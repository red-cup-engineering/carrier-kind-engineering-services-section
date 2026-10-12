import assert from "node:assert/strict";
import test from "node:test";
import { admitWorkCompletion, admitWorkStart, admitWorkUpdate } from "../src/work-events.mjs";
import { foldWorkEvents, judgeWorkStopGate, projectWorkSnapshot } from "../src/work-snapshot.mjs";

const at = "2026-08-30T12:00:00.000Z";

test("admits, folds, updates, and completes work from explicit carriers", () => {
  const started = admitWorkStart({ title: "Move work", intent: "move it", success: "legacy face absent", session: "s1" }, { at });
  let snapshot = foldWorkEvents([started.event], { generatedAt: at });
  assert.equal(judgeWorkStopGate(snapshot, { session: "s1" }).passed, false);
  const updated = admitWorkUpdate(snapshot, { id: started.id, note: "moving", status: "blocked" }, { at: "2026-08-30T12:01:00.000Z" });
  snapshot = foldWorkEvents([started.event, updated.event], { generatedAt: at });
  assert.equal(snapshot.items[0].status, "blocked");
  const completed = admitWorkCompletion(snapshot, { id: started.id, outcome: "moved" }, { at: "2026-08-30T12:02:00.000Z" });
  snapshot = foldWorkEvents([started.event, updated.event, completed.event], { generatedAt: at });
  assert.equal(snapshot.items[0].workStatus, "done");
  assert.equal(judgeWorkStopGate(snapshot, { session: "s1" }).passed, true);
});

test("projects bounded work pages", () => {
  const started = admitWorkStart({ title: "One", intent: "do", success: "done", gate: "record" }, { at });
  const snapshot = foldWorkEvents([started.event], { generatedAt: at });
  const page = projectWorkSnapshot(snapshot, { detail: "items", gate: "record" });
  assert.equal(page.returned, 1);
});
