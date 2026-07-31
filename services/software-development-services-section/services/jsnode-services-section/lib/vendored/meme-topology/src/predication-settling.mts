import { predicationCellCoincidenceHolds } from "@emsenn/meme-algebra";
import { fromCount, natEqual, natIsZero, type Natural } from "@emsenn/meme-algebra";
import {
  aperiodicClosureRegime,
  finiteOrdinalJudgment,
  finiteClosureRegime,
  isLimitOrdinal,
  isZeroOrdinal,
  limitOrdinal,
  scottClosureRegime,
  successorOrdinal,
  transfiniteClosureRegime,
  zeroOrdinal,
  type ClosureRegime,
  type FiniteOrdinalJudgment,
  type Ordinal,
  type OrdinalLabel,
} from "./ordinal-closure.mjs";
import { rankIdentity, rankVanishing, type RankIdentityJudgment, type RankVanishingJudgment } from "./predication-cohomology.mjs";
import type { Valuation } from "./predication-fiber.mjs";
import { cellSet, type Cell, type CellSet } from "@emsenn/meme-algebra";
import { chargeValue, sameChargeValue, valueOf } from "@emsenn/meme-algebra";

export interface SettlingStageOrdinalCarrier {
  readonly kind: "predication.settling.stageOrdinal";
  readonly ordinal: Ordinal;
}

export interface SettlingStageDesignatedCellsCarrier {
  readonly kind: "predication.settling.stageDesignatedCells";
  readonly cells: CellSet;
}

export interface SettlingFiniteStageWitness {
  readonly kind: "predication.settling.finiteStage:witness";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly value: Natural;
}

export interface SettlingFiniteStageObstruction {
  readonly kind: "predication.settling.finiteStage-obstruction";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly reading: FiniteOrdinalJudgment;
}

export type SettlingFiniteStageJudgment = SettlingFiniteStageWitness | SettlingFiniteStageObstruction;

export interface SettlingInitialStage {
  readonly kind: "predication.settling.stage.initial";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

export interface SettlingSuccessorStage {
  readonly kind: "predication.settling.stage.successor";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

export interface SettlingLimitStage {
  readonly kind: "predication.settling.stage.limit";
  readonly ordinal: SettlingStageOrdinalCarrier;
}

export type SettlingStageShape = SettlingInitialStage | SettlingSuccessorStage | SettlingLimitStage;

export interface SettlingStageInputCarrier {
  readonly kind: "predication.settling.stageInput";
  readonly ordinal: SettlingStageOrdinalCarrier;
  readonly shape: SettlingStageShape;
  readonly designated: SettlingStageDesignatedCellsCarrier;
}

export interface SettlingStage {
  readonly kind: "predication.settling.stage";
  readonly ordinal: SettlingStageOrdinalCarrier;
  readonly shape: SettlingStageShape;
  readonly designated: CellSet;
}

export type SettlingLimitStageCarrier = SettlingStage & { readonly shape: SettlingLimitStage };

export interface CountableSettlingCofinalityCarrier {
  readonly kind: "predication.settling.cofinality.countable";
}

export interface UncountableSettlingCofinalityCarrier {
  readonly kind: "predication.settling.cofinality.uncountable";
}

export type SettlingCofinalityCarrier =
  | CountableSettlingCofinalityCarrier
  | UncountableSettlingCofinalityCarrier;

export interface SettlingCarrier {
  readonly kind: "predication.settling.carrier";
  readonly stages: readonly SettlingStage[];
  readonly cofinality: SettlingCofinalityCarrier;
}

export interface SettlingIncrement {
  readonly kind: "predication.settling.increment";
  readonly stage: SettlingStageOrdinalCarrier;
  readonly source: SettlingStage;
  readonly added: CellSet;
}

export interface SettlingLimitStagesCarrier {
  readonly kind: "predication.settling.limitStages";
  readonly stages: readonly SettlingLimitStageCarrier[];
  readonly rank: Natural;
}

export interface NonScottSettlingFiringsCarrier {
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

export interface GradedGapCarrier {
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
  readonly depth: SettlingStageOrdinalCarrier;
  readonly regime: ClosureRegime;
  readonly cofinality: SettlingCofinalityCarrier;
  readonly limitStages: SettlingLimitStagesCarrier;
  readonly nonScottFirings: NonScottSettlingFiringsCarrier;
}

const dedupCells = (values: readonly Cell[]): readonly Cell[] => {
  const out: Cell[] = [];
  for (const cell of values) if (!out.some((item) => predicationCellCoincidenceHolds(item, cell))) out.push(cell);
  return Object.freeze(out);
};

const withoutCells = (left: readonly Cell[], right: readonly Cell[]): readonly Cell[] =>
  Object.freeze(left.filter((item) => !right.some((other) => predicationCellCoincidenceHolds(item, other))));

export const settlingInitialStageOrdinal = (): SettlingStageOrdinalCarrier => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: zeroOrdinal(),
});

export const settlingStageOrdinal = (ordinal: Ordinal): SettlingStageOrdinalCarrier => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal,
});

