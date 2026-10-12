/**
 * analysis/causal-involutivity - finite bicharacteristic propagation reads.
 *
 * Executable shadow for `RelMath.Lorentzian.CausalInvolutivity`: on finite
 * causal triangles, a closed 1-cochain is additive along composable
 * bicharacteristic edges, so a nonzero composite wavefront decomposes onto a
 * nonzero leg.
 */
import type { CausalSetCarrier } from "./causal.mjs";
import { type ColorAssignment } from "./causal-polarization.mjs";
export interface CausalEdge {
    readonly from: string;
    readonly to: string;
}
export type EdgeCochain = (edge: CausalEdge) => number;
export interface BicharacteristicTriangle {
    readonly edge01: CausalEdge;
    readonly edge12: CausalEdge;
    readonly edge02: CausalEdge;
}
export interface CausalInvolutivityReceipt {
    readonly kind: "lorentzian.causalInvolutivity:witness";
    readonly triangles: readonly BicharacteristicTriangle[];
    readonly edgesComposable: true;
    readonly cocycleAdditive: true;
    readonly wavefrontInvolutive: true;
    readonly bicharacteristicCausal: true;
    readonly bridgeBoundary: "symplectic Hamiltonian flow remains frontier";
}
/** The two legs of a causal 2-simplex are bicharacteristic-composable. */
export declare function bicharacteristicComposable(left: CausalEdge, right: CausalEdge): boolean;
/** List the causal 2-simplices as composable bicharacteristic triangles. */
export declare function bicharacteristicTriangles(carrier: CausalSetCarrier): readonly BicharacteristicTriangle[];
/** A 1-cochain is additive on every causal triangle: `phi(ac)=phi(ab)+phi(bc)`. */
export declare function cocycleAdditive(carrier: CausalSetCarrier, cochain: EdgeCochain): boolean;
/** A nonzero composite wavefront has at least one nonzero bicharacteristic leg. */
export declare function wavefrontInvolutive(carrier: CausalSetCarrier, cochain: EdgeCochain): boolean;
/** Exact colour coboundary `dc` as a causal edge cochain. */
export declare function colorCoboundary(colors: ColorAssignment): EdgeCochain;
/** Bundle the finite propagation content of causal involutivity. */
export declare function causalInvolutivityReceipt(carrier?: CausalSetCarrier, colors?: ColorAssignment): CausalInvolutivityReceipt;
