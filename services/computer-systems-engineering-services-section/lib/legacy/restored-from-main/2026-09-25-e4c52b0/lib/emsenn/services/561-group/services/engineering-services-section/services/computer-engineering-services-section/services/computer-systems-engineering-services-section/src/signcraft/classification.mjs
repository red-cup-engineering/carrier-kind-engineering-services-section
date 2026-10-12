/**
 * settling/classification — the regime, depth, and finitude of a settling.
 *
 * Aperiodicity (κ ≥ ω₁) is only ever declared through the carrier's cofinality
 * witness — bounded iteration witnesses only the stabilizing regimes (finite,
 * Scott, transfinite); its exhaustion is an obstruction, not an aperiodicity claim.
 */
import { natIsZero } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/closure";
import { readFiringsOfSettlementFiltration } from "./increment.mjs";
import { readNonScottFiringsOfSettlementFiltration, readLimitStagesOfSettlementFiltration } from "./limit.mjs";
import { judgeFinitudeOfSettlingStage } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/ordinal";
/** The classification of a settling: depth, regime, cofinality, limit stages, non-Scott firings. */
export function readClassificationOfSettlementFiltration(carrier) {
    const firingStages = readFiringsOfSettlementFiltration(carrier);
    const depth = firingStages.length ? firingStages[firingStages.length - 1].stage : carrier.stages[0].ordinal;
    const limitStages = readLimitStagesOfSettlementFiltration(carrier);
    const nonScottFirings = readNonScottFiringsOfSettlementFiltration(carrier);
    const regime = natIsZero(nonScottFirings.rank)
        ? (natIsZero(limitStages.rank) ? finiteClosureRegime : scottClosureRegime)
        : (carrier.cofinality.kind === "predication.settling.cofinality.uncountable" ? aperiodicClosureRegime : transfiniteClosureRegime);
    return Object.freeze({
        kind: "predication.settling.classification",
        depth,
        regime,
        cofinality: carrier.cofinality,
        limitStages,
        nonScottFirings,
    });
}
/** The settling depth: the ordinal of its last firing. */
export const readDepthOfSettlementFiltration = (carrier) => readClassificationOfSettlementFiltration(carrier).depth;
/** The finite-stage judgment on a settling's depth. */
export const readDepthFiniteStageJudgmentOfSettlementFiltration = (carrier) => judgeFinitudeOfSettlingStage(readDepthOfSettlementFiltration(carrier));
