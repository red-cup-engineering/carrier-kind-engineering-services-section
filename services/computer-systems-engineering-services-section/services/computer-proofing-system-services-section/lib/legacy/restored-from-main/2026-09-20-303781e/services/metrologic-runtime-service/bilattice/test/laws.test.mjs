// laws — property tests for the bilattice value-ops, on RANDOM charges run through the real morphisms. These
// assert algebraic LAWS that must hold for every input (lattice axioms, involutions, the σ-conjugation, evidence
// monotonicity) — not hand-built inputs forcing a chosen output. Each check runs many random trials and passes
// only if the law holds on all of them.
//
// Ported from @561/development.active.math-kernel's tests/laws.mjs (25 checks), retargeted at
// @lenticule-science/metrologic/bilattice's named exports (../src/charge.mjs) instead of the kernel's one-morphism-per-file
// scripts/, and reshaped from the kernel's `check(name, pass)` accumulator into discrete node:test cases so
// `node --test` reports each law on its own line. The math is unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  joinKnowledge as joinK,
  meetKnowledge as meetK,
  joinTruth as joinT,
  meetTruth as meetT,
  negate,
  conflate,
  aggregate,
} from "../src/charge.mjs";
import { witness } from "./_construct-utterance.mjs";
import { randomBytes } from "node:crypto";

const N = 80;
const V = (c) => `${+c.value[0]}${+c.value[1]}`; // the FOUR value, as a 2-bit string
const rbool = () => (randomBytes(1)[0] & 1) === 1;
// a random charge: random value bits, each present side witnessed by a real (random) witness.
const rand = () => {
  const p = rbool(), n = rbool();
  return { value: [p, n], evidence: [p ? [witness()] : [], n ? [witness()] : []] };
};
const times = (n, f) => { for (let i = 0; i < n; i++) f(); };
const J = (op) => (a, b) => op({ left: a, right: b });
const jk = J(joinK), mk = J(meetK), jt = J(joinT), mt = J(meetT);
const sigma = (c) => ({ value: [c.value[0], !c.value[1]], evidence: c.evidence }); // the order-swap (flip the neg side)

const ops = [["joinK", jk], ["meetK", mk], ["joinT", jt], ["meetT", mt]];

for (const [nm, op] of ops) {
  test(`law: ${nm} commutative (value)`, () => {
    times(N, () => { const a = rand(), b = rand(); assert.equal(V(op(a, b)), V(op(b, a))); });
  });
  test(`law: ${nm} associative (value)`, () => {
    times(N, () => { const a = rand(), b = rand(), c = rand(); assert.equal(V(op(op(a, b), c)), V(op(a, op(b, c)))); });
  });
  test(`law: ${nm} idempotent (value)`, () => {
    times(N, () => { const a = rand(); assert.equal(V(op(a, a)), V(a)); });
  });
}

test("law: knowledge absorption joinK(a, meetK(a,b)) = a (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(jk(a, mk(a, b))), V(a)); });
});
test("law: truth absorption joinT(a, meetT(a,b)) = a (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(jt(a, mt(a, b))), V(a)); });
});

test("law: negate is an involution", () => {
  times(N, () => { const a = rand(); assert.equal(V(negate(negate(a))), V(a)); });
});
test("law: conflate is an involution (value)", () => {
  times(N, () => { const a = rand(); assert.equal(V(conflate(conflate(a))), V(a)); });
});
test("law: negate & conflate commute (Klein four)", () => {
  times(N, () => { const a = rand(); assert.equal(V(negate(conflate(a))), V(conflate(negate(a)))); });
});
test("law: conflate reverses ≤_k — swaps absurd↔stable, fixes potential/active", () => {
  times(N, () => {
    const a = rand(), c = conflate(a);
    const want = [!a.value[1], !a.value[0]];
    assert.equal(V(c), `${+want[0]}${+want[1]}`);
  });
});

test("law: joinT = σ∘joinK∘σ (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(jt(a, b)), V(sigma(jk(sigma(a), sigma(b))))); });
});
test("law: meetT = σ∘meetK∘σ (value)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(mt(a, b)), V(sigma(mk(sigma(a), sigma(b))))); });
});

for (const [nm, op] of ops) {
  test(`law: ${nm} accumulates evidence (never shrinks either side)`, () => {
    times(N, () => {
      const a = rand(), b = rand(), r = op(a, b);
      assert.ok([0, 1].every((i) => r.evidence[i].length >= a.evidence[i].length && r.evidence[i].length >= b.evidence[i].length));
    });
  });
}
test("law: aggregate equals joinK on the value (lossless join)", () => {
  times(N, () => { const a = rand(), b = rand(); assert.equal(V(aggregate({ left: a, right: b })), V(jk(a, b))); });
});