export const settlingSuccessorStageOrdinal = (stage: SettlingStageOrdinalCarrier): SettlingStageOrdinalCarrier => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: successorOrdinal(stage.ordinal),
});

export const settlingLimitStageOrdinal = (
  label: OrdinalLabel,
  fundamentalSequence: (n: Natural) => Ordinal,
): SettlingStageOrdinalCarrier => settlingStageOrdinal(limitOrdinal(label, fundamentalSequence));

export const countableSettlingCofinality = (): CountableSettlingCofinalityCarrier => Object.freeze({
  kind: "predication.settling.cofinality.countable" as const,
});

export const uncountableSettlingCofinality = (): UncountableSettlingCofinalityCarrier => Object.freeze({
  kind: "predication.settling.cofinality.uncountable" as const,
});

export function settlingFiniteStageJudgment(stage: SettlingStageOrdinalCarrier | SettlingStage): SettlingFiniteStageJudgment {
  const stageOrdinal = stage.kind === "predication.settling.stage" ? stage.ordinal : stage;
  const reading = finiteOrdinalJudgment(stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({
      kind: "predication.settling.finiteStage:witness" as const,
      stage: stageOrdinal,
      value: reading.value,
    })
    : Object.freeze({
      kind: "predication.settling.finiteStage-obstruction" as const,
      stage: stageOrdinal,
      reading,
    });
}

export function sameSettlingStageOrdinal(left: SettlingStageOrdinalCarrier, right: SettlingStageOrdinalCarrier): boolean {
  const leftFinite = settlingFiniteStageJudgment(left);
  const rightFinite = settlingFiniteStageJudgment(right);
  return leftFinite.kind === "predication.settling.finiteStage:witness"
    && rightFinite.kind === "predication.settling.finiteStage:witness"
    && natEqual(leftFinite.value, rightFinite.value);
}

export const settlingInitialStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingInitialStage => Object.freeze({
  kind: "predication.settling.stage.initial" as const,
  ordinal,
});

export const settlingSuccessorStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingSuccessorStage => Object.freeze({
  kind: "predication.settling.stage.successor" as const,
  ordinal,
});

export const settlingLimitStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingLimitStage => Object.freeze({
  kind: "predication.settling.stage.limit" as const,
  ordinal,
});

export const settlingStageShape = (ordinal: SettlingStageOrdinalCarrier): SettlingStageShape => {
  if (isZeroOrdinal(ordinal.ordinal)) return settlingInitialStageShape(ordinal);
  if (isLimitOrdinal(ordinal.ordinal)) return settlingLimitStageShape(ordinal);
  return settlingSuccessorStageShape(ordinal);
};

export const settlingStageDesignatedCells = (designated: readonly Cell[]): SettlingStageDesignatedCellsCarrier => Object.freeze({
  kind: "predication.settling.stageDesignatedCells" as const,
  cells: cellSet(dedupCells(designated)),
});

export const settlingStageInput = (
  ordinal: SettlingStageOrdinalCarrier,
  designated: SettlingStageDesignatedCellsCarrier,
  shape: SettlingStageShape = settlingStageShape(ordinal),
): SettlingStageInputCarrier => Object.freeze({
  kind: "predication.settling.stageInput" as const,
  ordinal,
  shape,
  designated,
});

export const settlingInitialStageInput = (designated: readonly Cell[]): SettlingStageInputCarrier => {
  const ordinal = settlingInitialStageOrdinal();
  return settlingStageInput(ordinal, settlingStageDesignatedCells(designated), settlingInitialStageShape(ordinal));
};

export const settlingSuccessorStageInput = (
  previous: SettlingStageInputCarrier | SettlingStage,
  designated: readonly Cell[],
): SettlingStageInputCarrier => {
  const ordinal = settlingSuccessorStageOrdinal(previous.ordinal);
  return settlingStageInput(ordinal, settlingStageDesignatedCells(designated), settlingSuccessorStageShape(ordinal));
};

export const settlingLimitStageInput = (
  ordinal: SettlingStageOrdinalCarrier,
  designated: readonly Cell[],
): SettlingStageInputCarrier => {
  if (!isLimitOrdinal(ordinal.ordinal)) throw new TypeError("settlingLimitStageInput: expected limit ordinal");
  return settlingStageInput(ordinal, settlingStageDesignatedCells(designated), settlingLimitStageShape(ordinal));
};

const isSettlingLimitStage = (stage: SettlingStage): stage is SettlingStage & { readonly shape: SettlingLimitStage } =>
  stage.shape.kind === "predication.settling.stage.limit";

export function settling(
  stages: readonly SettlingStageInputCarrier[],
  cofinality: SettlingCofinalityCarrier = countableSettlingCofinality(),
): SettlingCarrier {
  if (stages.length === 0) throw new TypeError("settling: need at least one stage");
  if (stages[0]!.shape.kind !== "predication.settling.stage.initial") throw new TypeError("settling: stage 0 must be initial");
  const normalized: SettlingStage[] = [];
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!;
    const designated = stage.designated.cells;
    if (index > 0) {
      const previous = stages[index - 1]!.designated.cells.cells;
      if (withoutCells(previous, designated.cells).length > 0) throw new TypeError(`settling: stage ${index} drops cells`);
    }
    normalized.push(Object.freeze({
      kind: "predication.settling.stage" as const,
      ordinal: stage.ordinal,
      shape: stage.shape,
      designated,
    }));
  }
  return Object.freeze({
    kind: "predication.settling.carrier" as const,
    stages: Object.freeze(normalized),
    cofinality,
  });
}

