/**
 * analysis/settling-associated-sheaf - finite executable shadow of
 * RelMath.Cohomology.SettlingAssociatedSheaf.
 *
 * Lean proves the settling-associated sheaf masks, restriction laws, and the
 * designated short exact sequence. This module exposes the finite mask/cochain
 * operations over charge-valued cells, plus bounded sample receipts for the
 * all-integer proof obligations.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export interface ChargedCell {
    readonly kind: "settlingAssociatedSheaf.chargedCell";
    readonly cell: string;
    readonly charge: ChargeValueName;
}
export interface MaskCarrier {
    readonly kind: "settlingAssociatedSheaf.mask";
    readonly name: "dT" | "dK" | "dTop" | "custom";
    readonly cells: readonly string[];
}
export interface CochainEntry {
    readonly cell: string;
    readonly coefficient: number;
}
export interface CochainCarrier {
    readonly kind: "settlingAssociatedSheaf.cochain";
    readonly coefficients: readonly CochainEntry[];
}
export interface MaskSplitReceipt {
    readonly kind: "settlingAssociatedSheaf.maskSplit:witness";
    readonly valuation: readonly ChargedCell[];
    readonly dT: MaskCarrier;
    readonly dTop: MaskCarrier;
    readonly dK: MaskCarrier;
    readonly dTDisjointDTop: true;
    readonly dKEqualsUnion: true;
    readonly dTIncludedInDK: true;
    readonly dTopIncludedInDK: true;
}
export interface RestrictionReceipt {
    readonly kind: "settlingAssociatedSheaf.restriction:witness";
    readonly cochain: CochainCarrier;
    readonly fullMask: MaskCarrier;
    readonly subMask: MaskCarrier;
    readonly restricted: CochainCarrier;
    readonly fullRestrictionIdentity: true;
    readonly restrictedVanishesOffMask: true;
    readonly restrictionComposesByMeet: true;
}
export interface ShortExactSequenceReceipt {
    readonly kind: "settlingAssociatedSheaf.shortExactSequence:witness";
    readonly cochain: CochainCarrier;
    readonly iota: CochainCarrier;
    readonly pi: CochainCarrier;
    readonly truthPart: CochainCarrier;
    readonly topPart: CochainCarrier;
    readonly reconstructed: CochainCarrier;
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
    readonly supportReading: Readonly<Record<ChargeValueName, {
        readonly dT: boolean;
        readonly dK: boolean;
        readonly dTop: boolean;
    }>>;
    readonly openFrontier: readonly string[];
}
export declare function chargedCell(cell: string, charge: string): ChargedCell;
export declare function mask(name: MaskCarrier["name"], cells: readonly string[]): MaskCarrier;
export declare function cochain(coefficients: readonly CochainEntry[]): CochainCarrier;
export declare function dT(valuation: readonly ChargedCell[]): MaskCarrier;
export declare function dTop(valuation: readonly ChargedCell[]): MaskCarrier;
export declare function dK(valuation: readonly ChargedCell[]): MaskCarrier;
export declare function restrict(support: MaskCarrier, value: CochainCarrier): CochainCarrier;
export declare const iota: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare const pi: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare const projT: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare const projTop: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare function combine(left: CochainCarrier, right: CochainCarrier): CochainCarrier;
export declare function vanishesOff(support: MaskCarrier, value: CochainCarrier, cells: readonly string[]): boolean;
export declare function vanishesOnTop(valuation: readonly ChargedCell[], value: CochainCarrier): boolean;
export declare function maskSplitReceipt(valuationInput?: readonly ChargedCell[]): MaskSplitReceipt;
export declare function restrictionReceipt(valuationInput?: readonly ChargedCell[], value?: CochainCarrier): RestrictionReceipt;
export declare function shortExactSequenceReceipt(valuationInput?: readonly ChargedCell[], value?: CochainCarrier): ShortExactSequenceReceipt;
export declare const defaultValuation: readonly ChargedCell[];
export declare const defaultCochain: CochainCarrier;
export declare function receipt(): SettlingAssociatedSheafReceipt;
