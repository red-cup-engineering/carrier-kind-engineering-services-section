/**
 * settling/stage — settling-stage shapes and inputs.
 *
 * Selects the stage shape from its ordinal (initial for zero, limit for a limit
 * ordinal, else successor), builds designated-cell carriers (deduped to a
 * CellSet), and assembles the initial / successor / limit stage inputs the
 * filtration normalizes.
 */
import { cellSet } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { isLimitOrdinal, isZeroOrdinal } from "./closure.mjs";
import { cellSetRepresentatives } from "./cell-set.mjs";
import { initialSettlingStageOrdinal, successorSettlingStageOrdinal } from "./ordinal.mjs";
/** The initial stage shape. */
export const settlingInitialStageShape = (ordinal) => Object.freeze({ kind: "predication.settling.stage.initial", ordinal });
/** The successor stage shape. */
export const settlingSuccessorStageShape = (ordinal) => Object.freeze({ kind: "predication.settling.stage.successor", ordinal });
/** The limit stage shape. */
export const settlingLimitStageShape = (ordinal) => Object.freeze({ kind: "predication.settling.stage.limit", ordinal });
/** The stage shape selected from the stage ordinal. */
export const readShapeOfSettlingStageOrdinal = (ordinal) => {
    if (isZeroOrdinal(ordinal.ordinal))
        return settlingInitialStageShape(ordinal);
    if (isLimitOrdinal(ordinal.ordinal))
        return settlingLimitStageShape(ordinal);
    return settlingSuccessorStageShape(ordinal);
};
/** A designated-cells carrier from a cell list (deduped into a CellSet). */
export const settlingStageDesignatedCellSet = (designated) => Object.freeze({ kind: "predication.settling.stageDesignatedCells", cells: cellSet(cellSetRepresentatives(designated)) });
/** A stage input from an ordinal carrier, designated cells, and (default) shape. */
export const settlingStageInput = (ordinal, designated, shape = readShapeOfSettlingStageOrdinal(ordinal)) => Object.freeze({ kind: "predication.settling.stageInput", ordinal, shape, designated });
/** The initial stage input from designated cells. */
export const initialSettlingStageInput = (designated) => {
    const ordinal = initialSettlingStageOrdinal;
    return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingInitialStageShape(ordinal));
};
/** A successor stage input following a previous stage. */
export const successorSettlingStageInput = (previous, designated) => {
    const ordinal = successorSettlingStageOrdinal(previous.ordinal);
    return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingSuccessorStageShape(ordinal));
};
/** A limit stage input at a limit ordinal; throws if the ordinal is not a limit. */
export const limitSettlingStageInput = (ordinal, designated) => {
    if (!isLimitOrdinal(ordinal.ordinal))
        throw new TypeError("limitSettlingStageInput: expected limit ordinal");
    return settlingStageInput(ordinal, settlingStageDesignatedCellSet(designated), settlingLimitStageShape(ordinal));
};
/** Whether a stage is a limit stage. */
export const isSettlingLimitStage = (stage) => stage.shape.kind === "predication.settling.stage.limit";
