import assert from "node:assert/strict";
import test from "node:test";
import { classifyWorkDemand } from "../scripts/classify-work-demand.mjs";

test("classification reports science-owned determination coordinates", () => {
  assert.deepEqual(classifyWorkDemand({ scope: "task:data-custody-x" }).determination, { operation: "settled", inputsAndPath: "settled" });
  assert.equal(classifyWorkDemand({ scope: "task:friction-tool-x" }).workType, "derivation");
});
