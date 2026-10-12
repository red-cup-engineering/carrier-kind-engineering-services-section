import assert from "node:assert/strict";
import test from "node:test";
import { typedResultOf } from "../src/work/schema.mjs";

const countCodomain = {
  type: "object",
  required: ["count"],
  properties: { count: { type: "integer" } },
  additionalProperties: false,
};

test("typedResultOf refuses malformed outer results before its no-codomain bypass", () => {
  for (const value of [
    undefined, null, false, 0, "", {},
    { kind: "foreign", value: { count: 1 } },
    { kind: "skill-result" },
    { kind: "skill-result", value: { count: 1 }, extra: true },
    { kind: "skill-error" },
    { kind: "skill-error", error: "" },
    { kind: "skill-error", error: 1 },
    { kind: "skill-error", error: "reported failure", extra: true },
    { kind: "skill-error", error: "reported failure", value: { count: 1 } },
  ]) {
    assert.throws(() => typedResultOf(undefined, value), TypeError);
  }
});

test("typedResultOf refuses malformed non-success results with a declared codomain", () => {
  for (const value of [
    undefined, null, { kind: "foreign" },
    { kind: "skill-error" },
    { kind: "skill-error", error: "" },
    { kind: "skill-error", error: false },
    { kind: "skill-error", error: "reported failure", extra: true },
  ]) {
    assert.throws(() => typedResultOf(countCodomain, value), TypeError);
  }
});

test("typedResultOf retains valid legacy sums and still assays declared success codomains", () => {
  const success = { kind: "skill-result", value: { count: 1 } };
  const error = { kind: "skill-error", error: "reported failure" };
  assert.equal(typedResultOf(undefined, success), success);
  assert.equal(typedResultOf(undefined, error), error);
  assert.equal(typedResultOf(countCodomain, error), error);
  assert.deepEqual(typedResultOf(countCodomain, success), {
    kind: "skill-result", value: { returned: { count: 1 } },
  });
  const refused = typedResultOf(countCodomain, {
    kind: "skill-result", value: { count: "wrong" },
  });
  assert.equal(refused.kind, "skill-error");
  assert.match(refused.error, /codomain/);
});
