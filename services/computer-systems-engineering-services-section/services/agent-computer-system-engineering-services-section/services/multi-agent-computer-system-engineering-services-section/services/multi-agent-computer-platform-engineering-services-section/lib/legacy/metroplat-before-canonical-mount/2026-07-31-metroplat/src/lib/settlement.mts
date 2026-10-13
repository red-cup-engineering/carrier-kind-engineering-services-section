/**
 * The mathematical Settlement structure.
 *
 * A Settlement is an ordinal-indexed filtration of settling stages, each with
 * its designated cells, together with its declared cofinality. Its associated
 * readouts—increments, limit stages, non-Scott firings, first cohomology,
 * graded gap, closure invariant, and classification—are constituents and
 * invariants of this one structure.
 */
import type { Cell, CellSet } from "./logic/predicating/predication.mts";
import type { Natural } from "./math/rational/exact-number.mts";
import type { ClosureRegime, FiniteOrdinalJudgment, Ordinal } from "./fixpoint/closure.mts";
import type { RankVanishingJudgment } from "./fixpoint/cohomology.mts";
import type { FromSchema } from "./schema/contract.mts";
import { relativeCellComplement } from "./fixpoint/cell-set.mts";
import { countableSettlingCofinality } from "./fixpoint/ordinal.mts";

export interface SettlingStageOrdinal {
  readonly kind: "predication.settling.stageOrdinal";
  readonly ordinal: Ordinal;
}

export interface SettlingStageDesignatedCells {
  readonly kind: "predication.settling.stageDesignatedCells";
  readonly cells: CellSet;
}

export interface SettlingFiniteStageWitness {
  readonly kind: "predication.settling.finiteStage:witness";
  readonly stage: SettlingStageOrdinal;
  readonly value: Natural;
}

export interface SettlingFiniteStageObstruction {
  readonly kind: "predication.settling.finiteStage-obstruction";
  readonly stage: SettlingStageOrdinal;
  readonly reading: FiniteOrdinalJudgment;
}

export type SettlingFiniteStageJudgment = SettlingFiniteStageWitness | SettlingFiniteStageObstruction;

export interface SettlingInitialStage {
  readonly kind: "predication.settling.stage.initial";
  readonly ordinal: SettlingStageOrdinal;
}

export interface SettlingSuccessorStage {
  readonly kind: "predication.settling.stage.successor";
  readonly ordinal: SettlingStageOrdinal;
}

export interface SettlingLimitStage {
  readonly kind: "predication.settling.stage.limit";
  readonly ordinal: SettlingStageOrdinal;
}

export type SettlingStageShape = SettlingInitialStage | SettlingSuccessorStage | SettlingLimitStage;

export interface SettlingStageInput {
  readonly kind: "predication.settling.stageInput";
  readonly ordinal: SettlingStageOrdinal;
  readonly shape: SettlingStageShape;
  readonly designated: SettlingStageDesignatedCells;
}

export interface SettlingStage {
  readonly kind: "predication.settling.stage";
  readonly ordinal: SettlingStageOrdinal;
  readonly shape: SettlingStageShape;
  readonly designated: CellSet;
}

export type SettlingLimitStageInstance = SettlingStage & { readonly shape: SettlingLimitStage };

export const countableSettlingCofinalitySchemaContractSchema = {
  $id: "metroplat/closure/object/countable-settling-cofinality",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.settling.cofinality.countable" } },
  additionalProperties: false,
} as const;

export type CountableSettlingCofinality = FromSchema<typeof countableSettlingCofinalitySchemaContractSchema>;

export const uncountableSettlingCofinalitySchemaContractSchema = {
  $id: "metroplat/closure/object/uncountable-settling-cofinality",
  type: "object", required: ["kind"],
  properties: { kind: { const: "predication.settling.cofinality.uncountable" } },
  additionalProperties: false,
} as const;

export type UncountableSettlingCofinality = FromSchema<typeof uncountableSettlingCofinalitySchemaContractSchema>;
export type SettlingCofinality = CountableSettlingCofinality | UncountableSettlingCofinality;

