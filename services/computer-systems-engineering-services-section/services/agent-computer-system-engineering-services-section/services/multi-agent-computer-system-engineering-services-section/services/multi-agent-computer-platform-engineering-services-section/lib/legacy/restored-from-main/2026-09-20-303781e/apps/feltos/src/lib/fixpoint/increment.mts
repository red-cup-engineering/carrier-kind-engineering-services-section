/**
 * settling/increment — the per-stage increments and firings of a settling.
 */
import { cellSet } from "../logic/predicating/predication.mts";
import { relativeCellComplement } from "./cell-set.mts";
import type { Settlement, SettlingIncrement } from "../settlement.mts";

/** The cells added at each stage relative to the previous (all designated at stage 0). */
export function readIncrementsOfSettlementFiltration(filtration: Settlement): readonly SettlingIncrement[] {
  return Object.freeze(filtration.stages.map((stage, index) => Object.freeze({
    kind: "predication.settling.increment" as const,
    stage: stage.ordinal,
    source: stage,
    added: cellSet(index === 0 ? stage.designated.cells : relativeCellComplement(stage.designated.cells, filtration.stages[index - 1]!.designated.cells)),
  })));
}

/** The increments that actually add cells (non-empty added set). */
export const readFiringsOfSettlementFiltration = (filtration: Settlement): readonly SettlingIncrement[] =>
  Object.freeze(readIncrementsOfSettlementFiltration(filtration).filter((increment) => increment.added.cells.length > 0));
