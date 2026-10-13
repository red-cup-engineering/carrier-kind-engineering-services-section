import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FlatfileMessageQueue, receivePreservedQueue } from "../src/flatfile-queue.mjs";

const dueName = (due, id) => `${String(due).padStart(15, "0")}-${id}.json`;
const makeSpool = () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-claimed-recovery-"));
  for (const phase of ["ready", "claimed"]) mkdirSync(path.join(root, phase), { recursive: true });
  return root;
};
const put = (root, phase, name, payload) => {
  const file = path.join(root, phase, name);
  writeFileSync(file, payload, { flag: "wx", mode: 0o600 });
  return file;
};

test("recovery refuses all filename collisions before moving any claimed custody", () => {
  const root = makeSpool();
  const due = Date.now() - 3000;
  const colliding = dueName(due, "a".repeat(64));
  const distinct = dueName(due, "b".repeat(64));
  const readyPayload = JSON.stringify({ message: { id: "existing-ready" }, orderingKey: null, scheduled: due });
  const claimedPayload = JSON.stringify({ message: { id: "held-claimed" }, orderingKey: null, scheduled: due });
  const anotherPayload = JSON.stringify({ message: { id: "other-claimed" }, orderingKey: null, scheduled: due });
  try {
    const liveFile = put(root, "ready", colliding, readyPayload);
    const heldFile = put(root, "claimed", colliding, claimedPayload);
    const otherFile = put(root, "claimed", distinct, anotherPayload);
    assert.throws(() => new FlatfileMessageQueue({ directory: root }), /refuses claimed\/ready filename collision/);
    assert.equal(readFileSync(liveFile, "utf8"), readyPayload, "live ready payload is unmodified");
    assert.equal(readFileSync(heldFile, "utf8"), claimedPayload, "colliding held payload survives");
    assert.equal(readFileSync(otherFile, "utf8"), anotherPayload, "unrelated held payload survives preflight");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy source-bound due time and message pass through claim recovery without rewriting payload", async () => {
  const root = makeSpool();
  const due = Date.now() - 3000;
  const name = dueName(due, "e".repeat(64));
  const payload = JSON.stringify({
    message: { id: "retained-delivery-" + randomUUID() },
    orderingKey: "actor:example",
    scheduled: due,
  });
  const signal = new AbortController();
  const received = [];
  try {
    put(root, "claimed", name, payload);
    const queue = new FlatfileMessageQueue({ directory: root, pollInterval: 1 });
    assert.equal(readFileSync(path.join(root, "ready", name), "utf8"), payload, "original custody bytes survive restart");
    assert.equal((await queue.getDepth()).queued, 1);
    await queue.listen(async message => {
      received.push(message);
      signal.abort();
    }, { signal: signal.signal });
    assert.equal(received.length, 1);
    assert.equal(received[0].id, JSON.parse(payload).message.id);
    assert.equal(readdirSync(path.join(root, "claimed")).length, 0);
    assert.equal((await queue.getDepth()).queued, 0);
  } finally {
    signal.abort();
    rmSync(root, { recursive: true, force: true });
  }
});

const INCIDENT = 'incident-20261012T224202Z-38318056625';
function quarantine(t, readyCount = 2, claimedCount = 1) {
  const root = makeSpool();
  for (const phase of ['ready.' + INCIDENT, 'claimed.' + INCIDENT]) mkdirSync(path.join(root, phase));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const due = Date.now() - 3000;
  const originals = [];
  for (let n = 0; n < readyCount + claimedCount; n++) {
    const phase = n < readyCount ? 'ready.' + INCIDENT : 'claimed.' + INCIDENT;
    const name = dueName(due, String(n).padStart(8, '0'));
    const body = JSON.stringify({ message: { id: 'original-' + n }, orderingKey: 'actor:test', scheduled: due });
    const file = put(root, phase, name, body);
    originals.push({ phase, name, body, file });
  }
  const options = { directory: root, incident: INCIDENT, expectedReady: readyCount, expectedClaimed: claimedCount,
    assertQuiescent() {} };
  return { root, originals, options };
}

test('quarantined ready custody is hard-linked without altering original files, and same-lease retry is idempotent', t => {
  const f = quarantine(t);
  const first = receivePreservedQueue(f.options);
  assert.equal(first.linked, 2);
  assert.equal(first.claimedUnresolved, 1);
  assert.equal(first.deliveryObserved, false);
  for (const original of f.originals) {
    assert.equal(readFileSync(original.file, 'utf8'), original.body);
    if (original.phase.startsWith('ready.')) {
      const received = path.join(f.root, 'ready', original.name);
      assert.equal(readFileSync(received, 'utf8'), original.body);
      assert.equal(statSync(received).ino, statSync(original.file).ino);
    }
  }
  assert.equal(readdirSync(path.join(f.root, 'claimed')).length, 0);
  const second = receivePreservedQueue(f.options);
  assert.equal(second.linked, 0);
  assert.equal(second.alreadyPresent, 2);
});

test('every collision is preflighted before any quarantined source is linked', t => {
  const f = quarantine(t, 5, 1), last = f.originals[4];
  writeFileSync(path.join(f.root, 'ready', last.name), JSON.stringify({ message: 'different' }));
  assert.throws(() => receivePreservedQueue(f.options), /conflicting custody/);
  assert.equal(readdirSync(path.join(f.root, 'ready')).length, 1);
  assert.equal(readdirSync(path.join(f.root, 'ready.' + INCIDENT)).length, 5);
});

test('historic claim handling must be read and validated before admitting previously claimed custody', t => {
  const f = quarantine(t, 2, 1), claimed = f.originals[2];
  const handled = receivePreservedQueue({ ...f.options,
    inspectClaimedHandling: () => ({ filename: claimed.name, handlerResult: 'returned' }) });
  assert.equal(handled.claimedHandled, 1);
  assert.equal(handled.claimedLinked, 0);
  assert.equal(readFileSync(claimed.file, 'utf8'), claimed.body);
  const f2 = quarantine(t, 2, 1), differentClaim = f2.originals[2];
  const pending = receivePreservedQueue({ ...f2.options, inspectClaimedHandling: () => undefined });
  assert.equal(pending.claimedLinked, 1);
  assert.equal(pending.claimedUnresolved, 0);
  assert.equal(readFileSync(path.join(f2.root, 'ready', differentClaim.name), 'utf8'), differentClaim.body);
  const f3 = quarantine(t);
  assert.throws(() => receivePreservedQueue({ ...f3.options,
    inspectClaimedHandling: () => ({ filename: 'wrong', handlerResult: 'returned' }) }), /historical claimed outcome/);
  assert.deepEqual(readdirSync(path.join(f3.root, 'ready')), []);
});

test('source alias, redirected file, changed count, and active service fail before mutation', t => {
  const f = quarantine(t), source = f.originals[0];
  assert.throws(() => receivePreservedQueue({ ...f.options, expectedReady: 3 }), /count changed/);
  put(f.root, 'claimed.' + INCIDENT, source.name, source.body);
  assert.throws(() => receivePreservedQueue({ ...f.options, expectedClaimed: 2 }), /conflicting message identity/);
  rmSync(path.join(f.root, 'claimed.' + INCIDENT, source.name));
  rmSync(source.file);
  symlinkSync('/etc/passwd', source.file);
  assert.throws(() => receivePreservedQueue(f.options), /bounded regular file/);
  assert.deepEqual(readdirSync(path.join(f.root, 'ready')), []);
  const f2 = quarantine(t);
  assert.throws(() => receivePreservedQueue({ ...f2.options,
    assertQuiescent() { throw Error('primary still running'); } }), /primary still running/);
  assert.deepEqual(readdirSync(path.join(f2.root, 'ready')), []);
});

test('the incident-scale 4152 ready and one claimed files preserve every source byte', { timeout: 45000 }, t => {
  const f = quarantine(t, 4152, 1), receipt = receivePreservedQueue(f.options);
  assert.equal(receipt.linked, 4152);
  assert.equal(receipt.claimedUnresolved, 1);
  assert.equal(readdirSync(path.join(f.root, 'ready')).length, 4152);
  assert.equal(readdirSync(path.join(f.root, 'ready.' + INCIDENT)).length, 4152);
  assert.equal(readdirSync(path.join(f.root, 'claimed.' + INCIDENT)).length, 1);
});

test('the packaged receive-preserved CLI refuses an active service and admits a stopped one', t => {
  const f = quarantine(t, 2, 1);
  const commands = mkdtempSync(path.join(tmpdir(), 'incident-queue-systemctl-'));
  t.after(() => rmSync(commands, { recursive: true, force: true }));
  const systemctl = path.join(commands, 'systemctl');
  const run = () => spawnSync(process.execPath, [
    fileURLToPath(new URL('../src/flatfile-queue.mjs', import.meta.url)),
    'receive-preserved', f.root, INCIDENT, '2', '1', 'cold-red-gate-561-group.service',
  ], { encoding: 'utf8', timeout: 15000, env: { ...process.env, PATH: commands + ':' + (process.env.PATH ?? '') } });
  writeFileSync(systemctl, '#!/bin/sh\nprintf "active\\n"\nexit 0\n');
  chmodSync(systemctl, 0o755);
  const denied = run();
  assert.notEqual(denied.status, 0, denied.stderr);
  assert.deepEqual(readdirSync(path.join(f.root, 'ready')), []);
  writeFileSync(systemctl, '#!/bin/sh\nprintf "inactive\\n"\nexit 3\n');
  const received = run();
  assert.equal(received.status, 0, received.stderr);
  const effect = JSON.parse(received.stdout.trim());
  assert.equal(effect.linked, 2);
  assert.equal(effect.claimedUnresolved, 1);
});

test('the operational CLI refuses a substituted historical handler implementation before replay', t => {
  const f = quarantine(t, 1, 1);
  const commands = mkdtempSync(path.join(tmpdir(), 'incident-queue-historic-module-'));
  t.after(() => rmSync(commands, { recursive: true, force: true }));
  const control = path.join(commands, 'systemctl');
  writeFileSync(control, '#!/bin/sh\nprintf "inactive\\n"\nexit 3\n');
  chmodSync(control, 0o755);
  const substituted = path.join(commands, 'unverified.mjs');
  writeFileSync(substituted, 'throw new Error("must not execute unverified historical source");\n');
  const run = spawnSync(process.execPath, [
    fileURLToPath(new URL('../src/flatfile-queue.mjs', import.meta.url)),
    'receive-preserved', f.root, INCIDENT, '1', '1', 'cold-red-gate-561-group.service', substituted,
  ], { encoding: 'utf8', timeout: 15000, env: { ...process.env, PATH: commands + ':' + (process.env.PATH ?? '') } });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /historical queue reader differs from the incident-qualified source/);
  assert.doesNotMatch(run.stderr, /must not execute unverified historical source/);
  assert.deepEqual(readdirSync(path.join(f.root, 'ready')), []);
});
