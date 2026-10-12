/**
 * analysis/negative-paraconsistent-sheaf - finite executable shadow of
 * RelMath.Cohomology.NegativeParaconsistentSheaf.
 *
 * Lean proves that the negative paraconsistent sheaf is the bilattice-negation
 * mirror of the positive settling-associated sheaf. This module exposes the
 * finite mask/cochain content: dNeg = dF, dFonly, negation mirror laws, the
 * shared top seam, and the negative split into f-only plus top parts.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ChargedCell, type CochainCarrier, type MaskCarrier } from "./settling-associated-sheaf.mjs";
export interface NegationMirrorReceipt {
    readonly kind: "negativeParaconsistentSheaf.negationMirror:witness";
    readonly valuation: readonly ChargedCell[];
    readonly negatedValuation: readonly ChargedCell[];
    readonly dNeg: MaskCarrier;
    readonly dKOfNegated: MaskCarrier;
    readonly dFonly: MaskCarrier;
    readonly dTOfNegated: MaskCarrier;
    readonly dTop: MaskCarrier;
    readonly dTopOfNegated: MaskCarrier;
    readonly dNegEqualsDkOfNegation: true;
    readonly dFonlyEqualsDtOfNegation: true;
    readonly topSeamFixed: true;
    readonly negationInvolutive: true;
    readonly chargeMirrorTable: Readonly<Record<ChargeValueName, ChargeValueName>>;
}
export interface NegativeSplitReceipt {
    readonly kind: "negativeParaconsistentSheaf.split:witness";
    readonly valuation: readonly ChargedCell[];
    readonly dNeg: MaskCarrier;
    readonly dFonly: MaskCarrier;
    readonly dTop: MaskCarrier;
    readonly cochain: CochainCarrier;
    readonly fPart: CochainCarrier;
    readonly topPart: CochainCarrier;
    readonly reconstructed: CochainCarrier;
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
    readonly cochain: CochainCarrier;
    readonly dNeg: MaskCarrier;
    readonly restricted: CochainCarrier;
    readonly restrictedVanishesOffDNeg: true;
    readonly fullRestrictionIdentity: true;
    readonly restrictionComposesByMeet: true;
}
export interface NegativeParaconsistentSheafReceipt {
    readonly kind: "negativeParaconsistentSheaf.receipt:witness";
    readonly mirror: NegationMirrorReceipt;
    readonly split: NegativeSplitReceipt;
    readonly restriction: NegativeRestrictionReceipt;
    readonly supportReading: Readonly<Record<ChargeValueName, {
        readonly dNeg: boolean;
        readonly dFonly: boolean;
        readonly dTop: boolean;
    }>>;
    readonly openFrontier: readonly string[];
}
declare const zeroCochain: any;
export declare function negateChargeName(value: ChargeValueName): ChargeValueName;
export declare function negateValuation(valuation: readonly ChargedCell[]): readonly ChargedCell[];
/** Negative-designated mask: dNeg = DFrame.dF = {f, top}. */
export declare function dNeg(valuation: readonly ChargedCell[]): MaskCarrier;
/** F-only mask: cells whose settled charge is f. */
export declare function dFonly(valuation: readonly ChargedCell[]): MaskCarrier;
export declare const restrictNeg: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare const projF: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare const projTopNeg: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare const isSection: (valuation: readonly ChargedCell[], value: CochainCarrier) => boolean;
export declare function negationMirrorReceipt(valuationInput?: readonly ChargedCell[]): NegationMirrorReceipt;
export declare function negativeSplitReceipt(valuationInput?: readonly ChargedCell[], value?: CochainCarrier): NegativeSplitReceipt;
export declare function negativeRestrictionReceipt(valuationInput?: readonly ChargedCell[], value?: CochainCarrier): NegativeRestrictionReceipt;
export declare function receipt(): NegativeParaconsistentSheafReceipt;
export { zeroCochain };
