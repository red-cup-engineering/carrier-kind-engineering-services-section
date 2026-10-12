/**
 * evaluating/measuring/glass-overlap - RMN normalizers for finite overlap receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** Normalize the finite `RelMath.Glass.Overlap` receipt. */
export const receiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite `RelMath.Glass.BasinGraph` receipt. */
export const basinGraphTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite `RelMath.Glass.DynamicHeterogeneity` receipt. */
export const dynamicHeterogeneityTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite `RelMath.Glass.KCM` receipt. */
export const kcmTerm: Tm = tm.lam(tm.var(0));
