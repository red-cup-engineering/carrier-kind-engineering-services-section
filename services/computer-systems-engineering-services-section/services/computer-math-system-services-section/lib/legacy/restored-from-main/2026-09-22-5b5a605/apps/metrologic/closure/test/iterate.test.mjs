// iterate — tests for the transfinite iteration morphism itself: `approx` (the fold of Φ over an
// ordinal notation), `orbit` (the lazy ω-part as an iterator), and `stabilizingSup` (a default `sup` for
// lattices whose ω-chains eventually stabilize).
//
// Witnessed against `reachability` (closure/src/lattices.mjs's finite-regime closure: Φ grows a seed set
// to its reachable set in a finite directed graph) and `omegaPlusOne` (its one-non-Scott-continuous-firing
// closure, κ = ω+1) — the same witnesses closure.test.mjs uses for the regime-level checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { zero, succ, fin, OMEGA, show } from "../src/ordinal.mjs";
import { approx, orbit, stabilizingSup } from "../src/iterate.mjs";
import { reachability, omegaPlusOne } from "../src/lattices.mjs";

test("approx: F(0) = ⊥", () => {
  const { lattice, phi } = reachability(4, [[0, 1], [1, 2]], [0]);
  assert.deepEqual(approx(lattice, phi, zero()), lattice.bottom);
});

test("approx: F(α+1) = Φ(F(α)) — one step at a time matches the graph's own reachability growth", () => {
  const { lattice, phi } = reachability(5, [[0, 1], [1, 2], [2, 3]], [0]);
  assert.deepEqual(approx(lattice, phi, fin(1)), phi(lattice.bottom));
  assert.deepEqual(approx(lattice, phi, fin(2)), phi(phi(lattice.bottom)));
  assert.deepEqual(approx(lattice, phi, fin(3)), [0, 1, 2, 3]);
});

test("approx: F(α) stabilizes past the point the finite closure reaches its fixed point", () => {
  const { lattice, phi } = reachability(5, [[0, 1], [1, 2], [2, 3]], [0]);
  const atFix = approx(lattice, phi, fin(3));
  const beyond = approx(lattice, phi, fin(20));
  assert.deepEqual(atFix, beyond);
});

test("approx: F(ω) = the sup of the ω-chain, computed via L.sup over the fundamental sequence", () => {
  const { lattice, phi } = reachability(5, [[0, 1], [1, 2], [2, 3]], [0]);
  assert.deepEqual(approx(lattice, phi, OMEGA), [0, 1, 2, 3]);
});

test("approx: for the one-NSC-firing witness, F(ω) is the ω-part alone; F(ω+1) fires the limit point", () => {
  const { lattice, phi } = omegaPlusOne();
  const atOmega = approx(lattice, phi, OMEGA);
  const atOmegaPlus1 = approx(lattice, phi, succ(OMEGA));
  assert.equal(atOmega.tag, "nats"); // ℕ, not yet ⋆
  assert.equal(atOmegaPlus1.tag, "all"); // ℕ ∪ {⋆} — the non-Scott-continuous firing
});

test("approx: memoizes by the ordinal's canonical name — a shared memo avoids recomputation", () => {
  const { lattice, phi } = reachability(4, [[0, 1], [1, 2]], [0]);
  const memo = new Map();
  const a = approx(lattice, phi, fin(2), memo);
  assert.ok(memo.has(show(fin(2))));
  const b = approx(lattice, phi, fin(2), memo); // second call reads the memo, same object identity
  assert.equal(a, b);
});

test("orbit: F(0), F(1), F(2), … as a lazy iterator, matching approx at each finite stage", () => {
  const { lattice, phi } = reachability(5, [[0, 1], [1, 2], [2, 3]], [0]);
  const seen = [];
  for (const { stage, value } of orbit(lattice, phi)) {
    seen.push(value);
    if (stage === 4) break;
  }
  assert.equal(seen.length, 5);
  for (let n = 0; n < seen.length; n++) assert.deepEqual(seen[n], approx(lattice, phi, fin(n)));
});

test("orbit: keeps yielding past stabilization (it is not itself a fixed-point search)", () => {
  const { lattice, phi } = reachability(3, [[0, 1]], [0]);
  const stages = [];
  for (const { stage, value } of orbit(lattice, phi)) {
    stages.push(value);
    if (stage === 6) break;
  }
  // stabilizes at stage 1 ([0,1]); orbit keeps producing that same value forever after, on request
  assert.deepEqual(stages[1], [0, 1]);
  assert.deepEqual(stages[6], [0, 1]);
});

test("stabilizingSup: returns the first repeated value once a directed ω-chain stabilizes", () => {
  const eqArr = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const L = { eq: eqArr };
  const chain = [[], [1], [1, 2], [1, 2], [1, 2]]; // stabilizes at index 2
  const sup = stabilizingSup(L)((n) => chain[Math.min(n, chain.length - 1)]);
  assert.deepEqual(sup, [1, 2]);
});

test("stabilizingSup: waits for an actual repeat — a chain that stabilizes only after many distinct terms", () => {
  // stabilizingSup(L) is a synchronous, unbounded search for the first n with seqFn(n) == seqFn(n-1); it
  // is documented (iterate.mjs) to run forever on a chain that never repeats — that non-termination IS
  // the honest content for a genuinely aperiodic closure (see closure.test.mjs's `tower()` witness, which
  // supplies its OWN bounded `sup` for exactly this reason, rather than using this default). We cannot
  // safely invoke stabilizingSup on a never-stabilizing chain inside a test (it would hang the process,
  // not fail it) — so what we CAN prove here is that it does not stop early: on a chain of 200 strictly
  // distinct terms that finally repeats at n=200, it returns exactly that value, never a premature one.
  const L = { eq: (a, b) => a === b };
  const chain = (n) => (n < 200 ? n : 200); // 0,1,2,…,199,200,200,200,… — first repeat at n=200
  const sup = stabilizingSup(L)(chain);
  assert.equal(sup, 200);
});
