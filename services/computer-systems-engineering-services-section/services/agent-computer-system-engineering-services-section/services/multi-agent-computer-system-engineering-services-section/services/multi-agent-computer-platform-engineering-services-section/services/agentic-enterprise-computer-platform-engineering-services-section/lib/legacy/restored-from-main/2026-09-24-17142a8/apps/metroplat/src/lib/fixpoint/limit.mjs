/**
 * settling/limit — the limit stages and non-Scott firings of a settling.
 */
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { readFiringsOfSettlementFiltration } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/increment";
import { isSettlingLimitStage } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/stage";

/** The limit-shaped stages of a filtration, with their count. */
export const readLimitStagesOfSettlementFiltration = (filtration) => {
  const stages = Object.freeze(filtration.stages.filter(isSettlingLimitStage));
  return Object.freeze({ kind: "predication.settling.limitStages", stages, rank: count(stages) });
};

/** The cell-adding firings whose source is a limit stage, with their count. */
export const readNonScottFiringsOfSettlementFiltration = (filtration) => {
  const firings = Object.freeze(readFiringsOfSettlementFiltration(filtration).filter((increment) => isSettlingLimitStage(increment.source)));
  return Object.freeze({ kind: "predication.settling.nonScottFirings", firings, rank: count(firings) });
};
