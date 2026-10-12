/**
 * topology/d-frame - finite executable shadow of Obsmetrologia.DFrame.dframe_valued_sheaf,
 * generic over any caller-supplied four-valued charge/claim vocabulary (see
 * ../four-valued-names.mts).
 *
 * Lean proves frame, d-frame, canonical bitopological d-frame, and
 * d-frame-valued settling sheaf laws. This module exposes the finite powerset
 * instance: subsets as sorted string arrays, consistency as disjointness,
 * totality as covering, and restriction as intersection with a clopen mask. The
 * powerset/frame machinery (`subset`, `meet`, `join`, `allSubsets`, ...) needs no
 * charge vocabulary at all; only `dK`/`dF`/`settledMask`/`valuedSheafReceipt` — the
 * functions that read a `ChargedCell`'s `.charge` field — take a `FourValuedNames`
 * parameter naming which four strings mean bottom/positive-only/negative-only/top.
 *
 * Canonicalized 2026-09-11: this checker (algorithm identical) had been hand-
 * copied into `@lenticule-science/articulating`'s own
 * `predicating/positing/settling/analysis/d-frame.mts` (semiotic charge
 * vocabulary) and `@red-cup-engineering/feltos`'s
 * `src/lib/math/order/d-frame.mts` (federation claim vocabulary). Feltos's own
 * copy had drifted: its `dK`/`dF` filtered the WRONG two of the four charge names
 * relative to its own `chargeOfBooleanPoint` mapping in `topology/twist-product.mts`
 * (bottom=unknown, positiveOnly=held, negativeOnly=denied, top=contested), and its
 * `valuedSheafReceipt`'s `topSharedByBothSides`/`bottomInNeitherSide` checks used
 * `"denied"`/`"contested"` where the law requires `top`/`bottom` — a real latent
 * bug in a real consumer (`negative-paraconsistent-sheaf.mts`'s `dF` import),
 * exactly the drift hand-copying invites and canonicalizing here fixes.
 */
import type { FourValuedNames } from "../four-valued-names.mjs";
export interface ChargedCellLike<Name extends string> {
    readonly cell: string;
    readonly charge: Name;
}
export interface FiniteSubset {
    readonly kind: "dFrame.subset";
    readonly elements: readonly string[];
}
export interface PowersetFrameReceipt {
    readonly kind: "dFrame.powersetFrame:witness";
    readonly universe: readonly string[];
    readonly subsetCount: number;
    readonly bottom: FiniteSubset;
    readonly top: FiniteSubset;
    readonly meetCommutative: true;
    readonly meetAssociative: true;
    readonly meetIdempotent: true;
    readonly unionSupLeastUpperBound: true;
    readonly meetDistributesOverFiniteSup: true;
}
export interface CanonicalDFrameReceipt {
    readonly kind: "dFrame.canonical:witness";
    readonly universe: readonly string[];
    readonly positiveFrame: PowersetFrameReceipt;
    readonly negativeFrame: PowersetFrameReceipt;
    readonly consistentExample: readonly [FiniteSubset, FiniteSubset];
    readonly totalExample: readonly [FiniteSubset, FiniteSubset];
    readonly conIsDisjointness: true;
    readonly totIsCovering: true;
    readonly conDownwardClosed: true;
    readonly totUpwardClosed: true;
}
export interface DFrameValuedSheafReceipt {
    readonly kind: "dFrame.valuedSheaf:witness";
    readonly valuation: readonly ChargedCellLike<string>[];
    readonly clopen: FiniteSubset;
    readonly positiveSupport: FiniteSubset;
    readonly negativeSupport: FiniteSubset;
    readonly settledSupport: FiniteSubset;
    readonly topSharedByBothSides: true;
    readonly bottomInNeitherSide: true;
    readonly conDownwardClosed: true;
    readonly totUpwardClosed: true;
    readonly restrictionMeetPreserving: true;
    readonly restrictionTop: FiniteSubset;
    readonly restrictionMonotone: true;
    readonly restrictionPreservesCon: true;
}
export interface DFrameReceipt {
    readonly kind: "dFrame.receipt:witness";
    readonly powerset: PowersetFrameReceipt;
    readonly canonical: CanonicalDFrameReceipt;
    readonly valuedSheaf: DFrameValuedSheafReceipt;
    readonly openFrontier: readonly string[];
}
export declare function subset(elements: readonly string[]): FiniteSubset;
export declare const includes: (value: FiniteSubset, element: string) => boolean;
export declare const le: (left: FiniteSubset, right: FiniteSubset) => boolean;
export declare const sameSubset: (left: FiniteSubset, right: FiniteSubset) => boolean;
export declare const meet: (left: FiniteSubset, right: FiniteSubset) => FiniteSubset;
export declare const join: (left: FiniteSubset, right: FiniteSubset) => FiniteSubset;
export declare const finiteSup: (family: readonly FiniteSubset[]) => FiniteSubset;
export declare const disjoint: (left: FiniteSubset, right: FiniteSubset) => boolean;
export declare const covers: (universe: readonly string[], left: FiniteSubset, right: FiniteSubset) => boolean;
export declare function allSubsets(universeInput: readonly string[]): readonly FiniteSubset[];
export declare function powersetFrameReceipt(universeInput?: readonly string[]): PowersetFrameReceipt;
export declare function canonicalDFrameReceipt(universeInput?: readonly string[]): CanonicalDFrameReceipt;
export declare function dK<Name extends string>(names: FourValuedNames<Name>, valuation: readonly ChargedCellLike<Name>[]): FiniteSubset;
export declare function dF<Name extends string>(names: FourValuedNames<Name>, valuation: readonly ChargedCellLike<Name>[]): FiniteSubset;
export declare function settledMask<Name extends string>(names: FourValuedNames<Name>, valuation: readonly ChargedCellLike<Name>[], clopen: FiniteSubset): FiniteSubset;
export declare const restrictSub: (clopen: FiniteSubset, value: FiniteSubset) => FiniteSubset;
export declare function valuedSheafReceipt<Name extends string>(names: FourValuedNames<Name>, valuationInput: readonly ChargedCellLike<Name>[], clopenInput?: FiniteSubset): DFrameValuedSheafReceipt;
export declare function dFrameReceipt<Name extends string>(names: FourValuedNames<Name>, valuationInput: readonly ChargedCellLike<Name>[]): DFrameReceipt;
