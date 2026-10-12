import assert from "node:assert/strict";
import test from "node:test";
import { CHANNEL_KIND, OPERATION_KINDS, OPERATOR_KIND, classify, isValidKind } from "../src/operator/kind.mjs";

test("the seven canonical kinds match operation-kinds-completeness", () => {
  assert.deepEqual(OPERATION_KINDS, [
    "observation",
    "guard",
    "accounting",
    "query",
    "mutation",
    "analysis",
    "learning",
  ]);
});

test("canonical order is stable and deduped", () => {
  assert.equal(OPERATION_KINDS.length, 7);
  assert.equal(new Set(OPERATION_KINDS).size, 7);
});

test("isValidKind accepts each canonical kind", () => {
  for (const kind of OPERATION_KINDS) assert.equal(isValidKind(kind), true);
});

for (const bogus of ["Observation", "MUTATION", "obs", "", "fork", "audit", null, undefined, 0]) {
  test(`isValidKind rejects drift: ${JSON.stringify(bogus)}`, () => {
    assert.equal(isValidKind(bogus), false);
  });
}

const EMITTED_OPERATORS = [
  ["commit", "observation"],
  ["tick", "observation"],
  ["session", "observation"],
  ["dispatch", "guard"],
  ["set_fm_field", "mutation"],
  ["insert_fm_item", "mutation"],
  ["insert_flatfile", "mutation"],
  ["remove_fm_item", "mutation"],
  ["remove_fm_key", "mutation"],
  ["delete_flatfile", "mutation"],
  ["move_flatfile", "mutation"],
  ["rename_fm_key", "mutation"],
  ["rewrite_body_link", "mutation"],
  ["command_ship", "mutation"],
  ["receive_message", "mutation"],
  ["fm_add", "mutation"],
  ["fm_set", "mutation"],
  ["fm_remove", "mutation"],
  ["insertion", "mutation"],
  ["retraction", "mutation"],
  ["relocation", "mutation"],
  ["diagnose", "learning"],
  ["lesson", "learning"],
];

for (const [operator, expected] of EMITTED_OPERATORS) {
  test(`every emitted operator classifies correctly: ${operator}`, () => {
    assert.equal(classify(operator), expected);
  });
}

test("every OPERATOR_KIND value is a canonical kind", () => {
  for (const kind of Object.values(OPERATOR_KIND)) assert.equal(isValidKind(kind), true);
});

test("every CHANNEL_KIND value is a canonical kind", () => {
  for (const kind of Object.values(CHANNEL_KIND)) assert.equal(isValidKind(kind), true);
});

test("an unknown operator classifies via channel when known", () => {
  assert.equal(classify("future_self_modify_op", "learning"), "learning");
  assert.equal(classify("custom_heartbeat", "heartbeat"), "observation");
  assert.equal(classify("policy_check", "governance"), "guard");
  assert.equal(classify("ledger_post", "ledger"), "accounting");
});

test("an unknown operator with an unknown channel defaults to mutation", () => {
  assert.equal(classify("brand_new_op"), "mutation");
  assert.equal(classify("brand_new_op", "brand_new_channel"), "mutation");
});

test("the operator registry wins over the channel fallback", () => {
  assert.equal(classify("commit", "learning"), "observation");
  assert.equal(classify("dispatch", "heartbeat"), "guard");
});

test("no operator and no channel match defaults to mutation", () => {
  assert.equal(classify("xyzzy"), "mutation");
  assert.equal(classify("xyzzy", null), "mutation");
});

test("classify tolerates prototype-chain property names without misclassifying", () => {
  assert.equal(classify("toString"), "mutation");
  assert.equal(classify("constructor", "toString"), "mutation");
});

test("no duplicate operators in the emitted-operator inventory", () => {
  const seen = new Set();
  for (const [operator] of EMITTED_OPERATORS) {
    assert.equal(seen.has(operator), false, `duplicate ${operator} in EMITTED_OPERATORS`);
    seen.add(operator);
  }
});
