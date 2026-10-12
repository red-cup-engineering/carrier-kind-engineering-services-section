/**
 * settling/valuation-consistency — per-assignment consistency of a valuation.
 *
 * Each assignment's charge is read through the linear-logic charge-consistency
 * judgment (a value is inconsistent exactly when both sides are present —
 * `stable`). The valuation splits into consistent and contradictory
 * subvaluations; the contradiction rank vanishes exactly when no assignment is
 * stable. Contradictions are kept as data, never thrown — the paraconsistent stance.
 */
import { type ChargeValue } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ChargeConsistencyJudgment } from "../logic/index.mjs";
import { type Natural } from "./analysis/exact-number.mjs";
import type { Meme, Valuation } from "../fiber.mjs";
/** A charge-consistent assignment. */
export interface ValuationAssignmentConsistencyWitness {
    readonly kind: "predication.valuation.consistency.assignment:witness";
    readonly assignment: Meme;
    readonly value: ChargeValue;
    readonly chargeConsistency: ChargeConsistencyJudgment;
}
/** A charge-contradictory assignment. */
export interface ValuationAssignmentContradictionWitness {
    readonly kind: "predication.valuation.consistency.assignmentContradiction:witness";
    readonly assignment: Meme;
    readonly value: ChargeValue;
    readonly chargeConsistency: ChargeConsistencyJudgment;
}
/** A per-assignment consistency reading. */
export type ValuationConsistencyJudgment = ValuationAssignmentConsistencyWitness | ValuationAssignmentContradictionWitness;
/** All per-assignment readings, with rank. */
export interface ValuationConsistencyReadingsCarrier {
    readonly kind: "predication.valuation.consistency.readings";
    readonly readings: readonly ValuationConsistencyJudgment[];
    readonly rank: Natural;
}
/** The consistent assignments, with rank. */
export interface ValuationConsistentAssignmentsCarrier {
    readonly kind: "predication.valuation.consistency.consistentAssignments";
    readonly readings: readonly ValuationAssignmentConsistencyWitness[];
    readonly rank: Natural;
}
/** The contradictory assignments, with rank. */
export interface ValuationContradictoryAssignmentsCarrier {
    readonly kind: "predication.valuation.consistency.contradictoryAssignments";
    readonly readings: readonly ValuationAssignmentContradictionWitness[];
    readonly rank: Natural;
}
/** The contradiction obstruction vanishes. */
export interface ValuationConsistencyVanishingWitness {
    readonly kind: "predication.valuation.consistency.vanishing:witness";
    readonly rank: Natural;
}
/** The contradiction obstruction does not vanish. */
export interface ValuationConsistencyVanishingObstruction {
    readonly kind: "predication.valuation.consistency.vanishing-obstruction";
    readonly rank: Natural;
    readonly contradictions: ValuationContradictoryAssignmentsCarrier;
}
/** Judgment on whether contradictions vanish. */
export type ValuationConsistencyVanishingJudgment = ValuationConsistencyVanishingWitness | ValuationConsistencyVanishingObstruction;
/** A valuation restricted to its consistent assignments. */
export interface ConsistentValuationSubcarrier {
    readonly kind: "predication.valuation.consistency.consistentSubvaluation";
    readonly valuation: Valuation;
    readonly assignments: ValuationConsistentAssignmentsCarrier;
}
/** A valuation restricted to its contradictory assignments. */
export interface ContradictoryValuationSubcarrier {
    readonly kind: "predication.valuation.consistency.contradictorySubvaluation";
    readonly valuation: Valuation;
    readonly assignments: ValuationContradictoryAssignmentsCarrier;
}
/** The full consistency analysis of a valuation. */
export interface PredicationValuationConsistencyCarrier {
    readonly kind: "predication.valuation.consistency.carrier";
    readonly valuation: Valuation;
    readonly assignmentReadings: ValuationConsistencyReadingsCarrier;
    readonly consistentAssignments: ValuationConsistentAssignmentsCarrier;
    readonly contradictoryAssignments: ValuationContradictoryAssignmentsCarrier;
    readonly contradictionRank: Natural;
    readonly vanishing: ValuationConsistencyVanishingJudgment;
    readonly consistentSubvaluation: ConsistentValuationSubcarrier;
    readonly contradictorySubvaluation: ContradictoryValuationSubcarrier;
}
/** Wrap per-assignment readings with rank. */
export declare const valuationConsistencyReadings: (readings: readonly ValuationConsistencyJudgment[]) => ValuationConsistencyReadingsCarrier;
/** Select the consistency witnesses. */
export declare const valuationConsistentAssignments: (readings: readonly ValuationConsistencyJudgment[]) => ValuationConsistentAssignmentsCarrier;
/** Select the contradiction witnesses. */
export declare const valuationContradictoryAssignments: (readings: readonly ValuationConsistencyJudgment[]) => ValuationContradictoryAssignmentsCarrier;
/** A consistent-valuation subcarrier. */
export declare const consistentValuationSubcarrier: (valuation: Valuation, assignments: ValuationConsistentAssignmentsCarrier) => ConsistentValuationSubcarrier;
/** A contradictory-valuation subcarrier. */
export declare const contradictoryValuationSubcarrier: (valuation: Valuation, assignments: ValuationContradictoryAssignmentsCarrier) => ContradictoryValuationSubcarrier;
/** Decide vanishing from a contradictory-assignments carrier. */
export declare const valuationConsistencyVanishing: (contradictions: ValuationContradictoryAssignmentsCarrier) => ValuationConsistencyVanishingJudgment;
/** The full consistency analysis of a valuation. */
export declare function valuationConsistency(valuation: Valuation): PredicationValuationConsistencyCarrier;
