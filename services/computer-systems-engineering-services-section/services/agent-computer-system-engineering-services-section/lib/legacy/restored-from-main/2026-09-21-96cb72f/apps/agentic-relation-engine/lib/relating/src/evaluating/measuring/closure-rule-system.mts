/**
 * RMN normalizers for finite closure-rule-system receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const closureRuleReceiptTerm: Tm = tm.lam(tm.var(0));
export const closureRuleAlwaysTerm: Tm = tm.lam(tm.var(0));
