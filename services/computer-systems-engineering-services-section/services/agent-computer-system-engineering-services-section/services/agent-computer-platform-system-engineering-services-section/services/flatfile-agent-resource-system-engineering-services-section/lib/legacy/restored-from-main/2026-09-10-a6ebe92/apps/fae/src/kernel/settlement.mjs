import { four, joinKnowledge } from "./four.mjs";

// sigma_t — the knowledge-join settling algebra, over four.mjs's FOUR
// values rather than a generic bilattice: a settling is a finite
// assignment index -> Four (one section of one fiber). Merging two
// settlings is the pointwise knowledge-join; merge is therefore a
// semilattice (commutative, associative, idempotent), and any
// knowledge-monotone, inflationary step on a bounded fiber reaches a
// least fixed point — the settled state.

function eqFour(a, b) {
  return a.positiveEvidence === b.positiveEvidence && a.negativeEvidence === b.negativeEvidence;
}

// a <=_k b iff joining a into b changes nothing — b already knows
// everything a knows.
function leqK(a, b) {
  return eqFour(joinKnowledge(a, b), b);
}

export class SettlingMonotonicityViolation extends Error {
  constructor(message) {
    super(message);
    this.name = "SettlingMonotonicityViolation";
    this.code = "settling-monotonicity-violation";
  }
}

// Pointwise knowledge-join of two settlings. A missing key defaults to
// {false,false} (nothing known), so this is the join in the semilattice
// of settlings ordered cellwise by <=_k.
export function mergeSettling(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = {};
  for (const key of keys) {
    out[key] = joinKnowledge(a[key] ?? four(false, false), b[key] ?? four(false, false));
  }
  return out;
}

// Fold mergeSettling over many settlings ({} is the unit).
export function mergeAllSettlings(settlings) {
  let acc = {};
  for (const settling of settlings) acc = mergeSettling(acc, settling);
  return acc;
}

function settlingEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => key in b && eqFour(a[key], b[key]));
}

// Iterate step from start to a <=_k fixed point. step must be
// knowledge-monotone and inflationary (x <=_k step(x)); on a bounded
// fiber the orbit is then increasing and bounded, so it converges.
// Returns { state, iterations }. Throws if maxIter is hit without
// convergence — a sign step is not inflationary, or the fiber unbounded.
export function settle(step, start, { maxIter = 100_000 } = {}) {
  let state = { ...start };
  for (let i = 0; i < maxIter; i += 1) {
    const next = step(state);
    const merged = mergeSettling(state, next);
    if (settlingEqual(state, merged)) return { state: merged, iterations: i };
    state = merged;
  }
  throw new Error(
    `settling did not converge in ${maxIter} iterations; check that step is knowledge-monotone and inflationary`,
  );
}

// The settling-monotonicity gate: mirrors
// settling_monotonicity_quiescence's orbit_monotone check — m <= n implies
// orbit[m] <=_k orbit[n] over the given finite sequence of Four states. A
// dedicated, purpose-built check, not merely an implicit byproduct of
// settle()'s convergence behavior: it holds on any orbit handed to it,
// whether or not that orbit came from settle() at all.
export function orbitMonotone(orbit) {
  for (let i = 0; i < orbit.length; i += 1) {
    for (let j = i; j < orbit.length; j += 1) {
      if (!leqK(orbit[i], orbit[j])) return false;
    }
  }
  return true;
}

// Hard-abort gate: raises SettlingMonotonicityViolation on the first
// backward knowledge-order movement found in orbit. Nothing about the
// caller's in-flight construction survives the throw.
export function assertSettlingMonotone(orbit, { target } = {}) {
  if (!orbitMonotone(orbit)) {
    const where = target ? ` for ${target}` : "";
    throw new SettlingMonotonicityViolation(
      `settling-monotonicity-violation${where}: knowledge order moved backward`,
    );
  }
}

// The single-step form of the gate: does after dominate before? Mirrors
// kernel/settlement.py's guard_settling_monotone, judged the same way —
// as a two-point orbit through assertSettlingMonotone — over a named cell.
export function guardSettlingMonotone(before, after, { cell = "" } = {}) {
  assertSettlingMonotone([before, after], { target: cell });
}

// Per-cell committed knowledge state, tracked independently of any single
// witness's self-reported four_before — the actual accumulated state the
// dedicated gate judges a proposed write against. Every successful write
// only ever advances (or holds) a cell's knowledge order; a write that
// would not is refused before it is recorded here, and before the
// caller's own event-log append.
export class CellSettlement {
  #state = new Map();

  valueOf(cell) {
    return this.#state.get(cell) ?? four(false, false);
  }

  write(cell, after) {
    const before = this.valueOf(cell);
    guardSettlingMonotone(before, after, { cell });
    this.#state.set(cell, after);
    return after;
  }
}
