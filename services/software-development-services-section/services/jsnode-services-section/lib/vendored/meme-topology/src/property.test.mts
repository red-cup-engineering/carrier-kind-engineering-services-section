import assert from "node:assert/strict";
import test from "node:test";

import fc from "fast-check";

import {
  chargeValues,
  conflateValue,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  negateValue,
} from "./index.mjs";
import {
  fromCount,
  fromInt,
  fromRatio,
  intAdd,
  intEqual,
  intMultiply,
  intNegate,
  intSubtract,
  matEqual,
  matTranspose,
  matmul,
  natAdd,
  natEqual,
  natMultiply,
  ratAdd,
  ratEqual,
  ratMultiply,
  ratSubtract,
  toCount,
  toInt,
} from "@emsenn/meme-algebra";
import { sameChargeValue } from "./internal.mjs";
import { extend, induce, mark, sameMemeTopology, utterance, type UtteranceCarrier } from "./index.mjs";

const configuredSeed = process.env.FC_SEED === undefined ? undefined : Number.parseInt(process.env.FC_SEED, 10);
const propertyRuns = Number.parseInt(process.env.FC_RUNS ?? "25", 10);
const propertyOptions: fc.Parameters<unknown> = typeof configuredSeed === "number" && Number.isInteger(configuredSeed)
  ? Object.freeze({ numRuns: propertyRuns, seed: configuredSeed })
  : Object.freeze({ numRuns: propertyRuns });

const chargeValue = fc.constantFrom(...chargeValues());
const natural = fc.integer({ min: 0, max: 8 }).map(fromCount);
const integer = fc.integer({ min: -8, max: 8 }).map(fromInt);
const rational = fc.record({
  num: fc.integer({ min: -8, max: 8 }),
  den: fc.integer({ min: 1, max: 8 }),
}).map(({ num, den }) => fromRatio(num, den));
const squareMatrix = fc.integer({ min: 1, max: 2 }).chain((size) =>
  fc.array(fc.array(fc.integer({ min: -3, max: 3 }).map(fromInt), { minLength: size, maxLength: size }), { minLength: size, maxLength: size }));

test("knowledge and truth bilattice joins are commutative, associative, and idempotent", () => {
  const binaryLaws = [
    joinKnowledgeValue,
    meetKnowledgeValue,
    joinTruthValue,
    meetTruthValue,
  ] as const;

  for (const op of binaryLaws) {
    fc.assert(fc.property(chargeValue, (a) => {
      assert.equal(sameChargeValue(op(a, a), a), true);
    }), propertyOptions);
    fc.assert(fc.property(chargeValue, chargeValue, (a, b) => {
      assert.equal(sameChargeValue(op(a, b), op(b, a)), true);
    }), propertyOptions);
    fc.assert(fc.property(chargeValue, chargeValue, chargeValue, (a, b, c) => {
      assert.equal(sameChargeValue(op(op(a, b), c), op(a, op(b, c))), true);
    }), propertyOptions);
  }
});

test("bilattice negation and conflation are involutions", () => {
  fc.assert(fc.property(chargeValue, (value) => {
    assert.equal(sameChargeValue(negateValue(negateValue(value)), value), true);
    assert.equal(sameChargeValue(conflateValue(conflateValue(value)), value), true);
  }), propertyOptions);
});

test("natural arithmetic agrees with bounded counting semantics", () => {
  fc.assert(fc.property(natural, natural, (left, right) => {
    assert.equal(toCount(natAdd(left, right)), toCount(left) + toCount(right));
    assert.equal(toCount(natMultiply(left, right)), toCount(left) * toCount(right));
    assert.equal(natEqual(natAdd(left, right), natAdd(right, left)), true);
    assert.equal(natEqual(natMultiply(left, right), natMultiply(right, left)), true);
  }), propertyOptions);
});

test("integer arithmetic agrees with bounded JavaScript integers", () => {
  fc.assert(fc.property(integer, integer, (left, right) => {
    assert.equal(intEqual(intAdd(left, right), fromInt(toInt(left) + toInt(right))), true);
    assert.equal(intEqual(intSubtract(left, right), fromInt(toInt(left) - toInt(right))), true);
    assert.equal(intEqual(intMultiply(left, right), fromInt(toInt(left) * toInt(right))), true);
    assert.equal(intEqual(intAdd(left, intNegate(left)), fromInt(0)), true);
    assert.equal(intEqual(intAdd(left, right), intAdd(right, left)), true);
  }), propertyOptions);
});

test("rational arithmetic preserves canonical numeric readings in bounded examples", () => {
  fc.assert(fc.property(rational, rational, (left, right) => {
    assert.equal(ratEqual(ratAdd(left, right), ratAdd(right, left)), true);
    assert.equal(ratEqual(ratMultiply(left, right), ratMultiply(right, left)), true);
    assert.equal(ratEqual(ratSubtract(left, left), fromRatio(0, 1)), true);
  }), propertyOptions);
});

test("matrix transpose is involutive and identity multiplication is neutral", () => {
  fc.assert(fc.property(squareMatrix, (matrix) => {
    const size = matrix.length;
    const identity = Object.freeze(Array.from({ length: size }, (_, row) =>
      Object.freeze(Array.from({ length: size }, (_, column) => fromInt(row === column ? 1 : 0)))));

    assert.equal(matEqual(matTranspose(matTranspose(matrix)), matrix), true);
    assert.equal(matEqual(matmul(matrix, identity), matrix), true);
    assert.equal(matEqual(matmul(identity, matrix), matrix), true);
  }), propertyOptions);
});

const subjectArb = fc.constantFrom("socrates", "plato", "diogenes");
const predicateArb = fc.constantFrom("speaks", "errs");
const utteranceArb: fc.Arbitrary<UtteranceCarrier> = fc.oneof(
  fc.record({ s: subjectArb, p: predicateArb }).map(({ s, p }) =>
    utterance(mark(s), mark(p))),
  fc.record({ s: subjectArb, p: predicateArb, o: fc.constantFrom("truth", "wisdom") }).map(({ s, p, o }) =>
    utterance(mark({ subject: s, object: o }), mark(p))),
  fc.record({ special: subjectArb, general: fc.constantFrom("human", "animal") }).map(({ special, general }) =>
    utterance(mark({ subject: special, object: general }), mark("specializes"))),
);

test("extension and re-induction agree: evidence is monotone", () => {
  fc.assert(fc.property(
    fc.array(utteranceArb, { maxLength: 3 }),
    fc.array(utteranceArb, { maxLength: 2 }),
    (a, b) => {
      assert.equal(sameMemeTopology(extend(induce(a), b), induce([...a, ...b])), true);
    },
  ), Object.freeze({ numRuns: Math.min(propertyRuns, 8) }));
});
