import assert from "node:assert/strict";
import test from "node:test";
import { FOUR, fourName, joinEvidence, joinKnowledge } from "../src/four.mjs";

test("FOUR joins independent evidence without explosion", () => {
  assert.equal(fourName(joinKnowledge(FOUR.true, FOUR.false)), "both");
  assert.equal(fourName(joinEvidence([FOUR.neither, FOUR.true, FOUR.false])), "both");
  assert.equal(fourName(joinKnowledge(FOUR.neither, FOUR.true)), "true");
});

test("FOUR rejects implicit or malformed values", () => {
  assert.throws(() => joinKnowledge({ positiveEvidence: true }, FOUR.true), /Boolean/u);
  assert.throws(() => joinKnowledge({ positiveEvidence: 1, negativeEvidence: false }, FOUR.true), /Boolean/u);
});
