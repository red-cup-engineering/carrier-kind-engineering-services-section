/**
 * settling/first-cohomology — the degree-1 cohomology of a settling.
 *
 * One generator per cell added at a non-Scott limit-stage firing — the obstruction
 * to Scott-continuity of the closure.
 */
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { rankVanishing } from "./cohomology.mjs";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
/** The degree-1 cohomology of a settlement filtration. */
export function readFirstCohomologyOfSettlementFiltration(carrier) {
    const generators = Object.freeze(readNonScottFiringsOfSettlementFiltration(carrier).firings.flatMap((increment) => increment.added.cells.map((cell) => Object.freeze({
        kind: "predication.settling.firstCohomologyGenerator",
        stage: increment.source,
        cell,
    }))));
    return Object.freeze({
        kind: "predication.settling.firstCohomology",
        generators,
        rank: count(generators),
        degree: 1,
        vanishing: rankVanishing(count(generators)),
    });
}
