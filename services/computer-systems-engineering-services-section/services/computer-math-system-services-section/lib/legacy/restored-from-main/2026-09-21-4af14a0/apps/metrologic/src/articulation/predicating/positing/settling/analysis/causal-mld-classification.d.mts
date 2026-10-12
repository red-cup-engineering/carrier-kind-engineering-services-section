/**
 * analysis/causal-mld-classification - finite causal H1/MLD class reads.
 *
 * Executable shadows for `RelMath.Lorentzian.CausalMLDClassification` and
 * `RelMath.Lorentzian.CausalMldCohomology`: same-class cochains differ by a
 * coboundary, factor-map pullback preserves that class, and the finite
 * coboundary relation forms the cohomological MLD groupoid.
 */
import { type Cochain, type EventMap } from "./causal-manifoldlikeness.mjs";
import type { CausalSetCarrier } from "./causal.mjs";
export type { Cochain, EventMap };
export interface CausalMldClassificationReceipt {
    readonly kind: "lorentzian.causalMldClassification:witness";
    readonly sameClassReflexive: true;
    readonly sameClassSymmetric: true;
    readonly sameClassTransitive: true;
    readonly pullbackSameClass: true;
    readonly flatClinvCollapse: true;
    readonly oddCycleObstruction: true;
    readonly cohomologicalMldGroupoid: true;
    readonly invariantStep: "factor-map pullback preserves causal H1 class";
    readonly completenessBoundary: "equal H1 forcing carrier-level MLD remains frontier";
}
/** `SameClass phi psi` on finite samples: `phi - psi = delta primitive`. */
export declare function sameClass(phi: Cochain, psi: Cochain, primitive: Cochain, chains: readonly (readonly string[])[]): boolean;
/** Reflexivity: a cochain differs from itself by the zero coboundary. */
export declare function sameClassRefl(phi: Cochain, chains: readonly (readonly string[])[]): boolean;
/** Symmetry: invert a same-class arrow by negating the primitive. */
export declare function sameClassSymm(phi: Cochain, psi: Cochain, primitive: Cochain, chains: readonly (readonly string[])[]): boolean;
/** Transitivity: compose same-class arrows by adding their primitives. */
export declare function sameClassTrans(phi: Cochain, psi: Cochain, rho: Cochain, leftPrimitive: Cochain, rightPrimitive: Cochain, chains: readonly (readonly string[])[]): boolean;
/** Factor-map pullback preserves same-class cochains on finite samples. */
export declare function pullbackSameClass(map: EventMap, phi: Cochain, psi: Cochain, primitive: Cochain, sourceChains: readonly (readonly string[])[]): boolean;
/** The flat causal cl-inv collapses exactly when a Bool polarization exists. */
export declare function flatClinvCollapse(carrier: CausalSetCarrier): boolean;
/** The all-degree cohomological MLD groupoid laws as finite coboundary checks. */
export declare function cohomologicalMldGroupoid(phi: Cochain, psi: Cochain, rho: Cochain, leftPrimitive: Cochain, rightPrimitive: Cochain, chains: readonly (readonly string[])[]): boolean;
/** Bundle the finite causal H1/MLD classification invariant. */
export declare function causalMldClassificationReceipt(): CausalMldClassificationReceipt;
