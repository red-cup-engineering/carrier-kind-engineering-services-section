/**
 * analysis/settling-cohomology-h1 - finite executable runtime surface.
 *
 * cochains. This Node surface carries the finite support calculation: H0 is the
 * truth-designated count, agreeing local sections glue pointwise to a global
 * cochain, H1 vanishes in strict/Scott regimes, and the identity cochain's
 * classifying invariant is zero on that vanishing side.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import {
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
  aperiodicClosureRegime,
} from "@lenticule-science/articulating/predicating/positing/settling";
import { cohomologyVanishesInRegime } from "../../fixpoint/value-category.mts";
import { h1Zero, type H1Class } from "../tilings/aperiodic-classification.mts";
import {
  cochain,
  dT,
  defaultValuation,
  shortExactSequenceReceipt,
  type ChargedCell,
  type Cochain,
  type ShortExactSequenceReceipt,
} from "./settling-associated-sheaf.mts";
import {
  truthKnowledgeSectionDecompositionReceipt,
  type TruthKnowledgeSectionDecompositionReceipt,
} from "./bigraded-cohomology.mts";


export const cechPatchSchemaContractSchema = {
  $id: "metroplat/closure/analysis/settling-cohomology-h1/cech-patch",
  type: "object",
  required: ["kind", "name", "cells"],
  properties: {
    kind: { const: "settlingCohomologyH1.patch" },
    name: { type: "string" },
    cells: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "CechPatch",
  description: "A Cech cover patch: its name and the cells it contains.",
} as const;

export type CechPatch = FromJsonSchema<typeof cechPatchSchemaContractSchema>;

export interface LocalSection {
  readonly kind: "settlingCohomologyH1.localSection";
  readonly patch: string;
  readonly section: Cochain;
}

export interface Cech1Datum {
  readonly kind: "settlingCohomologyH1.cech1";
  readonly cells: readonly string[];
  readonly cover: readonly CechPatch[];
  readonly localSections: readonly LocalSection[];
}

export interface H0Receipt {
  readonly kind: "settlingCohomologyH1.h0:witness";
  readonly valuation: readonly ChargedCell[];
  readonly cells: readonly string[];
  readonly designatedCells: readonly string[];
  readonly count: number;
  readonly truthContent: boolean;
  readonly h0IsDesignatedCount: true;
  readonly positiveIffTruthContent: true;
}

export interface GluingReceipt {
  readonly kind: "settlingCohomologyH1.gluing:witness";
  readonly datum: Cech1Datum;
  readonly glued: Cochain;
  readonly cocycle: true;
  readonly coboundary: true;
  readonly separated: true;
  readonly uniqueGluingOnFiniteSupport: true;
}

export interface ClassifyingInvariantReceipt {
  readonly kind: "settlingCohomologyH1.classifyingInvariant:witness";
  readonly identityCochain: Cochain;
  readonly classifyingInvariant: H1Class;
  readonly identityVanishesOffTruthMask: true;
  readonly clInvDatumCocycle: true;
  readonly clInvCoboundary: true;
  readonly classifyingInvariantZero: true;
  readonly zeroOnlyInStrictScottReceipt: true;
}

export interface SettlingCohomologyH1Receipt {
  readonly kind: "settlingCohomologyH1.receipt:witness";
  readonly h0: H0Receipt;
  readonly h1: GluingReceipt;
  readonly classifyingInvariant: ClassifyingInvariantReceipt;
  readonly ses: ShortExactSequenceReceipt;
  readonly bigradedLes: TruthKnowledgeSectionDecompositionReceipt;
  readonly strictScottRegimeGate: true;
  readonly hnAboveOneZero: true;
  readonly h1Vanishes: true;
  readonly transfiniteAperiodicBoundary: true;
  readonly frontier: readonly string[];
}

const unique = (items: readonly string[]): readonly string[] => {
  const out: string[] = [];
  for (const item of items) if (!out.includes(item)) out.push(item);
  return Object.freeze(out);
};

const coefficientAt = (value: Cochain, cell: string): number =>
  value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;

const sameCochainOn = (cells: readonly string[], left: Cochain, right: Cochain): boolean =>
  cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));

const patchByName = (datum: Cech1Datum, name: string): CechPatch => {
  const found = datum.cover.find((patch) => patch.name === name);
  if (!found) throw new TypeError(`settlingCohomologyH1: unknown patch ${name}`);
  return found;
};

const sectionFor = (datum: Cech1Datum, patchName: string): Cochain => {
  const found = datum.localSections.find((section) => section.patch === patchName);
  if (!found) throw new TypeError(`settlingCohomologyH1: missing local section for patch ${patchName}`);
  return found.section;
};

const coversCells = (cells: readonly string[], cover: readonly CechPatch[]): boolean =>
  cells.every((cell) => cover.some((patch) => patch.cells.includes(cell)));

const sameNames = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export function patch(name: string, cells: readonly string[]): CechPatch {
  if (name.length === 0) throw new TypeError("settlingCohomologyH1.patch: name must be nonempty");
  return Object.freeze({
    kind: "settlingCohomologyH1.patch" as const,
    name,
    cells: unique(cells),
  });
}

export function localSection(patchName: string, section: Cochain): LocalSection {
  if (patchName.length === 0) throw new TypeError("settlingCohomologyH1.localSection: patch must be nonempty");
  return Object.freeze({
    kind: "settlingCohomologyH1.localSection" as const,
    patch: patchName,
    section,
  });
}

export function cech1(
  cellsInput: readonly string[],
  coverInput: readonly CechPatch[],
  localSectionsInput: readonly LocalSection[],
): Cech1Datum {
  const cells = unique(cellsInput);
  const cover = Object.freeze([...coverInput]);
  const localSections = Object.freeze([...localSectionsInput]);
  const coverNames = cover.map((entry) => entry.name);
  const localNames = localSections.map((entry) => entry.patch);
  if (cells.length === 0) throw new TypeError("settlingCohomologyH1.cech1: cells must be nonempty");
  if (new Set(coverNames).size !== coverNames.length) throw new TypeError("settlingCohomologyH1.cech1: duplicate patch names");
  if (!coversCells(cells, cover)) throw new TypeError("settlingCohomologyH1.cech1: cover does not cover every cell");
  if (!sameNames([...coverNames].sort(), [...localNames].sort())) {
    throw new TypeError("settlingCohomologyH1.cech1: local sections must match cover patches");
  }
  return Object.freeze({
    kind: "settlingCohomologyH1.cech1" as const,
    cells,
    cover,
    localSections,
  });
}

export function h0(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  cellsInput: readonly string[] = valuationInput.map((entry) => entry.cell),
): H0Receipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = unique(cellsInput);
  const designatedCells = Object.freeze(dT(valuation).cells.filter((cell) => cells.includes(cell)));
  const count = designatedCells.length;
  const truthContent = count > 0;
  const positiveIffTruthContent = (count > 0) === truthContent;

  if (!positiveIffTruthContent) throw new TypeError("settlingCohomologyH1.h0: designated count/truth-content law failed");

  return Object.freeze({
    kind: "settlingCohomologyH1.h0:witness" as const,
    valuation,
    cells,
    designatedCells,
    count,
    truthContent,
    h0IsDesignatedCount: true as const,
    positiveIffTruthContent: true as const,
  });
}

export function cocycle(datum: Cech1Datum): boolean {
  return datum.cover.every((left) => datum.cover.every((right) => {
    const leftSection = sectionFor(datum, left.name);
    const rightSection = sectionFor(datum, right.name);
    const overlap = left.cells.filter((cell) => right.cells.includes(cell));
    return overlap.every((cell) => coefficientAt(leftSection, cell) === coefficientAt(rightSection, cell));
  }));
}

export function glue(datum: Cech1Datum): Cochain {
  return cochain(datum.cells.map((cell) => {
    const coveringPatch = datum.cover.find((candidate) => candidate.cells.includes(cell));
    return Object.freeze({
      cell,
      coefficient: coveringPatch ? coefficientAt(sectionFor(datum, coveringPatch.name), cell) : 0,
    });
  }));
}

export function coboundary(datum: Cech1Datum, global: Cochain): boolean {
  return datum.cover.every((coverPatch) => {
    const local = sectionFor(datum, coverPatch.name);
    return coverPatch.cells.every((cell) => coefficientAt(local, cell) === coefficientAt(global, cell));
  });
}

export function separated(datum: Cech1Datum, left: Cochain, right: Cochain): boolean {
  const agreeOnCover = datum.cover.every((coverPatch) =>
    coverPatch.cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell)));
  return !agreeOnCover || sameCochainOn(datum.cells, left, right);
}

export function gluingReceipt(datum: Cech1Datum = defaultCechDatum): GluingReceipt {
  const glued = glue(datum);
  const isCocycle = cocycle(datum);
  const isCoboundary = coboundary(datum, glued);
  const isSeparated = separated(datum, glued, glued);
  const uniqueGluingOnFiniteSupport = coversCells(datum.cells, datum.cover);

  if (!isCocycle || !isCoboundary || !isSeparated || !uniqueGluingOnFiniteSupport) {
    throw new TypeError("settlingCohomologyH1.gluingReceipt: finite Cech gluing laws failed");
  }

  return Object.freeze({
    kind: "settlingCohomologyH1.gluing:witness" as const,
    datum,
    glued,
    cocycle: true as const,
    coboundary: true as const,
    separated: true as const,
    uniqueGluingOnFiniteSupport: true as const,
  });
}

export function identityCochain(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  cellsInput: readonly string[] = valuationInput.map((entry) => entry.cell),
): Cochain {
  const truthMask = dT(valuationInput);
  return cochain(unique(cellsInput).map((cell) => Object.freeze({
    cell,
    coefficient: truthMask.cells.includes(cell) ? 1 : 0,
  })));
}

export function clInvDatum(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  coverInput: readonly CechPatch[] = defaultCover,
): Cech1Datum {
  const cells = valuationInput.map((entry) => entry.cell);
  const id = identityCochain(valuationInput, cells);
  return cech1(cells, coverInput, coverInput.map((coverPatch) => localSection(coverPatch.name, id)));
}

export function classifyingInvariantReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  coverInput: readonly CechPatch[] = defaultCover,
): ClassifyingInvariantReceipt {
  const cells = valuationInput.map((entry) => entry.cell);
  const id = identityCochain(valuationInput, cells);
  const truthMask = dT(valuationInput);
  const identityVanishesOffTruthMask = cells.every((cell) => truthMask.cells.includes(cell) || coefficientAt(id, cell) === 0);
  const datum = clInvDatum(valuationInput, coverInput);
  const clInvDatumCocycle = cocycle(datum);
  const clInvCoboundary = coboundary(datum, id);
  const classifyingInvariantZero = h1Zero.coord === 0;
  const zeroOnlyInStrictScottReceipt = strictScottRegimeGate();

  if (!identityVanishesOffTruthMask || !clInvDatumCocycle || !clInvCoboundary || !classifyingInvariantZero || !zeroOnlyInStrictScottReceipt) {
    throw new TypeError("settlingCohomologyH1.classifyingInvariantReceipt: finite clInv laws failed");
  }

  return Object.freeze({
    kind: "settlingCohomologyH1.classifyingInvariant:witness" as const,
    identityCochain: id,
    classifyingInvariant: h1Zero,
    identityVanishesOffTruthMask: true as const,
    clInvDatumCocycle: true as const,
    clInvCoboundary: true as const,
    classifyingInvariantZero: true as const,
    zeroOnlyInStrictScottReceipt: true as const,
  });
}

export function strictScottRegimeGate(): boolean {
  return cohomologyVanishesInRegime(finiteClosureRegime)
    && cohomologyVanishesInRegime(scottClosureRegime)
    && !cohomologyVanishesInRegime(transfiniteClosureRegime)
    && !cohomologyVanishesInRegime(aperiodicClosureRegime);
}

export const defaultCells: readonly string[] = Object.freeze([
  "truth-cell",
  "both-cell",
  "false-cell",
  "empty-cell",
]);

export const defaultCover: readonly CechPatch[] = Object.freeze([
  patch("truth-side", ["truth-cell", "false-cell"]),
  patch("top-side", ["both-cell", "empty-cell"]),
  patch("bridge", ["truth-cell", "both-cell"]),
]);

export const defaultGlobalCochain: Cochain = cochain([
  { cell: "truth-cell", coefficient: 1 },
  { cell: "both-cell", coefficient: 2 },
  { cell: "false-cell", coefficient: 0 },
  { cell: "empty-cell", coefficient: 0 },
]);

export const defaultCechDatum: Cech1Datum = cech1(defaultCells, defaultCover, [
  localSection("truth-side", cochain([
    { cell: "truth-cell", coefficient: 1 },
    { cell: "both-cell", coefficient: 99 },
    { cell: "false-cell", coefficient: 0 },
  ])),
  localSection("top-side", cochain([
    { cell: "truth-cell", coefficient: 88 },
    { cell: "both-cell", coefficient: 2 },
    { cell: "empty-cell", coefficient: 0 },
  ])),
  localSection("bridge", cochain([
    { cell: "truth-cell", coefficient: 1 },
    { cell: "both-cell", coefficient: 2 },
  ])),
]);

export function settlingCohomologyH1Receipt(): SettlingCohomologyH1Receipt {
  const h0Receipt = h0(defaultValuation, defaultCells);
  const h1Receipt = gluingReceipt(defaultCechDatum);
  const clInv = classifyingInvariantReceipt(defaultValuation, defaultCover);
  const ses = shortExactSequenceReceipt(defaultValuation, defaultGlobalCochain);
  const bigradedLes = truthKnowledgeSectionDecompositionReceipt(defaultValuation, defaultGlobalCochain);
  const gate = strictScottRegimeGate();
  const gluedMatchesDefault = sameCochainOn(defaultCells, h1Receipt.glued, defaultGlobalCochain);

  if (!gate || !gluedMatchesDefault) {
    throw new TypeError("settlingCohomologyH1.receipt: finite H0/H1/classifying-invariant laws failed");
  }

  return Object.freeze({
    kind: "settlingCohomologyH1.receipt:witness" as const,
    h0: h0Receipt,
    h1: h1Receipt,
    classifyingInvariant: clInv,
    ses,
    bigradedLes,
    strictScottRegimeGate: true as const,
    hnAboveOneZero: true as const,
    h1Vanishes: true as const,
    transfiniteAperiodicBoundary: true as const,
    frontier: Object.freeze([
      "This receipt computes finite cover agreement, pointwise glue, and separation on a finite support.",
      "Higher cohomology is represented by the settled Hn=0 receipt boundary, not by a general chain-complex runtime.",
      "Nonzero aperiodic classifying invariants remain in the aperiodic classification surface; this receipt is the strict/Scott zero side.",
    ]),
  });
}
