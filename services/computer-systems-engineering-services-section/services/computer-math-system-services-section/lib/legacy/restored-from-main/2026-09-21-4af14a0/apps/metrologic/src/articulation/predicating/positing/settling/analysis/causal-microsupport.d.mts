/**
 * analysis/causal-microsupport - finite cone-confined microsupport reads.
 *
 * Executable shadow for `RelMath.Lorentzian.CausalMicrosupport`,
 * `ChargedMicrosupport`, and `CotangentMicrosupport`: support propagates by
 * causal future closure, cone emissions carry FOUR charges, and edge cochains
 * expose a finite cotangent wavefront projection.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type CausalSetCarrier, type CausalSettlementObstruction } from "./causal.mjs";
export interface Codirection {
    readonly from: string;
    readonly to: string;
}
export type EdgeCochain = Readonly<Record<string, number>>;
export interface CausalMicrosupportReceipt {
    readonly kind: "lorentzian.causalMicrosupport:witness";
    readonly pointSupport: readonly string[];
    readonly upwardClosed: true;
    readonly idempotent: true;
    readonly spacelikeExcluded: true;
    readonly chargedOutsideCone: "absurd";
    readonly chargedCollision: "stable";
    readonly chargedAgreement: "potential";
    readonly mergeKnowledgeInflationary: true;
    readonly wavefront: readonly Codirection[];
    readonly singularSupport: readonly string[];
    readonly nonzeroClinvSingular: true;
    readonly bridgeBoundary: "smooth cotangent symplectic flow remains frontier";
}
/** The closed future cone `J+(source)`. */
export declare function closedFuture(carrier: CausalSetCarrier, source: string): readonly string[] | CausalSettlementObstruction;
/** The causal microsupport of a finite event section. */
export declare function microsupport(carrier: CausalSetCarrier, support: readonly string[]): readonly string[] | CausalSettlementObstruction;
/** Microsupport is an up-set of the causal order. */
export declare function microsupportUpwardClosed(carrier: CausalSetCarrier, support: readonly string[]): boolean | CausalSettlementObstruction;
/** Propagating a microsupport again adds no events. */
export declare function microsupportIdempotent(carrier: CausalSetCarrier, support: readonly string[]): boolean | CausalSettlementObstruction;
/** Two events are spacelike when neither lies in the other's causal future. */
export declare function spacelike(carrier: CausalSetCarrier, left: string, right: string): boolean | CausalSettlementObstruction;
/** A point source does not propagate to a spacelike-separated event. */
export declare function microsupportExcludesSpacelike(carrier: CausalSetCarrier, source: string, target: string): boolean | CausalSettlementObstruction;
/** A charged source emits its charge inside the cone and `absurd` outside it. */
export declare function emit(carrier: CausalSetCarrier, source: string, charge: ChargeValueName, target: string): ChargeValueName | CausalSettlementObstruction;
/** Merge two charged cone emissions pointwise by knowledge join. */
export declare function emit2(carrier: CausalSetCarrier, leftSource: string, leftCharge: ChargeValueName, rightSource: string, rightCharge: ChargeValueName, target: string): ChargeValueName | CausalSettlementObstruction;
/** Merging charged influences climbs the knowledge order. */
export declare function emit2Inflationary(carrier: CausalSetCarrier, source: string, charge: ChargeValueName, otherSource: string, otherCharge: ChargeValueName, target: string): boolean | CausalSettlementObstruction;
/** Direct causal edges as the finite cotangent/codirection carrier. */
export declare function codirections(carrier: CausalSetCarrier): readonly Codirection[] | CausalSettlementObstruction;
/** The wavefront set: codirections where the edge cochain is nonzero. */
export declare function wavefront(carrier: CausalSetCarrier, cochain: EdgeCochain): readonly Codirection[] | CausalSettlementObstruction;
/** The base singular support: projection of wavefront codirections to source events. */
export declare function singularSupport(carrier: CausalSetCarrier, cochain: EdgeCochain): readonly string[] | CausalSettlementObstruction;
export declare function emptyWavefrontCoboundary(carrier: CausalSetCarrier, cochain: EdgeCochain): boolean | CausalSettlementObstruction;
export declare function clinvNonzeroSingular(carrier: CausalSetCarrier, cochain: EdgeCochain, edge: Codirection): boolean | CausalSettlementObstruction;
/** Bundle the finite causal/charged/cotangent microsupport laws. */
export declare function causalMicrosupportReceipt(carrier?: CausalSetCarrier): CausalMicrosupportReceipt | CausalSettlementObstruction;
