/**
 * settling/limit — the limit stages and non-Scott firings of a settling.
 */
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { readFiringsOfSettlementFiltration } from "./increment.mjs";
import { isSettlingLimitStage } from "./stage.mjs";
/** The limit-shaped stages of a filtration, with their count. */
export const readLimitStagesOfSettlementFiltration = (carrier) => {
    const stages = Object.freeze(carrier.stages.filter(isSettlingLimitStage));
    return Object.freeze({ kind: "predication.settling.limitStages", stages, rank: count(stages) });
};
/** The cell-adding firings whose source is a limit stage, with their count. */
export const readNonScottFiringsOfSettlementFiltration = (carrier) => {
    const firings = Object.freeze(readFiringsOfSettlementFiltration(carrier).filter((increment) => isSettlingLimitStage(increment.source)));
    return Object.freeze({ kind: "predication.settling.nonScottFirings", firings, rank: count(firings) });
};
