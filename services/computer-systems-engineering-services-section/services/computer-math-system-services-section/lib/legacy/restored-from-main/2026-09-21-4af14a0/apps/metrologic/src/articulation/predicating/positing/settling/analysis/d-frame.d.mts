/**
 * analysis/d-frame - articulating's own semiotic-charge binding of the
 * canonical, algebra-generic finite executable shadow of
 * Obsmetrologia.DFrame.dframe_valued_sheaf.
 *
 * Canonicalized 2026-09-11 to
 * `@lenticule-science/sheaf-mathematics-services-section/topology/d-frame`
 * alongside `./twist-product.mts` (same founding note). The powerset/frame
 * machinery needs no charge vocabulary; only `dK`/`dF`/`settledMask`/
 * `valuedSheafReceipt` take articulating's own semiotic charge names
 * (absurd/potential/active/stable) as a bound parameter.
 */
import { type ChargedCell } from "./settling-associated-sheaf.mjs";
import { subset as subsetGeneric, includes, le, sameSubset, meet, join, finiteSup, disjoint, covers, allSubsets, powersetFrameReceipt, canonicalDFrameReceipt, restrictSub, type FiniteSubset, type PowersetFrameReceipt, type CanonicalDFrameReceipt, type DFrameValuedSheafReceipt, type DFrameReceipt as DFrameReceiptGeneric } from "@lenticule-science/metrologic/sheaf/topology/d-frame";
export { subsetGeneric as subset, includes, le, sameSubset, meet, join, finiteSup, disjoint, covers, allSubsets, powersetFrameReceipt, canonicalDFrameReceipt, restrictSub, };
export type { FiniteSubset, PowersetFrameReceipt, CanonicalDFrameReceipt, DFrameValuedSheafReceipt };
export type DFrameReceipt = DFrameReceiptGeneric;
export declare const dK: (valuation: readonly ChargedCell[]) => FiniteSubset;
export declare const dF: (valuation: readonly ChargedCell[]) => FiniteSubset;
export declare const settledMask: (valuation: readonly ChargedCell[], clopen: FiniteSubset) => FiniteSubset;
export declare const defaultValuation: readonly ChargedCell[];
export declare function valuedSheafReceipt(valuationInput?: readonly ChargedCell[], clopenInput?: FiniteSubset): DFrameValuedSheafReceipt;
export declare function receipt(): DFrameReceipt;
