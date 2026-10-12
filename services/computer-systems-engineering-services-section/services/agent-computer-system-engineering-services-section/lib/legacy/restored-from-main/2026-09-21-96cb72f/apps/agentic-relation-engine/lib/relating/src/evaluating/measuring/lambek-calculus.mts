import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for finite Lambek-algebra law receipts. */
export const lawsTerm: Tm = tm.lam(tm.var(0));
