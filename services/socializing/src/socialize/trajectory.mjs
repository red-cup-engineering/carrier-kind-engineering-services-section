/**
 * trajectory — socializing's GOVERNANCE-CONVERGENCE reading: does a governance PROCESS ever settle,
 * and can it settle without a coordinator? A governance is not a snapshot but a closure process —
 * deliberation iterated toward a settled collective state. The corpus's four-regime classification
 * (Obsmetrologia `ClosureRegime`, surfaced as metrologic's `classifyRegime` /
 * `cohomologyVanishesInRegime`) answers both questions exactly, from the process's logical signature.
 *
 * A process is classified by three structural facts: is its agent base FINITE; are its rules
 * SCOTT-CONTINUOUS (quantifier-free, so the closure converges at ω); and, if transfinite, is its
 * cofinality COUNTABLE. The regime that falls out:
 *   - strict (κ < ω): settles in finitely many rounds; coordination-free.
 *   - scott (κ = ω): settles at the ω-limit; still coordination-free (H¹ vanishes).
 *   - transfinite-bounded (ω < κ < ω₁): may need a coordinator (H¹ need not vanish).
 *   - aperiodic (κ ≥ ω₁): PROVABLY never practically settles — perpetual deliberation.
 *
 * The unasked question this answers: some governance DESIGNS are non-convergent by construction. A
 * rule that quantifies over an unbounded future population (the seventh-generation obligation, an
 * open-membership swarm with ∀-over-all-future-agents) lands in the aperiodic regime — its consensus
 * cohomology does not vanish, so no finite coordination protocol settles it. That is not a bug to fix
 * but a structural fact the math exposes before the polity is ever run.
 *
 * Consumes metrologic's `classifyRegime` + `cohomologyVanishesInRegime` (the Lean regime theorems);
 * re-derives no closure-ordinal math.
 */
import { classifyRegime, closureRegimeData, cohomologyVanishesInRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";
import { aperiodicClosureRegime, closureRegimeName, finiteClosureRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";

/** Admit a governance process's closure data; a finite base forces Scott continuity and countable cofinality. */
function admittedClosure(process) {
  const admitted = closureRegimeData(process.scottContinuous === true, process.finiteBase === true, process.countableCofinality === true);
  if (admitted.kind !== "settling.closureRegimeData:witness") throw new TypeError(`governanceConvergence: closure data violates ${admitted.constraint}`);
  return admitted.data;
}

/**
 * governanceConvergence — classify a governance process's convergence by its closure regime, via the
 * Lean-grounded `classifyRegime` and `cohomologyVanishesInRegime`. Reports the regime, whether
 * convergence is coordination-free (the consensus cohomology vanishes), whether it settles finitely,
 * and whether it is provably perpetual (aperiodic).
 */
export function governanceConvergence(process) {
  const regime = classifyRegime(admittedClosure(process));
  return Object.freeze({
    kind: "socializing.convergence",
    regime: closureRegimeName(regime),
    coordinationFree: cohomologyVanishesInRegime(regime),
    settlesFinitely: regime === finiteClosureRegime,
    perpetual: regime === aperiodicClosureRegime,
  });
}
