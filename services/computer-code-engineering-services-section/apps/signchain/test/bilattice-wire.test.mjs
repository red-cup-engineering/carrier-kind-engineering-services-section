import test from "node:test";
import assert from "node:assert/strict";
import { FOUR, four, joinKnowledgeWire, isKnowledgeCover, validateFour, witnessBit, knowledgeLeqWire } from "@red-cup-engineering/computer-data-services-section/four";

const values = Object.values(FOUR);
// The complete Belnap knowledge diamond, in neither/true/false/both wire order.
const joins = [[0, 1, 2, 3], [1, 1, 3, 3], [2, 3, 2, 3], [3, 3, 3, 3]];
const covers = new Map([["0:1", "positiveEvidence"], ["0:2", "negativeEvidence"], ["1:3", "negativeEvidence"], ["2:3", "positiveEvidence"]]);

test("Boolean SEN binding preserves all four points and all 16 joins, order and witness cases", () => {
  assert.deepEqual(values, [
    { positiveEvidence: false, negativeEvidence: false },
    { positiveEvidence: true, negativeEvidence: false },
    { positiveEvidence: false, negativeEvidence: true },
    { positiveEvidence: true, negativeEvidence: true },
  ]);
  for (let a = 0; a < 4; a += 1) for (let b = 0; b < 4; b += 1) {
    const left = values[a], right = values[b], witness = covers.get(`${a}:${b}`);
    assert.deepEqual(joinKnowledgeWire(left, right), values[joins[a][b]]);
    assert.deepEqual(joinKnowledgeWire(left, right), values[joins[a][b]]);
    assert.equal(knowledgeLeqWire(left, right), joins[a][b] === b);
    assert.equal(isKnowledgeCover(left, right), witness !== undefined);
    if (witness === undefined) assert.throws(() => witnessBit(left, right), { code: "not-one-wit" });
    else assert.equal(witnessBit(left, right), witness);
  }
});

test("Boolean SEN admission retains exact keys, explicit booleans and immutable output", () => {
  for (const value of [null, {}, [], { positiveEvidence: 1, negativeEvidence: false }, { positiveEvidence: true, negativeEvidence: false, extra: true }]) {
    assert.throws(() => validateFour(value), { code: "malformed-four" });
  }
  assert.throws(() => four(true, 0), { code: "malformed-four" });
  assert.equal(Object.isFrozen(four(true, false)), true);
  assert.equal(Object.isFrozen(joinKnowledgeWire(FOUR.true, FOUR.false)), true);
});
