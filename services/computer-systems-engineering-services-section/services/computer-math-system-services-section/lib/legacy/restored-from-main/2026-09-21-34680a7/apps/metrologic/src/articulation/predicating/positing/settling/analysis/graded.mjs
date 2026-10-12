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
import { ratAdd, ratCompare, ratEqual, ratIsZero, ratMultiply, ratNegate, ratSign, ratSubtract, ratZero, } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/exact-number.mjs";
/** Construct a graded rational. */
export const graded = (value, grade) => Object.freeze({ kind: "exactNumber.gradedRational", value, grade });
/** The grade label. */
export const gradeOf = (g) => g.grade;
/** The value, stripped of its grade. */
export const gradedValue = (g) => g.value;
/** The zero of a grade. */
export const gradedZero = (grade) => graded(ratZero, grade);
/** Whether a value is a graded rational. */
export const isGradedRational = (x) => "kind" in x && x.kind === "exactNumber.gradedRational";
/** Whether two graded rationals share a grade. */
export const sameGrade = (left, right) => left.grade === right.grade;
const requireSameGrade = (left, right) => {
    if (left.grade !== right.grade)
        throw new TypeError(`grade mismatch: ${left.grade} vs ${right.grade}`);
};
/** Addition within a grade. */
export const gradedAdd = (left, right) => {
    requireSameGrade(left, right);
    return graded(ratAdd(left.value, right.value), left.grade);
};
/** Subtraction within a grade. */
export const gradedSubtract = (left, right) => {
    requireSameGrade(left, right);
    return graded(ratSubtract(left.value, right.value), left.grade);
};
/** Negation, keeping the grade. */
export const gradedNegate = (g) => graded(ratNegate(g.value), g.grade);
/** Whether a graded rational is zero. */
export const gradedIsZero = (g) => ratIsZero(g.value);
/** The sign of a graded rational. */
export const gradedSign = (g) => ratSign(g.value);
/** The absolute value, same grade. */
export const gradedAbs = (g) => graded(ratSign(g.value) < 0 ? ratNegate(g.value) : g.value, g.grade);
/** Three-way comparison within a grade. */
export const gradedCompare = (left, right) => {
    requireSameGrade(left, right);
    return ratCompare(left.value, right.value);
};
/** Equality (grades agree and values equal). */
export const gradedEqual = (left, right) => left.grade === right.grade && ratEqual(left.value, right.value);
/** Whether a graded rational's magnitude is within a tolerance of the same grade. */
export const withinGradedTolerance = (g, tolerance) => gradedCompare(gradedAbs(g), gradedAbs(tolerance)) <= 0;
/** Scalar multiplication by an ungraded Rational. */
export const gradedScale = (g, scalar) => graded(ratMultiply(g.value, scalar), g.grade);
/** The graded product into a result sector (dimensional multiplication). */
export const gradedTimes = (left, right, grade) => graded(ratMultiply(left.value, right.value), grade);
