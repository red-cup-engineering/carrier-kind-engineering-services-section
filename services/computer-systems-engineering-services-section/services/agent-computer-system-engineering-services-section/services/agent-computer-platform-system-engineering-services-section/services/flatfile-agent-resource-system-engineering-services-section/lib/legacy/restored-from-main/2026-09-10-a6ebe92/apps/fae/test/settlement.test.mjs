import assert from "node:assert/strict";
import test from "node:test";
import { four } from "../src/kernel/four.mjs";
import {
  CellSettlement,
  SettlingMonotonicityViolation,
  assertSettlingMonotone,
  guardSettlingMonotone,
  mergeAllSettlings,
  mergeSettling,
  orbitMonotone,
  settle,
} from "../src/kernel/settlement.mjs";
import { makeWitness } from "../src/kernel/witness.mjs";

const NEITHER = four(false, false);
const TRUE = four(true, false);
const FALSE = four(false, true);
const BOTH = four(true, true);

test("mergeSettling is the pointwise knowledge-join, missing keys default to neither", () => {
  const merged = mergeSettling({ a: TRUE }, { a: FALSE, b: TRUE });
  assert.deepEqual(merged, { a: BOTH, b: TRUE });
});

test("mergeSettling is commutative, associative, and idempotent", () => {
  const a = { x: TRUE, y: NEITHER };
  const b = { x: NEITHER, y: FALSE };
  const c = { y: TRUE, z: FALSE };
  assert.deepEqual(mergeSettling(a, b), mergeSettling(b, a));
  assert.deepEqual(
    mergeSettling(mergeSettling(a, b), c),
    mergeSettling(a, mergeSettling(b, c)),
  );
  assert.deepEqual(mergeSettling(a, a), a);
});

test("mergeAllSettlings folds mergeSettling over many settlings, {} is the unit", () => {
  assert.deepEqual(mergeAllSettlings([]), {});
  assert.deepEqual(
    mergeAllSettlings([{ a: TRUE }, {}, { a: FALSE, b: TRUE }]),
    { a: BOTH, b: TRUE },
  );
});

test("settle iterates a knowledge-monotone inflationary step to its fixed point", () => {
  const step = (state) => ({ ...state, a: TRUE });
  const { state, iterations } = settle(step, { a: NEITHER });
  assert.deepEqual(state, { a: TRUE });
  assert.ok(iterations >= 0);
});

test("settle throws when the step never converges within maxIter", () => {
  let n = 0;
  const step = (state) => {
    n += 1;
    return { ...state, [`k${n}`]: TRUE };
  };
  assert.throws(() => settle(step, {}, { maxIter: 5 }), /did not converge/);
});

test("orbitMonotone accepts a non-decreasing sequence and rejects a backward move", () => {
  assert.equal(orbitMonotone([NEITHER, TRUE, BOTH]), true);
  assert.equal(orbitMonotone([NEITHER, TRUE, TRUE]), true);
  assert.equal(orbitMonotone([TRUE, NEITHER]), false);
  assert.equal(orbitMonotone([BOTH, TRUE]), false);
});

test("assertSettlingMonotone raises SettlingMonotonicityViolation on a backward move", () => {
  assert.throws(
    () => assertSettlingMonotone([TRUE, NEITHER], { target: "concepts/alpha.md" }),
    (err) => err instanceof SettlingMonotonicityViolation && err.code === "settling-monotonicity-violation",
  );
});

test("assertSettlingMonotone is silent on a non-decreasing orbit", () => {
  assert.doesNotThrow(() => assertSettlingMonotone([NEITHER, TRUE, BOTH]));
});

test("guardSettlingMonotone is silent when after dominates before, throws otherwise", () => {
  assert.doesNotThrow(() => guardSettlingMonotone(NEITHER, TRUE, { cell: "concepts/alpha.md" }));
  assert.throws(
    () => guardSettlingMonotone(TRUE, NEITHER, { cell: "concepts/alpha.md" }),
    (err) => err instanceof SettlingMonotonicityViolation,
  );
});

test("CellSettlement.valueOf defaults an unwritten cell to NEITHER", () => {
  const settlement = new CellSettlement();
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), NEITHER);
});

