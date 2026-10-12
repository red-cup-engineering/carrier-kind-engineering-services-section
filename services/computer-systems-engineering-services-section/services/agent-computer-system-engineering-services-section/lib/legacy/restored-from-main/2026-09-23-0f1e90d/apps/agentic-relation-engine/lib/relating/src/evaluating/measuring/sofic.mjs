/**
 * evaluating/measuring/sofic — RMN normalizers for finite sofic-shift receipts.
 */
import { tm, } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";

/** Normalize finite directed-path witnesses/obstructions. */
export const pathTerm = tm.lam(tm.var(0));

/** Normalize finite 1-block sofic-image witnesses/obstructions. */
export const imageTerm = tm.lam(tm.var(0));

/** Normalize the golden-mean `bb` forbidden-pair witness. */
export const goldenForbidsBBTerm = tm.lam(tm.var(0));

/** Normalize the Fibonacci-substitution-lands-in-golden-SFT witness. */
export const fibSubstituteGoldenTerm = tm.lam(tm.var(0));

/** Normalize the decorated deep-sofic-cover witness. */
export const fibDeepSoficTerm = tm.lam(tm.var(0));

/** Normalize the finite local-rule graph-factor/coloring/sofic bridge receipt. */
export const finiteLocalRuleTerm = tm.lam(tm.var(0));
