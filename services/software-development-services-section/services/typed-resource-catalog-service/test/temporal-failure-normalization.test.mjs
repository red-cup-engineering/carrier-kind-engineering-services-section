import assert from "node:assert/strict";
import test from "node:test";
import { refuseTemporalFailureMarks, scanTemporalFailureMarks } from "../src/index.mjs";

test("projects every temporal failure mark as an addressable normalization demand", () => {
  const forbidden = ["set", "Timeout"].join("");
  const field = ["timeout", "Ms"].join("");
  const boundary = ["dead", "line"].join("");
  const credentialState = ["ex", "pired"].join("");
  const receipt = scanTemporalFailureMarks({ resources: [
    { path: "src/runner.mjs", content: `${forbidden}(run, 1); const ${field} = 1; throw new Error('${boundary} ${credentialState}');` },
    { path: "src/healthy.mjs", content: "export const state = 'running';" },
  ] });
  assert.equal(receipt.type, "TemporalFailureTerritoryScanReceipt");
  assert.equal(receipt.conforms, false);
  assert.deepEqual([...new Set(receipt.obligations.map(({ mark }) => mark.kind))], ["timer", "temporal-limit-field", "temporal-boundary", "temporal-credential-state"]);
  assert.throws(() => refuseTemporalFailureMarks({ resources: [{ path: "src/runner.mjs", content: `${["AbortSignal", ".", "time", "out"].join("")}(1)` }] }), /normalization remains demanded/u);
});

test("the same admitted territory has a stable clean receipt independent of resource order", () => {
  const left = scanTemporalFailureMarks({ resources: [{ path: "b.mjs", content: "export {}" }, { path: "a.mjs", content: "export {}" }] });
  const right = scanTemporalFailureMarks({ resources: [{ path: "a.mjs", content: "export {}" }, { path: "b.mjs", content: "export {}" }] });
  assert.equal(left.conforms, true);
  assert.equal(left.id, right.id);
  assert.equal(refuseTemporalFailureMarks({ resources: [{ path: "healthy.mjs", content: "export const status = 'running';" }] }).conforms, true);
});
