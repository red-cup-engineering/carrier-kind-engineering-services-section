/**
 * settling/classification — the regime, depth, and finitude of a settling.
 *
 * Aperiodicity (κ ≥ ω₁) is only ever declared through the filtration's cofinality
 * witness — bounded iteration witnesses only the stabilizing regimes (finite,
 * Scott, transfinite); its exhaustion is an obstruction, not an aperiodicity claim.
 */
import { natIsZero } from "@red-cup-engineering/computer-data-engine/exact-number";
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, judgeFinitudeOfSettlingStage } from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
import { readFiringsOfSettlementFiltration } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/increment";
import { readNonScottFiringsOfSettlementFiltration, readLimitStagesOfSettlementFiltration } from "./limit.mjs";

/** The classification of a settling: depth, regime, cofinality, limit stages, non-Scott firings. */
export function readClassificationOfSettlementFiltration(filtration) {
  const firingStages = readFiringsOfSettlementFiltration(filtration);
  const depth = firingStages.length ? firingStages[firingStages.length - 1].stage : filtration.stages[0].ordinal;
  const limitStages = readLimitStagesOfSettlementFiltration(filtration);
  const nonScottFirings = readNonScottFiringsOfSettlementFiltration(filtration);
  const regime = natIsZero(nonScottFirings.rank)
    ? (natIsZero(limitStages.rank) ? finiteClosureRegime : scottClosureRegime)
    : (filtration.cofinality.kind === "predication.settling.cofinality.uncountable" ? aperiodicClosureRegime : transfiniteClosureRegime);
  return Object.freeze({
    kind: "predication.settling.classification",
    depth,
    regime,
    cofinality: filtration.cofinality,
    limitStages,
    nonScottFirings,
  });
}

/** The settling depth: the ordinal of its last firing. */
export const readDepthOfSettlementFiltration = (filtration) => readClassificationOfSettlementFiltration(filtration).depth;

/** The finite-stage judgment on a settling's depth. */
export const readDepthFiniteStageJudgmentOfSettlementFiltration = (filtration) =>
  judgeFinitudeOfSettlingStage(readDepthOfSettlementFiltration(filtration));
