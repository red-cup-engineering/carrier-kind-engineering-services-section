/**
 * settling/valuation-consistency — per-assignment consistency of a valuation.
 *
 * Each assignment's charge is read through the linear-logic charge-consistency
 * judgment (a value is inconsistent exactly when both sides are present —
 * `stable`). The valuation splits into consistent and contradictory
 * subvaluations; the contradiction rank vanishes exactly when no assignment is
 * stable. Contradictions are kept as data, never thrown — the paraconsistent stance.
 */
import { sameCharge, valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { chargeConsistency } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-linear-logic";
import { natIsZero } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { cellCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { rankedReadings, selectRankedReadings } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/carrier";
function valuationAssignments(valuation) {
    return Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));
}
const valuationAssignmentCoincidenceHolds = (left, right) => cellCoincides(left.cell, right.cell) && sameCharge(left.charge, right.charge);
const readingMatchesAssignment = (reading, assignment) => valuationAssignmentCoincidenceHolds(reading.assignment, assignment);
/** Wrap per-assignment readings with rank. */
export const valuationConsistencyReadings = (readings) => rankedReadings("predication.valuation.consistency.readings", readings);
/** Select the consistency witnesses. */
export const valuationConsistentAssignments = (readings) => selectRankedReadings("predication.valuation.consistency.consistentAssignments", readings, (reading) => reading.kind === "predication.valuation.consistency.assignment:witness");
/** Select the contradiction witnesses. */
export const valuationContradictoryAssignments = (readings) => selectRankedReadings("predication.valuation.consistency.contradictoryAssignments", readings, (reading) => reading.kind === "predication.valuation.consistency.assignmentContradiction:witness");
const subvaluationOfReadings = (valuation, readings) => Object.freeze({
    ...valuation,
    fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
        ...fiber,
        assignments: Object.freeze(fiber.assignments.filter((assignment) => readings.some((reading) => readingMatchesAssignment(reading, assignment)))),
    }))),
});
/** A consistent-valuation subcarrier. */
export const consistentValuationSubcarrier = (valuation, assignments) => Object.freeze({ kind: "predication.valuation.consistency.consistentSubvaluation", valuation: subvaluationOfReadings(valuation, assignments.readings), assignments });
/** A contradictory-valuation subcarrier. */
export const contradictoryValuationSubcarrier = (valuation, assignments) => Object.freeze({ kind: "predication.valuation.consistency.contradictorySubvaluation", valuation: subvaluationOfReadings(valuation, assignments.readings), assignments });
/** Decide vanishing from a contradictory-assignments carrier. */
export const valuationConsistencyVanishing = (contradictions) => natIsZero(contradictions.rank)
    ? Object.freeze({ kind: "predication.valuation.consistency.vanishing:witness", rank: contradictions.rank })
    : Object.freeze({ kind: "predication.valuation.consistency.vanishing-obstruction", rank: contradictions.rank, contradictions });
/** The full consistency analysis of a valuation. */
export function valuationConsistency(valuation) {
    const readings = Object.freeze(valuationAssignments(valuation).map((assignment) => {
        const value = valueOf(assignment.charge);
        const consistency = chargeConsistency(value);
        return consistency.kind === "bilattice.linearLogic.chargeConsistency:witness"
            ? Object.freeze({ kind: "predication.valuation.consistency.assignment:witness", assignment, value, chargeConsistency: consistency })
            : Object.freeze({ kind: "predication.valuation.consistency.assignmentContradiction:witness", assignment, value, chargeConsistency: consistency });
    }));
    const assignmentReadings = valuationConsistencyReadings(readings);
    const consistentAssignments = valuationConsistentAssignments(readings);
    const contradictoryAssignments = valuationContradictoryAssignments(readings);
    return Object.freeze({
        kind: "predication.valuation.consistency.carrier",
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
