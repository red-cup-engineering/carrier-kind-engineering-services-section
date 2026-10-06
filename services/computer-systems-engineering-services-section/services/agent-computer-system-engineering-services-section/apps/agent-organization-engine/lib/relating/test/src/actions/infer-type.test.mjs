import assert from "node:assert/strict";
import test from "node:test";
import { inferTypeOperation } from "../../../src/operations/realization.mjs";

const pair = ["pair", ["mark", "\"a\""], ["mark", "\"b\""]];

test("infer-type answers a closed term's one SEN type with the judgment's content address", async () => {
  const result = await inferTypeOperation.execute({ term: pair });
  assert.equal(result.type, "SenTypeInference");
  assert.deepEqual(result.inferredType, ["prod", ["base"], ["base"]]);
  assert.match(result.id, /^ni:\/\/\/sha-256;/u);
  assert.equal((await inferTypeOperation.execute({ term: pair })).id, result.id);
  assert.deepEqual((await inferTypeOperation.execute({ term: ["app", ["lam", ["var", 0]], ["mark", "\"x\""]] })).inferredType, ["base"]);
});

test("infer-type refuses open, malformed and untypable terms rather than guessing", async () => {
  await assert.rejects(async () => inferTypeOperation.execute({ term: ["var", 0] }), /sen-term-must-be-closed/u);
  await assert.rejects(async () => inferTypeOperation.execute({ term: ["unit"] }), /malformed-sen-term/u);
  await assert.rejects(async () => inferTypeOperation.execute({ term: ["lam", ["var", 0]] }), /does-not-infer-one-type/u);
  await assert.rejects(async () => inferTypeOperation.execute({}), /sen-term-required/u);
});
