/**
 * analysis/spectral — exact spectral reads of integer polynomials and matrices.
 *
 * Root location relative to the unit circle (Möbius x↦(1+x)/(1−x) then the
 * Routh–Hurwitz array over the rationals), the Pisot test (one expanding root,
 * none neutral), the resultant via the Sylvester determinant, dominant-root
 * power iteration, and the Mahler measure. Exact throughout over the integer/
 * rational carriers — a pure leaf over exact-number.
 */
import { type Integer, type Matrix, type Natural, type Rational } from "./exact-number.mjs";
/** A polynomial over the integers: ascending-degree coefficients. */
export type IntegerPolynomial = readonly Integer[];
/** A polynomial over the rationals: ascending-degree coefficients. */
export type RationalPolynomial = readonly Rational[];
/** Root counts relative to the unit circle: outside / inside / on. */
export interface RootLocationWitness {
    readonly kind: "spectral.rootLocation:witness";
    readonly polynomial: IntegerPolynomial;
    readonly expanding: Natural;
    readonly contracting: Natural;
    readonly neutral: Natural;
}
/** Obstruction to locating roots, carrying the Routh-test reason. */
export interface RootLocationObstruction {
    readonly kind: "spectral.rootLocation-obstruction";
    readonly polynomial: IntegerPolynomial;
    readonly reason: RightHalfPlaneRootObstructionReason;
    readonly obstruction: RightHalfPlaneRootObstruction;
}
/** The result of locating roots relative to the unit circle. */
export type RootLocationJudgment = RootLocationWitness | RootLocationObstruction;
/** Why a Routh–Hurwitz right-half-plane count failed. */
export type RightHalfPlaneRootObstructionReason = "routh-row-has-zero-pivot" | "routh-first-column-has-zero-entry";
/** The count of right-half-plane roots (Routh first-column sign changes). */
export interface RightHalfPlaneRootWitness {
    readonly kind: "spectral.rightHalfPlaneRoot:witness";
    readonly rhp: Natural;
}
/** Obstruction to counting right-half-plane roots. */
export interface RightHalfPlaneRootObstruction {
    readonly kind: "spectral.rightHalfPlaneRoot-obstruction";
    readonly reason: RightHalfPlaneRootObstructionReason;
}
/** The result of counting right-half-plane roots. */
export type RightHalfPlaneRootJudgment = RightHalfPlaneRootWitness | RightHalfPlaneRootObstruction;
/** A polynomial with Pisot-style root structure. */
export interface PisotRootWitness {
    readonly kind: "spectral.pisotRoot:witness";
    readonly polynomial: IntegerPolynomial;
    readonly location: RootLocationWitness;
}
/** Obstruction to Pisot-style root structure. */
export interface PisotRootObstruction {
    readonly kind: "spectral.pisotRoot-obstruction";
    readonly polynomial: IntegerPolynomial;
    readonly location: RootLocationJudgment;
}
/** The result of the Pisot test. */
export type PisotRootJudgment = PisotRootWitness | PisotRootObstruction;
/** Two polynomials equal after normalization. */
export interface PolynomialIdentityWitness {
    readonly kind: "spectral.polynomialIdentity:witness";
    readonly left: IntegerPolynomial;
    readonly right: IntegerPolynomial;
}
/** Two polynomials that differ after normalization. */
export interface PolynomialIdentityObstruction {
    readonly kind: "spectral.polynomialIdentity-obstruction";
    readonly left: IntegerPolynomial;
    readonly right: IntegerPolynomial;
}
/** The result of comparing two polynomials. */
export type PolynomialIdentityJudgment = PolynomialIdentityWitness | PolynomialIdentityObstruction;
/** Two polynomials sharing a common root (resultant zero). */
export interface PolynomialRootIntersectionWitness {
    readonly kind: "spectral.polynomialRootIntersection:witness";
    readonly left: IntegerPolynomial;
    readonly right: IntegerPolynomial;
    readonly resultant: Integer;
}
/** Two polynomials with no common root (resultant nonzero). */
export interface PolynomialRootIntersectionObstruction {
    readonly kind: "spectral.polynomialRootIntersection-obstruction";
    readonly left: IntegerPolynomial;
    readonly right: IntegerPolynomial;
    readonly resultant: Integer;
}
/** The result of the resultant root-intersection test. */
export type PolynomialRootIntersectionJudgment = PolynomialRootIntersectionWitness | PolynomialRootIntersectionObstruction;
/** A polynomial paired with its reciprocal and their root intersection. */
export interface PolynomialInversionSymmetry {
    readonly kind: "spectral.polynomialInversionSymmetry";
    readonly polynomial: IntegerPolynomial;
    readonly reciprocal: IntegerPolynomial;
    readonly rootIntersection: PolynomialRootIntersectionJudgment;
}
/** A power-iteration estimate of a monic polynomial's dominant root. */
export interface DominantRootConvergenceWitness {
    readonly kind: "spectral.dominantRootConvergence:witness";
    readonly polynomial: IntegerPolynomial;
    readonly iterations: Natural;
    readonly value: Rational;
}
/** Why dominant-root power iteration could not produce an estimate. */
export type DominantRootConvergenceObstructionReason = "non-positive-degree" | "non-monic-polynomial" | "zero-denominator";
/** Obstruction to estimating a dominant root. */
export interface DominantRootConvergenceObstruction {
    readonly kind: "spectral.dominantRootConvergence-obstruction";
    readonly polynomial: IntegerPolynomial;
    readonly iterations: Natural;
    readonly reason: DominantRootConvergenceObstructionReason;
}
/** The result of dominant-root power iteration. */
export type DominantRootConvergenceJudgment = DominantRootConvergenceWitness | DominantRootConvergenceObstruction;
/** A polynomial of Mahler measure one (self-reciprocal, all roots on the circle). */
export interface UnitMahlerMeasureWitness {
    readonly kind: "spectral.mahlerMeasure.unit:witness";
    readonly polynomial: IntegerPolynomial;
    readonly selfReciprocity: PolynomialIdentityWitness;
    readonly location: RootLocationObstruction;
    readonly value: Rational;
}
/** A Mahler measure equal to the dominant (Pisot) root. */
export interface DominantRootMahlerMeasureWitness {
    readonly kind: "spectral.mahlerMeasure.dominantRoot:witness";
    readonly polynomial: IntegerPolynomial;
    readonly pisot: PisotRootWitness;
    readonly convergence: DominantRootConvergenceWitness;
    readonly value: Rational;
}
/** Obstruction: not Pisot. */
export interface PisotMahlerMeasureObstruction {
    readonly kind: "spectral.mahlerMeasure.pisot-obstruction";
    readonly polynomial: IntegerPolynomial;
    readonly pisot: PisotRootObstruction;
}
/** Obstruction: Pisot but power iteration failed. */
export interface ConvergenceMahlerMeasureObstruction {
    readonly kind: "spectral.mahlerMeasure.convergence-obstruction";
    readonly polynomial: IntegerPolynomial;
    readonly pisot: PisotRootWitness;
    readonly convergence: DominantRootConvergenceObstruction;
}
/** The result of computing a Mahler measure. */
export type MahlerMeasureJudgment = UnitMahlerMeasureWitness | DominantRootMahlerMeasureWitness | PisotMahlerMeasureObstruction | ConvergenceMahlerMeasureObstruction;
/** A matrix's characteristic polynomial with the Pisot judgment on it. */
export interface MatrixPisotCarrier {
    readonly kind: "spectral.matrixPisot.carrier";
    readonly polynomial: IntegerPolynomial;
    readonly roots: PisotRootJudgment;
}
/** Admit integer coefficients as a normalized polynomial. */
export declare const integerPolynomial: (coefficients: readonly Integer[]) => IntegerPolynomial;
/** The degree of a polynomial, as a Natural. */
export declare const polyDegree: (poly: readonly Integer[]) => Natural;
/** Compare two polynomials for equality after normalization. */
export declare function polynomialIdentity(left: readonly Integer[], right: readonly Integer[]): PolynomialIdentityJudgment;
/** The reciprocal of a polynomial (coefficients reversed). */
export declare const polyReciprocal: (poly: readonly Integer[]) => IntegerPolynomial;
/** The resultant of two polynomials (Sylvester determinant). */
export declare const resultant: (left: readonly Integer[], right: readonly Integer[]) => Integer;
/** Whether a polynomial equals its own reciprocal. */
export declare const selfReciprocity: (poly: readonly Integer[]) => PolynomialIdentityJudgment;
/** Whether two polynomials share a common root (via the resultant). */
export declare function rootIntersection(left: readonly Integer[], right: readonly Integer[]): PolynomialRootIntersectionJudgment;
/** A polynomial with its reciprocal and their root intersection. */
export declare function inversionSymmetry(poly: readonly Integer[]): PolynomialInversionSymmetry;
/** The Möbius transform x ↦ (1+x)/(1−x) applied to a polynomial. */
export declare function mobius(poly: readonly Integer[]): IntegerPolynomial;
/** Count a rational polynomial's right-half-plane roots (Routh–Hurwitz). */
export declare function rightHalfPlaneRoots(poly: RationalPolynomial): RightHalfPlaneRootJudgment;
/** Locate a polynomial's roots relative to the unit circle. */
export declare function rootLocation(poly: readonly Integer[]): RootLocationJudgment;
/** Whether a polynomial has Pisot-style root structure. */
export declare function pisotRoot(poly: readonly Integer[]): PisotRootJudgment;
/** Estimate a monic polynomial's dominant root by power iteration. */
export declare function dominantRootConvergence(poly: readonly Integer[], iterations?: Natural): DominantRootConvergenceJudgment;
/** Compute a polynomial's Mahler measure. */
export declare function mahlerMeasure(poly: readonly Integer[], iterations?: Natural): MahlerMeasureJudgment;
/** A matrix's characteristic polynomial with the Pisot judgment on its spectrum. */
export declare function matrixPisot(matrix: Matrix): MatrixPisotCarrier;
