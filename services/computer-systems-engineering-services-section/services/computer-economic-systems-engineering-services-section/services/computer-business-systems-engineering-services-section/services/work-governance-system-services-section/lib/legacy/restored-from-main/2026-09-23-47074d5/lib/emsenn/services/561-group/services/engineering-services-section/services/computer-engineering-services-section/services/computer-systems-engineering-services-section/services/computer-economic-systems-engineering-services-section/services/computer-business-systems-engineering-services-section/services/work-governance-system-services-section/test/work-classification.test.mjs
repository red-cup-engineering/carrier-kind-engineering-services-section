import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWork,
  DETERMINATION_OF_WORK_KIND,
  settleInputsAndPath,
  settleOperation,
  WORK_KINDS,
} from "../src/index.mjs";

test("the four work kinds are the complete determination product", () => {
  assert.deepEqual(WORK_KINDS, ["inquiry", "derivation", "procedure", "process"]);
  for (const kind of WORK_KINDS) assert.equal(classifyWork(DETERMINATION_OF_WORK_KIND[kind]), kind);
});

test("settling both coordinates classifies a process without an evidence value", () => {
  const inquiry = DETERMINATION_OF_WORK_KIND.inquiry;
  assert.equal(classifyWork(settleOperation(inquiry)), "derivation");
  assert.equal(classifyWork(settleInputsAndPath(inquiry)), "procedure");
  assert.equal(classifyWork(settleInputsAndPath(settleOperation(inquiry))), "process");
});
