/**
 * analysis/negative-paraconsistent-sheaf - finite executable runtime surface.
 *
 * mirror of the positive settling-associated sheaf. This module exposes the
 * finite mask/cochain content: dNeg = dF, dFonly, negation mirror laws, the
 * shared top seam, and the negative split into f-only plus top parts.
 */
import {
  asChargeValueName,
  chargeValue,
  chargeValueName,
  negateValue,
  type ChargeValueName,
} from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/claim-charge";
import {
  chargedCell,
  cochain,
  combine,
  dK,
  dT,
  dTop,
  defaultCochain,
  defaultValuation,
  mask,
  restrict,
  vanishesOff,
  type ChargedCell,
  type Cochain,
  type CochainEntry,
  type Mask,
} from "./settling-associated-sheaf.mts";
import { dF as dFrameFalseMask } from "../order/d-frame.mts";
import { negativeParaconsistentSheaf } from "@lenticule-science/articulating/predicating/positing/settling/analysis";

export interface NegationMirrorReceipt {
  readonly kind: "negativeParaconsistentSheaf.negationMirror:witness";
  readonly valuation: readonly ChargedCell[];
  readonly negatedValuation: readonly ChargedCell[];
  readonly dNeg: Mask;
  readonly dKOfNegated: Mask;
  readonly dFonly: Mask;
  readonly dTOfNegated: Mask;
  readonly dTop: Mask;
  readonly dTopOfNegated: Mask;
  readonly dNegEqualsDkOfNegation: true;
  readonly dFonlyEqualsDtOfNegation: true;
  readonly topSeamFixed: true;
  readonly negationInvolutive: true;
  readonly chargeMirrorTable: Readonly<Record<ChargeValueName, ChargeValueName>>;
}

export interface NegativeSplitReceipt {
  readonly kind: "negativeParaconsistentSheaf.split:witness";
  readonly valuation: readonly ChargedCell[];
  readonly dNeg: Mask;
  readonly dFonly: Mask;
  readonly dTop: Mask;
  readonly cochain: Cochain;
  readonly fPart: Cochain;
  readonly topPart: Cochain;
  readonly reconstructed: Cochain;
  readonly dFonlyDisjointDTop: true;
  readonly dNegEqualsUnion: true;
  readonly dFonlyIncludedInDNeg: true;
  readonly dTopIncludedInDNeg: true;
  readonly dTopIncludedInDK: true;
  readonly splitReconstructs: true;
  readonly splitUniqueOnSample: true;
  readonly sampleSize: number;
}

export interface NegativeRestrictionReceipt {
  readonly kind: "negativeParaconsistentSheaf.restriction:witness";
  readonly valuation: readonly ChargedCell[];
  readonly cochain: Cochain;
  readonly dNeg: Mask;
  readonly restricted: Cochain;
  readonly restrictedVanishesOffDNeg: true;
  readonly fullRestrictionIdentity: true;
  readonly restrictionComposesByMeet: true;
}

export interface NegativeParaconsistentSheafReceipt {
  readonly kind: "negativeParaconsistentSheaf.receipt:witness";
  readonly mirror: NegationMirrorReceipt;
  readonly split: NegativeSplitReceipt;
  readonly restriction: NegativeRestrictionReceipt;
  readonly supportProfile: Readonly<Record<ChargeValueName, {
    readonly dNeg: boolean;
    readonly dFonly: boolean;
    readonly dTop: boolean;
  }>>;
  readonly openFrontier: readonly string[];
}

const sorted = (cells: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(cells)].sort((left, right) => left.localeCompare(right)));

const asCustomMask = (cells: readonly string[]): Mask => mask("custom", sorted(cells));

const subset = (left: Mask, right: Mask): boolean =>
  left.cells.every((cell) => right.cells.includes(cell));

const sameMask = (left: Mask, right: Mask): boolean =>
  subset(left, right) && subset(right, left);

const meetMask = (left: Mask, right: Mask): Mask =>
  asCustomMask(left.cells.filter((cell) => right.cells.includes(cell)));

