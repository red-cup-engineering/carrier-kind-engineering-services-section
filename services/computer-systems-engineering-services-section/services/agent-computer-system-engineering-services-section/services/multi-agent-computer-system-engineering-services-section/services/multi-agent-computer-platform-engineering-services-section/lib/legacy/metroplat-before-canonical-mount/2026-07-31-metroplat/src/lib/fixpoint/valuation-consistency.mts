/**
 * settling/valuation-consistency — per-assignment consistency of a valuation.
 *
 * Each assignment's charge is read through the linear-logic charge-consistency
 * judgment (a value is inconsistent exactly when both sides are present —
 * `contested`). The valuation splits into consistent and contradictory
 * subvaluations; the contradiction rank vanishes exactly when no assignment is
 * contested. Contradictions are kept as data, never thrown — the paraconsistent stance.
 */
import { sameCharge, valueOf, type ChargeValue } from "../values/index.mts";
import { chargeConsistency, type ChargeConsistencyJudgment } from "../logic/predicating/evidence/logic/index.mts";
import { natIsZero, type Natural } from "../math/rational/exact-number.mts";
import { cellCoincides } from "../logic/predicating/predication.mts";
import { rankedJudgments, selectRankedJudgments } from "./ranked-judgments.mts";
import type { FiberAlgebra, Meme, Valuation } from "../logic/predicating/evidence/fiber.mts";

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

/** A per-assignment consistency judgment. */
export type ValuationConsistencyJudgment = ValuationAssignmentConsistencyWitness | ValuationAssignmentContradictionWitness;

/** All per-assignment judgments, with rank. */
export interface ValuationConsistencyJudgments {
  readonly kind: "predication.valuation.consistency.judgments";
  readonly judgments: readonly ValuationConsistencyJudgment[];
  readonly rank: Natural;
}

/** The consistent assignments, with rank. */
export interface ValuationConsistentAssignments {
  readonly kind: "predication.valuation.consistency.consistentAssignments";
  readonly judgments: readonly ValuationAssignmentConsistencyWitness[];
  readonly rank: Natural;
}

/** The contradictory assignments, with rank. */
export interface ValuationContradictoryAssignments {
  readonly kind: "predication.valuation.consistency.contradictoryAssignments";
  readonly judgments: readonly ValuationAssignmentContradictionWitness[];
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
  readonly contradictions: ValuationContradictoryAssignments;
}

/** Judgment on whether contradictions vanish. */
export type ValuationConsistencyVanishingJudgment = ValuationConsistencyVanishingWitness | ValuationConsistencyVanishingObstruction;

/** A valuation restricted to its consistent assignments. */
export interface ConsistentValuationSubvaluation {
  readonly kind: "predication.valuation.consistency.consistentSubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationConsistentAssignments;
}

/** A valuation restricted to its contradictory assignments. */
export interface ContradictoryValuationSubvaluation {
  readonly kind: "predication.valuation.consistency.contradictorySubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationContradictoryAssignments;
}

/** The full consistency analysis of a valuation. */
export interface PredicationValuationConsistencyReport {
  readonly kind: "predication.valuation.consistency.report";
  readonly valuation: Valuation;
  readonly assignmentJudgments: ValuationConsistencyJudgments;
  readonly consistentAssignments: ValuationConsistentAssignments;
  readonly contradictoryAssignments: ValuationContradictoryAssignments;
  readonly contradictionRank: Natural;
  readonly vanishing: ValuationConsistencyVanishingJudgment;
  readonly consistentSubvaluation: ConsistentValuationSubvaluation;
  readonly contradictorySubvaluation: ContradictoryValuationSubvaluation;
}

function valuationAssignments(valuation: Valuation): readonly Meme[] {
  return Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));
}

const valuationAssignmentCoincidenceHolds = (left: Meme, right: Meme): boolean =>
  cellCoincides(left.cell, right.cell) && sameCharge(left.charge, right.charge);

const judgmentMatchesAssignment = (judgment: ValuationConsistencyJudgment, assignment: Meme): boolean =>
  valuationAssignmentCoincidenceHolds(judgment.assignment, assignment);

