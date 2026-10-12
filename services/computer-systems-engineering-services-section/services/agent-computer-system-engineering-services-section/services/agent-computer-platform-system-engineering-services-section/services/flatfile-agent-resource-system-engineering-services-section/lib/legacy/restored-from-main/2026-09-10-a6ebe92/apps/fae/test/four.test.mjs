import assert from "node:assert/strict";
import test from "node:test";
import { FOUR, four, isKnowledgeCover, joinKnowledge, validateFour, witnessBit } from "../src/kernel/four.mjs";

test("four.mjs re-exports the RMN runtime's FOUR die material unchanged", () => {
  assert.deepEqual(FOUR.neither, four(false, false));
  assert.deepEqual(FOUR.true, four(true, false));
  assert.deepEqual(FOUR.false, four(false, true));
  assert.deepEqual(FOUR.both, four(true, true));
});

test("isKnowledgeCover accepts only a single legal 0->1 bit transition", () => {
  assert.equal(isKnowledgeCover(FOUR.neither, FOUR.true), true);
  assert.equal(isKnowledgeCover(FOUR.neither, FOUR.false), true);
  assert.equal(isKnowledgeCover(FOUR.true, FOUR.both), true);
  assert.equal(isKnowledgeCover(FOUR.false, FOUR.both), true);
});

test("isKnowledgeCover rejects a decrement", () => {
  assert.equal(isKnowledgeCover(FOUR.true, FOUR.neither), false);
  assert.equal(isKnowledgeCover(FOUR.both, FOUR.true), false);
});

test("isKnowledgeCover rejects a two-bit jump", () => {
  assert.equal(isKnowledgeCover(FOUR.neither, FOUR.both), false);
});

test("isKnowledgeCover rejects a no-op", () => {
  assert.equal(isKnowledgeCover(FOUR.true, FOUR.true), false);
  assert.equal(isKnowledgeCover(FOUR.neither, FOUR.neither), false);
});

test("witnessBit names the bit a legal WIT set and raises not-one-wit otherwise", () => {
  assert.equal(witnessBit(FOUR.neither, FOUR.true), "positiveEvidence");
  assert.equal(witnessBit(FOUR.neither, FOUR.false), "negativeEvidence");
  assert.throws(() => witnessBit(FOUR.neither, FOUR.both), { code: "not-one-wit" });
  assert.throws(() => witnessBit(FOUR.true, FOUR.neither), { code: "not-one-wit" });
});

test("joinKnowledge is the pointwise OR of evidence bits", () => {
  assert.deepEqual(joinKnowledge(FOUR.true, FOUR.false), FOUR.both);
  assert.deepEqual(joinKnowledge(FOUR.neither, FOUR.true), FOUR.true);
});

test("validateFour rejects a value that is not exactly a FOUR shape", () => {
  assert.throws(() => validateFour({ positiveEvidence: true }), { code: "malformed-four" });
  assert.throws(() => validateFour({ positiveEvidence: true, negativeEvidence: true, extra: 1 }), { code: "malformed-four" });
});
