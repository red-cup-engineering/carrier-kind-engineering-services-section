/**
 * settling/increment — the per-stage increments and firings of a settling.
 */
import { cellSet } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { relativeCellComplement } from "./cell-set.mjs";
/** The cells added at each stage relative to the previous (all designated at stage 0). */
export function readIncrementsOfSettlementFiltration(carrier) {
    return Object.freeze(carrier.stages.map((stage, index) => Object.freeze({
        kind: "predication.settling.increment",
        stage: stage.ordinal,
        source: stage,
        added: cellSet(index === 0 ? stage.designated.cells : relativeCellComplement(stage.designated.cells, carrier.stages[index - 1].designated.cells)),
    })));
}
/** The increments that actually add cells (non-empty added set). */
export const readFiringsOfSettlementFiltration = (carrier) => Object.freeze(readIncrementsOfSettlementFiltration(carrier).filter((increment) => increment.added.cells.length > 0));
