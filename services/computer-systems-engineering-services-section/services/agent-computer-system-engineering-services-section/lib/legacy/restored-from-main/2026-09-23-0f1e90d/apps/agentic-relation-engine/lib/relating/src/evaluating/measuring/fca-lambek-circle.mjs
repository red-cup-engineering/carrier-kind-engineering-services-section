import { tm, } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";

/** RMN normalizer for finite FCA/Lambek circle receipts. */
export const circleReceiptTerm = tm.lam(tm.var(0));

/** RMN normalizer for finite formal-concept-analysis derivation receipts. */
export const formalConceptAnalysisReceiptTerm = tm.lam(tm.var(0));
