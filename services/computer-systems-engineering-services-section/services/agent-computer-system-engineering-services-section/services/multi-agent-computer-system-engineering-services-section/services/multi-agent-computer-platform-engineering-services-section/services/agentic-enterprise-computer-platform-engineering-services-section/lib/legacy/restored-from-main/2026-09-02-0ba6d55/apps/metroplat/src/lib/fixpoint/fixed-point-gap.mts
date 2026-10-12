/**
 * @packageDocumentation
 *
 * settling/fixed-point-gap — the gap between least and greatest fixed points.
 *
 * Per cell, compares the least extremum's charge to the coincident greatest
 * charge: a closure witness when they agree, an opening obstruction when they
 * differ, a missing-greatest obstruction when the greatest has no coincident
 * cell. The gap vanishes exactly when no obstructions remain — the bilattice
 * interval collapses to a point.
 */
import { sameChargeValue, valueOf, type Charge } from "../values/index.mts";
import { cellCoincides, type Cell } from "../logic/predicating/predication.mts";
import { count, natIsZero, type Natural } from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
import { rankedJudgments, selectRankedJudgments } from "./ranked-judgments.mts";
import type { FixedPointExtremum, FixedPointOrderObject } from "./fixed-point.mts";

/** A cell whose least and greatest charges agree (the gap closes here). */
export interface FixedPointGapCellClosureWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosure:witness";
  readonly cell: Cell;
  readonly least: Charge;
  readonly greatest: Charge;
}

/** A cell whose least and greatest charges differ (the gap stays open). */
export interface FixedPointGapCellOpeningObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction";
  readonly cell: Cell;
  readonly least: Charge;
  readonly greatest: Charge;
}

/** A least cell with no coincident greatest counterpart. */
export interface FixedPointGapCellMissingGreatestObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction";
  readonly cell: Cell;
  readonly least: Charge;
}

/** The per-cell outcome of the least/greatest comparison. */
export type FixedPointGapCellJudgment =
  | FixedPointGapCellClosureWitness
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

/** The obstructing subset of cell judgments. */
export type FixedPointGapCellObstruction =
  | FixedPointGapCellOpeningObstruction
  | FixedPointGapCellMissingGreatestObstruction;

/** Every per-cell judgment, with rank. */
export interface FixedPointGapCellJudgments {
  readonly kind: "predication.valuation.fixedPoint.gap.cellJudgments";
  readonly judgments: readonly FixedPointGapCellJudgment[];
  readonly rank: Natural;
}

/** Only the closure witnesses, with rank. */
export interface FixedPointGapCellClosures {
  readonly kind: "predication.valuation.fixedPoint.gap.cellClosures";
  readonly judgments: readonly FixedPointGapCellClosureWitness[];
  readonly rank: Natural;
}

/** Only the opening obstructions, with rank. */
export interface FixedPointGapCellOpenings {
  readonly kind: "predication.valuation.fixedPoint.gap.cellOpenings";
  readonly judgments: readonly FixedPointGapCellOpeningObstruction[];
  readonly rank: Natural;
}

/** Only the missing-greatest obstructions, with rank. */
export interface FixedPointGapMissingGreatestCells {
  readonly kind: "predication.valuation.fixedPoint.gap.missingGreatestCells";
  readonly judgments: readonly FixedPointGapCellMissingGreatestObstruction[];
  readonly rank: Natural;
}

/** All obstructing judgments, grouped, with rank. */
export interface FixedPointGapCellObstructions {
  readonly kind: "predication.valuation.fixedPoint.gap.cellObstructions";
  readonly judgments: readonly FixedPointGapCellObstruction[];
  readonly rank: Natural;
  readonly openings: FixedPointGapCellOpenings;
  readonly missingGreatest: FixedPointGapMissingGreatestCells;
}

/** The gap vanishes (no obstructions). */
export interface FixedPointGapVanishingWitness {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing:witness";
  readonly rank: Natural;
}

/** The gap does not vanish. */
export interface FixedPointGapVanishingObstruction {
  readonly kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction";
  readonly rank: Natural;
  readonly obstructions: FixedPointGapCellObstructions;
}

/** The verdict on whether the gap vanishes. */
export type FixedPointGapVanishingJudgment = FixedPointGapVanishingWitness | FixedPointGapVanishingObstruction;

/** The full fixed-point gap result. */
export interface FixedPointGapReport {
  readonly kind: "predication.valuation.fixedPoint.gap.report";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
  readonly cellJudgments: FixedPointGapCellJudgments;
  readonly closures: FixedPointGapCellClosures;
  readonly openings: FixedPointGapCellOpenings;
  readonly missingGreatest: FixedPointGapMissingGreatestCells;
  readonly obstructions: FixedPointGapCellObstructions;
  readonly rank: Natural;
  readonly vanishing: FixedPointGapVanishingJudgment;
}

