// closure — tests for the closure ordinal κ as a morphism (closureOrdinal, leastFixedPoint,
// regimeOfOrdinal), witnessed against the three regime-typed (lattice, phi) pairs lattices.mjs builds
// on purpose: `reachability` (finite, κ < ω), `omegaPlusOne` (transfinite, κ = ω+1 — one non-Scott-
// continuous firing), and `tower` (aperiodic — no countable κ, the search never finds one).
//
// These are exactly Obsmetrologia/Closure/Regime.lean's four `ClosureRegime` strata (strict / scott /
// transfiniteBounded / aperiodic) and Obsmetrologia/Closure/Ordinal.lean's `regimeOfOrd`, read off here
// on the JS side by the SHAPE of the returned ordinal notation, not by any asserted label.
//
// A real defect is documented and demonstrated below, not silently patched: with a small `finite` search
// budget, `closureOrdinal` can OVERSHOOT the true least κ (see BUG block near the bottom).
import { test } from "node:test";
import assert from "node:assert/strict";
import { closureOrdinal, leastFixedPoint, regimeOfOrdinal } from "../src/closure.mjs";
import { zero, fin, succ, OMEGA, omegaTimes, show } from "../src/ordinal.mjs";
import { approx } from "../src/iterate.mjs";
import { reachability, omegaPlusOne, tower } from "../src/lattices.mjs";

// ── regimeOfOrdinal: the four-way classification, read off the ordinal's SHAPE ─────────────────────

test("regimeOfOrdinal: null (no countable fixed point found) is always aperiodic", () => {
  assert.equal(regimeOfOrdinal(null), "aperiodic");
});

test("regimeOfOrdinal: any finite ordinal is 'finite' (strict, κ < ω)", () => {
  assert.equal(regimeOfOrdinal(zero()), "finite");
  assert.equal(regimeOfOrdinal(fin(0)), "finite");
  assert.equal(regimeOfOrdinal(fin(17)), "finite");
});

test("regimeOfOrdinal: exactly ω (a limit whose fundamental sequence is the finite ordinals) is 'scott'", () => {
  assert.equal(regimeOfOrdinal(OMEGA), "scott");
});

test("regimeOfOrdinal: ω+1, ω·2, ω² are all 'transfinite' — anything strictly between ω and ω₁ that isn't ω itself", () => {
  assert.equal(regimeOfOrdinal(succ(OMEGA)), "transfinite");
  assert.equal(regimeOfOrdinal(omegaTimes(2)), "transfinite");
  assert.equal(regimeOfOrdinal(omegaTimes(5)), "transfinite");
});

// ── closureOrdinal / leastFixedPoint: the three regime witnesses ───────────────────────────────────

test("closureOrdinal: finite regime — reachability's κ is the graph's own diameter-bound", () => {
  const { lattice, phi } = reachability(6, [[0, 1], [1, 2], [2, 3], [3, 4]], [0]);
  const r = closureOrdinal(lattice, phi);
  assert.equal(r.regime, "finite");
  assert.equal(show(r.kappa), "4");
  assert.deepEqual(r.value, [0, 1, 2, 3, 4]);
});

test("closureOrdinal: finite regime — an already-closed seed has κ = 0", () => {
  const { lattice, phi } = reachability(3, [[0, 1]], [0, 1, 2]); // seed already includes every reachable vertex
  const r = closureOrdinal(lattice, phi);
  assert.equal(r.regime, "finite");
  assert.equal(show(r.kappa), "0");
});

test("closureOrdinal: transfinite regime — omegaPlusOne's κ is exactly ω+1, not ω", () => {
  const { lattice, phi } = omegaPlusOne();
  const r = closureOrdinal(lattice, phi);
  assert.equal(r.regime, "transfinite");
  assert.equal(show(r.kappa), "ω+1");
  assert.equal(r.value.tag, "all");
});

test("closureOrdinal: transfinite regime — F(ω) alone is NOT yet fixed (the whole point of the witness)", () => {
  const { lattice, phi } = omegaPlusOne();
  // if κ were merely ω the closure would already be scott-regime; confirm F(ω+1) ≠ F(ω)
  const atOmega = approx(lattice, phi, OMEGA);
  const atOmegaPlus1 = approx(lattice, phi, succ(OMEGA));
  assert.notDeepEqual(atOmega, atOmegaPlus1);
  assert.equal(atOmega.tag, "nats");
  assert.equal(atOmegaPlus1.tag, "all");
});

// ── the honest aperiodic proof: closureOrdinal returns kappa: null, never a fabricated κ ───────────

test("closureOrdinal: aperiodic regime — tower() never stabilizes below ω₁; the search reports kappa: null, not a fabricated ordinal", () => {
  const { lattice, phi } = tower();
  const r = closureOrdinal(lattice, phi, { limits: 2 }); // a small, deliberately-bounded search
  assert.equal(r.kappa, null);
  assert.equal(r.regime, "aperiodic");
  // `value` is still the best finite approximant reached — never asserted as the least fixed point
  assert.ok(r.value && typeof r.value === "object");
});