export function designatedCells(valuation: Valuation): readonly Cell[] {
  // Designated = truth coordinate present: potential AND stable. Excluding
  // stable would resolve the held contradiction to the falsity side — the
  // classical collapse the bilattice exists to refuse.
  return Object.freeze(valuation.fibers.flatMap((fiber) =>
    fiber.assignments
      .filter((assignment) => {
        const value = valueOf(assignment.charge);
        return sameChargeValue(value, chargeValue("potential")) || sameChargeValue(value, chargeValue("stable"));
      })
      .map((assignment) => assignment.cell)));
}

export function settlingIncrements(carrier: SettlingCarrier): readonly SettlingIncrement[] {
  return Object.freeze(carrier.stages.map((stage, index) => Object.freeze({
    kind: "predication.settling.increment" as const,
    stage: stage.ordinal,
    source: stage,
    added: cellSet(index === 0 ? stage.designated.cells : withoutCells(stage.designated.cells, carrier.stages[index - 1]!.designated.cells)),
  })));
}

export const settlingFirings = (carrier: SettlingCarrier): readonly SettlingIncrement[] =>
  Object.freeze(settlingIncrements(carrier).filter((increment) => increment.added.cells.length > 0));

export const settlingLimitStages = (carrier: SettlingCarrier): SettlingLimitStagesCarrier => {
  const stages = Object.freeze(carrier.stages.filter(isSettlingLimitStage));
  return Object.freeze({
    kind: "predication.settling.limitStages" as const,
    stages,
    rank: fromCount(stages.length),
  });
};

export const nonScottSettlingFirings = (carrier: SettlingCarrier): NonScottSettlingFiringsCarrier => {
  const firings = Object.freeze(settlingFirings(carrier).filter((increment) => isSettlingLimitStage(increment.source)));
  return Object.freeze({
    kind: "predication.settling.nonScottFirings" as const,
    firings,
    rank: fromCount(firings.length),
  });
};

