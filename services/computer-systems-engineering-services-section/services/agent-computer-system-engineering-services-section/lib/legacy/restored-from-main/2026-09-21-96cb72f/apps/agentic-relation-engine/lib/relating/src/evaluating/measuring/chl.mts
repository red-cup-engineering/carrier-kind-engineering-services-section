/**
 * RMN normalizer for finite Curry-Howard-Lambek quartet receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const quartetIsNuclearTerm: Tm = tm.lam(tm.var(0));
