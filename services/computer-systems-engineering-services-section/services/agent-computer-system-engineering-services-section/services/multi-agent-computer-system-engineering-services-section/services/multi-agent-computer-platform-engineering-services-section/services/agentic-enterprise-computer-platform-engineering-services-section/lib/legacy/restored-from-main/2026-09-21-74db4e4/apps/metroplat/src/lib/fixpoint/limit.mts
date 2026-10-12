/**
 * settling/limit — the limit stages and non-Scott firings of a settling.
 */
import { count } from "@red-cup-engineering/computer-data-engine/exact-number";
import { readFiringsOfSettlementFiltration } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/increment";
import { isSettlingLimitStage } from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
import type { NonScottSettlingFiringsRead, Settlement, SettlingLimitStagesRead } from "@lenticule-science/metrologic/settling/settlement";

/** The limit-shaped stages of a filtration, with their count. */
export const readLimitStagesOfSettlementFiltration = (filtration: Settlement): SettlingLimitStagesRead => {
  const stages = Object.freeze(filtration.stages.filter(isSettlingLimitStage));
  return Object.freeze({ kind: "predication.settling.limitStages" as const, stages, rank: count(stages) });
};

/** The cell-adding firings whose source is a limit stage, with their count. */
export const readNonScottFiringsOfSettlementFiltration = (filtration: Settlement): NonScottSettlingFiringsRead => {
  const firings = Object.freeze(readFiringsOfSettlementFiltration(filtration).filter((increment) => isSettlingLimitStage(increment.source)));
  return Object.freeze({ kind: "predication.settling.nonScottFirings" as const, firings, rank: count(firings) });
};
