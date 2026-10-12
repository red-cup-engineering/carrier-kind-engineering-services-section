/**
 * settling/first-cohomology — the degree-1 cohomology of a settling.
 *
 * One generator per cell added at a non-Scott limit-stage firing — the obstruction
 * to Scott-continuity of the closure.
 */
import { count } from "../math/rational/exact-number.mts";
import { rankVanishing } from "./cohomology.mts";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mts";
import type { Settlement, SettlingFirstCohomology } from "../settlement.mts";

/** The degree-1 cohomology of a settlement filtration. */
export function readFirstCohomologyOfSettlementFiltration(filtration: Settlement): SettlingFirstCohomology {
  const generators = Object.freeze(readNonScottFiringsOfSettlementFiltration(filtration).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.firstCohomologyGenerator" as const,
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({
    kind: "predication.settling.firstCohomology" as const,
    generators,
    rank: count(generators),
    degree: 1 as const,
    vanishing: rankVanishing(count(generators)),
  });
}