/** The complete mathematical Settlement structure. */
export interface Settlement {
  readonly kind: "predication.settlement.filtration";
  readonly stages: readonly SettlingStage[];
  readonly cofinality: SettlingCofinality;
}

export interface SettlingIncrement {
  readonly kind: "predication.settling.increment";
  readonly stage: SettlingStageOrdinal;
  readonly source: SettlingStage;
  readonly added: CellSet;
}

export interface SettlingLimitStagesRead {
  readonly kind: "predication.settling.limitStages";
  readonly stages: readonly SettlingLimitStageInstance[];
  readonly rank: Natural;
}

export interface NonScottSettlingFiringsRead {
  readonly kind: "predication.settling.nonScottFirings";
  readonly firings: readonly SettlingIncrement[];
  readonly rank: Natural;
}

export interface SettlingFirstCohomologyGenerator {
  readonly kind: "predication.settling.firstCohomologyGenerator";
  readonly stage: SettlingStage;
  readonly cell: Cell;
}

export interface SettlingFirstCohomology {
  readonly kind: "predication.settling.firstCohomology";
  readonly generators: readonly SettlingFirstCohomologyGenerator[];
  readonly rank: Natural;
  readonly degree: 1;
  readonly vanishing: RankVanishingJudgment;
}

export interface GradedGapLoss {
  readonly kind: "predication.settling.gradedGapLoss";
  readonly stage: SettlingStage;
  readonly cell: Cell;
}

export interface GradedGap {
  readonly kind: "predication.settling.gradedGap";
  readonly lost: readonly GradedGapLoss[];
  readonly rank: Natural;
}

export interface SettlingClosureInvariantStep {
  readonly kind: "predication.settling.closureInvariantStep";
  readonly stage: SettlingStage;
  readonly additions: CellSet;
}

export interface SettlingClosureInvariant {
  readonly kind: "predication.settling.closureInvariant";
  readonly nonScottAdditions: readonly SettlingClosureInvariantStep[];
}

export interface SettlingClosureEquivalenceWitness {
  readonly kind: "predication.settling.closureEquivalence:witness";
  readonly left: SettlingClosureInvariant;
  readonly right: SettlingClosureInvariant;
}

export interface SettlingClosureEquivalenceObstruction {
  readonly kind: "predication.settling.closureEquivalence-obstruction";
  readonly left: SettlingClosureInvariant;
  readonly right: SettlingClosureInvariant;
}

export type SettlingClosureEquivalenceJudgment = SettlingClosureEquivalenceWitness | SettlingClosureEquivalenceObstruction;

export interface SettlingClassification {
  readonly kind: "predication.settling.classification";
  readonly depth: SettlingStageOrdinal;
  readonly regime: ClosureRegime;
  readonly cofinality: SettlingCofinality;
  readonly limitStages: SettlingLimitStagesRead;
  readonly nonScottFirings: NonScottSettlingFiringsRead;
}

/** Construct a Settlement while enforcing initiality and monotonicity. */
export function settlementFiltration(
  stages: readonly SettlingStageInput[],
  cofinality: SettlingCofinality = countableSettlingCofinality,
): Settlement {
  if (stages.length === 0) throw new TypeError("settlementFiltration: need at least one stage");
  if (stages[0]!.shape.kind !== "predication.settling.stage.initial") throw new TypeError("settlementFiltration: stage 0 must be initial");
  const normalized: SettlingStage[] = [];
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const designated = stage.designated.cells;
    if (index > 0) {
      const previous = stages[index - 1]!.designated.cells.cells;
      if (relativeCellComplement(previous, designated.cells).length > 0) throw new TypeError(`settlementFiltration: stage ${index} drops cells`);
    }
    normalized.push(Object.freeze({
      kind: "predication.settling.stage" as const,
      ordinal: stage.ordinal,
      shape: stage.shape,
      designated,
    }));
  }
  return Object.freeze({
    kind: "predication.settlement.filtration" as const,
    stages: Object.freeze(normalized),
    cofinality,
  });
}