test("CellSettlement.write advances a cell's knowledge state and remembers it", () => {
  const settlement = new CellSettlement();
  settlement.write("concepts/alpha.md", TRUE);
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), TRUE);
  settlement.write("concepts/alpha.md", BOTH);
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), BOTH);
});

test("CellSettlement.write refuses a backward move and leaves the cell's state unchanged", () => {
  const settlement = new CellSettlement();
  settlement.write("concepts/alpha.md", BOTH);
  assert.throws(
    () => settlement.write("concepts/alpha.md", TRUE),
    (err) => err instanceof SettlingMonotonicityViolation,
  );
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), BOTH);
});

test("CellSettlement tracks cells independently of one another", () => {
  const settlement = new CellSettlement();
  settlement.write("concepts/alpha.md", TRUE);
  settlement.write("concepts/beta.md", FALSE);
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), TRUE);
  assert.deepEqual(settlement.valueOf("concepts/beta.md"), FALSE);
});

test("makeWitness accepts a legal transition with no settlement given", () => {
  const witness = makeWitness({
    operator: "fm_add",
    target: "concepts/alpha.md",
    before_digest: null,
    after_digest: "sha256:" + "a".repeat(64),
    details: {},
    agent: "morgan",
    timestamp: "2026-08-19T00:00:00Z",
    kind: "mutation",
    four_before: [false, false],
    four_after: [true, false],
    channel: "substrate",
  });
  assert.equal(witness.four_before[0], false);
  assert.equal(witness.four_after[0], true);
});

test("makeWitness records its write on the given settlement and accepts a subsequent forward move", () => {
  const settlement = new CellSettlement();
  makeWitness({
    operator: "fm_add",
    target: "concepts/alpha.md",
    before_digest: null,
    after_digest: "sha256:" + "a".repeat(64),
    details: {},
    agent: "morgan",
    timestamp: "2026-08-19T00:00:00Z",
    kind: "mutation",
    four_before: [false, false],
    four_after: [true, false],
    channel: "substrate",
    settlement,
  });
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), TRUE);

  const witness = makeWitness({
    operator: "fm_add",
    target: "concepts/alpha.md",
    before_digest: null,
    after_digest: "sha256:" + "b".repeat(64),
    details: {},
    agent: "morgan",
    timestamp: "2026-08-19T00:01:00Z",
    kind: "mutation",
    four_before: [true, false],
    four_after: [true, true],
    channel: "substrate",
    settlement,
  });
  assert.deepEqual(witness.four_after, [true, true]);
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), BOTH);
});

test("makeWitness hard-errors when the settlement's own tracked state would move backward", () => {
  const settlement = new CellSettlement();
  settlement.write("concepts/alpha.md", TRUE);
  assert.throws(
    () =>
      makeWitness({
        operator: "fm_remove",
        target: "concepts/alpha.md",
        before_digest: null,
        after_digest: null,
        details: {},
        agent: "morgan",
        timestamp: "2026-08-19T00:02:00Z",
        kind: "mutation",
        four_before: [false, false],
        four_after: [false, true],
        channel: "substrate",
        settlement,
      }),
    (err) => err instanceof SettlingMonotonicityViolation,
  );
});

test("makeWitness's settling-monotonicity gate is judged against settlement, not the witness's own self-reported four_before", () => {
  // The claimed four_before/four_after here is a perfectly legal Register B
  // cover transition (NEITHER -> TRUE) on its own — witnessBit alone would
  // accept it. But the settlement already has this cell settled at BOTH,
  // so writing back down to TRUE is a backward move the dedicated gate
  // must catch independently.
  const settlement = new CellSettlement();
  settlement.write("concepts/alpha.md", BOTH);
  let threw = null;
  try {
    makeWitness({
      operator: "fm_remove",
      target: "concepts/alpha.md",
      before_digest: null,
      after_digest: null,
      details: {},
      agent: "morgan",
      timestamp: "2026-08-19T00:03:00Z",
      kind: "mutation",
      four_before: [false, false],
      four_after: [true, false],
      channel: "substrate",
      settlement,
    });
  } catch (err) {
    threw = err;
  }
  assert.ok(threw instanceof SettlingMonotonicityViolation);
  assert.deepEqual(settlement.valueOf("concepts/alpha.md"), BOTH);
});
