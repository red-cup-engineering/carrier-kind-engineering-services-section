import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for finite FOUR knowledge-Heyting nuclear-square receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));

/** RMN normalizer for finite K4-graded bigraded-diamond tower receipts. */
export const towerTerm: Tm = tm.lam(tm.var(0));