test("closureOrdinal: aperiodic — a larger search budget reaches a strictly later, still-unfixed block, never a fabricated stop", () => {
  // if the search were secretly giving up early rather than actually probing further, widening `limits`
  // would not change how far it got. It does: the reported best-approximant's own block number strictly
  // increases with the search budget, and it is STILL not a fixed point (still kappa: null) — real
  // exploration, not a canned non-answer.
  const { lattice, phi } = tower();
  const shallow = closureOrdinal(lattice, phi, { limits: 1 });
  const deeper = closureOrdinal(lattice, phi, { limits: 3 });
  assert.equal(shallow.kappa, null);
  assert.equal(deeper.kappa, null);
  assert.ok(deeper.value.block > shallow.value.block, "a wider search genuinely reaches further, unfixed, blocks");
});

test("leastFixedPoint: equals closureOrdinal(...).value for a finite-regime witness", () => {
  const { lattice, phi } = reachability(5, [[0, 1], [1, 2]], [0]);
  assert.deepEqual(leastFixedPoint(lattice, phi), closureOrdinal(lattice, phi).value);
});

test("leastFixedPoint: on the aperiodic witness returns the best approximant, not a real least fixed point", () => {
  const { lattice, phi } = tower();
  const lfp = leastFixedPoint(lattice, phi, { limits: 2 });
  const r = closureOrdinal(lattice, phi, { limits: 2 });
  assert.deepEqual(lfp, r.value);
  assert.equal(r.kappa, null); // — so `lfp` here is honestly NOT lfp(Φ); no κ exists to name it by
});

// ── BUG: closureOrdinal can overshoot the true least κ when `finite` is smaller than the true κ's ─────
// distance past a limit — it returns a strictly LARGER, non-least ordinal as `kappa` ─────────────────
//
// closure.mjs's own doc: "The closure ordinal κ of (L, Φ): the LEAST α (in canonical order) with
// F(α+1) = F(α)." The search tests 0..finite-1 successor steps PAST each block (0, ω, ω·2, …, ω·limits),
// then jumps to the next block. Nothing between `block + finite` and the next block is ever tested. If
// the true κ falls in that untested gap, the search skips past it, and the NEXT block's boundary test
// (`fixedAt(nextBlock)`) succeeds instead — because F is already fixed by then — and reports that later,
// larger ordinal as κ. `omegaPlusOne`'s true κ is ω+1 (one successor past ω); with `finite: 0` the
// successor loop inside the ω-block never runs at all, and the search instead reports κ = ω·2.
test("closureOrdinal marks κ as not-least when the successor budget skipped past the true one", () => {
  const { lattice, phi } = omegaPlusOne();
  const trueLeast = closureOrdinal(lattice, phi); // default finite=64 — correctly finds ω+1
  assert.equal(show(trueLeast.kappa), "ω+1");

  const tooSmall = closureOrdinal(lattice, phi, { finite: 0, limits: 3 });
  assert.equal(show(tooSmall.kappa), "ω·2", "ω·2 is NOT the least α with F(α+1)=F(α)");
  assert.notEqual(show(tooSmall.kappa), show(trueLeast.kappa));
  // The gap between ω+finite and ω·2 is infinite and cannot be searched, so the overshoot itself
  // is not fixable — but it is reported rather than passed off as the least ordinal.
  assert.equal(tooSmall.least, false);
  assert.equal(trueLeast.least, true);
  // the regime label happens to survive here (ω+1 and ω·2 are both 'transfinite'), which is exactly why
  // this is easy to miss: the reported VALUE (fixed point) is still correct, but the reported ORDINAL κ
  // is not the least one — a caller relying on `kappa` itself (its exact ordinal shape, or comparing two
  // closures' κ for equality) gets a wrong answer, silently, with no error or warning.
  assert.equal(tooSmall.regime, trueLeast.regime);
  assert.deepEqual(tooSmall.value, trueLeast.value);
});

test("the same overshoot at finite: 1 is likewise reported rather than claimed as least", () => {
  const { lattice, phi } = omegaPlusOne();
  const r = closureOrdinal(lattice, phi, { finite: 1, limits: 3 });
  // finite:1 tests only ω+0 (the block boundary itself); ω+1 needs i=1, which is out of range for
  // `for (let i = 0; i < finite; i++)` when finite === 1 (i only takes the value 0).
  assert.equal(show(r.kappa), "ω·2");
  assert.equal(r.least, false);
});

test("a failed limit-boundary test clears the gap below it, so a later κ can still be least", () => {
  // finite:2 skips the finite ordinals from 2 up, but F is then found NOT fixed at ω, which proves
  // κ > ω and rules out everything skipped. ω+1 is reached contiguously from ω, so it is least.
  const { lattice, phi } = omegaPlusOne();
  const r = closureOrdinal(lattice, phi, { finite: 2, limits: 3 });
  assert.equal(show(r.kappa), "ω+1");
  assert.equal(r.least, true);
});

test("an aperiodic search reports no ordinal and claims no leastness", () => {
  const { lattice, phi } = tower();
  const r = closureOrdinal(lattice, phi, { finite: 4, limits: 2 });
  assert.equal(r.kappa, null);
  assert.equal(r.regime, "aperiodic");
  assert.equal(r.least, false);
});
