/**
 * @packageDocumentation
 *
 * settling/fixed-point-gap — the gap between least and greatest fixed points.
 *
 * Per cell, compares the least extremum's charge to the coincident greatest
 * charge: a closure witness when they agree, an opening obstruction when they
 * differ, a missing-greatest obstruction when the greatest has no coincident
 * cell, and a missing-least obstruction for an unmatched greatest cell. The gap
 * vanishes exactly when both supports and charge values agree — the bilattice
 * interval collapses to a point.
 */
import { sameChargeValue, valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { cellCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { count, natIsZero } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { rankedReadings, selectRankedReadings } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/carrier";
/** Build a gap input from one order interval. */
export function fixedPointGapInput(order, least, greatest) {
    return Object.freeze({ kind: "predication.valuation.fixedPoint.gap.input", order, least, greatest });
}
/** Wrap cell readings with rank. */
export const fixedPointGapCellReadings = (readings) => rankedReadings("predication.valuation.fixedPoint.gap.cellReadings", readings);
/** Select the closure witnesses. */
export const fixedPointGapCellClosures = (readings) => selectRankedReadings("predication.valuation.fixedPoint.gap.cellClosures", readings, (reading) => reading.kind === "predication.valuation.fixedPoint.gap.cellClosure:witness");
/** Select the opening obstructions. */
export const fixedPointGapCellOpenings = (readings) => selectRankedReadings("predication.valuation.fixedPoint.gap.cellOpenings", readings, (reading) => reading.kind === "predication.valuation.fixedPoint.gap.cellOpening-obstruction");
/** Select the missing-greatest obstructions. */
export const fixedPointGapMissingGreatestCells = (readings) => selectRankedReadings("predication.valuation.fixedPoint.gap.missingGreatestCells", readings, (reading) => reading.kind === "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction");
/** Select the missing-least obstructions. */
export const fixedPointGapMissingLeastCells = (readings) => selectRankedReadings("predication.valuation.fixedPoint.gap.missingLeastCells", readings, (reading) => reading.kind === "predication.valuation.fixedPoint.gap.cellMissingLeast-obstruction");
/** Combine openings and unmatched cells into one obstructions carrier. */
export const fixedPointGapCellObstructions = (openings, missingGreatest, missingLeast = fixedPointGapMissingLeastCells([])) => {
    const obstructions = Object.freeze([...openings.readings, ...missingGreatest.readings, ...missingLeast.readings]);
    return Object.freeze({
        kind: "predication.valuation.fixedPoint.gap.cellObstructions",
        readings: obstructions,
        rank: count(obstructions),
        openings,
        missingGreatest,
        missingLeast,
    });
};
/** Judge vanishing from an obstructions carrier. */
export const fixedPointGapVanishing = (obstructions) => natIsZero(obstructions.rank)
    ? Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing:witness", rank: obstructions.rank })
    : Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction", rank: obstructions.rank, obstructions });
/** Compute the gap between an order's least and greatest extrema. */
export function fixedPointGap(input) {
    const least = input.least;
    const greatest = input.greatest;
    const greatestAssignments = greatest.sheaf.section.fibers.flatMap((fiber) => fiber.assignments);
    const leastAssignments = least.sheaf.section.fibers.flatMap((fiber) => fiber.assignments);
    const readings = [];
    for (const fiber of least.sheaf.section.fibers) {
        for (const assignment of fiber.assignments) {
            const greatestCharge = greatestAssignments.find((candidate) => cellCoincides(candidate.cell, assignment.cell))?.charge;
            if (!greatestCharge) {
                readings.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction", cell: assignment.cell, least: assignment.charge }));
                continue;
            }
            if (sameChargeValue(valueOf(assignment.charge), valueOf(greatestCharge))) {
                readings.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellClosure:witness", cell: assignment.cell, least: assignment.charge, greatest: greatestCharge }));
                continue;
            }
            readings.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction", cell: assignment.cell, least: assignment.charge, greatest: greatestCharge }));
        }
    }
    for (const assignment of greatestAssignments) {
        if (!leastAssignments.some((candidate) => cellCoincides(candidate.cell, assignment.cell))) {
            readings.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellMissingLeast-obstruction", cell: assignment.cell, greatest: assignment.charge }));
        }
    }
    const cellReadings = fixedPointGapCellReadings(readings);
    const closures = fixedPointGapCellClosures(readings);
    const openings = fixedPointGapCellOpenings(readings);
    const missingGreatest = fixedPointGapMissingGreatestCells(readings);
    const missingLeast = fixedPointGapMissingLeastCells(readings);
    const obstructions = fixedPointGapCellObstructions(openings, missingGreatest, missingLeast);
    return Object.freeze({
        kind: "predication.valuation.fixedPoint.gap.carrier",
        order: input.order,
        least,
        greatest,
        cellReadings,
        closures,
        openings,
        missingGreatest,
        missingLeast,
        obstructions,
        rank: obstructions.rank,
        vanishing: fixedPointGapVanishing(obstructions),
    });
}
