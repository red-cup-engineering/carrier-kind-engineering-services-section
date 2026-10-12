import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { each, readHead, readLog, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { filesystemRpcFeedResponder, journaledRpcEvidence, journalRpcWitness, rpcEvidenceType } from "../../src/rpc/journal-witness.mjs";
import { rpcStepRowOf } from "../../src/journal/reading/rpc-sequence.mjs";

const at = "2026-10-11T12:00:00.000Z";
const invocation = Object.freeze({
  kind: "metroplat.rpc.invocation", id: "ni:///sha-256;invocation", operation: "ni:///sha-256;operation", verb: "clock-due",
  subject: "bare-cedar-fog.561.group", resource: "infograph", input: { now: at }, arguments: {}, caller: { transport: "metroplat-clock" },
  causes: [], observedAt: at, request: "ni:///sha-256;request",
});
const decision = Object.freeze({
  kind: "metroplat.rpc.authorization:obstruction", ok: false, invocation: invocation.id, operation: invocation.operation,
  subject: invocation.subject, reading: "unknown", evidence: ["settled-subject-standing:bare-cedar-fog.561.group"],
  reasons: ["subject standing is unknown; held standing is required"], advice: [{ statement: "x".repeat(4096), because: "y".repeat(4096) }],
  decidedAt: at,
});
const receipt = Object.freeze({
  kind: "metroplat.rpc.execution:obstruction", ok: false, invocation, operation: invocation.operation, decision, phase: "authorization",
  value: { output: "z".repeat(8192) }, reasons: decision.reasons, evidence: [], startedAt: at, completedAt: at, id: "ni:///sha-256;receipt",
});

test("the journal keeps each fact of an act once: no invocation, decision, advice or output copied into later evidence", () => {
  const kept = journaledRpcEvidence({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at });
  assert.deepEqual(Object.keys(kept.receipt).sort(), ["completedAt", "evidence", "id", "kind", "ok", "operation", "phase", "reasons", "startedAt"]);
  const decided = journaledRpcEvidence({ kind: "metroplat.rpc.decision", invocation: invocation.id, decision, at });
  assert.equal(decided.decision.advice, undefined);
  assert.equal(decided.decision.invocation, undefined);
  assert.equal(decided.decision.reading, "unknown");
  const attempt = { kind: "metroplat.rpc.attempt", invocation, at };
  assert.equal(journaledRpcEvidence(attempt), attempt);
});

test("a witnessed act's records stay small, chain by causes and still read as steps", (t) => {
  const root = mkdtempSync(join(tmpdir(), "rpc-witness-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const witness = journalRpcWitness(root);
  const attempt = witness.admit({ kind: "metroplat.rpc.attempt", invocation, at });
  const decided = witness.admit({ kind: "metroplat.rpc.decision", invocation: invocation.id, decision, at });
  assert.deepEqual(witness.causalHead(invocation.id), decided.eventIds, "the frontier is the last record");
  const outcome = witness.admit({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at });
  const records = [...each(root, rpcEvidenceType)];
  assert.equal(records.length, 3);
  for (const bucket of readdirSync(join(root, "data", "records", "rpc-evidence-records"), { recursive: true })) {
    if (!String(bucket).endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(root, "data", "records", "rpc-evidence-records", String(bucket)), "utf8").trim().split("\n")) {
      assert.ok(line.length < 2048, `a ${line.length}-byte line`);
    }
  }
  const head = readHead(root, rpcEvidenceType, invocation.id);
  assert.equal(head.closed, true, "the outcome closes the invocation's thread");
  assert.deepEqual(head.frontier, outcome.eventIds);
  const thread = [...walk(root, rpcEvidenceType, head.frontier)].reverse();
  assert.deepEqual(thread.map((step) => step.address), [attempt.eventIds[0], decided.eventIds[0], outcome.eventIds[0]], "causes first");
  const rows = thread.map((step) => [invocation.id, { kind: step.record.evidence.kind }, step.record.evidence, step.record.at]);
  assert.deepEqual(rows.map(rpcStepRowOf).filter(Boolean).map((row) => row[2].receipt?.ok ?? row[2].invocation.verb), ["clock-due", false]);
});

test("a witnessed act leaves one log line per piece of evidence, naming its record by address", (t) => {
  const root = mkdtempSync(join(tmpdir(), "rpc-witness-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const witness = journalRpcWitness(root);
  const attempt = witness.admit({ kind: "metroplat.rpc.attempt", invocation, at });
  const lines = [...readLog(root, rpcEvidenceType, at.slice(0, 10))].map(({ line }) => line);
  assert.deepEqual(lines, [{ at, invocation: invocation.id, kind: "metroplat.rpc.attempt", of: attempt.eventIds[0] }]);
  const response = filesystemRpcFeedResponder(root, "ns", () => at)(undefined);
  assert.equal(response.response.status, 200);
  assert.match(response.response.body, /metroplat\.rpc\.attempt/u);
});
