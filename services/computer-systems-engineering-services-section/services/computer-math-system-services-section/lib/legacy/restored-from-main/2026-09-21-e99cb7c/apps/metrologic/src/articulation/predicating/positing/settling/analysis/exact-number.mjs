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
function membersExhaustFirst(left, right) {
    const leftMembers = left.members[Symbol.iterator]();
    const rightMembers = right.members[Symbol.iterator]();
    for (;;) {
        const l = leftMembers.next();
        const r = rightMembers.next();
        if (r.done)
            return false;
        if (l.done)
            return true;
    }
}
/** Strict less-than on naturals: left's member set runs out before right's. */
export const natLess = (left, right) => membersExhaustFirst(left, right);
/** Equality on naturals. */
export function natEqual(left, right) {
    return !membersExhaustFirst(left, right) && !membersExhaustFirst(right, left);
}
/** Set membership: member < n. */
export const isMember = (member, n) => natLess(member, n);
/** Less-than-or-equal on naturals. */
export const natLeq = (left, right) => !membersExhaustFirst(right, left);
/** The natural zero: the von Neumann ordinal with no members. */
export const natZero = Object.freeze({ kind: "exactNumber.natural", members: Object.freeze([]) });
/** The von Neumann successor n ∪ {n}. */
export const successor = (n) => Object.freeze({ kind: "exactNumber.natural", members: Object.freeze([...n.members, n]) });
/** The natural one. */
export const natOne = successor(natZero);
/** The members of a natural (the naturals below it). */
export const members = (n) => Object.freeze([...n.members]);
/** Whether a natural is zero. */
export const natIsZero = (n) => natEqual(n, natZero);
/** Three-way comparison of naturals. */
export const natCompare = (left, right) => natLess(left, right) ? -1 : natLess(right, left) ? 1 : 0;
/** The predecessor of a natural: zero, or its largest member. */
export const predecessor = (n) => {
    let largest = natZero;
    for (const member of n.members)
        largest = member;
    return largest;
};
/** Addition of naturals by primitive recursion. */
export function natAdd(left, right) {
    let sum = left;
    let remaining = right;
    while (!natIsZero(remaining)) {
        sum = successor(sum);
        remaining = predecessor(remaining);
    }
    return sum;
}
/** Multiplication of naturals by primitive recursion. */
export function natMultiply(left, right) {
    let product = natZero;
    let remaining = right;
    while (!natIsZero(remaining)) {
        product = natAdd(product, left);
        remaining = predecessor(remaining);
    }
    return product;
}
/** Truncated subtraction of naturals (never negative). */
export function monus(left, right) {
    let difference = left;
    let remaining = right;
    while (!natIsZero(remaining) && !natIsZero(difference)) {
        difference = predecessor(difference);
        remaining = predecessor(remaining);
    }
    return difference;
}
/** Euclidean division of naturals; throws on division by zero. */
export function natDivmod(n, d) {
    if (natIsZero(d))
        throw new RangeError("natural divmod: division by zero");
    let quotientValue = natZero;
    let remainder = n;
    while (natLeq(d, remainder)) {
        remainder = monus(remainder, d);
        quotientValue = successor(quotientValue);
    }
    return Object.freeze({ quotient: quotientValue, remainder });
}
/** Greatest common divisor of two naturals (Euclid). */
export function gcd(left, right) {
    let a = left;
    let b = right;
    while (!natIsZero(b)) {
        const remainder = natDivmod(a, b).remainder;
        a = b;
        b = remainder;
    }
    return a;
}
/** The carrier-native cardinality of a collection, as a Natural. */
export const count = (items) => {
    let value = natZero;
    for (const _item of items)
        value = successor(value);
    return value;
};
function balance(pos, neg) {
    return Object.freeze(natLeq(neg, pos)
        ? { kind: "exactNumber.integer", pos: monus(pos, neg), neg: natZero }
        : { kind: "exactNumber.integer", pos: natZero, neg: monus(neg, pos) });
}
/** Construct a balanced integer from positive and negative parts. */
export const integer = (pos, neg) => balance(pos, neg);
/** Embed a natural as a non-negative integer. */
export const fromNatural = (n) => Object.freeze({ kind: "exactNumber.integer", pos: n, neg: natZero });
/** The integer zero. */
export const intZero = fromNatural(natZero);
/** The integer one. */
export const intOne = fromNatural(natOne);
/** Negation of an integer. */
export const intNegate = (z) => Object.freeze({ kind: "exactNumber.integer", pos: z.neg, neg: z.pos });
/** Addition of integers. */
export const intAdd = (left, right) => balance(natAdd(left.pos, right.pos), natAdd(left.neg, right.neg));
/** Subtraction of integers. */
export const intSubtract = (left, right) => intAdd(left, intNegate(right));
/** Multiplication of integers. */
export const intMultiply = (left, right) => balance(natAdd(natMultiply(left.pos, right.pos), natMultiply(left.neg, right.neg)), natAdd(natMultiply(left.pos, right.neg), natMultiply(left.neg, right.pos)));
/** Equality on integers in balanced form. */
export const intEqual = (left, right) => natEqual(left.pos, right.pos) && natEqual(left.neg, right.neg);
/** Value equivalence of integers regardless of balance. */
export const equivalent = (left, right) => natEqual(natAdd(left.pos, right.neg), natAdd(right.pos, left.neg));
/** Whether an integer is zero. */
export const intIsZero = (z) => natIsZero(z.pos) && natIsZero(z.neg);
/** Whether an integer is positive. */
export const isPositive = (z) => !natIsZero(z.pos);
/** Whether an integer is negative. */
export const isNegative = (z) => !natIsZero(z.neg);
/** The sign of an integer. */
export const sign = (z) => isPositive(z) ? 1 : isNegative(z) ? -1 : 0;
/** The absolute value of an integer, as a natural. */
export const magnitude = (z) => intIsZero(z) ? z.pos : isPositive(z) ? z.pos : z.neg;
/** Division of integers; throws on division by zero. */
export function intDivmod(left, right) {
    if (intIsZero(right))
        throw new RangeError("integer divmod: division by zero");
    const quotientMagnitude = natDivmod(magnitude(left), magnitude(right)).quotient;
    const quotient = sign(left) * sign(right) < 0 ? intNegate(fromNatural(quotientMagnitude)) : fromNatural(quotientMagnitude);
    return Object.freeze({ quotient, remainder: intSubtract(left, intMultiply(quotient, right)) });
}
/** The quotient of dividing two integers. */
export const quotient = (left, right) => intDivmod(left, right).quotient;
/** Whether divisor divides value exactly. */
export const divides = (divisor, value) => intIsZero(intDivmod(value, divisor).remainder);
/** Three-way comparison of integers. */
export const intCompare = (left, right) => sign(intSubtract(left, right));
function canonicalRational(num, den) {
    if (intIsZero(den))
        throw new RangeError("rational: zero denominator");
    const s = sign(num) * sign(den);
    const mNum = magnitude(num);
    const mDen = magnitude(den);
    if (natIsZero(mNum))
        return Object.freeze({ kind: "exactNumber.rational", num: intZero, den: intOne });
    const factor = gcd(mNum, mDen);
    const normalizedNum = fromNatural(natDivmod(mNum, factor).quotient);
    return Object.freeze({
        kind: "exactNumber.rational",
        num: s < 0 ? intNegate(normalizedNum) : normalizedNum,
        den: fromNatural(natDivmod(mDen, factor).quotient),
    });
}
/** Construct a canonical rational; throws on a zero denominator. */
export const rational = (num, den) => canonicalRational(num, den);
/** Embed an integer as a rational. */
export const fromInteger = (z) => Object.freeze({ kind: "exactNumber.rational", num: z, den: intOne });
/** The rational zero. */
export const ratZero = fromInteger(intZero);
/** The rational one. */
export const ratOne = fromInteger(intOne);
/** Negation of a rational. */
export const ratNegate = (q) => Object.freeze({ kind: "exactNumber.rational", num: intNegate(q.num), den: q.den });
/** The reciprocal of a rational. */
export const reciprocal = (q) => canonicalRational(q.den, q.num);
/** Addition of rationals. */
export const ratAdd = (left, right) => canonicalRational(intAdd(intMultiply(left.num, right.den), intMultiply(right.num, left.den)), intMultiply(left.den, right.den));
/** Subtraction of rationals. */
export const ratSubtract = (left, right) => ratAdd(left, ratNegate(right));
/** Multiplication of rationals. */
export const ratMultiply = (left, right) => canonicalRational(intMultiply(left.num, right.num), intMultiply(left.den, right.den));
/** Division of rationals. */
export const divide = (left, right) => ratMultiply(left, reciprocal(right));
/** Equality on rationals in canonical form. */
export const ratEqual = (left, right) => intEqual(left.num, right.num) && intEqual(left.den, right.den);
/** Whether a rational is zero. */
export const ratIsZero = (q) => intIsZero(q.num);
/** The sign of a rational. */
export const ratSign = (q) => sign(q.num);
/** Three-way comparison of rationals. */
export const ratCompare = (left, right) => ratSign(ratSubtract(left, right));
// ── native-integer exact lifts ──
// Exact, successor-based lifts of native JS integers into the carriers. These
// are algebra, not the codec boundary: no float, no decimal string, no loss.
// The math library ingests native loop counters and small integer labels here;
// the lossy `number`/decimal door stays in the writing layer.
/** Decode — a natural's member-count as a native number. */
export const toCount = (n) => n.members.length;
/** Encode — a non-negative JS integer as a natural by iterated successor. */
export function fromCount(value) {
    if (!Number.isInteger(value) || value < 0)
        throw new RangeError("fromCount: expected a non-negative integer");
    let natural = natZero;
    for (let index = 0; index < value; index += 1)
        natural = successor(natural);
    return natural;
}
/** Decode — an integer to a native number. */
export const toInt = (z) => toCount(z.pos) - toCount(z.neg);
/** Encode — a native integer as an exact integer. */
export const fromInt = (value) => value >= 0 ? fromNatural(fromCount(value)) : intNegate(fromNatural(fromCount(-value)));
/** Encode — a native integer as a rational with denominator one. */
export const ratFromInt = (value) => fromInteger(fromInt(value));
/** Encode — native numerator and denominator as a reduced rational. */
export const fromRatio = (num, den) => rational(fromInt(num), fromInt(den));
/** Encode — rows of native integers as an exact integer Matrix. */
export const fromInts = (rows) => Object.freeze(rows.map((row) => Object.freeze(row.map(fromInt))));
const polyNormalize = (poly) => {
    let high = poly.length - 1;
    while (high > 0 && intIsZero(poly[high]))
        high -= 1;
    return Object.freeze(poly.slice(0, high + 1));
};
const polyPad = (left, right, op) => {
    const length = Math.max(left.length, right.length);
    return polyNormalize(Array.from({ length }, (_, index) => op(left[index] ?? intZero, right[index] ?? intZero)));
};
const polyAdd = (left, right) => polyPad(left, right, intAdd);
const polySub = (left, right) => polyPad(left, right, intSubtract);
const polyMul = (left, right) => {
    const result = Array.from({ length: left.length + right.length - 1 }, () => intZero);
    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
        for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
            result[leftIndex + rightIndex] = intAdd(result[leftIndex + rightIndex], intMultiply(left[leftIndex], right[rightIndex]));
        }
    }
    return polyNormalize(result);
};
const polyRing = Object.freeze({ zero: Object.freeze([intZero]), add: polyAdd, sub: polySub, mul: polyMul });
function det(matrix, ring) {
    const n = matrix.length;
    if (n === 1)
        return matrix[0][0];
    let acc = ring.zero;
    for (let column = 0; column < n; column += 1) {
        const minor = matrix.slice(1).map((row) => row.filter((_, index) => index !== column));
        const term = ring.mul(matrix[0][column], det(minor, ring));
        acc = column % 2 === 0 ? ring.add(acc, term) : ring.sub(acc, term);
    }
    return acc;
}
function integerDeterminant(matrix) {
    const n = matrix.length;
    if (n === 0)
        return intOne;
    if (n === 1)
        return matrix[0][0];
    const work = matrix.map((row) => [...row]);
    let signValue = intOne;
    let previousPivot = intOne;
    for (let pivotIndex = 0; pivotIndex < n - 1; pivotIndex += 1) {
        let pivotRow = pivotIndex;
        while (pivotRow < n && intIsZero(work[pivotRow][pivotIndex]))
            pivotRow += 1;
        if (pivotRow === n)
            return intZero;
        if (pivotRow !== pivotIndex) {
            [work[pivotIndex], work[pivotRow]] = [work[pivotRow], work[pivotIndex]];
            signValue = intNegate(signValue);
        }
        const pivot = work[pivotIndex][pivotIndex];
        for (let row = pivotIndex + 1; row < n; row += 1) {
            for (let column = pivotIndex + 1; column < n; column += 1) {
                const numerator = intSubtract(intMultiply(work[row][column], pivot), intMultiply(work[row][pivotIndex], work[pivotIndex][column]));
                work[row][column] = quotient(numerator, previousPivot);
            }
            work[row][pivotIndex] = intZero;
        }
        previousPivot = pivot;
    }
    return intMultiply(signValue, work[n - 1][n - 1]);
}
/** The transpose of a matrix. */
export const matTranspose = (matrix) => Object.freeze(matrix[0].map((_, column) => Object.freeze(matrix.map((row) => row[column]))));
/** The product of two matrices, exact. */
export const matmul = (left, right) => Object.freeze(left.map((row) => Object.freeze(right[0].map((_, column) => row.reduce((sum, item, index) => intAdd(sum, intMultiply(item, right[index][column])), intZero)))));
/** Equality on matrices. */
export const matEqual = (left, right) => left.length === right.length
    && left.every((row, rowIndex) => row.length === right[rowIndex].length && row.every((item, columnIndex) => intEqual(item, right[rowIndex][columnIndex])));
