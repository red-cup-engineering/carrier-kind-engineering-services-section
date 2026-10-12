/**
 * RMN normalizers for finite chromatic-Lorentzian settling and action receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const receiptTerm: Tm = tm.lam(tm.var(0));
export const actionReceiptTerm: Tm = tm.lam(tm.var(0));
