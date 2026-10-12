import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for finite/symbolic ordinal-closure receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
