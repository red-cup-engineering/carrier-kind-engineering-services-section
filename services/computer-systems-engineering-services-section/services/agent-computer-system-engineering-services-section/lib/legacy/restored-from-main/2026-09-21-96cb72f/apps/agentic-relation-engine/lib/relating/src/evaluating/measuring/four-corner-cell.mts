/**
 * RMN normalizer for finite four-corner-cell receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const fourCornerCellReceiptTerm: Tm = tm.lam(tm.var(0));
