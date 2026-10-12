/**
 * evaluating/measuring/dynamics — RMN normalizers for finite substitution-dynamics receipts.
 */
import { tm, } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";

/** Normalize a finite MLD invariant carrier. */
export const mldInvariantTerm = tm.lam(tm.var(0));

/** Normalize a finite MLD witness or obstruction. */
export const mutuallyLocallyDerivableTerm = tm.lam(tm.var(0));

/** Normalize a finite inverse-hull thread witness or obstruction. */
export const hullThreadTerm = tm.lam(tm.var(0));

/** Normalize the finite hull/colimit seam invariant. */
export const hullSeamTerm = tm.lam(tm.var(0));
