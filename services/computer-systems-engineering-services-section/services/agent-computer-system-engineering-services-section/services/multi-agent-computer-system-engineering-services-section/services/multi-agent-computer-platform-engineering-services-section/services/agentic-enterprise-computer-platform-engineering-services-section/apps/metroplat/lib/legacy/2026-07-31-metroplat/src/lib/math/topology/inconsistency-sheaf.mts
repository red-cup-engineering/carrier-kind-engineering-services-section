/**
 * analysis/inconsistency-sheaf - finite executable runtime surface.
 *
 * Lean defines the inconsistency sheaf as the dTop-supported cokernel of the
 * settling-associated sheaf inclusion. This module reuses the existing
 * settling-associated masks, projections, and short exact sequence receipt.
 */
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
} from "../../fixpoint/closure.mts";
import { cohomologyVanishesInRegime } from "../../fixpoint/value-category.mts";
import {
  chargedCell,
  cochain,
  dTop,
  defaultCochain,
  defaultValuation,
  pi,
  shortExactSequenceReceipt,
  vanishesOff,
  type ChargedCell,
  type Cochain,
  type ShortExactSequenceReceipt,
} from "./settling-associated-sheaf.mts";

export interface InconsistencyCohomologyReceipt {
  readonly kind: "inconsistencySheaf.cohomology:witness";
  readonly valuation: readonly ChargedCell[];
  readonly cells: readonly string[];
  readonly h0Top: number;
  readonly hasInconsistencyContent: boolean;
  readonly h0CountsInconsistency: true;
  readonly h1VanishesInStrict: true;
  readonly h1VanishesInScott: true;
  readonly h1VanishesInTransfinite: false;
  readonly h1VanishesInAperiodic: false;
}

export interface ConsistentZeroReceipt {
  readonly kind: "inconsistencySheaf.consistentZero:witness";
  readonly valuation: readonly ChargedCell[];
  readonly cochain: Cochain;
  readonly topSection: Cochain;
  readonly noTopCells: true;
  readonly topSectionZero: true;
}

export interface InconsistencySheafReceipt {
  readonly kind: "inconsistencySheaf.receipt:witness";
  readonly valuation: readonly ChargedCell[];
  readonly cochain: Cochain;
  readonly topMask: ReturnType<typeof dTop>;
  readonly topSection: Cochain;
  readonly cokernel: ShortExactSequenceReceipt;
  readonly cohomology: InconsistencyCohomologyReceipt;
  readonly consistentZero: ConsistentZeroReceipt;
  readonly restrictTopEqualsPi: true;
  readonly cokernelOfIota: true;
  readonly directSumSplitInherited: true;
  readonly frontier: "arbitrary Cech H1 cochains are outside this finite runtime; Node reports the finite dTop cokernel and regime gate";
}

const coefficientAt = (value: Cochain, cell: string): number =>
  value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;

const allCells = (valuation: readonly ChargedCell[]): readonly string[] =>
  Object.freeze(valuation.map((entry) => entry.cell));

const zeroOnCells = (value: Cochain, cells: readonly string[]): boolean =>
  cells.every((cell) => coefficientAt(value, cell) === 0);

export const h0Top = (valuation: readonly ChargedCell[]): number => dTop(valuation).cells.length;

export const hasInconsistencyContent = (valuation: readonly ChargedCell[]): boolean => h0Top(valuation) > 0;

export const restrictTop = (valuation: readonly ChargedCell[], value: Cochain): Cochain =>
  pi(valuation, value);

export function inconsistencyCohomologyReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
): InconsistencyCohomologyReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = allCells(valuation);
  const count = h0Top(valuation);
  const h0CountsInconsistency = count === valuation.filter((entry) => entry.charge === "denied").length;
  const h1VanishesInStrict = cohomologyVanishesInRegime(finiteClosureRegime);
  const h1VanishesInScott = cohomologyVanishesInRegime(scottClosureRegime);
  const h1VanishesInTransfinite = cohomologyVanishesInRegime(transfiniteClosureRegime);
  const h1VanishesInAperiodic = cohomologyVanishesInRegime(aperiodicClosureRegime);

  if (!h0CountsInconsistency || !h1VanishesInStrict || !h1VanishesInScott || h1VanishesInTransfinite || h1VanishesInAperiodic) {
    throw new TypeError("inconsistencyCohomologyReceipt: inconsistency count/regime gate laws failed");
  }

  return Object.freeze({
    kind: "inconsistencySheaf.cohomology:witness" as const,
    valuation,
    cells,
    h0Top: count,
    hasInconsistencyContent: count > 0,
    h0CountsInconsistency: true as const,
    h1VanishesInStrict: true as const,
    h1VanishesInScott: true as const,
    h1VanishesInTransfinite: false as const,
    h1VanishesInAperiodic: false as const,
  });
}

export function consistentZeroReceipt(
  valuationInput: readonly ChargedCell[] = Object.freeze([
    chargedCell("truth-cell", "unknown"),
    chargedCell("false-cell", "held"),
    chargedCell("empty-cell", "contested"),
  ]),
  value: Cochain = cochain([
    { cell: "truth-cell", coefficient: 3 },
    { cell: "false-cell", coefficient: 5 },
    { cell: "empty-cell", coefficient: 0 },
  ]),
): ConsistentZeroReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = allCells(valuation);
  const topMask = dTop(valuation);
  const topSection = restrictTop(valuation, value);
  const noTopCells = topMask.cells.length === 0;
  const topSectionZero = zeroOnCells(topSection, cells);

  if (!noTopCells || !topSectionZero) {
    throw new TypeError("consistentZeroReceipt: consistent valuation did not kill the dTop section");
  }

  return Object.freeze({
    kind: "inconsistencySheaf.consistentZero:witness" as const,
    valuation,
    cochain: value,
    topSection,
    noTopCells: true as const,
    topSectionZero: true as const,
  });
}

export function inconsistencySheafReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: Cochain = defaultCochain,
): InconsistencySheafReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = allCells(valuation);
  const topMask = dTop(valuation);
  const topSection = restrictTop(valuation, value);
  const cokernel = shortExactSequenceReceipt(valuation, value);
  const restrictTopEqualsPi = zeroOnCells(
    cochain(topSection.coefficients.map((entry) => ({
      cell: entry.cell,
      coefficient: entry.coefficient - coefficientAt(pi(valuation, value), entry.cell),
    }))),
    cells,
  );
  const supportedOnTop = vanishesOff(topMask, topSection, cells);

  if (!restrictTopEqualsPi || !supportedOnTop || !cokernel.piSurjectiveOnTopPart || !cokernel.kernelPiIffVanishesOnTopOnSample) {
    throw new TypeError("inconsistencySheaf.receipt: dTop cokernel laws failed");
  }

  return Object.freeze({
    kind: "inconsistencySheaf.receipt:witness" as const,
    valuation,
    cochain: value,
    topMask,
    topSection,
    cokernel,
    cohomology: inconsistencyCohomologyReceipt(valuation),
    consistentZero: consistentZeroReceipt(),
    restrictTopEqualsPi: true as const,
    cokernelOfIota: true as const,
    directSumSplitInherited: true as const,
    frontier: "arbitrary Cech H1 cochains are outside this finite runtime; Node reports the finite dTop cokernel and regime gate" as const,
  });
}
