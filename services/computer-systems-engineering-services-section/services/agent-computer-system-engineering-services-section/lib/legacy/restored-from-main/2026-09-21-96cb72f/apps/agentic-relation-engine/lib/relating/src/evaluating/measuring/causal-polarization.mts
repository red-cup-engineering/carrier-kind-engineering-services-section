/**
 * RMN normalizers for finite causal polarization and Liouville receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const polarizationReceiptTerm: Tm = tm.lam(tm.var(0));
export const liouvilleReceiptTerm: Tm = tm.lam(tm.var(0));
