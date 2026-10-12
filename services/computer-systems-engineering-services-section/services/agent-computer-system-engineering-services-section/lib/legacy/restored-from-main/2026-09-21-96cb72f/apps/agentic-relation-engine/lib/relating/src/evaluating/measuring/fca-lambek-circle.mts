import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** RMN normalizer for finite FCA/Lambek circle receipts. */
export const circleReceiptTerm: Tm = tm.lam(tm.var(0));

/** RMN normalizer for finite formal-concept-analysis derivation receipts. */
export const formalConceptAnalysisReceiptTerm: Tm = tm.lam(tm.var(0));
