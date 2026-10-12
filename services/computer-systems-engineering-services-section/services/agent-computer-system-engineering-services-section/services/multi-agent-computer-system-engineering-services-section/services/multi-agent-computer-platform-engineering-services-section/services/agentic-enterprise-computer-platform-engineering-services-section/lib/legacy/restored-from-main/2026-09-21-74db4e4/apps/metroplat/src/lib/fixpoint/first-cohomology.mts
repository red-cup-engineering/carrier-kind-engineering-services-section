/**
 * settling/first-cohomology — the degree-1 cohomology of a settling.
 *
 * One generator per cell added at a non-Scott limit-stage firing — the obstruction
 * to Scott-continuity of the closure.
 */
import { count } from "@red-cup-engineering/computer-data-engine/exact-number";
import { rankVanishing } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mts";
import type { Settlement, SettlingFirstCohomology } from "@lenticule-science/metrologic/settling/settlement";

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