const unionMask = (left: Mask, right: Mask): Mask =>
  asCustomMask([...left.cells, ...right.cells]);

const coefficientAt = (value: Cochain, cell: string): number =>
  value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;

const sameCochain = (cells: readonly string[], left: Cochain, right: Cochain): boolean =>
  cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));

const zeroCochain = cochain([]);

const cellsOf = (valuation: readonly ChargedCell[]): readonly string[] =>
  Object.freeze(valuation.map((entry) => entry.cell));

const normalizeValueName = (charge: string): ChargeValueName => asChargeValueName(charge);

export function negateChargeName(value: ChargeValueName): ChargeValueName {
  return chargeValueName(negateValue(chargeValue(value)));
}

export function negateValuation(valuation: readonly ChargedCell[]): readonly ChargedCell[] {
  return Object.freeze(valuation.map((entry) =>
    chargedCell(entry.cell, negateChargeName(normalizeValueName(entry.charge)))));
}

/** Negative-designated mask: dNeg = DFrame.dF = {f, top}. */
export function dNeg(valuation: readonly ChargedCell[]): Mask {
  return asCustomMask(dFrameFalseMask(valuation).elements);
}

/** F-only mask: cells whose settled charge is f. */
export function dFonly(valuation: readonly ChargedCell[]): Mask {
  return asCustomMask(valuation
    .filter((entry) => entry.charge === "denied")
    .map((entry) => entry.cell));
}

export const restrictNeg = (valuation: readonly ChargedCell[], value: Cochain): Cochain =>
  restrict(dNeg(valuation), value);

export const projF = (valuation: readonly ChargedCell[], value: Cochain): Cochain =>
  restrict(dFonly(valuation), value);

export const projTopNeg = (valuation: readonly ChargedCell[], value: Cochain): Cochain =>
  restrict(dTop(valuation), value);

export const isSection = (valuation: readonly ChargedCell[], value: Cochain): boolean =>
  vanishesOff(dNeg(valuation), value, cellsOf(valuation));

const sampleCochains = (cells: readonly string[]): readonly Cochain[] => {
  const values = [-1, 0, 1] as const;
  let samples: readonly Cochain[] = Object.freeze([cochain([])]);
  for (const cell of cells) {
    samples = Object.freeze(samples.flatMap((existing) =>
      values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient } satisfies CochainEntry]))));
  }
  return samples;
};

export function negationMirrorReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
): NegationMirrorReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const negatedValuation = negateValuation(valuation);
  const negativeMask = dNeg(valuation);
  const positiveMaskOfNegated = dK(negatedValuation);
  const falseOnly = dFonly(valuation);
  const truthOnlyOfNegated = dT(negatedValuation);
  const top = dTop(valuation);
  const topOfNegated = dTop(negatedValuation);
  const roundTrip = negateValuation(negatedValuation);
  const dNegEqualsDkOfNegation = sameMask(negativeMask, positiveMaskOfNegated);
  const dFonlyEqualsDtOfNegation = sameMask(falseOnly, truthOnlyOfNegated);
  const topSeamFixed = sameMask(top, topOfNegated);
  const negationInvolutive = valuation.every((entry) =>
    roundTrip.some((candidate) => candidate.cell === entry.cell && candidate.charge === entry.charge));

  if (!dNegEqualsDkOfNegation || !dFonlyEqualsDtOfNegation || !topSeamFixed || !negationInvolutive) {
    throw new TypeError("negationMirrorReceipt: negative sheaf mirror laws failed");
  }

  return Object.freeze({
    kind: "negativeParaconsistentSheaf.negationMirror:witness" as const,
    valuation,
    negatedValuation,
    dNeg: negativeMask,
    dKOfNegated: positiveMaskOfNegated,
    dFonly: falseOnly,
    dTOfNegated: truthOnlyOfNegated,
    dTop: top,
    dTopOfNegated: topOfNegated,
    dNegEqualsDkOfNegation: true as const,
    dFonlyEqualsDtOfNegation: true as const,
    topSeamFixed: true as const,
    negationInvolutive: true as const,
    chargeMirrorTable: Object.freeze({
      contested: negateChargeName("contested"),
      unknown: negateChargeName("unknown"),
      held: negateChargeName("held"),
      denied: negateChargeName("denied"),
    }),
  });
}

