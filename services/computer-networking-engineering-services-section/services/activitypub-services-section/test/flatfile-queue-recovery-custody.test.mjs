import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FlatfileMessageQueue } from "../src/flatfile-queue.mjs";

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
