import { sameCharge, valueOf, type ChargeValue } from "@emsenn/meme-algebra";
import { chargeConsistency, type ChargeConsistencyJudgment } from "@emsenn/meme-logic";
import { fromCount, natIsZero, type Natural } from "@emsenn/meme-algebra";
import { predicationCellCoincidenceHolds } from "@emsenn/meme-algebra";
import type { FiberAlgebra, Meme, Valuation } from "./predication-fiber.mjs";

export interface ValuationAssignmentConsistencyWitness {
  readonly kind: "predication.valuation.consistency.assignment:witness";
  readonly assignment: Meme;
  readonly value: ChargeValue;
  readonly chargeConsistency: ChargeConsistencyJudgment;
}

export interface ValuationAssignmentContradictionWitness {
  readonly kind: "predication.valuation.consistency.assignmentContradiction:witness";
  readonly assignment: Meme;
  readonly value: ChargeValue;
  readonly chargeConsistency: ChargeConsistencyJudgment;
}

export type ValuationConsistencyJudgment =
  | ValuationAssignmentConsistencyWitness
  | ValuationAssignmentContradictionWitness;

export interface ValuationConsistencyReadingsCarrier {
  readonly kind: "predication.valuation.consistency.readings";
  readonly readings: readonly ValuationConsistencyJudgment[];
  readonly rank: Natural;
}

export interface ValuationConsistentAssignmentsCarrier {
  readonly kind: "predication.valuation.consistency.consistentAssignments";
  readonly readings: readonly ValuationAssignmentConsistencyWitness[];
  readonly rank: Natural;
}

export interface ValuationContradictoryAssignmentsCarrier {
  readonly kind: "predication.valuation.consistency.contradictoryAssignments";
  readonly readings: readonly ValuationAssignmentContradictionWitness[];
  readonly rank: Natural;
}

export interface ValuationConsistencyVanishingWitness {
  readonly kind: "predication.valuation.consistency.vanishing:witness";
  readonly rank: Natural;
}

export interface ValuationConsistencyVanishingObstruction {
  readonly kind: "predication.valuation.consistency.vanishing-obstruction";
  readonly rank: Natural;
  readonly contradictions: ValuationContradictoryAssignmentsCarrier;
}

export type ValuationConsistencyVanishingJudgment =
  | ValuationConsistencyVanishingWitness
  | ValuationConsistencyVanishingObstruction;

export interface ConsistentValuationSubcarrier {
  readonly kind: "predication.valuation.consistency.consistentSubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationConsistentAssignmentsCarrier;
}

export interface ContradictoryValuationSubcarrier {
  readonly kind: "predication.valuation.consistency.contradictorySubvaluation";
  readonly valuation: Valuation;
  readonly assignments: ValuationContradictoryAssignmentsCarrier;
}

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

function valuationAssignments(valuation: Valuation): readonly Meme[] {
  return Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));
}

const valuationAssignmentCoincidenceHolds = (left: Meme, right: Meme): boolean =>
  predicationCellCoincidenceHolds(left.cell, right.cell) && sameCharge(left.charge, right.charge);

const readingMatchesAssignment = (reading: ValuationConsistencyJudgment, assignment: Meme): boolean =>
  valuationAssignmentCoincidenceHolds(reading.assignment, assignment);

export const valuationConsistencyReadings = (
  readings: readonly ValuationConsistencyJudgment[],
): ValuationConsistencyReadingsCarrier => Object.freeze({
  kind: "predication.valuation.consistency.readings" as const,
  readings: Object.freeze([...readings]),
  rank: fromCount(readings.length),
});

export const valuationConsistentAssignments = (
  readings: readonly ValuationConsistencyJudgment[],
): ValuationConsistentAssignmentsCarrier => {
  const consistentReadings = Object.freeze(readings.filter((reading): reading is ValuationAssignmentConsistencyWitness =>
    reading.kind === "predication.valuation.consistency.assignment:witness"));
  return Object.freeze({
    kind: "predication.valuation.consistency.consistentAssignments" as const,
    readings: consistentReadings,
    rank: fromCount(consistentReadings.length),
  });
};

