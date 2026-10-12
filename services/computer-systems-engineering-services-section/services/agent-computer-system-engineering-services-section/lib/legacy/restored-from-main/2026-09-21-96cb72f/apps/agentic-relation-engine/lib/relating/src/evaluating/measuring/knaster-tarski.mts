/**
 * RMN normalizers for finite Knaster-Tarski fixed-point receipts.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const fixedPointsTerm: Tm = tm.lam(tm.var(0));
