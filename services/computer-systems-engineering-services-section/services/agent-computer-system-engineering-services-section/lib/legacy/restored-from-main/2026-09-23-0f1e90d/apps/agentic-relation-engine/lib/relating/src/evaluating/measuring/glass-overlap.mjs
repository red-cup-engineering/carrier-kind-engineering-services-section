/**
 * evaluating/measuring/glass-overlap - RMN normalizers for finite overlap receipts.
 */
import { tm, } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";

/** Normalize the finite `RelMath.Glass.Overlap` receipt. */
export const receiptTerm = tm.lam(tm.var(0));

/** Normalize the finite `RelMath.Glass.BasinGraph` receipt. */
export const basinGraphTerm = tm.lam(tm.var(0));

/** Normalize the finite `RelMath.Glass.DynamicHeterogeneity` receipt. */
export const dynamicHeterogeneityTerm = tm.lam(tm.var(0));

/** Normalize the finite `RelMath.Glass.KCM` receipt. */
export const kcmTerm = tm.lam(tm.var(0));