export function settlingFirstCohomology(carrier: SettlingCarrier): SettlingFirstCohomology {
  const generators = Object.freeze(nonScottSettlingFirings(carrier).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.firstCohomologyGenerator" as const,
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({
    kind: "predication.settling.firstCohomology" as const,
    generators,
    rank: fromCount(generators.length),
    degree: 1 as const,
    vanishing: rankVanishing(fromCount(generators.length)),
  });
}

export function settlingClosureInvariant(carrier: SettlingCarrier): SettlingClosureInvariant {
  const nonScottAdditions = Object.freeze(nonScottSettlingFirings(carrier).firings.map((increment) => Object.freeze({
    kind: "predication.settling.closureInvariantStep" as const,
    stage: increment.source,
    additions: cellSet(dedupCells(increment.added.cells)),
  })));
  return Object.freeze({
    kind: "predication.settling.closureInvariant" as const,
    nonScottAdditions,
  });
}

export function settlingClosureEquivalence(left: SettlingCarrier, right: SettlingCarrier): SettlingClosureEquivalenceJudgment {
  const leftInvariant = settlingClosureInvariant(left);
  const rightInvariant = settlingClosureInvariant(right);
  const leftAdditions = leftInvariant.nonScottAdditions;
  const rightAdditions = rightInvariant.nonScottAdditions;
  const equivalent = leftAdditions.length === rightAdditions.length
    && leftAdditions.every((leftStage, index) => {
      const rightStage = rightAdditions[index]!;
      return leftStage.additions.cells.length === rightStage.additions.cells.length
        && leftStage.additions.cells.every((leftCell) => rightStage.additions.cells.some((rightCell) => predicationCellCoincidenceHolds(leftCell, rightCell)));
    });
  return equivalent
    ? Object.freeze({
      kind: "predication.settling.closureEquivalence:witness" as const,
      left: leftInvariant,
      right: rightInvariant,
    })
    : Object.freeze({
      kind: "predication.settling.closureEquivalence-obstruction" as const,
      left: leftInvariant,
      right: rightInvariant,
    });
}

export function gradedGap(carrier: SettlingCarrier): GradedGapCarrier {
  const lost = Object.freeze(nonScottSettlingFirings(carrier).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.gradedGapLoss" as const,
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({ kind: "predication.settling.gradedGap" as const, lost, rank: fromCount(lost.length) });
}

export const gradedGapSettlingFirstCohomologyRank = (carrier: SettlingCarrier): RankIdentityJudgment =>
  rankIdentity(settlingFirstCohomology(carrier).rank, gradedGap(carrier).rank);

/** The sole mint site of the aperiodic regime. Aperiodicity (κ ≥ ω₁) is only
 *  ever declared into the system through the carrier's cofinality witness —
 *  same epistemic standing as an attestation; bounded iteration can witness
 *  only the stabilizing regimes, and its exhaustion is an obstruction. */
export function classifySettling(carrier: SettlingCarrier): SettlingClassification {
  const firingStages = settlingFirings(carrier);
  const depth = firingStages.length ? firingStages[firingStages.length - 1]!.stage : carrier.stages[0]!.ordinal;
  const limitStages = settlingLimitStages(carrier);
  const nonScottFirings = nonScottSettlingFirings(carrier);
  const regime: ClosureRegime = natIsZero(nonScottFirings.rank)
    ? (natIsZero(limitStages.rank) ? finiteClosureRegime() : scottClosureRegime())
    : (carrier.cofinality.kind === "predication.settling.cofinality.uncountable" ? aperiodicClosureRegime() : transfiniteClosureRegime());
  return Object.freeze({
    kind: "predication.settling.classification" as const,
    depth,
    regime,
    cofinality: carrier.cofinality,
    limitStages,
    nonScottFirings,
  });
}

export const settlingDepth = (carrier: SettlingCarrier): SettlingStageOrdinalCarrier => classifySettling(carrier).depth;

export const settlingDepthFiniteJudgment = (carrier: SettlingCarrier): SettlingFiniteStageJudgment =>
  settlingFiniteStageJudgment(settlingDepth(carrier));
