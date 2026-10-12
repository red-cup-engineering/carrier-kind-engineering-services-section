import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for finite Scott-continuity and settling-coalgebra receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
