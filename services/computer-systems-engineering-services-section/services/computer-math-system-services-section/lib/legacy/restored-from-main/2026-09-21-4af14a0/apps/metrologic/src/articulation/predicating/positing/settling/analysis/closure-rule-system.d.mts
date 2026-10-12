/**
 * analysis/closure-rule-system - finite immediate-consequence operators.
 *
 * Executable shadow of RelMath.Closure.ClosureRuleSystem. Rules are represented
 * as positive finite threshold antecedents over FOUR-valued valuation cells, with
 * one consequent that raises a cell by knowledge join.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ValuationFiberCarrier } from "../../index.mjs";
import type { Cell } from "../../../predication.mjs";
/**
 * The earned runtime image of Lean's `PredicationCell`.  A closure system may
 * retain string keys for the finite valuation implementation, but admission of
 * a proof-traceable system starts from actual subject–predicate–object cells;
 * the key is derived structurally, never supplied as new metadata.
 */
export declare const predicationCellKey: (cell: Cell) => string;
export interface ClosureRuleCondition {
    readonly cell: string;
    readonly atLeast: ChargeValueName;
}
export interface ClosureRuleConsequent {
    readonly cell: string;
    readonly charge: ChargeValueName;
}
export interface ClosureRuleCarrier {
    readonly kind: "closureRule.rule.carrier";
    readonly name: string;
    readonly antecedent: readonly ClosureRuleCondition[];
    readonly consequent: ClosureRuleConsequent;
}
export interface ClosureRuleSystemCarrier {
    readonly kind: "closureRule.system.carrier";
    readonly cells: readonly string[];
    readonly rules: readonly ClosureRuleCarrier[];
}
/** A closure system whose finite carrier is explicitly the existing predication-cell carrier. */
export interface PredicationClosureRuleSystemCarrier extends ClosureRuleSystemCarrier {
    readonly predicationCells: readonly Cell[];
}
export interface ClosureRuleReceipt {
    readonly kind: "closureRule.system.receipt:witness";
    readonly system: ClosureRuleSystemCarrier;
    readonly seed: ValuationFiberCarrier;
    readonly orbit: readonly ValuationFiberCarrier[];
    readonly closed: ValuationFiberCarrier;
    readonly fixed: true;
    readonly inflationary: true;
    readonly monotone: true;
    readonly ruleRespecting: true;
    readonly leastClosed: true;
    /** Eventual finite runtime search reached a fixed point; not the Lean three-step theorem. */
    readonly eventualFixedPoint: true;
    readonly firedAtSeed: readonly string[];
}
/** The exact runtime premise required by `generated_closure_is_least` / `immediate_consequence_lfp`. */
export interface ThreeStepClosureReceipt {
    readonly kind: "closureRule.threeStep.receipt:theorem-aligned";
    readonly system: ClosureRuleSystemCarrier;
    readonly seed: ValuationFiberCarrier;
    readonly threeStep: ValuationFiberCarrier;
    readonly fixed: true;
    readonly theorem: "Obsmetrologia.Closure.RuleSystem.immediate_consequence_lfp";
}
export declare function closureRule(name: string, antecedent: readonly ClosureRuleCondition[], consequent: ClosureRuleConsequent): ClosureRuleCarrier;
export declare const alwaysRule: (cell: string, charge: ChargeValueName) => ClosureRuleCarrier;
export declare function closureRuleSystem(cells: readonly string[], rules: readonly ClosureRuleCarrier[]): ClosureRuleSystemCarrier;
/**
 * Typed admission path for `Obsmetrologia.Closure.RuleSystem`: its finite
 * valuation coordinates are derived from actual `PredicationCell`s.  The
 * restricted runtime rule language remains positive threshold firing over
 * FOUR-valued knowledge joins; no additional cell metadata is introduced.
 */
export declare function predicationClosureRuleSystem(predicationCells: readonly Cell[], rules: readonly ClosureRuleCarrier[]): PredicationClosureRuleSystemCarrier;
export declare function knowledgeLeastValuation(cells: readonly string[]): ValuationFiberCarrier;
export declare function valuation(cells: readonly string[], values: Readonly<Record<string, ChargeValueName>>): ValuationFiberCarrier;
export declare function antecedentHolds(rule: ClosureRuleCarrier, carrier: ValuationFiberCarrier): boolean;
export declare function ruleFire(rule: ClosureRuleCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function fire(system: ClosureRuleSystemCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function tstep(system: ClosureRuleSystemCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier;
export declare function closureOrbit(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier, maxSteps?: any): readonly ValuationFiberCarrier[];
/** The exact three-step `clS` definition used by the Lean RuleSystem module. */
export declare function clS(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier): ValuationFiberCarrier;
/** Eventual finite runtime closure; distinct from Lean's three-step `clS`. */
export declare function eventualClosure(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier): ValuationFiberCarrier;
/**
 * Lean's `clS` is exactly three `Tstep`s.  This receipt is intentionally
 * unavailable unless that candidate is fixed, the explicit `hfix` premise of
 * `generated_closure_is_least` and `immediate_consequence_lfp`.  Longer
 * cross-cell cascades remain available through `closureOrbit`/`closureRuleReceipt`
 * as eventual runtime closure, not as this theorem.
 */
export declare function threeStepClosureReceipt(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier): ThreeStepClosureReceipt;
export declare function firedRuleNames(system: ClosureRuleSystemCarrier, carrier: ValuationFiberCarrier): readonly string[];
export declare function closureRuleReceipt(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier): ClosureRuleReceipt;
export declare function alwaysRuleReceipt(cell?: string, charge?: ChargeValueName): ClosureRuleReceipt;
export declare const consequentJoin: (current: ChargeValueName, consequent: ChargeValueName) => ChargeValueName;
