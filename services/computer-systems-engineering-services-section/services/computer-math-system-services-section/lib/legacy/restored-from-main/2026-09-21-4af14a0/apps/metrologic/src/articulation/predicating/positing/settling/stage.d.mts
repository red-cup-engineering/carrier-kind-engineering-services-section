/**
 * settling/stage — settling-stage shapes and inputs.
 *
 * Selects the stage shape from its ordinal (initial for zero, limit for a limit
 * ordinal, else successor), builds designated-cell carriers (deduped to a
 * CellSet), and assembles the initial / successor / limit stage inputs the
 * filtration normalizes.
 */
import { type Cell } from "../../predication.mjs";
import type { SettlingInitialStage, SettlingLimitStage, SettlingStage, SettlingStageDesignatedCellsCarrier, SettlingStageInputCarrier, SettlingStageOrdinalCarrier, SettlingStageShape, SettlingSuccessorStage } from "./object.mjs";
/** The initial stage shape. */
export declare const settlingInitialStageShape: (ordinal: SettlingStageOrdinalCarrier) => SettlingInitialStage;
/** The successor stage shape. */
export declare const settlingSuccessorStageShape: (ordinal: SettlingStageOrdinalCarrier) => SettlingSuccessorStage;
/** The limit stage shape. */
export declare const settlingLimitStageShape: (ordinal: SettlingStageOrdinalCarrier) => SettlingLimitStage;
/** The stage shape selected from the stage ordinal. */
export declare const readShapeOfSettlingStageOrdinal: (ordinal: SettlingStageOrdinalCarrier) => SettlingStageShape;
/** A designated-cells carrier from a cell list (deduped into a CellSet). */
export declare const settlingStageDesignatedCellSet: (designated: readonly Cell[]) => SettlingStageDesignatedCellsCarrier;
/** A stage input from an ordinal carrier, designated cells, and (default) shape. */
export declare const settlingStageInput: (ordinal: SettlingStageOrdinalCarrier, designated: SettlingStageDesignatedCellsCarrier, shape?: SettlingStageShape) => SettlingStageInputCarrier;
/** The initial stage input from designated cells. */
export declare const initialSettlingStageInput: (designated: readonly Cell[]) => SettlingStageInputCarrier;
/** A successor stage input following a previous stage. */
export declare const successorSettlingStageInput: (previous: SettlingStageInputCarrier | SettlingStage, designated: readonly Cell[]) => SettlingStageInputCarrier;
/** A limit stage input at a limit ordinal; throws if the ordinal is not a limit. */
export declare const limitSettlingStageInput: (ordinal: SettlingStageOrdinalCarrier, designated: readonly Cell[]) => SettlingStageInputCarrier;
/** Whether a stage is a limit stage. */
export declare const isSettlingLimitStage: (stage: SettlingStage) => stage is SettlingStage & {
    readonly shape: SettlingLimitStage;
};
