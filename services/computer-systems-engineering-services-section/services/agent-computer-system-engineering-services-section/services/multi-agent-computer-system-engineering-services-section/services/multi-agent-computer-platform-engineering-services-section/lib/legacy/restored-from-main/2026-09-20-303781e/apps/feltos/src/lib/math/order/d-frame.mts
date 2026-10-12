/**
 * order/d-frame - FeltOS's own federation-claim binding of the canonical,
 * algebra-generic finite executable shadow of
 * Obsmetrologia.DFrame.dframe_valued_sheaf.
 *
 * Canonicalized 2026-09-11 to
 * `@lenticule-science/sheaf-mathematics-services-section/topology/d-frame`
 * alongside `../topology/twist-product.mts` (same founding note). FeltOS's
 * OWN prior copy of this file had drifted from its declared semantics: its
 * `dK`/`dF` filtered the wrong two of the four charge names relative to this
 * file's own `chargeOfBooleanPoint` mapping in `twist-product.mts` (bottom=
 * unknown, positiveOnly=held, negativeOnly=denied, top=contested), and
 * `valuedSheafReceipt`'s `topSharedByBothSides`/`bottomInNeitherSide` checks
 * used the wrong charge names for top/bottom -- a real latent bug reaching a
 * real consumer (`negative-paraconsistent-sheaf.mts`'s `dF` import).
 * Canonicalizing fixes it: the powerset/frame machinery needs no charge
 * vocabulary; only `dK`/`dF`/`settledMask`/`valuedSheafReceipt` take FeltOS's
 * own claim names as a bound parameter, correct by construction.
 */
import {
  chargedCell,
  type ChargedCell,
} from "../topology/settling-associated-sheaf.mts";
import {
  subset as subsetGeneric,
  includes,
  le,
  sameSubset,
  meet,
  join,
  finiteSup,
  disjoint,
  covers,
  allSubsets,
  powersetFrameReceipt,
  canonicalDFrameReceipt,
  dK as dKGeneric,
  dF as dFGeneric,
  settledMask as settledMaskGeneric,
  restrictSub,
  valuedSheafReceipt as valuedSheafReceiptGeneric,
  type FiniteSubset,
  type PowersetFrameReceipt,
  type CanonicalDFrameReceipt,
  type DFrameValuedSheafReceipt,
  type DFrameReceipt as DFrameReceiptGeneric,
} from "@lenticule-science/sheaf-mathematics-services-section/topology/d-frame";

export {
  subsetGeneric as subset,
  includes,
  le,
  sameSubset,
  meet,
  join,
  finiteSup,
  disjoint,
  covers,
  allSubsets,
  powersetFrameReceipt,
  canonicalDFrameReceipt,
  restrictSub,
};
export type { FiniteSubset, PowersetFrameReceipt, CanonicalDFrameReceipt, DFrameValuedSheafReceipt };
export type DFrameReceipt = DFrameReceiptGeneric;

const CLAIM_NAMES = Object.freeze({ bottom: "unknown", positiveOnly: "held", negativeOnly: "denied", top: "contested" } as const);

export const dK = (valuation: readonly ChargedCell[]): FiniteSubset => dKGeneric(CLAIM_NAMES, valuation);
export const dF = (valuation: readonly ChargedCell[]): FiniteSubset => dFGeneric(CLAIM_NAMES, valuation);
export const settledMask = (valuation: readonly ChargedCell[], clopen: FiniteSubset): FiniteSubset =>
  settledMaskGeneric(CLAIM_NAMES, valuation, clopen);

export const defaultValuation: readonly ChargedCell[] = Object.freeze([
  chargedCell("truth-cell", "held"),
  chargedCell("both-cell", "contested"),
  chargedCell("false-cell", "denied"),
  chargedCell("empty-cell", "unknown"),
]);

export function valuedSheafReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  clopenInput: FiniteSubset = subsetGeneric(defaultValuation.map((entry) => entry.cell)),
): DFrameValuedSheafReceipt {
  return valuedSheafReceiptGeneric(CLAIM_NAMES, valuationInput, clopenInput);
}

export function dFrameReceipt(): DFrameReceipt {
  return Object.freeze({
    kind: "dFrame.receipt:witness" as const,
    powerset: powersetFrameReceipt(),
    canonical: canonicalDFrameReceipt(),
    valuedSheaf: valuedSheafReceipt(),
    openFrontier: Object.freeze([
      "The runtime receipt checks finite powerset-frame laws; arbitrary Prop-valued frames and infinitary suprema remain Lean-side.",
      "The d-frame-valued sheaf is modeled over finite charged cells and masks, not arbitrary bitopological sites or all clopen covers.",
      "General d-frame morphism categories and non-finite frame-valued sheaf cohomology remain runtime-frontier obligations.",
    ]),
  });
}
