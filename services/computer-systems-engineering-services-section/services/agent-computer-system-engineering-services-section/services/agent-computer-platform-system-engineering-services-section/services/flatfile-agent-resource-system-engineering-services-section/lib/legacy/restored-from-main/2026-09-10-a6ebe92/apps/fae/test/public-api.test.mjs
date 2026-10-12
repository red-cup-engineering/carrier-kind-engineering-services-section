import assert from "node:assert/strict";
import test from "node:test";
import * as fae from "@red-cup-engineering/fae";

test("the declared FAE entrypoint exposes the modules that build a FARS", () => {
  assert.equal(typeof fae.closureRules.composeRules, "function");
  assert.equal(typeof fae.compositor.composeProviders, "function");
  assert.equal(typeof fae.store.value, "function");
  assert.equal(typeof fae.substrateStore.loadFlatfiles, "function");
  assert.equal(typeof fae.edit.fmSet, "function");
});
