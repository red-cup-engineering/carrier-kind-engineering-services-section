/**
 * analysis/causal-manifoldlikeness - finite causal cohomology invariance reads.
 *
 * Executable carrier shadows for `RelMath.Lorentzian.CausalManifoldlikeness`:
 * pullback as a cochain map, cocycle/coboundary preservation on finite samples,
 * and the corpus diamond interval's Philip-Hall/Mobius Euler signature.
 */
import { type CausalSetCarrier, type CausalSettlementObstruction } from "./causal.mjs";
export type EventMap = Readonly<Record<string, string>>;
export type Cochain = (chain: readonly string[]) => number;
export interface DiamondIntervalEulerReceipt {
    readonly kind: "lorentzian.causalManifoldlikeness.diamondIntervalEuler:witness";
    readonly interval: readonly [string, string];
    readonly chainCounts: readonly [number, number, number];
    readonly hallSum: number;
    readonly mobius: number;
    readonly eulerEqualsMobius: true;
    readonly linkSignature: "S0";
    readonly certifiedDimension: 2;
}
export interface CausalManifoldlikenessReceipt {
    readonly kind: "lorentzian.causalManifoldlikeness:witness";
    readonly pullbackDelta: true;
    readonly pullbackCocycle: true;
    readonly pullbackCoboundary: true;
    readonly diamondIntervalEuler: DiamondIntervalEulerReceipt;
    readonly topologyMldInvariant: true;
    readonly diamondCertified2DManifoldlike: true;
    readonly hauptvermutungBoundary: "continuum-limit Betti matching remains frontier";
}
/** The factor-map pullback `(f^* phi)(sigma) = phi(sigma.map(f))`. */
export declare function pullback(map: EventMap, cochain: Cochain): Cochain;
/** The alternating simplicial coboundary on finite chains. */
export declare function delta(cochain: Cochain): Cochain;
/** Check `f^*(delta phi) = delta(f^* phi)` over a finite chain sample. */
export declare function pullbackDeltaCommutes(map: EventMap, cochain: Cochain, chains: readonly (readonly string[])[]): boolean;
/** Check that a closed cochain remains closed under finite pullback samples. */
export declare function pullbackPreservesCocycle(map: EventMap, cocycle: Cochain, chains: readonly (readonly string[])[]): boolean;
/** Check that a coboundary pulls back to the coboundary of the pulled primitive. */
export declare function pullbackPreservesCoboundary(map: EventMap, primitive: Cochain, chains: readonly (readonly string[])[]): boolean;
/**
 * Count strict chains from `from` to `to` with exactly `length` order-edges.
 * Length 1 is the direct two-event chain `[from,to]`, matching RelMath's
 * `CausalMobius.chainCount ... 1`.
 */
export declare function chainCount(carrier: CausalSetCarrier, length: number, from: string, to: string): number | CausalSettlementObstruction;
/** The Philip Hall alternating chain sum `sum_k (-1)^k c_k`. */
export declare function hallSum(carrier: CausalSetCarrier, from: string, to: string, maxLength?: number): number | CausalSettlementObstruction;
/** The corpus diamond interval `(a,d)` Euler/Mobius witness. */
export declare function diamondIntervalEulerReceipt(): DiamondIntervalEulerReceipt;
/** Bundle the finite computable halves of RelMath's causal manifoldlikeness theorem. */
export declare function causalManifoldlikenessReceipt(): CausalManifoldlikenessReceipt;
