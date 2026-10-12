/**
 * analysis/hauptvermutung - finite spacetime fingerprints.
 *
 * Executable shadow for `RelMath.Lorentzian.Hauptvermutung`: the green,
 * order-intrinsic fingerprint `(relations, action)` computed from a finite
 * causal order alone. Continuum uniqueness remains outside this Node surface.
 */
import { type CausalSetCarrier, type CausalSettlementObstruction } from "./causal.mjs";
export interface SpacetimeFingerprint {
    readonly kind: "lorentzian.spacetimeFingerprint";
    readonly relations: number;
    readonly action: number;
}
export interface HauptvermutungReceipt {
    readonly kind: "lorentzian.hauptvermutungFingerprint:witness";
    readonly fingerprint: SpacetimeFingerprint;
    readonly diamondFingerprint: SpacetimeFingerprint;
    readonly orderIntrinsic: true;
    readonly manifoldFree: true;
    readonly continuumUniquenessBoundary: "faithful embedding uniqueness remains frontier";
}
/** Read the order-intrinsic spacetime fingerprint `(relations, action)`. */
export declare function fingerprint(carrier: CausalSetCarrier): SpacetimeFingerprint | CausalSettlementObstruction;
/** Bundle the finite, testable content of the Hauptvermutung module. */
export declare function hauptvermutungReceipt(carrier?: CausalSetCarrier): HauptvermutungReceipt | CausalSettlementObstruction;
