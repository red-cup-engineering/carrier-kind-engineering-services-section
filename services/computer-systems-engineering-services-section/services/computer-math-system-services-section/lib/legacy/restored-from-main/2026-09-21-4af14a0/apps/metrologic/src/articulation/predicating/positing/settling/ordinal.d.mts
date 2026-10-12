/**
 * settling/ordinal — settling-stage ordinal carriers and cofinality.
 *
 * Wraps the closure ordinals as settling-stage coordinates (initial, successor,
 * limit), the countable/uncountable cofinality witnesses, and the finitude
 * judgment on a stage ordinal.
 */
import { type Natural } from "./analysis/exact-number.mjs";
import { type Ordinal, type OrdinalLabel } from "./closure.mjs";
import type { CountableSettlingCofinalityCarrier, SettlingFiniteStageJudgment, SettlingStage, SettlingStageOrdinalCarrier, UncountableSettlingCofinalityCarrier } from "./object.mjs";
/** The stage ordinal carrier for the initial stage (zero ordinal). */
export declare const initialSettlingStageOrdinal: SettlingStageOrdinalCarrier;
/** Wrap an ordinal as a settling stage ordinal carrier. */
export declare const settlingStageOrdinal: (ordinal: Ordinal) => SettlingStageOrdinalCarrier;
/** The stage ordinal carrier for the successor of a stage's ordinal. */
export declare const successorSettlingStageOrdinal: (stage: SettlingStageOrdinalCarrier) => SettlingStageOrdinalCarrier;
/** The stage ordinal carrier for a limit ordinal from a label and fundamental sequence. */
export declare const limitSettlingStageOrdinal: (label: OrdinalLabel, fundamentalSequence: (n: Natural) => Ordinal) => SettlingStageOrdinalCarrier;
/** Countable cofinality witness. */
export declare const countableSettlingCofinality: CountableSettlingCofinalityCarrier;
/** Uncountable cofinality witness. */
export declare const uncountableSettlingCofinality: UncountableSettlingCofinalityCarrier;
/** Judge whether a stage ordinal (or stage) is finite. */
export declare function judgeFinitudeOfSettlingStage(stage: SettlingStageOrdinalCarrier | SettlingStage): SettlingFiniteStageJudgment;
/** Whether two stage ordinals are both finite and equal in value. */
export declare function settlingStageOrdinalCoincidenceHolds(left: SettlingStageOrdinalCarrier, right: SettlingStageOrdinalCarrier): boolean;