/** Wrap per-assignment judgments with rank. */
export const valuationConsistencyJudgments = (judgments: readonly ValuationConsistencyJudgment[]): ValuationConsistencyJudgments =>
  rankedJudgments("predication.valuation.consistency.judgments", judgments);

/** Select the consistency witnesses. */
export const valuationConsistentAssignments = (judgments: readonly ValuationConsistencyJudgment[]): ValuationConsistentAssignments =>
  selectRankedJudgments("predication.valuation.consistency.consistentAssignments", judgments,
    (judgment): judgment is ValuationAssignmentConsistencyWitness => judgment.kind === "predication.valuation.consistency.assignment:witness");

/** Select the contradiction witnesses. */
export const valuationContradictoryAssignments = (judgments: readonly ValuationConsistencyJudgment[]): ValuationContradictoryAssignments =>
  selectRankedJudgments("predication.valuation.consistency.contradictoryAssignments", judgments,
    (judgment): judgment is ValuationAssignmentContradictionWitness => judgment.kind === "predication.valuation.consistency.assignmentContradiction:witness");

const subvaluationOfJudgments = (valuation: Valuation, judgments: readonly ValuationConsistencyJudgment[]): Valuation =>
  Object.freeze({
    ...valuation,
    fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
      ...fiber,
      assignments: Object.freeze(fiber.assignments.filter((assignment) => judgments.some((judgment) => judgmentMatchesAssignment(judgment, assignment)))),
    }) satisfies FiberAlgebra)),
  });

/** A consistent-valuation subvaluation. */
export const consistentValuationSubvaluation = (valuation: Valuation, assignments: ValuationConsistentAssignments): ConsistentValuationSubvaluation =>
  Object.freeze({ kind: "predication.valuation.consistency.consistentSubvaluation" as const, valuation: subvaluationOfJudgments(valuation, assignments.judgments), assignments });

/** A contradictory-valuation subvaluation. */
export const contradictoryValuationSubvaluation = (valuation: Valuation, assignments: ValuationContradictoryAssignments): ContradictoryValuationSubvaluation =>
  Object.freeze({ kind: "predication.valuation.consistency.contradictorySubvaluation" as const, valuation: subvaluationOfJudgments(valuation, assignments.judgments), assignments });

/** Decide vanishing from a contradictory-assignments partition. */
export const valuationConsistencyVanishing = (contradictions: ValuationContradictoryAssignments): ValuationConsistencyVanishingJudgment =>
  natIsZero(contradictions.rank)
    ? Object.freeze({ kind: "predication.valuation.consistency.vanishing:witness" as const, rank: contradictions.rank })
    : Object.freeze({ kind: "predication.valuation.consistency.vanishing-obstruction" as const, rank: contradictions.rank, contradictions });

/** The full consistency analysis of a valuation. */
export function valuationConsistency(valuation: Valuation): PredicationValuationConsistencyReport {
  const judgments = Object.freeze(valuationAssignments(valuation).map((assignment): ValuationConsistencyJudgment => {
    const value = valueOf(assignment.charge);
    const consistency = chargeConsistency(value);
    return consistency.kind === "bilattice.linearLogic.chargeConsistency:witness"
      ? Object.freeze({ kind: "predication.valuation.consistency.assignment:witness" as const, assignment, value, chargeConsistency: consistency })
      : Object.freeze({ kind: "predication.valuation.consistency.assignmentContradiction:witness" as const, assignment, value, chargeConsistency: consistency });
  }));
  const assignmentJudgments = valuationConsistencyJudgments(judgments);
  const consistentAssignments = valuationConsistentAssignments(judgments);
  const contradictoryAssignments = valuationContradictoryAssignments(judgments);
  return Object.freeze({
    kind: "predication.valuation.consistency.report" as const,
    valuation,
    assignmentJudgments,
    consistentAssignments,
    contradictoryAssignments,
    contradictionRank: contradictoryAssignments.rank,
    vanishing: valuationConsistencyVanishing(contradictoryAssignments),
    consistentSubvaluation: consistentValuationSubvaluation(valuation, consistentAssignments),
    contradictorySubvaluation: contradictoryValuationSubvaluation(valuation, contradictoryAssignments),
  });
}
