/**
 * @packageDocumentation
 *
 * settling/dynamics/substitution/recurrence - step-`n` hierarchy witnesses.
 *
 * This submodule reads the single natural parameter `n >= 2` that locks four
 * quantities of a canonical step-`n` rule together:
 *
 * 1. matrix dimension: the incidence matrix is `n x n`;
 * 2. recurrence depth: the rule is an `n`-term recurrence;
 * 3. alphabet size: the rule has `n` letters;
 * 4. cohomological rank: the step-`n` classifying invariant has rank `n`.
 *
 * A `+1` in the parameter is therefore visible as `+1` in all four carrier
 * fields. For Fibonacci (`n = 2`) and Padovan (`n = 3`), the module derives the
 * exact integer characteristic polynomial from the actual incidence matrix and
 * checks it against the declared polynomial. It does not compute real
 * Perron-Frobenius eigenvalues.
 *
 * Grounding: `lean/RelMath/Aperiodic/StepN/Recurrence.lean`,
 * `lean/RelMath/Aperiodic/StepN/SubstitutionMatrix.lean`, and the content node
 * `content/.../settling/content/aperiodic-settling/content/step-n-substitution-recurrence/`.
 */
import { type PrimitiveMatrixWitness, type StepNInvariant, type SubstitutionIncidenceMatrix, type SubstitutionRule } from "../index.mjs";
import { type Integer, type Matrix, type Natural } from "../../../analysis/exact-number.mjs";
/** The **co-incrementing data** of a step-`n` substitution rule: the four exact
 * `Natural` quantities the single parameter `n` controls. For the canonical step-`n`
 * rule ({@link mkStepN}) all four equal `n`, so a `+1` in the parameter is a `+1`
 * in every field at once. */
export interface StepNData {
    readonly kind: "substitution.dynamics.recurrence.stepNData";
    /** The dimension of the `n × n` incidence matrix `M`. */
    readonly matrixDim: Natural;
    /** The recurrence depth — the rule is an `n`-term recurrence. */
    readonly recurrenceDepth: Natural;
    /** The alphabet size — the rule has `n` letters. */
    readonly alphabetSize: Natural;
    /** The cohomological rank — `cl-inv⁽ⁿ⁾ ∈ ℤⁿ`. */
    readonly cohRank: Natural;
}
/** The **canonical step-`n` bundle**: every controlled quantity equals the single
 * parameter `n`. The construction witnessing the co-incrementing hierarchy — there
 * is *one* `n`, and matrix dimension, recurrence depth, alphabet size, and
 * cohomological rank are all that one `n`. */
export declare function mkStepN(n: Natural): StepNData;
/** A witness that all four controlled quantities of a bundle coincide. */
export interface StepNAllEqualWitness {
    readonly kind: "substitution.dynamics.recurrence.allEqual:witness";
    readonly data: StepNData;
    readonly value: Natural;
}
/** An obstruction: a bundle whose four controlled quantities are not all equal. */
export interface StepNAllEqualObstruction {
    readonly kind: "substitution.dynamics.recurrence.allEqual-obstruction";
    readonly data: StepNData;
}
/** The result of checking the four controlled quantities coincide. */
export type StepNAllEqualJudgment = StepNAllEqualWitness | StepNAllEqualObstruction;
/** **The four controlled quantities of a bundle are equal.** Witnesses that matrix
 * dimension, recurrence depth, alphabet size, and cohomological rank are the single
 * parameter `n` viewed four ways — the locking that makes the hierarchy
 * co-increment. */
export declare function stepNDataAllEqual(data: StepNData): StepNAllEqualJudgment;
/** A characteristic polynomial: ascending-degree exact-integer coefficients. */
export type CharacteristicPolynomial = readonly Integer[];
/** **Degree-`n` predicate**: an `n × n` matrix's characteristic polynomial has
 * degree exactly `n`, i.e. its ascending coefficient list has length `n + 1`. */
export declare const degreeN: (cp: CharacteristicPolynomial, n: Natural) => boolean;
/** **Monic predicate** (ascending degree): the leading (last) coefficient is `1`.
 * The characteristic polynomial of an integer matrix is always monic. */
export declare const monic: (cp: CharacteristicPolynomial) => boolean;
/** Equality of characteristic polynomials, coefficientwise. */
export declare const samePolynomial: (left: CharacteristicPolynomial, right: CharacteristicPolynomial) => boolean;
/** **The golden ratio's minimal polynomial** `x² − x − 1`, ascending coefficients
 * `[-1, -1, 1]` — the Perron–Frobenius growth rate of the Fibonacci substitution
 * (the dominant eigenvalue of `[[1,1],[1,0]]`). Monic of degree `2`. */
