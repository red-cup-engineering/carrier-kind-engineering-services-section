/**
 * settling/classification — the regime, depth, and finitude of a settling.
 *
 * Aperiodicity (κ ≥ ω₁) is only ever declared through the filtration's cofinality
 * witness — bounded iteration witnesses only the stabilizing regimes (finite,
 * Scott, transfinite); its exhaustion is an obstruction, not an aperiodicity claim.
 */
import { natIsZero } from "../math/rational/exact-number.mts";
import { aperiodicClosureRegime, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, type ClosureRegime } from "./closure.mts";
import { readFiringsOfSettlementFiltration } from "./increment.mts";
import { readNonScottFiringsOfSettlementFiltration, readLimitStagesOfSettlementFiltration } from "./limit.mts";
import { judgeFinitudeOfSettlingStage } from "./ordinal.mts";
import type { Settlement, SettlingClassification, SettlingFiniteStageJudgment, SettlingStageOrdinal } from "../settlement.mts";

/** The classification of a settling: depth, regime, cofinality, limit stages, non-Scott firings. */
export function readClassificationOfSettlementFiltration(filtration: Settlement): SettlingClassification {
  const firingStages = readFiringsOfSettlementFiltration(filtration);
  const depth = firingStages.length ? firingStages[firingStages.length - 1]!.stage : filtration.stages[0]!.ordinal;
  const limitStages = readLimitStagesOfSettlementFiltration(filtration);
  const nonScottFirings = readNonScottFiringsOfSettlementFiltration(filtration);
  const regime: ClosureRegime = natIsZero(nonScottFirings.rank)
    ? (natIsZero(limitStages.rank) ? finiteClosureRegime : scottClosureRegime)
    : (filtration.cofinality.kind === "predication.settling.cofinality.uncountable" ? aperiodicClosureRegime : transfiniteClosureRegime);
  return Object.freeze({
    kind: "predication.settling.classification" as const,
    depth,
    regime,
    cofinality: filtration.cofinality,
    limitStages,
    nonScottFirings,
  });
}

/** The settling depth: the ordinal of its last firing. */
export const readDepthOfSettlementFiltration = (filtration: Settlement): SettlingStageOrdinal => readClassificationOfSettlementFiltration(filtration).depth;

/** The finite-stage judgment on a settling's depth. */
export const readDepthFiniteStageJudgmentOfSettlementFiltration = (filtration: Settlement): SettlingFiniteStageJudgment =>
  judgeFinitudeOfSettlingStage(readDepthOfSettlementFiltration(filtration));
