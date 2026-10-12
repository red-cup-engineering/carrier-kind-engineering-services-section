/**
 * geometry/spatial/quadratic — exact arithmetic in a real quadratic field ℚ(√d).
 *
 * Elements are `unit + root·√d` over a fixed nonsquare radicand d ≥ 2, with exact
 * rational coefficients — the minimal coordinate system in which a 1-D cut of a
 * 2-D lattice has an irrational but exactly decidable slope. Signs and
 * comparisons never touch a float; Galois conjugation √d ↦ −√d is the algebraic
 * form of the cut-and-project physical/internal swap.
 */
import { type Rational } from "../../positing/settling/analysis/exact-number.mjs";
/** An element of ℚ(√d): exact unit and root coefficients over a nonsquare radicand. */
export interface QuadraticRational {
    readonly kind: "meme-geometry.quadratic.rational";
    readonly radicand: number;
    readonly unit: Rational;
    readonly root: Rational;
}
/** Construct a ℚ(√d) element; throws unless d is a nonsquare integer in [2, 1000]. */
export declare const quadraticRational: (radicand: number, unit: Rational, root: Rational) => QuadraticRational;
/** Construct from integer unit and root coefficients. */
export declare const quadraticFromInts: (radicand: number, unit: number, root: number) => QuadraticRational;
/** Embed a plain rational into ℚ(√d) as its unit part. */
export declare const quadraticFromRational: (radicand: number, value: Rational) => QuadraticRational;
/** Whether two elements live in the same field ℚ(√d). */
export declare const sameRadicand: (left: QuadraticRational, right: QuadraticRational) => boolean;
/** Add componentwise over a shared radicand. */
export declare const quadraticAdd: (left: QuadraticRational, right: QuadraticRational) => QuadraticRational;
/** Subtract componentwise over a shared radicand. */
export declare const quadraticSubtract: (left: QuadraticRational, right: QuadraticRational) => QuadraticRational;
/** Negate both coefficients. */
export declare const quadraticNegate: (value: QuadraticRational) => QuadraticRational;
/** (a + b√d)(c + e√d) = (ac + bed) + (ae + bc)√d. */
export declare const quadraticMultiply: (left: QuadraticRational, right: QuadraticRational) => QuadraticRational;
/** Scale by a plain rational. */
export declare const quadraticScale: (value: QuadraticRational, scalar: Rational) => QuadraticRational;
/** value + q for rational q. */
export declare const quadraticAddRational: (value: QuadraticRational, scalar: Rational) => QuadraticRational;
/** Galois conjugation √d ↦ −√d. */
export declare const quadraticConjugate: (value: QuadraticRational) => QuadraticRational;
/** Exact equality. */
export declare const quadraticEqual: (left: QuadraticRational, right: QuadraticRational) => boolean;
/** Whether the element is a plain rational (zero root). */
export declare const quadraticIsRational: (value: QuadraticRational) => boolean;
/** Exact sign of t + s√d (mixed signs decided by t² − ds²). */
export declare const quadraticSign: (value: QuadraticRational) => -1 | 0 | 1;
/** Exact three-way comparison. */
export declare const quadraticCompare: (left: QuadraticRational, right: QuadraticRational) => -1 | 0 | 1;
/** Strictly less than. */
export declare const quadraticLess: (left: QuadraticRational, right: QuadraticRational) => boolean;
/** Less than or equal. */
export declare const quadraticLeq: (left: QuadraticRational, right: QuadraticRational) => boolean;
