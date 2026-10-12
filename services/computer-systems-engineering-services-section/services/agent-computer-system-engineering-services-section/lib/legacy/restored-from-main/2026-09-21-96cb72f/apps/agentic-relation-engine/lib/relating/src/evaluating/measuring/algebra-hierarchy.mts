/**
 * RMN normalizer for finite algebra-hierarchy receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const algebraHierarchyReceiptTerm: Tm = tm.lam(tm.var(0));
