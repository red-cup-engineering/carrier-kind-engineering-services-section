/**
 * evaluating/measuring/recurrence — RMN normalizers for finite Step-N recurrence receipts.
 */
import { tm, } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";

/** Normalize a finite Step-N all-equal witness or obstruction. */
export const stepNAllEqualTerm = tm.lam(tm.var(0));

/** Normalize a finite substitution growth-degree witness or obstruction. */
export const growthDegreeTerm = tm.lam(tm.var(0));

/** Normalize the finite Step-N co-incrementing hierarchy carrier. */
export const stepNHierarchyTerm = tm.lam(tm.var(0));

/** Normalize the finite Fibonacci/Padovan substitution-primitivity receipt. */
export const substitutionPrimitivityTerm = tm.lam(tm.var(0));
