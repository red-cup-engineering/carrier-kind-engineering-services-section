/**
 * settling/dynamics/substitution - finite substitution carriers and matrix reads.
 *
 * A substitution rule maps each finite symbol to a finite word. From that rule
 * this module derives the target-by-source incidence matrix, finite iterates and
 * orbits, bounded primitivity judgments, bounded rational Perron reads, Smith
 * and localized-module colimit data, substitution duality, and gauge-labeling
 * self-duality checks.
 *
 * The `fixedPointClosure` helper is a prefix-ordered closure carrier with a
 * distinguished fixed-point marker. It is a runtime carrier for the package's
 * settling machinery, not a proof that an arbitrary substitution has a global
 * aperiodic fixed word.
 *
 * @packageDocumentation
 */
import type { Lattice } from "../../closure.mjs";
import { type ChargeValue, type GaugeElementName } from "../../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type Integer, type Matrix, type Natural, type Rational } from "../../analysis/exact-number.mjs";
import type { Mark } from "@red-cup-engineering/computer-data-engine/utterance";
/** A single letter: a Mark wrapped as a dynamics symbol (compared by carrier). */
export interface SubstitutionSymbol {
    readonly kind: "substitution.dynamics.symbol";
    readonly mark: Mark;
}
/** A finite word over the alphabet. */
export type SubstitutionWord = readonly SubstitutionSymbol[];
/** One production: a symbol → its image word. */
export interface SubstitutionRuleEntry {
    readonly kind: "substitution.dynamics.ruleEntry";
    readonly symbol: SubstitutionSymbol;
    readonly word: SubstitutionWord;
}
/** A substitution morphism: the rule entries. */
export interface SubstitutionRule {
    readonly kind: "substitution.dynamics.rule";
    readonly entries: readonly SubstitutionRuleEntry[];
}
/** The incidence (abelianization) matrix of a substitution. */
export type SubstitutionIncidenceMatrix = Matrix;
/** A word in the fixed-point closure: finite, or the distinguished fixed point. */
export type InfiniteWord = {
    readonly kind: "substitution.dynamics.fixedPoint";
} | SubstitutionWord;
/** A substitution dynamical system: a rule and its alphabet. */
export interface SubstitutionCarrier {
    readonly kind: "substitution.dynamics.carrier";
    readonly rule: SubstitutionRule;
    readonly alphabet: readonly SubstitutionSymbol[];
}
/** The fixed-point closure: a lattice over infinite words and the map φ. */
export interface SubstitutionClosureCarrier {
    readonly kind: "substitution.dynamics.closure";
    readonly lattice: Lattice<InfiniteWord>;
    readonly phi: (word: InfiniteWord) => InfiniteWord;
}
/** Two matrices are equal. */
export interface MatrixEquationWitness {
    readonly kind: "substitution.dynamics.matrixEquation:witness";
    readonly left: Matrix;
    readonly right: Matrix;
}
/** Two matrices differ. */
export interface MatrixEquationObstruction {
    readonly kind: "substitution.dynamics.matrixEquation-obstruction";
    readonly left: Matrix;
    readonly right: Matrix;
}
/** The result of comparing two matrices. */
export type MatrixEquationJudgment = MatrixEquationWitness | MatrixEquationObstruction;
/** A gauge labeling: charge values over alphabet positions, with rank. */
export interface GaugeLabelingCarrier {
    readonly kind: "substitution.dynamics.gaugeLabeling";
    readonly values: readonly ChargeValue[];
    readonly rank: Natural;
}
/** The image of a gauge labeling under a gauge element. */
export interface GaugeImageCarrier {
    readonly kind: "substitution.dynamics.gaugeImage";
    readonly labeling: GaugeLabelingCarrier;
    readonly sigma: GaugeElementName;
    readonly values: readonly ChargeValue[];
    readonly rank: Natural;
}
/** A labeling value absent from a gauge image. */
export interface GaugePermutationMissingValue {
    readonly kind: "substitution.dynamics.gaugePermutationMissingValue";
    readonly value: ChargeValue;
    readonly image: GaugeImageCarrier;
}
/** A gauge image value outside the labeling. */
export interface GaugePermutationEscapingValue {
    readonly kind: "substitution.dynamics.gaugePermutationEscapingValue";
    readonly value: ChargeValue;
    readonly image: GaugeImageCarrier;
}
/** A gauge element permutes a labeling. */
export interface GaugePermutationWitness {
    readonly kind: "substitution.dynamics.gaugePermutation:witness";
    readonly labeling: GaugeLabelingCarrier;
    readonly image: GaugeImageCarrier;
    readonly matrix: SubstitutionIncidenceMatrix;
}
/** A gauge element fails to permute a labeling. */
export interface GaugePermutationObstruction {
    readonly kind: "substitution.dynamics.gaugePermutation-obstruction";
    readonly labeling: GaugeLabelingCarrier;
    readonly image: GaugeImageCarrier;
    readonly missing: readonly GaugePermutationMissingValue[];
    readonly escaping: readonly GaugePermutationEscapingValue[];
    readonly rank: Natural;
}
/** The result of testing a gauge permutation. */
export type GaugePermutationJudgment = GaugePermutationWitness | GaugePermutationObstruction;
/** A self-dual substitution rule under a gauge. */
export interface SubstitutionSelfDualityWitness {
    readonly kind: "substitution.dynamics.selfDuality:witness";
    readonly permutation: GaugePermutationWitness;
    readonly commutation: MatrixEquationJudgment;
    readonly gaugeInvolution: MatrixEquationJudgment;
}
/** A non-self-dual substitution rule. */
export interface SubstitutionSelfDualityObstruction {
    readonly kind: "substitution.dynamics.selfDuality-obstruction";
    readonly permutation: GaugePermutationObstruction;
}
/** The result of a substitution self-duality test. */
export type SubstitutionSelfDualityJudgment = SubstitutionSelfDualityWitness | SubstitutionSelfDualityObstruction;
/** The colimit invariants of a substitution matrix. */
export interface ColimStructure {
    readonly kind: "substitution.dynamics.colim";
    readonly rank: Natural;
    readonly det: Integer;
    readonly smith: readonly Integer[];
    readonly stableDet: Integer;
    readonly module: LocalizedIntegerModule;
}
/** A free integer module with certain primes inverted. */
export interface LocalizedIntegerModule {
    readonly kind: "substitution.dynamics.localizedIntegerModule";
    readonly rank: Natural;
    readonly invertedPrimes: readonly Integer[];
}
/** Sheaf and cosheaf colimit structures agree. */
export interface ColimitDualityWitness {
    readonly kind: "substitution.dynamics.colimDuality:witness";
    readonly sheaf: ColimStructure;
    readonly cosheaf: ColimStructure;
}
/** Sheaf and cosheaf colimit structures disagree. */
export interface ColimitDualityObstruction {
    readonly kind: "substitution.dynamics.colimDuality-obstruction";
    readonly sheaf: ColimStructure;
    readonly cosheaf: ColimStructure;
}
/** The result of comparing sheaf and cosheaf colimits. */
export type ColimitDualityJudgment = ColimitDualityWitness | ColimitDualityObstruction;
/** The dual of a substitution matrix. */
export interface SubstitutionDual {
    readonly kind: "substitution.dynamics.dual";
    readonly sheaf: ColimStructure;
    readonly cosheaf: ColimStructure;
    readonly duality: ColimitDualityJudgment;
}
/** A primitive matrix (a power is strictly positive). */
export interface PrimitiveMatrixWitness {
    readonly kind: "substitution.dynamics.primitiveMatrix:witness";
    readonly matrix: Matrix;
    readonly exponent: Natural;
}
/** Why a matrix fails primitivity. */
export type PrimitiveMatrixObstructionReason = "negative-entry" | "positive-power-not-found";
/** A non-primitive matrix. */
export interface PrimitiveMatrixObstruction {
    readonly kind: "substitution.dynamics.primitiveMatrix-obstruction";
    readonly matrix: Matrix;
    readonly reason: PrimitiveMatrixObstructionReason;
    readonly searchedThrough: Natural;
}
/** The result of testing primitivity. */
export type PrimitiveMatrixJudgment = PrimitiveMatrixWitness | PrimitiveMatrixObstruction;
/** The step-N invariant of a substitution matrix. */
export interface StepNInvariant {
    readonly kind: "substitution.dynamics.stepNInvariant";
    readonly rank: Natural;
    readonly module: LocalizedIntegerModule;
}
/** Whether two substitution symbols are the same carrier (the mark is opaque). */
export declare function sameSubstitutionSymbol(left: SubstitutionSymbol, right: SubstitutionSymbol): boolean;
/** A substitution symbol wrapping a mark. */
export declare function substitutionSymbol(mark: Mark): SubstitutionSymbol;
/** A rule entry pairing a symbol with its image word. */
export declare function substitutionRuleEntry(symbol: SubstitutionSymbol, word: SubstitutionWord): SubstitutionRuleEntry;
/** A substitution rule from entries. */
export declare function substitutionRule(entries: readonly SubstitutionRuleEntry[]): SubstitutionRule;
/** A substitution carrier from a rule and (default) alphabet. */
export declare function substitutionCarrier(rule: SubstitutionRule, alphabet?: readonly SubstitutionSymbol[]): SubstitutionCarrier;
/** Apply a substitution once to a word. */
export declare const substitute: (rule: SubstitutionRule, word: SubstitutionWord) => SubstitutionWord;
/** Apply a substitution n times. */
export declare function iterateSubstitution(rule: SubstitutionRule, word: SubstitutionWord, n: Natural): SubstitutionWord;
/** The orbit of a seed under a substitution. */
export declare function substitutionOrbit(rule: SubstitutionRule, seed: SubstitutionWord): Generator<SubstitutionWord>;
/** The fixed-point closure of a substitution from a seed (prefix-ordered lattice). */
export declare function fixedPointClosure(rule: SubstitutionRule, seed: SubstitutionWord): SubstitutionClosureCarrier;
/** The incidence matrix of a substitution over an alphabet. */
export declare function abelianize(rule: SubstitutionRule, alphabet: readonly SubstitutionSymbol[]): SubstitutionIncidenceMatrix;
/** A gauge labeling from charge values. */
export declare function gaugeLabeling(values: readonly ChargeValue[]): GaugeLabelingCarrier;
/** Apply a gauge element to a labeling. */
export declare function gaugeImage(labeling: GaugeLabelingCarrier, sigma: GaugeElementName): GaugeImageCarrier;
/** Whether a gauge element permutes a set of charge values. */
export declare function inducedPermutation(values: readonly ChargeValue[], sigma: GaugeElementName): GaugePermutationJudgment;
/** Whether a substitution incidence matrix is self-dual under a gauge. */
export declare function substitutionRuleSelfDual(matrix: SubstitutionIncidenceMatrix, labeling: readonly ChargeValue[], sigma: GaugeElementName): SubstitutionSelfDualityJudgment;
/** The transpose of a substitution incidence matrix. */
export declare function transposeSubstitutionMatrix(matrix: SubstitutionIncidenceMatrix): SubstitutionIncidenceMatrix;
/** The characteristic polynomial of a matrix. */
export declare function charPolyOver(matrix: Matrix): readonly Integer[];
/** Whether a matrix is primitive (a power is strictly positive). */
export declare function primitiveMatrix(matrix: Matrix): PrimitiveMatrixJudgment;
/** Approximate the Perron eigenvalue by power iteration from the all-ones vector. */
export declare function perronConvergent(matrix: Matrix, iterations?: number): Rational;
/** The colimit structure of a matrix (Smith normal form, stable det, localized module). */
export declare function colimStructure(matrix: Matrix): ColimStructure;
/** The dual of a substitution matrix (sheaf of the transpose, cosheaf of the matrix). */
export declare function substitutionDual(matrix: Matrix): SubstitutionDual;
/** A localized integer module: invert the distinct prime factors of the stable determinant. */
export declare const localizedIntegerModule: (moduleRank: Natural, stableDet: Integer) => LocalizedIntegerModule;
/** The step-N invariant of a matrix (its rank and localized module). */
export declare const stepNInvariant: (matrix: Matrix) => StepNInvariant;

export interface SubstitutionSystem {
    readonly kind: "substitution.dynamics.system";
    readonly rule: SubstitutionRule;
    readonly alphabet: readonly SubstitutionSymbol[];
}
export declare function substitutionSystem(rule: SubstitutionRule, alphabet?: readonly SubstitutionSymbol[]): SubstitutionSystem;
