/**
 * RMN normalizer for finite bilattice-coloured weave-draft receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const receiptTerm: Tm = tm.lam(tm.var(0));
