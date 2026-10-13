/**
 * settling/limit — the limit stages and non-Scott firings of a settling.
 */
import { count } from "../math/rational/exact-number.mts";
import { readFiringsOfSettlementFiltration } from "./increment.mts";
import { isSettlingLimitStage } from "./stage.mts";
import type { NonScottSettlingFiringsRead, Settlement, SettlingLimitStagesRead } from "../settlement.mts";

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
