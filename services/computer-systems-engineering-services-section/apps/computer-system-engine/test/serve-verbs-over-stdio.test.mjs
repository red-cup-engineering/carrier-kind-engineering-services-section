// serve-verbs-over-stdio.test — contract tests for scripts/serve-verbs-over-stdio.mjs, the one
// generic stdio verb server in the tree. Exercises the server's own contract (handshake, shared
// type catalog, InvalidInput/EffectRefused/TypeSystemMismatch refusals, frame recovery, read-after-
// append ordering) against a real spawned process, using @red-cup-engineering/eavt's own verbs
// module (--verbs @red-cup-engineering/eavt/verbs) as its fixture — a real owner module, not a
// bespoke one, but this file is about the SERVER's contract, not eavt's.
//
// Ported from computer-deployment-engine's former composite-worker contract test (this server's
// own assertions) and @red-cup-engineering/eavt's former standalone contract test for its own
// now-deleted stdio-loop script, both retired when the loop they each tested moved here.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import test from "node:test";
import { admitTypeSystemDocument } from "@red-cup-engineering/computer-data-services-section/type-system/document";
import { getType } from "@red-cup-engineering/computer-data-services-section/type-system";

const SERVER_SCRIPT = new URL("../scripts/serve-verbs-over-stdio.mjs", import.meta.url).pathname;
const EAVT_VERBS = "@red-cup-engineering/eavt/verbs";

function openWorker(environment = {}) {
  const worker = spawn(process.execPath, [SERVER_SCRIPT, "--verbs", EAVT_VERBS], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...environment },
  });
  let nextId = 0;
  let buffered = "";
  let stderr = "";
  let failure;
  let typeSystemIdentity;
  const replies = new Map();
  const waiters = new Map();
  const fail = (error) => {
    if (failure) return;
    failure = error;
    for (const { reject } of waiters.values()) reject(error);
    waiters.clear();
  };
  worker.on("error", fail);
  worker.stderr.setEncoding("utf8");
  worker.stderr.on("data", (chunk) => { stderr += chunk; });
  worker.on("exit", (code, signal) => {
    if (code !== 0 && signal === null) fail(new Error(`worker exited ${code}: ${stderr}`));
  });
  worker.stdout.setEncoding("utf8");
  worker.stdout.on("data", (chunk) => {
    buffered += chunk;
    for (const line of buffered.split("\n").slice(0, -1)) {
      const reply = JSON.parse(line);
      const waiter = waiters.get(reply.id);
      if (waiter) {
        waiters.delete(reply.id);
        waiter.resolve(reply);
      } else replies.set(reply.id, reply);
    }
    buffered = buffered.slice(buffered.lastIndexOf("\n") + 1);
  });
  function send(verb, args, identity = typeSystemIdentity) {
    if (failure) return Promise.reject(failure);
    const id = nextId++;
    worker.stdin.write(`${JSON.stringify({ id, verb, args, typeSystemIdentity: identity })}\n`);
    return new Promise((resolve, reject) => {
      const reply = replies.get(id);
      if (reply) {
        replies.delete(id);
        resolve(reply);
      } else waiters.set(id, { resolve, reject });
    });
  }
  const ready = send("verbs", {}).then(reply => {
    assert.equal(reply.ok, true, reply.error);
    typeSystemIdentity = reply.typeSystemIdentity;
  });
  return {
    async call(verb, args, identity) { await ready; return send(verb, args, identity); },
    close() { worker.kill(); },
  };
}

async function succeeds(worker, verb, args) {
  const reply = await worker.call(verb, args);
  assert.equal(reply.ok, true, `${verb}: ${reply.error}`);
  return reply.value;
}

test("worker refuses invalid append arguments before creating a file", async (t) => {
  const worker = openWorker();
  const path = `/tmp/serve-verbs-over-stdio-contract-${randomUUID()}.eavt`;
  t.after(() => worker.close());
  const reply = await worker.call("append", { path, row: { e: "thing:invalid" } });
  assert.equal(reply.ok, false);
  assert.equal(reply.refusal.code, "InvalidInput");
  assert.equal(existsSync(path), false);
});