/** The exact integer determinant (fraction-free Bareiss elimination). */
export const determinant = (matrix) => integerDeterminant(matrix);
/** The characteristic polynomial of a matrix (ascending-degree integer coefficients). */
export function charPoly(matrix) {
    const lambdaIMinusM = matrix.map((row, rowIndex) => Object.freeze(row.map((item, columnIndex) => columnIndex === rowIndex ? Object.freeze([intNegate(item), intOne]) : Object.freeze([intNegate(item)]))));
    return det(lambdaIMinusM, polyRing);
}
/** The invariant factors of a matrix from its Smith normal form. */
export function smithNormalForm(matrix) {
    const work = matrix.map((row) => [...row]);
    const rows = work.length;
    const columns = work[0]?.length ?? 0;
    const swapRows = (left, right) => {
        [work[left], work[right]] = [work[right], work[left]];
    };
    const swapColumns = (left, right) => {
        for (const row of work)
            [row[left], row[right]] = [row[right], row[left]];
    };
    const addRow = (destination, source, quotientValue) => {
        for (let column = 0; column < columns; column += 1) {
            work[destination][column] = intSubtract(work[destination][column], intMultiply(quotientValue, work[source][column]));
        }
    };
    const addColumn = (destination, source, quotientValue) => {
        for (let row = 0; row < rows; row += 1) {
            work[row][destination] = intSubtract(work[row][destination], intMultiply(quotientValue, work[row][source]));
        }
    };
    const limit = Math.min(rows, columns);
    for (let t = 0; t < limit; t += 1) {
        let found = false;
        outer: for (let row = t; row < rows; row += 1) {
            for (let column = t; column < columns; column += 1) {
                if (!intIsZero(work[row][column])) {
                    swapRows(t, row);
                    swapColumns(t, column);
                    found = true;
                    break outer;
                }
            }
        }
        if (!found)
            break;
        for (;;) {
            let changed = false;
            for (let row = t + 1; row < rows; row += 1) {
                if (intIsZero(work[row][t]))
                    continue;
                addRow(row, t, quotient(work[row][t], work[t][t]));
                if (!intIsZero(work[row][t])) {
                    swapRows(t, row);
                    changed = true;
                }
            }
            for (let column = t + 1; column < columns; column += 1) {
                if (intIsZero(work[t][column]))
                    continue;
                addColumn(column, t, quotient(work[t][column], work[t][t]));
                if (!intIsZero(work[t][column])) {
                    swapColumns(t, column);
                    changed = true;
                }
            }
            if (!changed)
                break;
        }
        let fixed = false;
        outer2: for (let row = t + 1; row < rows; row += 1) {
            for (let column = t + 1; column < columns; column += 1) {
                if (!divides(work[t][t], work[row][column])) {
                    addRow(t, row, intNegate(intOne));
                    fixed = true;
                    break outer2;
                }
            }
        }
        if (fixed)
            t -= 1;
    }
    const factors = [];
    for (let index = 0; index < limit; index += 1)
        factors.push(fromNatural(magnitude(work[index]?.[index] ?? intZero)));
    return Object.freeze(factors);
}
/** The rank of a matrix: the count of nonzero invariant factors. */
export const rank = (matrix) => count(smithNormalForm(matrix).filter((factor) => !intIsZero(factor)));

/** Read an exact rational as a host floating-point value. */
export const toNumber = (q) => toInt(q.num) / toInt(q.den);
