/**
 * analysis/frobenius-tqft - finite/runtime shadow of the settling Frobenius TQFT.
 *
 * Executable part of:
 * - RelMath.Value.SettlingFrobeniusTQFT
 *
 * The worked algebra is Z[x]/(x^2), carried as integer pairs `(a,b)` for
 * `a + b*x`. Lean proves the laws for all integers. Runtime exposes the
 * operations, degree embedding, TQFT generator package, and a finite sample law
 * checker that can travel through RMN.
 */
import { type BigradedDiamondTowerReceipt } from "./bigraded-diamond.mjs";
export interface Z2 {
    readonly kind: "frobenius.z2";
    readonly unit: number;
    readonly top: number;
}
export interface Tensor {
    readonly kind: "frobenius.tensor";
    readonly left: Z2;
    readonly right: Z2;
}
export interface FrobeniusLawReceipt {
    readonly kind: "frobenius.laws:witness";
    readonly sample: readonly Z2[];
    readonly additiveAbelianGroup: true;
    readonly associativeMultiplication: true;
    readonly commutativeMultiplication: true;
    readonly unitLaws: true;
    readonly counitLaws: true;
    readonly frobeniusCompatibility: true;
    readonly xSquaredZero: true;
    readonly checkedPairs: number;
    readonly leanAllIntegerProof: "RelMath.Frobenius.settling_frobenius_algebra";
}
export interface DegreeReceipt {
    readonly kind: "frobenius.degree:witness";
    readonly h0UnitAxis: true;
    readonly h1TopAxis: true;
    readonly vanishesAboveOne: true;
    readonly counitReadsTop: true;
    readonly h0Example: Z2;
    readonly h1Example: Z2;
    readonly h2Example: Z2;
}
export interface TqftReceipt {
    readonly kind: "frobenius.tqft:witness";
    readonly circleValue: "Z[x]/(x^2)";
    readonly unit: Z2;
    readonly multiplication: "mu((a,b),(c,d)) = (a*c, a*d + b*c)";
    readonly counit: "epsilon(a,b) = b";
    readonly comultiplication: "Delta(a,b) = a*(1 tensor x + x tensor 1) + b*(x tensor x)";
    readonly generatorsMatch: true;
    readonly roundtripMultiplication: true;
    readonly roundtripUnit: true;
    readonly abramsBoundary: "worked commutative Frobenius algebra yields generating 2D TQFT data; full symmetric monoidal equivalence remains proof-side";
}
export interface SettlingFrobeniusReceipt {
    readonly kind: "frobenius.settling.receipt:witness";
    readonly laws: FrobeniusLawReceipt;
    readonly degree: DegreeReceipt;
    readonly tqft: TqftReceipt;
    readonly k4Grading: BigradedDiamondTowerReceipt;
    readonly openFrontier: readonly string[];
}
export declare function z2(unit: number, top: number): Z2;
export declare const zero: Z2;
export declare const one: Z2;
export declare const x: Z2;
export declare function add(left: Z2, right: Z2): Z2;
export declare function neg(value: Z2): Z2;
export declare function mul(left: Z2, right: Z2): Z2;
export declare function counit(value: Z2): number;
export declare function tensor(left: Z2, right: Z2): Tensor;
export declare function comul(value: Z2): readonly Tensor[];
export declare function intSmul(coefficient: number, value: Z2): Z2;
export declare function degreeOfClass(degree: number, coefficient: number): Z2;
export declare function checkLaws(sample?: readonly Z2[]): FrobeniusLawReceipt;
export declare function degreeReceipt(coefficient?: number): DegreeReceipt;
export declare function tqftReceipt(): TqftReceipt;
export declare function receipt(): SettlingFrobeniusReceipt;
