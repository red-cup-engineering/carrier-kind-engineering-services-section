import assert from "node:assert/strict";
import test from "node:test";
import * as fars from "@red-cup-engineering/fars";

test("the declared package entrypoint exposes the FARS modules", () => {
  assert.equal(typeof fars.closureRules.composeRules, "function");
  assert.equal(typeof fars.store.loadSystem, "function");
  assert.equal(typeof fars.substrateStore.loadFlatfiles, "function");
  assert.equal(typeof fars.edit.fmSet, "function");
});
