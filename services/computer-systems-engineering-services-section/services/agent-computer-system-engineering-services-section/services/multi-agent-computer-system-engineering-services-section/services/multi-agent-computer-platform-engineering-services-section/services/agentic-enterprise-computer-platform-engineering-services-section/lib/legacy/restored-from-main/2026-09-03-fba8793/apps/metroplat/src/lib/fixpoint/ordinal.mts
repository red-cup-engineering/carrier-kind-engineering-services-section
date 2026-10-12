/**
 * settling/ordinal — settling-stage ordinals and cofinality.
 *
 * Wraps the closure ordinals as settling-stage coordinates (initial, successor,
 * limit), the countable/uncountable cofinality witnesses, and the finitude
 * judgment on a stage ordinal.
 */
import { natEqual, type Natural } from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
import { finiteOrdinalJudgment, limitOrdinal, successorOrdinal, zeroOrdinal, type Ordinal, type OrdinalLabel } from "./closure.mts";
import type {
  CountableSettlingCofinality,
  SettlingFiniteStageJudgment,
  SettlingStage,
  SettlingStageOrdinal,
  UncountableSettlingCofinality,
} from "../settlement.mts";

/** The stage ordinal for the initial stage (zero ordinal). */
export const initialSettlingStageOrdinal: SettlingStageOrdinal = Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: zeroOrdinal,
});

/** Wrap an ordinal as a settling stage ordinal. */
export const settlingStageOrdinal = (ordinal: Ordinal): SettlingStageOrdinal => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal,
});

/** The stage ordinal for the successor of a stage's ordinal. */
export const successorSettlingStageOrdinal = (stage: SettlingStageOrdinal): SettlingStageOrdinal => Object.freeze({
  kind: "predication.settling.stageOrdinal" as const,
  ordinal: successorOrdinal(stage.ordinal),
});

/** The stage ordinal for a limit ordinal from a label and fundamental sequence. */
export const limitSettlingStageOrdinal = (
  label: OrdinalLabel,
  fundamentalSequence: (n: Natural) => Ordinal,
): SettlingStageOrdinal => settlingStageOrdinal(limitOrdinal(label, fundamentalSequence));

/** Countable cofinality witness. */
export const countableSettlingCofinality: CountableSettlingCofinality = Object.freeze({
  kind: "predication.settling.cofinality.countable" as const,
});

/** Uncountable cofinality witness. */
export const uncountableSettlingCofinality: UncountableSettlingCofinality = Object.freeze({
  kind: "predication.settling.cofinality.uncountable" as const,
});

/** Judge whether a stage ordinal (or stage) is finite. */
export function judgeFinitudeOfSettlingStage(stage: SettlingStageOrdinal | SettlingStage): SettlingFiniteStageJudgment {
  const stageOrdinal = stage.kind === "predication.settling.stage" ? stage.ordinal : stage;
  const reading = finiteOrdinalJudgment(stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({ kind: "predication.settling.finiteStage:witness" as const, stage: stageOrdinal, value: reading.value })
    : Object.freeze({ kind: "predication.settling.finiteStage-obstruction" as const, stage: stageOrdinal, reading });
}

/** Whether two stage ordinals are both finite and equal in value. */
export function settlingStageOrdinalCoincidenceHolds(left: SettlingStageOrdinal, right: SettlingStageOrdinal): boolean {
  const leftFinite = judgeFinitudeOfSettlingStage(left);
  const rightFinite = judgeFinitudeOfSettlingStage(right);
  return leftFinite.kind === "predication.settling.finiteStage:witness"
    && rightFinite.kind === "predication.settling.finiteStage:witness"
    && natEqual(leftFinite.value, rightFinite.value);
}
