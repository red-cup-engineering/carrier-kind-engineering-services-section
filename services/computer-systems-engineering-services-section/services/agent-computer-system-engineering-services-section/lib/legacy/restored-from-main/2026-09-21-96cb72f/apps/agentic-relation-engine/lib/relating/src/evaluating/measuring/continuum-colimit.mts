/**
 * RMN normalizer for the finite continuum-colimit receipt.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const receiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the finite receipt for `RelMath.Lorentzian.ChuActionColimit`. */
export const chuInformationActionTerm: Tm = tm.lam(tm.var(0));