/** Input to the gap computation. */
export interface FixedPointGapInput {
  readonly kind: "predication.valuation.fixedPoint.gap.input";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
}

/** Build a gap input from one order interval. */
export function fixedPointGapInput(order: FixedPointOrderObject, least: FixedPointExtremum, greatest: FixedPointExtremum): FixedPointGapInput {
  return Object.freeze({ kind: "predication.valuation.fixedPoint.gap.input" as const, order, least, greatest });
}

/** Wrap cell judgments with rank. */
export const fixedPointGapCellJudgments = (judgments: readonly FixedPointGapCellJudgment[]): FixedPointGapCellJudgments =>
  rankedJudgments("predication.valuation.fixedPoint.gap.cellJudgments", judgments);

/** Select the closure witnesses. */
export const fixedPointGapCellClosures = (judgments: readonly FixedPointGapCellJudgment[]): FixedPointGapCellClosures =>
  selectRankedJudgments("predication.valuation.fixedPoint.gap.cellClosures", judgments,
    (judgment): judgment is FixedPointGapCellClosureWitness => judgment.kind === "predication.valuation.fixedPoint.gap.cellClosure:witness");

/** Select the opening obstructions. */
export const fixedPointGapCellOpenings = (judgments: readonly FixedPointGapCellJudgment[]): FixedPointGapCellOpenings =>
  selectRankedJudgments("predication.valuation.fixedPoint.gap.cellOpenings", judgments,
    (judgment): judgment is FixedPointGapCellOpeningObstruction => judgment.kind === "predication.valuation.fixedPoint.gap.cellOpening-obstruction");

/** Select the missing-greatest obstructions. */
export const fixedPointGapMissingGreatestCells = (judgments: readonly FixedPointGapCellJudgment[]): FixedPointGapMissingGreatestCells =>
  selectRankedJudgments("predication.valuation.fixedPoint.gap.missingGreatestCells", judgments,
    (judgment): judgment is FixedPointGapCellMissingGreatestObstruction => judgment.kind === "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction");

/** Combine openings and missing-greatest into one obstructions record. */
export const fixedPointGapCellObstructions = (
  openings: FixedPointGapCellOpenings,
  missingGreatest: FixedPointGapMissingGreatestCells,
): FixedPointGapCellObstructions => {
  const obstructions = Object.freeze([...openings.judgments, ...missingGreatest.judgments]);
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.cellObstructions" as const,
    judgments: obstructions,
    rank: count(obstructions),
    openings,
    missingGreatest,
  });
};

/** Judge vanishing from an obstructions record. */
export const fixedPointGapVanishing = (obstructions: FixedPointGapCellObstructions): FixedPointGapVanishingJudgment =>
  natIsZero(obstructions.rank)
    ? Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing:witness" as const, rank: obstructions.rank })
    : Object.freeze({ kind: "predication.valuation.fixedPoint.gap.vanishing-obstruction" as const, rank: obstructions.rank, obstructions });

/** Compute the gap between an order's least and greatest extrema. */
export function fixedPointGap(input: FixedPointGapInput): FixedPointGapReport {
  const least = input.least;
  const greatest = input.greatest;
  const greatestAssignments = greatest.sheaf.section.fibers.flatMap((fiber) => fiber.assignments);
  const judgments: FixedPointGapCellJudgment[] = [];
  for (const fiber of least.sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const greatestCharge = greatestAssignments.find((candidate) => cellCoincides(candidate.cell, assignment.cell))?.charge;
      if (!greatestCharge) {
        judgments.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellMissingGreatest-obstruction" as const, cell: assignment.cell, least: assignment.charge }));
        continue;
      }
      if (sameChargeValue(valueOf(assignment.charge), valueOf(greatestCharge))) {
        judgments.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellClosure:witness" as const, cell: assignment.cell, least: assignment.charge, greatest: greatestCharge }));
        continue;
      }
      judgments.push(Object.freeze({ kind: "predication.valuation.fixedPoint.gap.cellOpening-obstruction" as const, cell: assignment.cell, least: assignment.charge, greatest: greatestCharge }));
    }
  }
  const cellJudgments = fixedPointGapCellJudgments(judgments);
  const closures = fixedPointGapCellClosures(judgments);
  const openings = fixedPointGapCellOpenings(judgments);
  const missingGreatest = fixedPointGapMissingGreatestCells(judgments);
  const obstructions = fixedPointGapCellObstructions(openings, missingGreatest);
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.gap.report" as const,
    order: input.order,
    least,
    greatest,
    cellJudgments,
    closures,
    openings,
    missingGreatest,
    obstructions,
    rank: obstructions.rank,
    vanishing: fixedPointGapVanishing(obstructions),
  });
}
