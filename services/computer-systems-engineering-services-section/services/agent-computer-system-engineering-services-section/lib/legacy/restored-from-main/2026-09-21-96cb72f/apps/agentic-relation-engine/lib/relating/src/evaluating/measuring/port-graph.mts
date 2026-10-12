/**
 * RMN normalizers for finite port-graph and condensate-matter receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const portGraphReceiptTerm: Tm = tm.lam(tm.var(0));
export const condensateMatterReceiptTerm: Tm = tm.lam(tm.var(0));
export const portGrowthReceiptTerm: Tm = tm.lam(tm.var(0));
export const portGrowthTimeReceiptTerm: Tm = tm.lam(tm.var(0));
export const portVershikReceiptTerm: Tm = tm.lam(tm.var(0));
