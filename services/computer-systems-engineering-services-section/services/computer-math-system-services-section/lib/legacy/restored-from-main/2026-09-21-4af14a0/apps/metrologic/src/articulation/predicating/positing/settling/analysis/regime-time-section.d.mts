/**
 * analysis/regime-time-section - finite causal past-count time sections.
 *
 * Executable shadow for `RelMath.Lorentzian.RegimeTimeSection`: the global
 * time function `t(x) = |past(x)|`, strictly increasing along finite settled
 * causal orders, with the corpus diamond section `(0,1,1,3)`.
 */
import { type CausalSetCarrier, type CausalSettlementObstruction } from "./causal.mjs";
export interface RegimeTimeSectionReceipt {
    readonly kind: "lorentzian.regimeTimeSection:witness";
    readonly profile: Readonly<Record<string, number>>;
    readonly strictMonotone: true;
    readonly diamondTimeSection: Readonly<Record<"a" | "b" | "c" | "d", number>>;
    readonly diamondStrictPairs: readonly string[];
    readonly ordinalBound: "finite-sub-omega";
    readonly stableCausalityBoundary: "aperiodic biconditional remains frontier";
}
/** The discrete global time function `t(x) = |past(x)|`. */
export declare function timeSection(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction;
/** The full finite time profile, event by event. */
export declare function timeProfile(carrier: CausalSetCarrier): Readonly<Record<string, number>> | CausalSettlementObstruction;
/** Check `x < y` in the causal order implies `t(x) < t(y)`. */
export declare function timeSectionStrictMonotone(carrier: CausalSetCarrier): boolean | CausalSettlementObstruction;
/** Bundle the finite global time-section witness. */
export declare function regimeTimeSectionReceipt(carrier?: CausalSetCarrier): RegimeTimeSectionReceipt | CausalSettlementObstruction;
