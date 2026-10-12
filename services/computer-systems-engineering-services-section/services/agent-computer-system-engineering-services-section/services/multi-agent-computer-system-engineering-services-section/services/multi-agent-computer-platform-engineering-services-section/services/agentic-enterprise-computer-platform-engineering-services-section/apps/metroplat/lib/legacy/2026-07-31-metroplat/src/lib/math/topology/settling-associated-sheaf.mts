/**
 * analysis/settling-associated-sheaf - finite executable runtime surface.
 *
 * designated short exact sequence. This module exposes the finite mask/cochain
 * operations over charge-valued cells, plus bounded sample receipts for the
 * all-integer proof obligations.
 */
import { asChargeValueName, type ChargeValueName } from "../../values/index.mts";
import type { FromSchema } from "../../schema/contract.mts";

export interface ChargedCell {
  readonly kind: "settlingAssociatedSheaf.chargedCell";
  readonly cell: string;
  readonly charge: ChargeValueName;
}

export const maskSchemaContractSchema = {
  $id: "metroplat/closure/analysis/settling-associated-sheaf/mask",
  type: "object",
  required: ["kind", "name", "cells"],
  properties: {
    kind: { const: "settlingAssociatedSheaf.mask" },
    name: { enum: ["dT", "dK", "dTop", "custom"] },
    cells: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "Mask",
  description: "A named mask: the set of cells it selects.",
} as const;

export type Mask = FromSchema<typeof maskSchemaContractSchema>;

export interface CochainEntry {
  readonly cell: string;
  readonly coefficient: number;
}

export interface Cochain {
  readonly kind: "settlingAssociatedSheaf.cochain";
  readonly coefficients: readonly CochainEntry[];
}

export interface MaskSplitReceipt {
  readonly kind: "settlingAssociatedSheaf.maskSplit:witness";
  readonly valuation: readonly ChargedCell[];
  readonly dT: Mask;
  readonly dTop: Mask;
  readonly dK: Mask;
  readonly dTDisjointDTop: true;
  readonly dKEqualsUnion: true;
  readonly dTIncludedInDK: true;
  readonly dTopIncludedInDK: true;
}

export interface RestrictionReceipt {
  readonly kind: "settlingAssociatedSheaf.restriction:witness";
  readonly cochain: Cochain;
  readonly fullMask: Mask;
  readonly subMask: Mask;
  readonly restricted: Cochain;
  readonly fullRestrictionIdentity: true;
  readonly restrictedVanishesOffMask: true;
  readonly restrictionComposesByMeet: true;
}

export interface ShortExactSequenceReceipt {
  readonly kind: "settlingAssociatedSheaf.shortExactSequence:witness";
  readonly cochain: Cochain;
  readonly iota: Cochain;
  readonly pi: Cochain;
  readonly truthPart: Cochain;
  readonly topPart: Cochain;
  readonly reconstructed: Cochain;
  readonly iotaImageVanishesOnTop: true;
  readonly piSurjectiveOnTopPart: true;
  readonly kernelPiIffVanishesOnTopOnSample: true;
  readonly splitReconstructs: true;
  readonly splitUniqueOnSample: true;
  readonly sampleSize: number;
}

export interface SettlingAssociatedSheafReceipt {
  readonly kind: "settlingAssociatedSheaf.receipt:witness";
  readonly masks: MaskSplitReceipt;
  readonly restriction: RestrictionReceipt;
  readonly ses: ShortExactSequenceReceipt;
  readonly supportProfile: Readonly<Record<ChargeValueName, {
    readonly dT: boolean;
    readonly dK: boolean;
    readonly dTop: boolean;
  }>>;
  readonly openFrontier: readonly string[];
}

const canonicalCells = (valuation: readonly ChargedCell[]): readonly string[] =>
  Object.freeze(valuation.map((entry) => entry.cell));

const unique = (cells: readonly string[]): readonly string[] => {
  const out: string[] = [];
  for (const cell of cells) if (!out.includes(cell)) out.push(cell);
  return Object.freeze(out);
};

const assertSafeInteger = (value: number): number => {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`cochain coefficient must be a safe integer: ${value}`);
  }
  return value;
};

export function chargedCell(cell: string, charge: string): ChargedCell {
  if (cell.length === 0) throw new TypeError("chargedCell: cell id must be nonempty");
  return Object.freeze({
    kind: "settlingAssociatedSheaf.chargedCell" as const,
    cell,
    charge: asChargeValueName(charge),
  });
}

export function mask(name: Mask["name"], cells: readonly string[]): Mask {
  return Object.freeze({
    kind: "settlingAssociatedSheaf.mask" as const,
    name,
    cells: unique(cells),
  });
}

