import assert from "node:assert/strict";
import test from "node:test";
import { admitGoalSubmission } from "../src/goal-events.mjs";
import { foldGoalEvents } from "../src/goal-snapshot.mjs";
test("admits and folds a supplied goal event", () => {
  const admission = admitGoalSubmission({ text: "Consume the legacy package", priority: 90 }, { at: "2026-08-30T00:00:00.000Z" });
  const snapshot = foldGoalEvents([admission.event], { generatedAt: "2026-08-30T00:01:00.000Z" });
  assert.equal(snapshot.goals[0].text, "Consume the legacy package");
  assert.equal(snapshot.goals[0].workItem.status, "open");
  assert.equal(snapshot.counts.open, 1);
});
