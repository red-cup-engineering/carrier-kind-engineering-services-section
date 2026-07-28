// Pure law tests for the terminal projection Actor.
import assert from "node:assert/strict";
import test from "node:test";
import { projectNativeWorkProduct } from "../src/projector.mjs";

test("projects native Markdown without requiring JSON", () => {
  const result = projectNativeWorkProduct({ text: "Reasoning stays native.\nTOOL: edit\nPATH: calc.mjs\nSEARCH:\n```js\na - b\n```\nREPLACE:\n```js\na + b\n```" });
  assert.equal(result.projected, true);
  assert.deepEqual(result.transition.args.blocks, [{ search: "a - b", replace: "a + b" }]);
});

test("preserves an inquiry work product", () => {
  const result = projectNativeWorkProduct({ text: "TOOL: finish\n---BEGIN WORK PRODUCT---\nThe answer is 42.\n---END WORK PRODUCT---" });
  assert.equal(result.transition.args.summary, "The answer is 42.");
});

test("returns a typed refusal instead of inventing a transition", () => {
  assert.deepEqual(projectNativeWorkProduct({ text: "I have no proposed transition." }), {
    type: "NativeWorkProductTransitionProjectionRefusal", projected: false, reason: "no-supported-transition-in-native-work-product",
  });
});
