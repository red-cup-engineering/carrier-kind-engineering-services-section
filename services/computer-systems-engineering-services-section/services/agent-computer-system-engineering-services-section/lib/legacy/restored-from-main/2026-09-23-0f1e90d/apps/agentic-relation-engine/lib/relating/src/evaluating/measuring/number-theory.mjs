/**
 * RMN normalizers for finite RelMath.Order number-theory/factorization receipts.
 *
 * The arithmetic computation lives under `analysis.numberTheory`; these terms
 * carry the resulting witness/obstruction objects as portable RMN-normalized
 * receipts for downstream packages.
 */
import { tm, } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";

export const pascalTerm = tm.lam(tm.var(0));
export const binomialTerm = tm.lam(tm.var(0));
export const gcdMeetTerm = tm.lam(tm.var(0));
export const euclidLemmaTerm = tm.lam(tm.var(0));
export const combinatoricsTerm = tm.lam(tm.var(0));
export const primeFactorizationTerm = tm.lam(tm.var(0));
export const primeFactorizationUniqueTerm = tm.lam(tm.var(0));
export const imageFactorizationTerm = tm.lam(tm.var(0));
