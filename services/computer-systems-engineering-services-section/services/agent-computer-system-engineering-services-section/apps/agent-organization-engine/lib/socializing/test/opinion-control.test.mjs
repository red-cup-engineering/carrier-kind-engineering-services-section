import assert from "node:assert/strict";
import test from "node:test";
import { admitOpinion, foldOpinions, measureOpinions } from "../src/socialize/opinion-control.mjs";

const at = "2026-08-30T12:00:00.000Z";

test("admits one explicit opinion as one event", () => {
  const result = admitOpinion({ claim: "scripts have one effect", kind: "constraint", scope: "javascript" }, { at });
  assert.equal(result.event[1], "opinion-control.opinion.held");
  assert.equal(result.opinion.severity, "warning");
  assert.deepEqual(result.opinion.scopes, ["javascript"]);
});

test("folds opinion events without reading or writing state", () => {
  const admitted = admitOpinion({ claim: "apps compose scripts", scope: ["javascript", "apps"] }, { at });
  const snapshot = foldOpinions([admitted.event], { generatedAt: at });
  assert.equal(snapshot.opinions.length, 1);
  assert.deepEqual(snapshot.scopes, ["apps", "javascript"]);
});

test("measures an explicit snapshot and explicit assessments", () => {
  const admitted = admitOpinion({ claim: "apps compose scripts", scope: "javascript" }, { at });
  const snapshot = foldOpinions([admitted.event], { generatedAt: at });
  const result = measureOpinions(snapshot, {
    subject: "NOG", scope: "javascript",
    assessments: [{ id: admitted.opinion.id, charge: "potential", evidence: ["composition test"] }],
  }, { generatedAt: at });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].charge, "potential");
  assert.deepEqual(result.unassessed, []);
});
