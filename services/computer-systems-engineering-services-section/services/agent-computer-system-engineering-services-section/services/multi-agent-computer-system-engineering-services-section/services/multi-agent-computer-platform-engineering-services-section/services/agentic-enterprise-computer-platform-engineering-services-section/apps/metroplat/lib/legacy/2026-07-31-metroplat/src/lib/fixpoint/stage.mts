/**
 * settling/stage — settling-stage shapes and inputs.
 *
 * Selects the stage shape from its ordinal (initial for zero, limit for a limit
 * ordinal, else successor), builds designated-cell records (deduped to a
 * CellSet), and assembles the initial / successor / limit stage inputs the
 * filtration normalizes.
 */
import { cellSet, type Cell } from "../logic/predicating/predication.mts";
import { isLimitOrdinal, isZeroOrdinal } from "./closure.mts";
import { cellSetRepresentatives } from "./cell-set.mts";
import { initialSettlingStageOrdinal, successorSettlingStageOrdinal } from "./ordinal.mts";
import type {
  SettlingInitialStage,
  SettlingLimitStage,
  SettlingStage,
  SettlingStageDesignatedCells,
  SettlingStageInput,
  SettlingStageOrdinal,
  SettlingStageShape,
  SettlingSuccessorStage,
} from "../settlement.mts";

/** The initial stage shape. */
export const settlingInitialStageShape = (ordinal: SettlingStageOrdinal): SettlingInitialStage =>
  Object.freeze({ kind: "predication.settling.stage.initial" as const, ordinal });

/** The successor stage shape. */
export const settlingSuccessorStageShape = (ordinal: SettlingStageOrdinal): SettlingSuccessorStage =>
  Object.freeze({ kind: "predication.settling.stage.successor" as const, ordinal });

/** The limit stage shape. */
export const settlingLimitStageShape = (ordinal: SettlingStageOrdinal): SettlingLimitStage =>
  Object.freeze({ kind: "predication.settling.stage.limit" as const, ordinal });

/** The stage shape selected from the stage ordinal. */
export const readShapeOfSettlingStageOrdinal = (ordinal: SettlingStageOrdinal): SettlingStageShape => {
  if (isZeroOrdinal(ordinal.ordinal)) return settlingInitialStageShape(ordinal);
  if (isLimitOrdinal(ordinal.ordinal)) return settlingLimitStageShape(ordinal);
  return settlingSuccessorStageShape(ordinal);
};

/** A designated-cells record from a cell list (deduped into a CellSet). */
export const settlingStageDesignatedCellSet = (designated: readonly Cell[]): SettlingStageDesignatedCells =>
  Object.freeze({ kind: "predication.settling.stageDesignatedCells" as const, cells: cellSet(cellSetRepresentatives(designated)) });

/** A stage input from an ordinal record, designated cells, and (default) shape. */
export const settlingStageInput = (
  ordinal: SettlingStageOrdinal,
  designated: SettlingStageDesignatedCells,
  shape: SettlingStageShape = readShapeOfSettlingStageOrdinal(ordinal),
): SettlingStageInput => Object.freeze({ kind: "predication.settling.stageInput" as const, ordinal, shape, designated });

/** The initial stage input from designated cells. */
export const initialSettlingStageInput = (designated: readonly Cell[]): SettlingStageInput => {
  const ordinal = initialSettlingStageOrdinal;
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingInitialStageShape(ordinal));
};

/** A successor stage input following a previous stage. */
export const successorSettlingStageInput = (
  previous: SettlingStageInput | SettlingStage,
  designated: readonly Cell[],
): SettlingStageInput => {
  const ordinal = successorSettlingStageOrdinal(previous.ordinal);
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingSuccessorStageShape(ordinal));
};

/** A limit stage input at a limit ordinal; throws if the ordinal is not a limit. */
export const limitSettlingStageInput = (
  ordinal: SettlingStageOrdinal,
  designated: readonly Cell[],
): SettlingStageInput => {
  if (!isLimitOrdinal(ordinal.ordinal)) throw new TypeError("limitSettlingStageInput: expected limit ordinal");
  return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingLimitStageShape(ordinal));
};

/** Whether a stage is a limit stage. */
export const isSettlingLimitStage = (stage: SettlingStage): stage is SettlingStage & { readonly shape: SettlingLimitStage } =>
  stage.shape.kind === "predication.settling.stage.limit";
