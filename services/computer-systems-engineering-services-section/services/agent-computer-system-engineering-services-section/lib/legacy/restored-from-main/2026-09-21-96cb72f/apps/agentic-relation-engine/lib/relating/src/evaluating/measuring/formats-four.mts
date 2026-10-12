/**
 * RMN normalizer for the finite FormatsFour closure-hierarchy receipt.
 */
import { tm, type Tm } from "@red-cup-engineering/relation-model-notation";

export const closureHierarchyTerm: Tm = tm.lam(tm.var(0));
