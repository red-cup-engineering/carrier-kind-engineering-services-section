/**
 * analysis/residuated-lattice - finite executable shadow of
 * RelMath.Order.ResiduatedLatticeStandalone.
 *
 * Lean proves the integral commutative residuated lattice laws abstractly over
 * a bounded lattice. This module checks the finite table version: bounded
 * lattice tables plus fusion/residual tables satisfy the commutative monoid
 * laws, residuation adjunction, integrality, and derived laws.
 */
import { type BoundedLatticeObstruction, type FiniteLatticeSystem } from "./order-infra.mjs";
export interface FiniteResiduatedLatticeSystem {
    readonly kind: "residuatedLattice.finiteSystem";
    readonly lattice: FiniteLatticeSystem;
    readonly top: number;
    readonly bot: number;
    readonly one: number;
    readonly fuse: readonly (readonly number[])[];
    readonly imp: readonly (readonly number[])[];
}
export declare function finiteResiduatedLatticeSystem(lattice: FiniteLatticeSystem, top: number, bot: number, one: number, fuse: readonly (readonly number[])[], imp: readonly (readonly number[])[]): FiniteResiduatedLatticeSystem;
export interface ResiduatedLatticeWitness {
    readonly kind: "residuatedLattice.laws:witness";
    readonly carrier: readonly string[];
    readonly top: number;
    readonly topLabel: string;
    readonly bot: number;
    readonly botLabel: string;
    readonly one: number;
    readonly oneLabel: string;
    readonly boundedLattice: true;
    readonly commutativeMonoid: true;
    readonly residuation: true;
    readonly integral: true;
    readonly fuseMonotone: true;
    readonly leOne: true;
    readonly modusPonens: true;
    readonly fuseLeMeet: true;
}
export interface ResiduatedLatticeObstruction {
    readonly kind: "residuatedLattice.laws-obstruction";
    readonly reason: "boundedLattice" | "fuse.comm" | "fuse.assoc" | "fuse.one" | "residuation" | "integral" | "fuse.mono.left" | "fuse.mono.right" | "le.one" | "modusPonens" | "fuse.leMeet";
    readonly boundedLattice?: BoundedLatticeObstruction;
    readonly indices?: readonly number[];
    readonly labels?: readonly string[];
    readonly left?: number | undefined;
    readonly right?: number | undefined;
}
export type ResiduatedLatticeJudgment = ResiduatedLatticeWitness | ResiduatedLatticeObstruction;
/** Finite integral commutative residuated-lattice law receipt. */
export declare function laws(system: FiniteResiduatedLatticeSystem): ResiduatedLatticeJudgment;
export declare const twoBooleanResiduatedLattice: FiniteResiduatedLatticeSystem;
export declare const twoBooleanOrder: any;
