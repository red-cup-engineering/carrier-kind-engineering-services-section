/**
 * RMN normalizers for finite lax-idempotence/antisymmetry receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const kzStrictCollapseTerm: Tm = tm.lam(tm.var(0));
export const laxSlackAntisymmetryFailureTerm: Tm = tm.lam(tm.var(0));
export const chargeNoLaxSlackTerm: Tm = tm.lam(tm.var(0));
export const preValueCategoryReceiptTerm: Tm = tm.lam(tm.var(0));
