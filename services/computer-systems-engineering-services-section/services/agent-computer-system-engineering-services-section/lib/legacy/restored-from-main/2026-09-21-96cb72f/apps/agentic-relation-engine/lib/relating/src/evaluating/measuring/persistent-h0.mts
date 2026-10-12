/**
 * evaluating/measuring/persistent-h0 - RMN normalizer.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

/** Normalize the finite `RelMath.Topology.PersistentH0` receipt. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