export function cochain(coefficients: readonly CochainEntry[]): Cochain {
  const merged = new Map<string, number>();
  for (const entry of coefficients) {
    if (entry.cell.length === 0) throw new TypeError("cochain: cell id must be nonempty");
    merged.set(entry.cell, (merged.get(entry.cell) ?? 0) + assertSafeInteger(entry.coefficient));
  }
  return Object.freeze({
    kind: "settlingAssociatedSheaf.cochain" as const,
    coefficients: Object.freeze([...merged.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([cell, coefficient]) => Object.freeze({ cell, coefficient: assertSafeInteger(coefficient) }))),
  });
}

const coefficientAt = (value: Cochain, cell: string): number =>
  value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;

const sameCochain = (cells: readonly string[], left: Cochain, right: Cochain): boolean =>
  cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));

const subset = (left: Mask, right: Mask): boolean =>
  left.cells.every((cell) => right.cells.includes(cell));

const sameMask = (left: Mask, right: Mask): boolean =>
  subset(left, right) && subset(right, left);

const meetMask = (left: Mask, right: Mask): Mask =>
  mask("custom", left.cells.filter((cell) => right.cells.includes(cell)));

export function dT(valuation: readonly ChargedCell[]): Mask {
  return mask("dT", valuation.filter((entry) => entry.charge === "held").map((entry) => entry.cell));
}

export function dTop(valuation: readonly ChargedCell[]): Mask {
  return mask("dTop", valuation.filter((entry) => entry.charge === "contested").map((entry) => entry.cell));
}

export function dK(valuation: readonly ChargedCell[]): Mask {
  return mask("dK", valuation
    .filter((entry) => entry.charge === "held" || entry.charge === "contested")
    .map((entry) => entry.cell));
}

export function restrict(support: Mask, value: Cochain): Cochain {
  return cochain(value.coefficients.map((entry) => Object.freeze({
    cell: entry.cell,
    coefficient: support.cells.includes(entry.cell) ? entry.coefficient : 0,
  })));
}

export const iota = (valuation: readonly ChargedCell[], value: Cochain): Cochain =>
  restrict(dT(valuation), value);

export const pi = (valuation: readonly ChargedCell[], value: Cochain): Cochain =>
  restrict(dTop(valuation), value);

export const projT = iota;
export const projTop = pi;

export function combine(left: Cochain, right: Cochain): Cochain {
  return cochain([
    ...left.coefficients,
    ...right.coefficients,
  ]);
}

export function vanishesOff(support: Mask, value: Cochain, cells: readonly string[]): boolean {
  return cells.every((cell) => support.cells.includes(cell) || coefficientAt(value, cell) === 0);
}

export function vanishesOnTop(valuation: readonly ChargedCell[], value: Cochain): boolean {
  const top = dTop(valuation);
  return top.cells.every((cell) => coefficientAt(value, cell) === 0);
}

export function maskSplitReceipt(valuationInput: readonly ChargedCell[] = defaultValuation): MaskSplitReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const truth = dT(valuation);
  const topOnly = dTop(valuation);
  const belnap = dK(valuation);
  const dTDisjointDTop = truth.cells.every((cell) => !topOnly.cells.includes(cell));
  const union = mask("custom", [...truth.cells, ...topOnly.cells]);
  const dKEqualsUnion = sameMask(belnap, union);
  const dTIncludedInDK = subset(truth, belnap);
  const dTopIncludedInDK = subset(topOnly, belnap);

  if (!dTDisjointDTop || !dKEqualsUnion || !dTIncludedInDK || !dTopIncludedInDK) {
    throw new TypeError("maskSplitReceipt: dT/dK/dTop split laws failed");
  }

  return Object.freeze({
    kind: "settlingAssociatedSheaf.maskSplit:witness" as const,
    valuation,
    dT: truth,
    dTop: topOnly,
    dK: belnap,
    dTDisjointDTop: true as const,
    dKEqualsUnion: true as const,
    dTIncludedInDK: true as const,
    dTopIncludedInDK: true as const,
  });
}

export function restrictionReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: Cochain = defaultCochain,
): RestrictionReceipt {
  const cells = canonicalCells(valuationInput);
  const fullMask = mask("custom", cells);
  const subMask = dT(valuationInput);
  const restricted = restrict(subMask, value);
  const fullRestrictionIdentity = sameCochain(cells, restrict(fullMask, value), value);
  const restrictedVanishesOffMask = vanishesOff(subMask, restricted, cells);
  const m1 = dK(valuationInput);
  const m2 = dTop(valuationInput);
  const restrictionComposesByMeet = sameCochain(
    cells,
    restrict(m2, restrict(m1, value)),
    restrict(meetMask(m2, m1), value),
  );

  if (!fullRestrictionIdentity || !restrictedVanishesOffMask || !restrictionComposesByMeet) {
    throw new TypeError("restrictionReceipt: masked cochain restriction laws failed");
  }

  return Object.freeze({
    kind: "settlingAssociatedSheaf.restriction:witness" as const,
    cochain: value,
    fullMask,
    subMask,
    restricted,
    fullRestrictionIdentity: true as const,
    restrictedVanishesOffMask: true as const,
    restrictionComposesByMeet: true as const,
  });
}

