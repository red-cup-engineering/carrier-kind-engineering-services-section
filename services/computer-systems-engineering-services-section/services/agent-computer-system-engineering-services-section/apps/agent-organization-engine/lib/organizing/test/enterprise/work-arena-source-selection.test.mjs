import assert from "node:assert/strict";
import test from "node:test";
import { createWorkArenaReader, moveOf } from "../../src/enterprise/work-arena.mjs";

const at = (minute) => new Date(Date.parse("2026-10-02T00:00:00.000Z") + minute * 60_000).toISOString();
const row = (move, index) => ({ id: move.id ?? `record:${index}`, record: move });
const request = (fields) => moveOf({
  move: "request", by: fields.by ?? "requester", need: "The service remains available.",
  requirements: [{ id: "r1", says: "The service shall remain available." }],
  conditions: [{ id: "c1", says: "The service remains available.", verifies: ["r1"] }],
  at: fields.at, ...fields,
});
const report = (fields) => moveOf({ move: "report", by: fields.by ?? "reporter", observation: fields.observation ?? "Observed condition.", at: fields.at, ...fields });

test("source selection equals full canonical projection and places only selected threads", () => {
  const locator = "https://example.test/issues/7";
  const target = request({ sources: [{ kind: "issue", locator }], at: at(0) });
  const child = request({ by: "child-owner", serves: [target.id], at: at(1) });
  const proposal = moveOf({ move: "propose", by: "proposer", idea: "An alternate resolution exists.", addresses: [target.id], at: at(2) });
  const obstacle = report({ obstacle: "information", obstructs: [target.id], subject: "obstacle subject", observation: "The target is obstructed.", at: at(3) });
  const adoptedReport = report({ law: "law:selected", subject: "selected subject", sources: [{ kind: "issue", locator }], at: at(4) });
  const adoption = moveOf({ move: "adopt", thread: adoptedReport.id, by: "assayer", at: at(5) });
  const refined = moveOf({ move: "refine", thread: target.id, by: "requester", need: "The service remains available.", requirements: [{ id: "r1", says: "The service shall remain available." }], conditions: [{ id: "c1", says: "The service remains available.", verifies: ["r1"] }], at: at(6) });
  const promise = moveOf({ move: "promise", thread: target.id, by: "provider", at: at(7) });
  const delivery = moveOf({ move: "deliver", thread: target.id, by: "provider", evidence: ["delivery evidence"], at: at(8) });
  const receipt = moveOf({ move: "accept", thread: target.id, by: "requester", of: "provider", evidence: ["receipt evidence"], at: at(9) });
  const unrelated = Array.from({ length: 600 }, (_, index) => report({
    law: `law:unrelated:${index}`, subject: `subject:${index}`, at: at(10 + index),
  }));
  const records = [target, child, proposal, obstacle, adoptedReport, adoption, refined, promise, delivery, receipt, ...unrelated].map(row);
  const fullReader = createWorkArenaReader();
  const full = fullReader.boardAt(records, at(700));
  const reader = createWorkArenaReader();
  reader.inspectAt(records, at(700), "not-on-board");
  const expected = full.threads.filter((thread) => thread.opening.sources?.some(({ locator: source }) => source === locator));

  const originalClone = globalThis.structuredClone;
  let clones = 0;
  globalThis.structuredClone = (value) => { clones++; return originalClone(value); };
  let selected;
  try {
    selected = reader.boardAt(records, at(700), { sources: [locator] });
  } finally {
    globalThis.structuredClone = originalClone;
  }

  assert.deepEqual(selected.threads, expected);
  assert.equal(selected.position, full.position);
  assert.deepEqual(selected.refused, full.refused);
  assert.deepEqual(selected.awaiting, full.awaiting);
  assert.equal(selected.threads.length, 2);
  const selectedRequest = selected.threads.find((thread) => thread.id === target.id);
  const selectedReport = selected.threads.find((thread) => thread.id === adoptedReport.id);
  assert.equal(selectedRequest.standing, "accepted");
  assert.deepEqual(selectedRequest.children, [child.id]);
  assert.deepEqual(selectedRequest.positions?.map(({ id }) => id), [proposal.id]);
  assert.deepEqual(selectedRequest.obstacles?.map(({ id }) => id), [obstacle.id]);
  assert.equal(selectedReport.standing, "adopted");
  assert.equal(clones, 2, `expected only the two selected threads to be detached, saw ${clones} clones`);
  const selectedAddress = selected.position;
  const extended = [...records, row(report({ law: "law:later", subject: "later subject", at: at(701) }), records.length)];
  reader.boardAt(extended, at(701));
  assert.equal(selected.position, selectedAddress, "an earlier selected reading keeps its immutable position address after later replay");
  assert.throws(() => reader.boardAt(records, at(700), { sources: [] }), /1 to 200/);
});
