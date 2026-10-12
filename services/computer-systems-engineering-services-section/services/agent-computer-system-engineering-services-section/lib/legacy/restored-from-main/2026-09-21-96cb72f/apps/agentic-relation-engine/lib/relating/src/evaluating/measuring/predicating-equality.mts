/**
 * RMN normalizers for finite predicating equality receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const predicatingEqualityReceiptTerm: Tm = tm.lam(tm.var(0));
export const predicatingTruthQuantifierTerm: Tm = tm.lam(tm.var(0));
