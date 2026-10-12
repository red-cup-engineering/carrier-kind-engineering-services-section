/**
 * RMN normalizers for finite predicating quantifier/hyperdoctrine receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const predicatingQuantifyingReceiptTerm: Tm = tm.lam(tm.var(0));
export const predicatingHyperdoctrineReceiptTerm: Tm = tm.lam(tm.var(0));
export const predicatingDualHyperdoctrineReceiptTerm: Tm = tm.lam(tm.var(0));