export declare const goldenRatioMinimalPolynomial: CharacteristicPolynomial;
/** **The plastic number's minimal polynomial** `x³ − x − 1`, ascending coefficients
 * `[-1, -1, 0, 1]` — the Perron–Frobenius growth rate of the Padovan substitution
 * (the smallest Pisot number). Monic of degree `3`. */
export declare const plasticNumberMinimalPolynomial: CharacteristicPolynomial;
/** The **Fibonacci substitution** `a ↦ ab`, `b ↦ a` over the 2-letter alphabet
 * `{a, b}` — the canonical step-2 rule. */
export declare const fibonacciSubstitution: SubstitutionRule;
/** The **Padovan substitution** `a ↦ b`, `b ↦ c`, `c ↦ ab` over the 3-letter
 * alphabet `{a, b, c}` — the canonical step-3 rule (recurrence `P(k) = P(k−2) +
 * P(k−3)`). */
export declare const padovanSubstitution: SubstitutionRule;
/** The Fibonacci incidence matrix `[[1,1],[1,0]]`, derived by abelianization. */
export declare const fibonacciIncidence: SubstitutionIncidenceMatrix;
/** The Padovan incidence matrix `[[0,0,1],[1,0,1],[0,1,0]]`, derived by abelianization. */
export declare const padovanIncidence: SubstitutionIncidenceMatrix;
/** The Lean/corpus orientation `[[0,1,0],[0,0,1],[1,1,0]]`: entry `i,j` counts `j` in `subst(i)`. */
export declare const padovanCorpusIncidence: SubstitutionIncidenceMatrix;
/** The n-th **metallic-mean substitution** `a ↦ aⁿb, b ↦ a` over `{a, b}` (`n ≥ 1`). */
export declare function metallicMeanSubstitution(n: Natural): SubstitutionRule;
/** The n-th metallic mean's minimal polynomial `x² − nx − 1`, ascending coeffs `[−1, −n, 1]`; the
 *  Perron eigenvalue `(n + √(n²+4))/2` is its larger root. */
export declare function metallicMeanMinimalPolynomial(n: Natural): CharacteristicPolynomial;
/** The n-th metallic mean's incidence matrix `[[n,1],[1,0]]`, derived by abelianization. */
export declare function metallicMeanIncidence(n: Natural): SubstitutionIncidenceMatrix;
/** A witness that the n-th metallic-mean rule's growth rate is the n-th metallic mean: its derived
 *  incidence characteristic polynomial is monic of degree 2 and equals the declared `x² − nx − 1`. */
export declare function metallicMeanGrowthDegree(n: Natural): GrowthDegreeJudgment;
/** The Fibonacci characteristic polynomial, derived from its incidence matrix. */
export declare const fibonacciCharacteristicPolynomial: CharacteristicPolynomial;
/** The Padovan characteristic polynomial, derived from its incidence matrix. */
export declare const padovanCharacteristicPolynomial: CharacteristicPolynomial;
export declare function matrixPower(matrix: Matrix, exponent: Natural): Matrix;
export declare const nonnegativeMatrix: (matrix: Matrix) => boolean;
export declare const positiveMatrix: (matrix: Matrix) => boolean;
export interface MatrixPrimitivityWitness {
    readonly kind: "substitution.dynamics.recurrence.matrixPrimitivity:witness";
    readonly matrix: Matrix;
    readonly nonnegative: true;
    readonly primitive: PrimitiveMatrixWitness;
    readonly positiveExponent: Natural;
    readonly positivePower: Matrix;
    readonly positiveImpliesNonnegative: true;
}
export interface SubstitutionPrimitivityReceipt {
    readonly kind: "substitution.dynamics.recurrence.substitutionPrimitivity:witness";
    readonly sourceModule: "RelMath.Aperiodic.SubstitutionPrimitivity";
    readonly theorems: readonly [
        "RelMath.Aperiodic.StepN.NonnegativeMatrix",
        "RelMath.Aperiodic.StepN.PositiveMatrix",
        "RelMath.Aperiodic.StepN.Primitive",
        "RelMath.Aperiodic.StepN.PositiveMatrix.nonneg",
        "RelMath.Aperiodic.StepN.fibonacciMatrix_nonnegative",
        "RelMath.Aperiodic.StepN.padovanMatrix_nonnegative",
        "RelMath.Aperiodic.StepN.fibonacciMatrix_pow2_positive",
        "RelMath.Aperiodic.StepN.fibonacciMatrix_primitive",
        "RelMath.Aperiodic.StepN.padovanMatrix_pow5_positive",
        "RelMath.Aperiodic.StepN.padovanMatrix_primitive"
    ];
    readonly fibonacci: MatrixPrimitivityWitness;
    readonly padovan: MatrixPrimitivityWitness;
}
/** Finite carrier for `RelMath.Aperiodic.SubstitutionPrimitivity`. */
export declare function substitutionPrimitivityReceipt(): SubstitutionPrimitivityReceipt;
/** The **Fibonacci** step-2 bundle: 2-term recurrence, 2 letters, `2 × 2` matrix,
 * rank-2 cohomology — all `= 2`. */