const sampleCochains = (cells: readonly string[]): readonly Cochain[] => {
  const values = [-1, 0, 1] as const;
  let samples: readonly Cochain[] = Object.freeze([cochain([])]);
  for (const cell of cells) {
    samples = Object.freeze(samples.flatMap((existing) =>
      values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient }]))));
  }
  return samples;
};

export function shortExactSequenceReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: Cochain = defaultCochain,
): ShortExactSequenceReceipt {
  const cells = canonicalCells(valuationInput);
  const belnap = dK(valuationInput);
  const topOnly = dTop(valuationInput);
  const truthPart = projT(valuationInput, value);
  const topPart = projTop(valuationInput, value);
  const reconstructed = combine(truthPart, topPart);
  const included = iota(valuationInput, value);
  const projected = pi(valuationInput, value);
  const samples = sampleCochains(cells);
  const supportedSamples = samples.filter((sample) => vanishesOff(belnap, sample, cells));

  const iotaImageVanishesOnTop = supportedSamples.every((sample) => vanishesOnTop(valuationInput, iota(valuationInput, sample)));
  const piSurjectiveOnTopPart = samples
    .filter((sample) => vanishesOff(topOnly, sample, cells))
    .every((sample) => sameCochain(cells, pi(valuationInput, sample), sample));
  const kernelPiIffVanishesOnTopOnSample = supportedSamples.every((sample) =>
    sameCochain(cells, pi(valuationInput, sample), cochain([])) === vanishesOnTop(valuationInput, sample),
  );
  const splitReconstructs = supportedSamples.every((sample) =>
    sameCochain(cells, combine(projT(valuationInput, sample), projTop(valuationInput, sample)), sample),
  );
  const splitUniqueOnSample = supportedSamples.every((left) => supportedSamples.every((right) => {
    const sameParts = sameCochain(cells, projT(valuationInput, left), projT(valuationInput, right))
      && sameCochain(cells, projTop(valuationInput, left), projTop(valuationInput, right));
    return !sameParts || sameCochain(cells, left, right);
  }));

  if (!iotaImageVanishesOnTop || !piSurjectiveOnTopPart || !kernelPiIffVanishesOnTopOnSample || !splitReconstructs || !splitUniqueOnSample) {
    throw new TypeError("shortExactSequenceReceipt: designated SES sample laws failed");
  }

  return Object.freeze({
    kind: "settlingAssociatedSheaf.shortExactSequence:witness" as const,
    cochain: value,
    iota: included,
    pi: projected,
    truthPart,
    topPart,
    reconstructed,
    iotaImageVanishesOnTop: true as const,
    piSurjectiveOnTopPart: true as const,
    kernelPiIffVanishesOnTopOnSample: true as const,
    splitReconstructs: true as const,
    splitUniqueOnSample: true as const,
    sampleSize: supportedSamples.length,
  });
}

export const defaultValuation: readonly ChargedCell[] = Object.freeze([
  chargedCell("truth-cell", "held"),
  chargedCell("both-cell", "contested"),
  chargedCell("false-cell", "denied"),
  chargedCell("empty-cell", "unknown"),
]);

export const defaultCochain: Cochain = cochain([
  { cell: "truth-cell", coefficient: 2 },
  { cell: "both-cell", coefficient: 5 },
  { cell: "false-cell", coefficient: 0 },
  { cell: "empty-cell", coefficient: 0 },
]);

export function settlingAssociatedSheafReceipt(): SettlingAssociatedSheafReceipt {
  return Object.freeze({
    kind: "settlingAssociatedSheaf.receipt:witness" as const,
    masks: maskSplitReceipt(defaultValuation),
    restriction: restrictionReceipt(defaultValuation, defaultCochain),
    ses: shortExactSequenceReceipt(defaultValuation, defaultCochain),
    supportProfile: Object.freeze({
      contested: Object.freeze({ dT: false, dK: false, dTop: false }),
      unknown: Object.freeze({ dT: true, dK: true, dTop: false }),
      held: Object.freeze({ dT: false, dK: false, dTop: false }),
      denied: Object.freeze({ dT: false, dK: true, dTop: true }),
    }),
    openFrontier: Object.freeze([
      "The receipt checks finite executable cochain samples and operations.",
      "Sheaf gluing and H1=0 are reused from existing finite cohomology/sheaf surfaces, not reconstructed as arbitrary cover arbitrary cochains.",
      "General bitopological site semantics and non-finite clopen covers remain runtime-frontier obligations.",
    ]),
  });
}
