import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for the finite settling-local-constancy receipt. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