export declare const fibonacciStepN: StepNData;
/** The **Padovan** step-3 bundle: 3-term recurrence, 3 letters, `3 × 3` matrix,
 * rank-3 cohomology — all `= 3`. */
export declare const padovanStepN: StepNData;
/** A witness that a rule's growth rate is a degree-`n` algebraic number: its
 * incidence matrix's characteristic polynomial is monic of degree `n` and equals
 * the declared minimal polynomial of the growth rate. */
export interface GrowthDegreeWitness {
    readonly kind: "substitution.dynamics.recurrence.growthDegree:witness";
    readonly degree: Natural;
    readonly derived: CharacteristicPolynomial;
    readonly declared: CharacteristicPolynomial;
}
/** An obstruction: the derived characteristic polynomial fails monicity, the
 * expected degree, or agreement with the declared minimal polynomial. */
export interface GrowthDegreeObstruction {
    readonly kind: "substitution.dynamics.recurrence.growthDegree-obstruction";
    readonly reason: "not-monic" | "wrong-degree" | "declared-mismatch";
    readonly degree: Natural;
    readonly derived: CharacteristicPolynomial;
    readonly declared: CharacteristicPolynomial;
}
/** The result of checking a rule's growth degree. */
export type GrowthDegreeJudgment = GrowthDegreeWitness | GrowthDegreeObstruction;
/** **The substitution growth rate has degree exactly `n`.** Derives the incidence
 * matrix's characteristic polynomial and witnesses it is monic, of degree `n`, and
 * identical to the declared minimal polynomial of the growth rate — refusing the
 * witness when any of the three fails. */
export declare function growthDegree(incidence: SubstitutionIncidenceMatrix, n: Natural, declared: CharacteristicPolynomial): GrowthDegreeJudgment;
/** The full **step-`n` co-incrementing hierarchy** carrier: the parameter `n`, the
 * canonical bundle and its `+1` successor with their all-equal witnesses, the worked
 * Fibonacci / Padovan growth-degree witnesses, and the `n = 2 ↔ FOUR` alignment. */
export interface StepNHierarchyCarrier {
    readonly kind: "substitution.dynamics.recurrence.hierarchy";
    readonly parameter: Natural;
    /** All four controlled quantities of `mkStepN n` equal `n`. */
    readonly atParameter: StepNAllEqualJudgment;
    /** The `+1`-propagation: all four of `mkStepN (n+1)` equal `n + 1`. */
    readonly atSuccessor: StepNAllEqualJudgment;
    /** Fibonacci (`n = 2`): growth rate the golden ratio, degree 2. */
    readonly fibonacci: GrowthDegreeJudgment;
    /** Padovan (`n = 3`): growth rate the plastic number, degree 3. */
    readonly padovan: GrowthDegreeJudgment;
    /** The `n = 2 ↔ FOUR` corner alignment: the bilattice has `4 = 2²` corners. */
    readonly fourCornerAlignment: boolean;
    /** The step-2 colimit invariant (`Aperiodic.stepNInvariant`) of the Fibonacci matrix. */
    readonly fibonacciStepNInvariant: StepNInvariant;
}
/** **The step-`n` co-incrementing hierarchy.** For the canonical step-`n` rule the
 * matrix dimension, recurrence depth, alphabet size, and cohomological rank are the
 * single parameter `n` (all-equal witness), the `(n+1)`-bundle has all four equal to
 * `n + 1` (the `+1`-propagation), and the growth rate is a degree-`n` algebraic
 * number — exhibited concretely by Fibonacci (`n = 2`, golden ratio, `x² − x − 1`)
 * and Padovan (`n = 3`, plastic number, `x³ − x − 1`), each derived through the
 * parent module's `abelianize` ∘ `charPolyOver`. At `n = 2` the bilattice's
 * `4 = 2²` corners realize FOUR. */
export declare function stepNHierarchy(n: Natural): StepNHierarchyCarrier;
