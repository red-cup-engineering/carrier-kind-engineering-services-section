/**
 * analysis/lambek-calculus - finite Lambek algebra law receipts.
 *
 * Executable shadow of RelMath.Order.LambekCalculus. A finite Lambek algebra is
 * represented by a lattice table, a possibly noncommutative product table, and
 * left/right residual tables satisfying the two bi-residuation adjunctions.
 */
import { type FiniteLatticeSystem, type LatticeObstruction } from "./order-infra.mjs";
export interface FiniteLambekAlgebraSystem {
    readonly kind: "lambek.finiteAlgebraSystem";
    readonly lattice: FiniteLatticeSystem;
    readonly unit: number;
    readonly dot: readonly (readonly number[])[];
    readonly lres: readonly (readonly number[])[];
    readonly rres: readonly (readonly number[])[];
}
export interface LambekLawsWitness {
    readonly kind: "lambek.laws:witness";
    readonly carrier: readonly string[];
    readonly unit: number;
    readonly unitLabel: string;
    readonly lattice: true;
    readonly monoid: true;
    readonly leftBiResiduation: true;
    readonly rightBiResiduation: true;
    readonly modusPonensLeft: true;
    readonly modusPonensRight: true;
    readonly fusionMonotoneLeft: true;
    readonly fusionMonotoneRight: true;
    readonly residualMonotone: true;
    readonly residualAntitone: true;
    readonly unitResiduals: true;
    readonly commutative: boolean;
    readonly residualsCoincideWhenCommutative: boolean;
    readonly singleImplicationWhenCommutative: boolean;
}
export interface LambekLawsObstruction {
    readonly kind: "lambek.laws-obstruction";
    readonly reason: "lattice" | "dot.assoc" | "dot.unit.left" | "dot.unit.right" | "leftBiResiduation" | "rightBiResiduation" | "modusPonens.left" | "modusPonens.right" | "fusion.mono.left" | "fusion.mono.right" | "lres.mono.right" | "lres.antitone.left" | "rres.mono.left" | "rres.antitone.right" | "lres.unit" | "rres.unit" | "commutativeCollapse.residuals" | "commutativeCollapse.singleImplication";
    readonly lattice?: LatticeObstruction;
    readonly indices?: readonly number[];
    readonly labels?: readonly string[];
    readonly left?: number | boolean | undefined;
    readonly right?: number | boolean | undefined;
}
export type LambekLawsJudgment = LambekLawsWitness | LambekLawsObstruction;
export declare function finiteLambekAlgebraSystem(latticeSystem: FiniteLatticeSystem, unit: number, dot: readonly (readonly number[])[], lres: readonly (readonly number[])[], rres: readonly (readonly number[])[]): FiniteLambekAlgebraSystem;
/** Finite Lambek algebra law receipt, including derived laws and commutative collapse. */
export declare function laws(system: FiniteLambekAlgebraSystem): LambekLawsJudgment;
export declare const trivialLambekAlgebra: FiniteLambekAlgebraSystem;
export declare const booleanCommutativeLambekAlgebra: FiniteLambekAlgebraSystem;
