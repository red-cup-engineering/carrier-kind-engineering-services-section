import assert from "node:assert/strict";
import test from "node:test";

import { assertNonemptyString } from "../src/lib/strings.mjs";

test("nonempty string admission preserves field labels and caller expectation", () => {
  assert.equal(assertNonemptyString("  value  ", "field"), "  value  ");
  assert.throws(() => assertNonemptyString(" \t", "field"), { name: "TypeError", message: "field: expected a non-empty string" });
  assert.throws(() => assertNonemptyString("", "field", "nonempty text"), { name: "TypeError", message: "field: expected nonempty text" });
});
