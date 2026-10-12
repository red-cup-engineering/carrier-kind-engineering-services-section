/**
 * analysis/settling-associated-sheaf - finite executable runtime surface.
 *
 * designated short exact sequence. This module exposes the finite mask/cochain
 * operations over charge-valued cells, plus bounded sample receipts for the
 * all-integer proof obligations.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import * as canonical from "@lenticule-science/articulating/predicating/positing/settling/analysis/settling-associated-sheaf";
import { asChargeValueName, toArticulatingName, fromArticulatingName, type ChargeValueName } from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/claim-charge";


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

export type Mask = FromJsonSchema<typeof maskSchemaContractSchema>;

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


const toCanonical = (entries: readonly ChargedCell[]): readonly canonical.ChargedCell[] =>
  entries.map((entry) => canonical.chargedCell(entry.cell, toArticulatingName(entry.charge)));
const fromCanonical = (entry: canonical.ChargedCell): ChargedCell =>
  Object.freeze({...entry, charge: fromArticulatingName(entry.charge)});
export const chargedCell = (cell: string, charge: string): ChargedCell =>
  fromCanonical(canonical.chargedCell(cell, toArticulatingName(asChargeValueName(charge))));
export const mask = canonical.mask;
export const cochain = canonical.cochain;
export const dT = (v: readonly ChargedCell[]): Mask => canonical.dT(toCanonical(v));
export const dTop = (v: readonly ChargedCell[]): Mask => canonical.dTop(toCanonical(v));
export const dK = (v: readonly ChargedCell[]): Mask => canonical.dK(toCanonical(v));
export const restrict = canonical.restrict;
export const iota = (v: readonly ChargedCell[], c: Cochain): Cochain => canonical.iota(toCanonical(v),c);
export const pi = (v: readonly ChargedCell[], c: Cochain): Cochain => canonical.pi(toCanonical(v),c);
export const projT = iota;
export const projTop = pi;
export const combine = canonical.combine;
export const vanishesOff = canonical.vanishesOff;
export const vanishesOnTop = (v: readonly ChargedCell[], c: Cochain): boolean => canonical.vanishesOnTop(toCanonical(v),c);
export const defaultValuation: readonly ChargedCell[] = Object.freeze(canonical.defaultValuation.map(fromCanonical));
export const defaultCochain = canonical.defaultCochain;
export function maskSplitReceipt(v: readonly ChargedCell[] = defaultValuation): MaskSplitReceipt {
  const r = canonical.maskSplitReceipt(toCanonical(v));
  return Object.freeze({...r, valuation: Object.freeze(r.valuation.map(fromCanonical))});
}
export const restrictionReceipt = (v: readonly ChargedCell[] = defaultValuation, c: Cochain = defaultCochain): RestrictionReceipt =>
  canonical.restrictionReceipt(toCanonical(v),c);
export const shortExactSequenceReceipt = (v: readonly ChargedCell[] = defaultValuation, c: Cochain = defaultCochain): ShortExactSequenceReceipt =>
  canonical.shortExactSequenceReceipt(toCanonical(v),c);
export function settlingAssociatedSheafReceipt(): SettlingAssociatedSheafReceipt {
  const {supportReading, masks, ...r} = canonical.receipt();
  return Object.freeze({...r, masks:Object.freeze({...masks,valuation:Object.freeze(masks.valuation.map(fromCanonical))}),
    supportProfile: Object.freeze(Object.fromEntries(Object.entries(supportReading).map(([name, profile]) => [fromArticulatingName(name as canonical.ChargedCell["charge"]),profile]))) as SettlingAssociatedSheafReceipt["supportProfile"]});
}
