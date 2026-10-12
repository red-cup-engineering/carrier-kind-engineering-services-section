import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for finite verification-tournament certificate receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
