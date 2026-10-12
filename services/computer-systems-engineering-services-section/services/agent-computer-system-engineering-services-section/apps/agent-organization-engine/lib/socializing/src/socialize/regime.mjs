/**
 * socialize/regime — the closure regime of a multi-observer system (Obsmetrologia
 * `ClosureRegime`), read off its observers' own settlings.
 *
 * For socializing this is the SECOND, ORTHOGONAL stratification of consensus, distinct
 * from the opposition-cycle H¹ that `converge` already computes:
 *
 *   - The opposition-cycle H¹ (`section.obstruction`/`coordinationFree`) is the STATIC
 *     question — do the observers' fixed opinions glue into one global section? — the
 *     bilattice-network-sheaf consensus. It can be non-zero in ANY regime.
 *   - The REGIME is the DYNAMIC question — does iterating the CRDT merge toward that
 *     consensus need a coordination protocol? The merge is coordination-free by regime
 *     exactly where the settling sheaf's H¹ vanishes (`cohomologyVanishesInRegime`: strict
 *     and scott); in the transfinite-bounded and aperiodic regimes it need not.
 *
 * The regime also fixes the FEDERATION discipline: where H¹ vanishes a merge may ship only
 * the merged evidence (endpoint-state); elsewhere it must ship the trajectory to preserve
 * the H¹ invariant across the exchange.
 *
 * An observer's regime is not declared: it is the regime of its own knowledge orbit, the
 * cognition its animating agent reads off the knowing face. An observer with no cognition
 * has an empty orbit, settled at stage 0 (strict).
 */
import {
  closureRegimeName,
  closureRegimeNamed,
  finiteClosureRegime,
} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { costlierRegime } from "@red-cup-engineering/computer-data-engineering-services-section/closure-regime";
import { cohomologyVanishesInRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";

const strict = closureRegimeName(finiteClosureRegime);

/**
 * The joint regime of a multi-observer system: the costliest of the observers' regimes.
 * A society spanning regimes obeys the discipline its most demanding observer needs. The
 * empty society is strict.
 */
export function jointRegime(regimes) {
  return regimes.reduce(costlierRegime, strict);
}

/** Whether convergence is coordination-free by regime: the settling sheaf's H¹ vanishes. */
export function coordinationFreeByRegime(regime) {
  return cohomologyVanishesInRegime(closureRegimeNamed(regime));
}

/** The federation discipline a regime forces on a merge or exchange. */
export function federationDiscipline(regime) {
  return coordinationFreeByRegime(regime) ? "endpoint-state" : "trajectory";
}

/** An observer's regime: the closure regime of its agent's knowledge orbit. */
export function observerRegime(agent) {
  const regime = agent?.cognition?.regime ?? strict;
  return closureRegimeName(closureRegimeNamed(regime));
}