export const valuationContradictoryAssignments = (
  readings: readonly ValuationConsistencyJudgment[],
): ValuationContradictoryAssignmentsCarrier => {
  const contradictoryReadings = Object.freeze(readings.filter((reading): reading is ValuationAssignmentContradictionWitness =>
    reading.kind === "predication.valuation.consistency.assignmentContradiction:witness"));
  return Object.freeze({
    kind: "predication.valuation.consistency.contradictoryAssignments" as const,
    readings: contradictoryReadings,
    rank: fromCount(contradictoryReadings.length),
  });
};

const subvaluationOfReadings = (
  valuation: Valuation,
  readings: readonly ValuationConsistencyJudgment[],
): Valuation => {
  return Object.freeze({
    ...valuation,
    fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
      ...fiber,
      assignments: Object.freeze(fiber.assignments.filter((assignment) =>
        readings.some((reading) => readingMatchesAssignment(reading, assignment)))),
    }) satisfies FiberAlgebra)),
  });
};

export const consistentValuationSubcarrier = (
  valuation: Valuation,
  assignments: ValuationConsistentAssignmentsCarrier,
): ConsistentValuationSubcarrier => Object.freeze({
  kind: "predication.valuation.consistency.consistentSubvaluation" as const,
  valuation: subvaluationOfReadings(valuation, assignments.readings),
  assignments,
});

export const contradictoryValuationSubcarrier = (
  valuation: Valuation,
  assignments: ValuationContradictoryAssignmentsCarrier,
): ContradictoryValuationSubcarrier => Object.freeze({
  kind: "predication.valuation.consistency.contradictorySubvaluation" as const,
  valuation: subvaluationOfReadings(valuation, assignments.readings),
  assignments,
});

export const valuationConsistencyVanishing = (
  contradictions: ValuationContradictoryAssignmentsCarrier,
): ValuationConsistencyVanishingJudgment =>
  natIsZero(contradictions.rank)
    ? Object.freeze({ kind: "predication.valuation.consistency.vanishing:witness" as const, rank: contradictions.rank })
    : Object.freeze({
      kind: "predication.valuation.consistency.vanishing-obstruction" as const,
      rank: contradictions.rank,
      contradictions,
    });

export function valuationConsistency(valuation: Valuation): PredicationValuationConsistencyCarrier {
  const readings = Object.freeze(valuationAssignments(valuation).map((assignment): ValuationConsistencyJudgment => {
    const value = valueOf(assignment.charge);
    const consistency = chargeConsistency(value);
    return consistency.kind === "bilattice.linearLogic.chargeConsistency:witness"
      ? Object.freeze({
        kind: "predication.valuation.consistency.assignment:witness" as const,
        assignment,
        value,
        chargeConsistency: consistency,
      })
      : Object.freeze({
        kind: "predication.valuation.consistency.assignmentContradiction:witness" as const,
        assignment,
        value,
        chargeConsistency: consistency,
      });
  }));
  const assignmentReadings = valuationConsistencyReadings(readings);
  const consistentAssignments = valuationConsistentAssignments(readings);
  const contradictoryAssignments = valuationContradictoryAssignments(readings);
  return Object.freeze({
    kind: "predication.valuation.consistency.carrier" as const,
    valuation,
    assignmentReadings,
    consistentAssignments,
    contradictoryAssignments,
    contradictionRank: contradictoryAssignments.rank,
    vanishing: valuationConsistencyVanishing(contradictoryAssignments),
    consistentSubvaluation: consistentValuationSubcarrier(valuation, consistentAssignments),
    contradictorySubvaluation: contradictoryValuationSubcarrier(valuation, contradictoryAssignments),
  });
}
