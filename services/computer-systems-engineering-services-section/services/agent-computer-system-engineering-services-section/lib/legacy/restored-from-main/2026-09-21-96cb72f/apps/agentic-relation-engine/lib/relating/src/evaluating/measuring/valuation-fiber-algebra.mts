/**
 * RMN normalizers for finite valuation-fiber algebra receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const valuationFiberAlgebraReceiptTerm: Tm = tm.lam(tm.var(0));
export const quartetRecurrenceReceiptTerm: Tm = tm.lam(tm.var(0));
