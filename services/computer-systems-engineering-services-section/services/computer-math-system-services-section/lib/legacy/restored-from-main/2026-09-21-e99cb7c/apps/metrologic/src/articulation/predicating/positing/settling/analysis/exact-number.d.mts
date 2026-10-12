/**
 * settling/analysis/exact-number — the exact-arithmetic carrier.
 *
 * The core numeric carriers, built bottom-up and exact throughout: a `Natural`
 * is a von Neumann ordinal (a set of the naturals below it, so its count is its
 * value); an `Integer` is a balanced difference of naturals; a `Rational` is a
 * reduced pair of integers; a `Matrix` is rows of integers, with a fraction-free
 * (Bareiss) determinant, characteristic polynomial, Smith normal form, and rank.
 *
 * Pure arithmetic with NO external dependency — a true leaf. (The relation-valued
 * reading of a natural's von Neumann extension, `asExtension`/`extensionOf`,
 * lives with bilattice-relation, where it belongs; it is not arithmetic.) The
 * carrier↔native-number doors live in the codecs, never here.
 */
/** A natural number as a von Neumann ordinal: the set of naturals below it. */
export interface Natural {
    readonly kind: "exactNumber.natural";
    readonly members: readonly Natural[];
}
/** Strict less-than on naturals: left's member set runs out before right's. */
export declare const natLess: (left: Natural, right: Natural) => boolean;
/** Equality on naturals. */
export declare function natEqual(left: Natural, right: Natural): boolean;
/** Set membership: member < n. */
export declare const isMember: (member: Natural, n: Natural) => boolean;
/** Less-than-or-equal on naturals. */
export declare const natLeq: (left: Natural, right: Natural) => boolean;
/** The natural zero: the von Neumann ordinal with no members. */
export declare const natZero: Natural;
/** The von Neumann successor n ∪ {n}. */
export declare const successor: (n: Natural) => Natural;
/** The natural one. */
export declare const natOne: Natural;
/** The members of a natural (the naturals below it). */
export declare const members: (n: Natural) => readonly Natural[];
/** Whether a natural is zero. */
export declare const natIsZero: (n: Natural) => boolean;
/** Three-way comparison of naturals. */
export declare const natCompare: (left: Natural, right: Natural) => -1 | 0 | 1;
/** The predecessor of a natural: zero, or its largest member. */
export declare const predecessor: (n: Natural) => Natural;
/** Addition of naturals by primitive recursion. */
export declare function natAdd(left: Natural, right: Natural): Natural;
/** Multiplication of naturals by primitive recursion. */
export declare function natMultiply(left: Natural, right: Natural): Natural;
/** Truncated subtraction of naturals (never negative). */
export declare function monus(left: Natural, right: Natural): Natural;
/** Euclidean division of naturals; throws on division by zero. */
export declare function natDivmod(n: Natural, d: Natural): {
    readonly quotient: Natural;
    readonly remainder: Natural;
};
/** Greatest common divisor of two naturals (Euclid). */
export declare function gcd(left: Natural, right: Natural): Natural;
/** The carrier-native cardinality of a collection, as a Natural. */
export declare const count: <Item>(items: Iterable<Item>) => Natural;
/** An integer as a balanced difference of naturals (one part zero). */
export interface Integer {
    readonly kind: "exactNumber.integer";
    readonly pos: Natural;
    readonly neg: Natural;
}
/** Construct a balanced integer from positive and negative parts. */
export declare const integer: (pos: Natural, neg: Natural) => Integer;
/** Embed a natural as a non-negative integer. */
export declare const fromNatural: (n: Natural) => Integer;
/** The integer zero. */
export declare const intZero: Integer;
/** The integer one. */
export declare const intOne: Integer;
/** Negation of an integer. */
export declare const intNegate: (z: Integer) => Integer;
/** Addition of integers. */
export declare const intAdd: (left: Integer, right: Integer) => Integer;
/** Subtraction of integers. */
export declare const intSubtract: (left: Integer, right: Integer) => Integer;
/** Multiplication of integers. */
export declare const intMultiply: (left: Integer, right: Integer) => Integer;
/** Equality on integers in balanced form. */
export declare const intEqual: (left: Integer, right: Integer) => boolean;
/** Value equivalence of integers regardless of balance. */
export declare const equivalent: (left: Integer, right: Integer) => boolean;
/** Whether an integer is zero. */
export declare const intIsZero: (z: Integer) => boolean;
/** Whether an integer is positive. */
export declare const isPositive: (z: Integer) => boolean;
/** Whether an integer is negative. */
export declare const isNegative: (z: Integer) => boolean;
/** The sign of an integer. */
export declare const sign: (z: Integer) => -1 | 0 | 1;
/** The absolute value of an integer, as a natural. */
export declare const magnitude: (z: Integer) => Natural;
/** Division of integers; throws on division by zero. */
export declare function intDivmod(left: Integer, right: Integer): {
    readonly quotient: Integer;
    readonly remainder: Integer;
};
/** The quotient of dividing two integers. */
export declare const quotient: (left: Integer, right: Integer) => Integer;
/** Whether divisor divides value exactly. */
export declare const divides: (divisor: Integer, value: Integer) => boolean;
/** Three-way comparison of integers. */
export declare const intCompare: (left: Integer, right: Integer) => -1 | 0 | 1;
/** A rational as a canonical (reduced, positive-denominator) pair of integers. */
export interface Rational {
    readonly kind: "exactNumber.rational";
    readonly num: Integer;
    readonly den: Integer;
}
/** Construct a canonical rational; throws on a zero denominator. */
export declare const rational: (num: Integer, den: Integer) => Rational;
/** Embed an integer as a rational. */
export declare const fromInteger: (z: Integer) => Rational;
/** The rational zero. */
export declare const ratZero: Rational;
/** The rational one. */
export declare const ratOne: Rational;
/** Negation of a rational. */
export declare const ratNegate: (q: Rational) => Rational;
/** The reciprocal of a rational. */
export declare const reciprocal: (q: Rational) => Rational;
/** Addition of rationals. */
export declare const ratAdd: (left: Rational, right: Rational) => Rational;
/** Subtraction of rationals. */
export declare const ratSubtract: (left: Rational, right: Rational) => Rational;
/** Multiplication of rationals. */
export declare const ratMultiply: (left: Rational, right: Rational) => Rational;
/** Division of rationals. */
export declare const divide: (left: Rational, right: Rational) => Rational;
/** Equality on rationals in canonical form. */
export declare const ratEqual: (left: Rational, right: Rational) => boolean;
/** Whether a rational is zero. */
export declare const ratIsZero: (q: Rational) => boolean;
/** The sign of a rational. */
export declare const ratSign: (q: Rational) => -1 | 0 | 1;
/** Three-way comparison of rationals. */
export declare const ratCompare: (left: Rational, right: Rational) => -1 | 0 | 1;
/** Decode — a natural's member-count as a native number. */
export declare const toCount: (n: Natural) => number;
/** Encode — a non-negative JS integer as a natural by iterated successor. */
export declare function fromCount(value: number): Natural;
/** Decode — an integer to a native number. */
export declare const toInt: (z: Integer) => number;
/** Encode — a native integer as an exact integer. */
export declare const fromInt: (value: number) => Integer;
/** Encode — a native integer as a rational with denominator one. */
export declare const ratFromInt: (value: number) => Rational;
/** Encode — native numerator and denominator as a reduced rational. */
export declare const fromRatio: (num: number, den: number) => Rational;
/** A matrix of exact integers. */
export type Matrix = readonly (readonly Integer[])[];
/** Encode — rows of native integers as an exact integer Matrix. */
export declare const fromInts: (rows: readonly (readonly number[])[]) => Matrix;
/** The transpose of a matrix. */
export declare const matTranspose: (matrix: Matrix) => Matrix;
/** The product of two matrices, exact. */
export declare const matmul: (left: Matrix, right: Matrix) => Matrix;
/** Equality on matrices. */
export declare const matEqual: (left: Matrix, right: Matrix) => boolean;
/** The exact integer determinant (fraction-free Bareiss elimination). */
export declare const determinant: (matrix: Matrix) => Integer;
/** The characteristic polynomial of a matrix (ascending-degree integer coefficients). */
export declare function charPoly(matrix: Matrix): readonly Integer[];
/** The invariant factors of a matrix from its Smith normal form. */
export declare function smithNormalForm(matrix: Matrix): readonly Integer[];
/** The rank of a matrix: the count of nonzero invariant factors. */
export declare const rank: (matrix: Matrix) => Natural;