type ArticulatingNegativeSplitArguments = Parameters<typeof negativeParaconsistentSheaf.negativeSplitReceipt>;

const articulatingChargeByMetroplatCharge = Object.freeze({
  contested: "absurd",
  unknown: "potential",
  held: "active",
  denied: "stable",
} as const);

const asArticulatingValuation = (
  valuation: readonly ChargedCell[],
): ArticulatingNegativeSplitArguments[0] => Object.freeze(valuation.map((entry) => Object.freeze({
  ...entry,
  charge: articulatingChargeByMetroplatCharge[entry.charge],
}))) as unknown as ArticulatingNegativeSplitArguments[0];

export function negativeSplitReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: Cochain = cochain([
    { cell: "truth-cell", coefficient: 0 },
    { cell: "both-cell", coefficient: 5 },
    { cell: "false-cell", coefficient: -2 },
    { cell: "empty-cell", coefficient: 0 },
  ]),
): NegativeSplitReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const receipt = negativeParaconsistentSheaf.negativeSplitReceipt(
    asArticulatingValuation(valuation),
    value as unknown as ArticulatingNegativeSplitArguments[1],
  );
  return Object.freeze({ ...receipt, valuation }) as NegativeSplitReceipt;
}

export function negativeRestrictionReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: Cochain = defaultCochain,
): NegativeRestrictionReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = cellsOf(valuation);
  const negativeMask = dNeg(valuation);
  const restricted = restrictNeg(valuation, value);
  const fullMask = asCustomMask(cells);
  const fullRestrictionIdentity = sameCochain(cells, restrict(fullMask, value), value);
  const restrictedVanishesOffDNeg = vanishesOff(negativeMask, restricted, cells);
  const restrictionComposesByMeet = sameCochain(
    cells,
    restrict(dTop(valuation), restrict(negativeMask, value)),
    restrict(meetMask(dTop(valuation), negativeMask), value),
  );

  if (!restrictedVanishesOffDNeg || !fullRestrictionIdentity || !restrictionComposesByMeet) {
    throw new TypeError("negativeRestrictionReceipt: negative restriction laws failed");
  }

  return Object.freeze({
    kind: "negativeParaconsistentSheaf.restriction:witness" as const,
    valuation,
    cochain: value,
    dNeg: negativeMask,
    restricted,
    restrictedVanishesOffDNeg: true as const,
    fullRestrictionIdentity: true as const,
    restrictionComposesByMeet: true as const,
  });
}

export function negativeParaconsistentSheafReceipt(): NegativeParaconsistentSheafReceipt {
  const valuation = defaultValuation;
  return Object.freeze({
    kind: "negativeParaconsistentSheaf.receipt:witness" as const,
    mirror: negationMirrorReceipt(valuation),
    split: negativeSplitReceipt(valuation),
    restriction: negativeRestrictionReceipt(valuation),
    supportProfile: Object.freeze({
      contested: Object.freeze({ dNeg: false, dFonly: false, dTop: false }),
      unknown: Object.freeze({ dNeg: false, dFonly: false, dTop: false }),
      held: Object.freeze({ dNeg: true, dFonly: true, dTop: false }),
      denied: Object.freeze({ dNeg: true, dFonly: false, dTop: true }),
    }),
    openFrontier: Object.freeze([
      "The runtime receipt checks finite negative masks and bounded cochain sample laws.",
      "Negation mirror parity is charge-name and finite-cell parity, not arbitrary sheaf equivalence over every cover.",
      "General Cech gluing, CALM equivalence, and non-finite paraconsistent sheaf cohomology remain runtime-frontier obligations.",
    ]),
  });
}

export { zeroCochain };
