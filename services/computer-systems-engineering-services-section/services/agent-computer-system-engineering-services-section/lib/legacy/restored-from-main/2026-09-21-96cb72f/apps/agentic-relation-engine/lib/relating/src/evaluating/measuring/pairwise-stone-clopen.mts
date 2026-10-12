import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for the finite paired Priestley / pairwise-Stone FOUR receipt. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
