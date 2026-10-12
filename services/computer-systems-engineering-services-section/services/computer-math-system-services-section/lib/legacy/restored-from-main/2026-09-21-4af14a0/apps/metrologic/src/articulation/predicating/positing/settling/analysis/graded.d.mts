/**
 * settling/analysis/graded — a Rational carried in a superselection sector.
 *
 * A graded rational is an exact Rational under an opaque grade (the sector:
 * species, dimension, conserved-quantity type). Its one law is that addition is
 * defined only WITHIN a sector — you cannot add a charge to a spin. Scalar
 * multiplication by an ungraded Rational rescales within a sector; the graded
 * product pairs two sectors into a third (dimensional multiplication). The value
 * is always an exact carrier Rational; reading it out is a codec concern.
 */
import { type Rational } from "./exact-number.mjs";
/** A graded rational: an exact value under an opaque grade. */
export interface GradedRational {
    readonly kind: "exactNumber.gradedRational";
    readonly value: Rational;
    readonly grade: string;
}
/** Construct a graded rational. */
export declare const graded: (value: Rational, grade: string) => GradedRational;
/** The grade label. */
export declare const gradeOf: (g: GradedRational) => string;
/** The value, stripped of its grade. */
export declare const gradedValue: (g: GradedRational) => Rational;
/** The zero of a grade. */
export declare const gradedZero: (grade: string) => GradedRational;
/** Whether a value is a graded rational. */
export declare const isGradedRational: (x: object) => x is GradedRational;
/** Whether two graded rationals share a grade. */
export declare const sameGrade: (left: GradedRational, right: GradedRational) => boolean;
/** Addition within a grade. */
export declare const gradedAdd: (left: GradedRational, right: GradedRational) => GradedRational;
/** Subtraction within a grade. */
export declare const gradedSubtract: (left: GradedRational, right: GradedRational) => GradedRational;
/** Negation, keeping the grade. */
export declare const gradedNegate: (g: GradedRational) => GradedRational;
/** Whether a graded rational is zero. */
export declare const gradedIsZero: (g: GradedRational) => boolean;
/** The sign of a graded rational. */
export declare const gradedSign: (g: GradedRational) => -1 | 0 | 1;
/** The absolute value, same grade. */
export declare const gradedAbs: (g: GradedRational) => GradedRational;
/** Three-way comparison within a grade. */
export declare const gradedCompare: (left: GradedRational, right: GradedRational) => -1 | 0 | 1;
/** Equality (grades agree and values equal). */
export declare const gradedEqual: (left: GradedRational, right: GradedRational) => boolean;
/** Whether a graded rational's magnitude is within a tolerance of the same grade. */
export declare const withinGradedTolerance: (g: GradedRational, tolerance: GradedRational) => boolean;
/** Scalar multiplication by an ungraded Rational. */
export declare const gradedScale: (g: GradedRational, scalar: Rational) => GradedRational;
/** The graded product into a result sector (dimensional multiplication). */
export declare const gradedTimes: (left: GradedRational, right: GradedRational, grade: string) => GradedRational;
