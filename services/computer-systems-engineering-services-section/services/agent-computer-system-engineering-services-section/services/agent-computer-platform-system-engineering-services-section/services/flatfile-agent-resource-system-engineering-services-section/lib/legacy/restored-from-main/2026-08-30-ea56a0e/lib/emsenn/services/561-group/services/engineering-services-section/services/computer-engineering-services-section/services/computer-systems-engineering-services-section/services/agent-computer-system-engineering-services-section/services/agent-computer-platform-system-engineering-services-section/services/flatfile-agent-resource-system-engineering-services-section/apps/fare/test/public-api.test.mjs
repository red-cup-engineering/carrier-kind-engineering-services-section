import assert from "node:assert/strict";
import test from "node:test";
import * as fare from "@red-cup-engineering/fare";

test("the declared FARE entrypoint exposes the modules that build a FARS", () => {
  assert.equal(typeof fare.closureRules.composeRules, "function");
  assert.equal(typeof fare.store.loadSystem, "function");
  assert.equal(typeof fare.substrateStore.loadFlatfiles, "function");
  assert.equal(typeof fare.edit.fmSet, "function");
});
