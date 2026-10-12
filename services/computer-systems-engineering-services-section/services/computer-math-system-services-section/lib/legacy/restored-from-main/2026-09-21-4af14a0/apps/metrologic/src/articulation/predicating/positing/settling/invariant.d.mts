import type { SettlementFiltration, SettlingClosureEquivalenceJudgment, SettlingClosureInvariant } from "./object.mjs";
/** The closure invariant: one step per non-Scott firing with its deduped additions. */
export declare function readClosureInvariantOfSettlementFiltration(carrier: SettlementFiltration): SettlingClosureInvariant;
/** Compare two settlings by closure invariant (stage-for-stage, cell-for-cell up to coincidence). */
export declare function readClosureEquivalenceOfSettlementFiltration(left: SettlementFiltration, right: SettlementFiltration): SettlingClosureEquivalenceJudgment;
