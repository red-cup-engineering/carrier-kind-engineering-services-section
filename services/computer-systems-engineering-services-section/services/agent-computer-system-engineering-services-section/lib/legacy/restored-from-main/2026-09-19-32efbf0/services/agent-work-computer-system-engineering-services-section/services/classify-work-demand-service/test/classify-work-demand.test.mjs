import assert from "node:assert/strict";
import test from "node:test";
import { classifyWorkDemand } from "../scripts/classify-work-demand.mjs";

test("a repair script is a process on the script lane", () => {
  const demand = classifyWorkDemand({ scope: "task:exact-deps-lib-x", text: "pin exact" });
  assert.equal(demand.workType, "process");
  assert.equal(demand.lane, "script");
});

test("a named script settles inputs and path", () => {
  const demand = classifyWorkDemand({ scope: "task:friction-missing-x", text: "run scripts/publish-package.mjs" });
  assert.deepEqual(demand.determination, { operation: "open", inputsAndPath: "settled" });
  assert.equal(demand.workType, "procedure");
});
