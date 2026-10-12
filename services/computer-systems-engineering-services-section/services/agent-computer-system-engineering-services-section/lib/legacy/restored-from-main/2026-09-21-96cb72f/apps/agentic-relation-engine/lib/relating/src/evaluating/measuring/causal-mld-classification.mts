/**
 * RMN normalizer for the finite causal MLD/classification receipt.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const receiptTerm: Tm = tm.lam(tm.var(0));
