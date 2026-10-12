// closure.mjs — the closure ordinal κ as a morphism, and the regime it determines.
//
// The CLOSURE ORDINAL of (L, Φ) is the least α with F(α+1) = F(α): the stage at which the iteration
// reaches its least fixed point, lfp(Φ). `closureOrdinal` is the morphism that finds it — walking the
// ordinals 0, 1, 2, …, ω, ω+1, …, ω·2, … and testing idempotence at each.
//
// It is HONEST about the boundary. A search to a notation bound either returns κ (with its regime) or
// reports that no fixed point was found below the bound — which, when the closure really is aperiodic
// (κ ≥ ω₁, an ordinal with no countable notation), is what *must* happen: there is no κ to return, and an
// unbounded search would never halt. We do not pretend to decide the undecidable; we expose exactly where
// the iteration would run forever, and let the caller choose how far to look.
//
// REGIME, read off κ — the four-regime dichotomy as a property of where the closure stabilizes:
//   strict               κ < ω         finite
//   scott                κ = ω         Scott-continuous (the ω-limit is already fixed)
//   transfinite-bounded  ω < κ < ω₁    a non-Scott-continuous firing pushes κ past ω, but it is still countable
//   aperiodic            κ ≥ ω₁        no countable κ — the search never finds one (witnessed, not asserted)

import { zero, succ, fin, omegaTimes, OMEGA_SQ, plusFin, show, toFinite } from "./ordinal.mjs";
import { approx } from "./iterate.mjs";
import { closureRegimeName } from "../articulation/predicating/positing/settling/closure.mjs";
import { classifyRegime } from "../articulation/predicating/positing/settling/value-category.mjs";

/** The regime named by a closure ordinal κ (or by its absence), by its Obsmetrologia name. Classified by
 *  the SHAPE of κ, not its name: a finite κ is a finite base, κ = ω is Scott-continuous, any κ found is
 *  countable, and no κ found reads aperiodic (`classifyRegime`). */
export function regimeOfOrdinal(kappa) {
  const finite = kappa !== null && toFinite(kappa) < Infinity; // κ < ω
  // κ = ω iff it is a limit whose fundamental sequence is the finite ordinals.
  const omega = kappa !== null && kappa.kind === "limit" && toFinite(kappa.seq(2)) < Infinity;
  return closureRegimeName(classifyRegime({ finiteBase: finite, scottContinuous: finite || omega, countableCofinality: kappa !== null }));
}

/**
 * The closure ordinal κ of (L, Φ): the least α (in canonical order) with F(α+1) = F(α). Searches the
 * finite ordinals, then ω-blocks ω·k + i, up to ω·`limits` (and ω²). Returns `{ kappa, value, regime }`
 * with the least fixed point `value = F(κ)`; or `{ kappa: null, … , regime: "aperiodic" }` if none is
 * found within the bound (the closure has not stabilized by any searched ordinal — provisionally, or
 * genuinely, aperiodic).
 * @param {object} L a lattice @param {(x:any)=>any} phi a monotone inflationary operator
 * @param {{ finite?: number, limits?: number }} [opts]
 */
export function closureOrdinal(L, phi, { finite = 64, limits = 4 } = {}) {
  const memo = new Map();
  const at = (a) => approx(L, phi, a, memo);
  const fixedAt = (a) => L.eq(at(succ(a)), at(a)); // F(α+1) = F(α)

  // Each block is scanned for only `finite` successor steps, so the ordinals between
  // `base + finite` and the next block are never tested. Once such a gap has been passed, a later
  // ordinal found fixed is an upper bound on κ and not necessarily the least one: F is already
  // fixed by then, so the test succeeds wherever it is next applied. The gap is infinite and
  // cannot be searched, so leastness cannot be recovered by looking harder — but claiming it
  // regardless would be the one thing this morphism is built not to do. `least` reports it.
  let skippedGap = false;
  const found = (kappa) => ({ kappa, value: at(kappa), regime: regimeOfOrdinal(kappa), least: !skippedGap });

  // the ordinals to test, in order: 0,1,…  then ω,ω+1,…  then ω·2,…  …up to ω·limits, then ω².
  const blocks = [zero(), ...Array.from({ length: limits }, (_, k) => omegaTimes(k + 1))];
  for (const base of blocks) {
    if (base.kind === "limit") {
      if (fixedAt(base)) return found(base);
      // F is not fixed at this boundary, so κ lies strictly above it and no ordinal below it was
      // κ after all. That clears every gap skipped so far.
      skippedGap = false;
    }
    for (let i = 0; i < finite; i++) {
      const a = base.kind === "zero" ? fin(i) : plusFin(base, i);
      if (fixedAt(a)) return found(a);
    }
    skippedGap = true; // this block ran out before fixing; everything past it is untested
  }
  if (fixedAt(OMEGA_SQ)) return found(OMEGA_SQ);
  return { kappa: null, value: at(omegaTimes(limits + 1)), regime: regimeOfOrdinal(null), least: false };
}

/** The least fixed point lfp(Φ) = F(κ), or the best approximant found if the closure is (provisionally) aperiodic. */
export const leastFixedPoint = (L, phi, opts) => closureOrdinal(L, phi, opts).value;
