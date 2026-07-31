import { sameChargeValue, valueOf, type ChargeCarrier } from "@emsenn/meme-algebra";
import { predicationCellCoincidenceHolds } from "@emsenn/meme-algebra";
import { fromCount, natIsZero, type Natural } from "@emsenn/meme-algebra";
import type { Cell } from "@emsenn/meme-algebra";
import type {
  FixedPointExtremum,
  FixedPointOrderCarrier,
  FixedPointOrderObject,
} from "./predication-valuation-fixed-point.mjs";

export interface FixedPointGapCellClosureWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosure:witness";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
  readonly greatest: ChargeCarrier;
}

export interface FixedPointGapCellOpeningObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
  readonly greatest: ChargeCarrier;
}

export interface FixedPointGapCellMissingGreatestObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction";
  readonly cell: Cell;
  readonly least: ChargeCarrier;
}

export type FixedPointGapCellReading =
  | FixedPointGapCellClosureWitness
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

export type FixedPointGapCellObstruction =
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

export interface FixedPointGapCellReadingsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellReadings";
  readonly readings: readonly FixedPointGapCellReading[];
  readonly rank: Natural;
}

export interface FixedPointGapCellClosuresCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosures";
  readonly readings: readonly FixedPointGapCellClosureWitness[];
  readonly rank: Natural;
}

export interface FixedPointGapCellOpeningsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpenings";
  readonly readings: readonly FixedPointGapCellOpeningObstruction[];
  readonly rank: Natural;
}

export interface FixedPointGapMissingGreatestCellsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.missingGreatestCells";
  readonly readings: readonly FixedPointGapCellMissingGreatestObstruction[];
  readonly rank: Natural;
}

export interface FixedPointGapCellObstructionsCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.cellObstructions";
  readonly readings: readonly FixedPointGapCellObstruction[];
  readonly rank: Natural;
  readonly openings: FixedPointGapCellOpeningsCarrier;
  readonly missingGreatest: FixedPointGapMissingGreatestCellsCarrier;
}

export interface FixedPointGapVanishingWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing:witness";
  readonly rank: Natural;
}

export interface FixedPointGapVanishingObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction";
  readonly rank: Natural;
  readonly obstructions: FixedPointGapCellObstructionsCarrier;
}

export type FixedPointGapVanishingJudgment = FixedPointGapVanishingWitness | FixedPointGapVanishingObstruction;

export interface FixedPointGapCarrier {
  readonly kind: "predication.valuation.fixedPoint.gap.carrier";
  readonly order: FixedPointOrderObject;
  readonly fixedPointOrder: FixedPointOrderCarrier;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
  readonly cellReadings: FixedPointGapCellReadingsCarrier;
  readonly closures: FixedPointGapCellClosuresCarrier;
  readonly openings: FixedPointGapCellOpeningsCarrier;
  readonly missingGreatest: FixedPointGapMissingGreatestCellsCarrier;
  readonly obstructions: FixedPointGapCellObstructionsCarrier;
  readonly rank: Natural;
  readonly vanishing: FixedPointGapVanishingJudgment;
}

export interface FixedPointGapInput {
  readonly kind: "predication.valuation.fixedPoint.gap.input";
  readonly order: FixedPointOrderCarrier;
}

export function fixedPointGapInput(order: FixedPointOrderCarrier): FixedPointGapInput {
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.input" as const,
    order,
  });
}

export const fixedPointGapCellReadings = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapCellReadingsCarrier => Object.freeze({
  kind: "predication.valuation.fixedPoint.gap.cellReadings" as const,
  readings: Object.freeze([...readings]),
  rank: fromCount(readings.length),
});

export const fixedPointGapCellClosures = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapCellClosuresCarrier => {
  const closures = Object.freeze(readings.filter((reading): reading is FixedPointGapCellClosureWitness =>
    reading.kind === "predication.valuation.fixedPoint.gap.cellClosure:witness"));
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.cellClosures" as const,
    readings: closures,
    rank: fromCount(closures.length),
  });
};

export const fixedPointGapCellOpenings = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapCellOpeningsCarrier => {
  const openings = Object.freeze(readings.filter((reading): reading is FixedPointGapCellOpeningObstruction =>
    reading.kind === "predication.valuation.fixedPoint.gap.cellOpening-obstruction"));
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.cellOpenings" as const,
    readings: openings,
    rank: fromCount(openings.length),
  });
};

export const fixedPointGapMissingGreatestCells = (
  readings: readonly FixedPointGapCellReading[],
): FixedPointGapMissingGreatestCellsCarrier => {
  const missingGreatest = Object.freeze(readings.filter((reading): reading is FixedPointGapCellMissingGreatestObstruction =>
    reading.kind === "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction"));
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.missingGreatestCells" as const,
    readings: missingGreatest,
    rank: fromCount(missingGreatest.length),
  });
};

export const fixedPointGapCellObstructions = (
  openings: FixedPointGapCellOpeningsCarrier,
  missingGreatest: FixedPointGapMissingGreatestCellsCarrier,
): FixedPointGapCellObstructionsCarrier => {
  const obstructions = Object.freeze([...openings.readings, ...missingGreatest.readings]);
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.cellObstructions" as const,
    readings: obstructions,
    rank: fromCount(obstructions.length),
    openings,
    missingGreatest,
  });
};

export const fixedPointGapVanishing = (
  obstructions: FixedPointGapCellObstructionsCarrier,
): FixedPointGapVanishingJudgment =>
  natIsZero(obstructions.rank)
    ? Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing:witness" as const, rank: obstructions.rank })
    : Object.freeze({
      kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction" as const,
      rank: obstructions.rank,
      obstructions,
    });

export function fixedPointGap(input: FixedPointGapInput): FixedPointGapCarrier {
  const least = input.order.least;
  const greatest = input.order.greatest;
  const greatestAssignments = greatest.sheaf.section.fibers.flatMap((fiber) => fiber.assignments);
  const readings: FixedPointGapCellReading[] = [];
  for (const fiber of least.sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const greatestCharge = greatestAssignments.find((candidate) => predicationCellCoincidenceHolds(candidate.cell, assignment.cell))?.charge;
      if (!greatestCharge) {
        const missing = Object.freeze({
          kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction" as const,
          cell: assignment.cell,
          least: assignment.charge,
        });
        readings.push(missing);
        continue;
      }
      if (sameChargeValue(valueOf(assignment.charge), valueOf(greatestCharge))) {
        readings.push(Object.freeze({
          kind: "predication.valuation.fixedPoint.gap.cellClosure:witness" as const,
          cell: assignment.cell,
          least: assignment.charge,
          greatest: greatestCharge,
        }));
        continue;
      }
      const opening = Object.freeze({
        kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction" as const,
        cell: assignment.cell,
        least: assignment.charge,
        greatest: greatestCharge,
      });
      readings.push(opening);
    }
  }
  const cellReadings = fixedPointGapCellReadings(readings);
  const closures = fixedPointGapCellClosures(readings);
  const openings = fixedPointGapCellOpenings(readings);
  const missingGreatest = fixedPointGapMissingGreatestCells(readings);
  const obstructions = fixedPointGapCellObstructions(openings, missingGreatest);
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.carrier" as const,
    order: input.order.order,
    fixedPointOrder: input.order,
    least,
    greatest,
    cellReadings,
    closures,
    openings,
    missingGreatest,
    obstructions,
    rank: obstructions.rank,
    vanishing: fixedPointGapVanishing(obstructions),
  });
}