test("the worker exports its complete admitted type system and binds every operation to it", async t => {
  const worker = openWorker();
  t.after(() => worker.close());
  const document = await succeeds(worker, "type-system", {});
  const catalog = admitTypeSystemDocument(document);
  assert.equal(catalog.ok, true);
  if (!catalog.ok) assert.fail(JSON.stringify(catalog.refusal));
  for (const spec of await succeeds(worker, "verbs", {})) {
    assert.equal(spec.typeSystemIdentity, document.identity);
    assert.deepEqual(getType(catalog.value, spec.domain).schema, spec.args);
    assert.deepEqual(getType(catalog.value, spec.codomain).schema, spec.returns);
    assert.equal(spec.operation.domain, spec.domain);
    assert.equal(spec.operation.codomain, spec.codomain);
  }
  const mismatch = await worker.call("row-id", { row: {} }, "wrong-catalog");
  assert.equal(mismatch.refusal.code, "TypeSystemMismatch");
});

test("process effect authority blocks writes even when the request has a valid type", async t => {
  const worker = openWorker({ VERBS_ALLOWED_EFFECTS: "[]" });
  const path = `/tmp/serve-verbs-over-stdio-contract-${randomUUID()}.eavt`;
  t.after(() => worker.close());
  const row = { e: "thing:ordered", a: "named", v: "ordered", t: 1 };
  const reply = await worker.call("append", { path, row });
  assert.equal(reply.refusal.code, "EffectRefused");
  assert.equal(existsSync(path), false);
  assert.match(await succeeds(worker, "row-id", { row }), /^ni:\/\/\/sha-256;/);
});

test("a rejected frame leaves the worker available for its next valid frame", async (t) => {
  const worker = openWorker();
  t.after(() => worker.close());
  const rejected = await worker.call("assert-row", { row: { e: "thing:invalid" } });
  assert.equal(rejected.ok, false);
  const value = await succeeds(worker, "row-id", { row: { e: "thing:valid", a: "named", v: "valid", t: 1 } });
  assert.match(value, /^ni:\/\/\/sha-256;/);
});

test("a read frame received immediately after an append observes that append", async (t) => {
  const worker = openWorker();
  const path = `/tmp/serve-verbs-over-stdio-contract-${randomUUID()}.eavt`;
  const row = { e: "thing:ordered", a: "named", v: "ordered", t: 1 };
  t.after(() => {
    worker.close();
    rmSync(path, { force: true });
  });
  const appended = worker.call("append", { path, row });
  const read = worker.call("read", { path });
  assert.equal((await appended).ok, true);
  assert.deepEqual((await read).value, [row]);
});

test("declared return contracts admit current read-only worker values", async (t) => {
  const worker = openWorker();
  const row = { e: "thing:pebble", a: "named", v: "pebble", t: 1 };
  t.after(() => worker.close());

  const asserted = await succeeds(worker, "assert-row", { row });
  assert.deepEqual(asserted, row);
  const bytes = await succeeds(worker, "encode-cbor", { value: row });
  assert.deepEqual(await succeeds(worker, "decode-cbor", { bytes }), row);
  await succeeds(worker, "row-id", { row });
  await succeeds(worker, "dedupe", { rows: [row, row] });
  const folded = await succeeds(worker, "fold", { subject: row.e, rows: [row] });
  await succeeds(worker, "settle", { subject: row.e, rows: [row] });
  await succeeds(worker, "section", { folded });
  await succeeds(worker, "supersede", { rows: [row], functional: [row.a] });
  await succeeds(worker, "relate", { rows: [row], predicate: row.a, object: row.v });
  await succeeds(worker, "relate-from", { rows: [row], subject: row.e, predicate: row.a });
  const constituted = await succeeds(worker, "constitute", { kind: "thing", attributes: { name: "pebble" }, t: 1 });
  await succeeds(worker, "verify-address", { row: constituted.genesisRow });
});

test("an unknown verb is refused without disturbing the worker", async (t) => {
  const worker = openWorker();
  t.after(() => worker.close());
  const reply = await worker.call("not-a-real-verb", {});
  assert.equal(reply.ok, false);
  assert.equal(reply.refusal.code, "UnknownVerb");
  const value = await succeeds(worker, "row-id", { row: { e: "thing:valid", a: "named", v: "valid", t: 1 } });
  assert.match(value, /^ni:\/\/\/sha-256;/);
});
