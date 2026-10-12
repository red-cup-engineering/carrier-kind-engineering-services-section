/**
 * analysis/internal-real - finite executable shadows of RelMath.InternalReals.
 *
 * Lean derives constructive rationals/reals, logarithms, scalar cancellation,
 * entropy monotonicity, and the per-step log-Lipschitz bound. This module keeps
 * the Node surface finite and exact: it computes rational approximants and
 * carrier-shaped witnesses for the laws that can be checked over bounded Nat
 * inputs without pretending to materialize arbitrary Bishop reals.
 */
import { ratOne, type Rational } from "./exact-number.mjs";
import { type ChromaticLorentzianReceipt } from "./chromatic-lorentzian.mjs";
/** The floor logarithm `floor(log_b n)`, matching RelMath.InternalReals.natLog. */
export declare function natLog(base: number, n: number): number;
/** The `k`th rational under-approximation of `log_b(N)`: `floor(log_b(N^(k+1))) / (k+1)`. */
export declare function logSeq(base: number, n: number, k: number): Rational;
/** The rational `1/(k+1)` from the Lean `Rat.invNatP k` constructor. */
export declare function invNatP(k: number): Rational;
/** Dependency-free floor square root, matching `RelMath.InternalReals.natSqrt`. */
export declare function natSqrt(n: number): number;
/** The `k`th rational under-approximation of `sqrt(c)`: `floor(sqrt(c*(k+1)^2))/(k+1)`. */
export declare function sqrtSeq(c: number, k: number): Rational;
export interface SqrtSeqApproximationWitness {
    readonly kind: "internalReal.sqrtSeqApproximation:witness";
    readonly c: number;
    readonly k: number;
    readonly numerator: number;
    readonly denominator: number;
    readonly approximation: Rational;
    readonly square: Rational;
    readonly target: Rational;
    readonly lowerHolds: true;
    readonly gap: Rational;
    readonly gapBound: Rational;
    readonly upperAdmissible: true;
    readonly upperHolds: true;
}
export interface SqrtSeqApproximationObstruction {
    readonly kind: "internalReal.sqrtSeqApproximation-obstruction";
    readonly reason: "domain" | "lower" | "upper";
    readonly c: number;
    readonly k: number;
    readonly numerator: number;
    readonly denominator: number;
    readonly approximation: Rational;
    readonly square: Rational;
    readonly target: Rational;
    readonly lowerHolds: boolean;
    readonly gap: Rational;
    readonly gapBound: Rational;
    readonly upperAdmissible: boolean;
    readonly upperHolds: boolean;
}
export type SqrtSeqApproximationJudgment = SqrtSeqApproximationWitness | SqrtSeqApproximationObstruction;
export interface ConstructiveIvtReceipt {
    readonly kind: "internalReal.constructiveIvt.receipt:witness";
    readonly sourceModule: "RelMath.Real.IVT";
    readonly theorems: readonly [
        "RelMath.InternalReals.natSqrt_spec",
        "RelMath.InternalReals.sqrtSeq_le_succ",
        "RelMath.InternalReals.sqrtSeq_sq_le",
        "RelMath.InternalReals.ofNat_sub_sqrtSeq_sq_le",
        "RelMath.InternalReals.sq_sqrtNat"
    ];
    readonly radicand: number;
    readonly sampleIndex: number;
    readonly approximation: SqrtSeqApproximationWitness;
    readonly decidableRationalOrder: true;
    readonly floorSqrtSpec: true;
    readonly bisectionCauchyStep: true;
    readonly lowerBracket: true;
    readonly upperSqueeze: true;
    readonly squareRootPinned: true;
    readonly boundary: "constructive square-root bisection carrier; full polynomial IVT root extraction remains proof-side";
}
/**
 * Finite carrier for `sqrtSeq_sq_le` and `ofNat_sub_sqrtSeq_sq_le`:
 * `sqrtSeq(c,k)^2 <= c` and, for `c >= 1`, `c - sqrtSeq(c,k)^2 <= 2c/(k+1)`.
 */
export declare function sqrtSeqApproximation(c: number, k: number): SqrtSeqApproximationJudgment;
/** Receipt for the constructive IVT stone earned by rational square-root bisection. */
export declare function constructiveIvtReceipt(c?: number, k?: number): ConstructiveIvtReceipt;
export interface RealMultiplicationReceipt {
    readonly kind: "internalReal.realMultiplication:witness";
    readonly theorem: "RelMath.InternalReals.RReal.mul";
    readonly left: Rational;
    readonly middle: Rational;
    readonly right: Rational;
    readonly product: Rational;
    readonly absMul: true;
    readonly leftMonotoneNonnegative: true;
    readonly rightMonotoneNonnegative: true;
    readonly boundScaling: true;
    readonly productIncrementSplit: true;
    readonly commutative: true;
    readonly associative: true;
    readonly oneMul: true;
    readonly mulOne: true;
    readonly zeroMul: true;
    readonly mulZero: true;
    readonly leftDistributive: true;
    readonly rightDistributive: true;
    readonly boundary: "finite constant-rational shadow of Bishop real multiplication; arbitrary real product moduli remain proof-side";
}
/**
 * Finite carrier for `RelMath.Real.RealMultiplication`.
 *
 * It checks the rational product lemmas used by the Bishop-real descent and the
 * ring laws on constant rational representatives.
 */
export declare function realMultiplicationReceipt(): RealMultiplicationReceipt;
/** Repeated addition of a rational, the finite carrier form of `nsmul`. */
export declare function nsmulRational(m: number, value: Rational): Rational;
export interface ScalarCancellationWitness {
    readonly kind: "internalReal.scalarCancellation:witness";
    readonly m: number;
    readonly left: Rational;
    readonly right: Rational;
    readonly scaledLeft: Rational;
    readonly scaledRight: Rational;
    readonly positive: true;
    readonly premiseHolds: true;
    readonly conclusionHolds: true;
}
export interface ScalarCancellationObstruction {
    readonly kind: "internalReal.scalarCancellation-obstruction";
    readonly reason: "positive-scalar" | "scaled-order-premise" | "conclusion";
    readonly m: number;
    readonly left: Rational;
    readonly right: Rational;
    readonly scaledLeft: Rational;
    readonly scaledRight: Rational;
    readonly positive: boolean;
    readonly premiseHolds: boolean;
    readonly conclusionHolds: boolean;
}
export type ScalarCancellationJudgment = ScalarCancellationWitness | ScalarCancellationObstruction;
/** The executable rational carrier of `Rat.le_of_ofNat_mul_le_left`. */
export declare function scalarCancellation(m: number, left: Rational, right: Rational): ScalarCancellationJudgment;
export interface LogStepBoundWitness {
    readonly kind: "internalReal.logStepBound:witness";
    readonly base: 2;
    readonly M: number;
    readonly k: number;
    readonly lhs: Rational;
    readonly rhs: Rational;
    readonly admissible: true;
    readonly holds: true;
}
export interface LogStepBoundObstruction {
    readonly kind: "internalReal.logStepBound-obstruction";
    readonly reason: "domain" | "bound";
    readonly base: 2;
    readonly M: number;
    readonly k: number;
    readonly lhs: Rational;
    readonly rhs: Rational;
    readonly admissible: boolean;
    readonly holds: boolean;
}
export type LogStepBoundJudgment = LogStepBoundWitness | LogStepBoundObstruction;
/**
 * Finite rational approximation of `logNat_step_bound`:
 * `log₂(M+1) ≤ log₂ M + 1/(k+1)` when `2(k+1) ≤ M`.
 */
export declare function logStepBound(M: number, k: number): LogStepBoundJudgment;
export interface LogLipschitzReceipt {
    readonly kind: "internalReal.logLipschitz:witness";
    readonly sourceModule: "RelMath.Real.LogLipschitz";
    readonly theorems: readonly [
        "RelMath.InternalReals.Rat.le_of_ofNat_mul_le_left",
        "RelMath.InternalReals.Rat.le_of_ofNat_mul_le",
        "RelMath.InternalReals.realNsmul_seq",
        "RelMath.InternalReals.nsmul_le_cancel",
        "RelMath.InternalReals.nsmul_ofRat_invNatP",
        "RelMath.InternalReals.logNat_one",
        "RelMath.InternalReals.logNat_pow_eq_nsmul",
        "RelMath.InternalReals.logNat_step_bound"
    ];
    readonly scalarCancellation: ScalarCancellationWitness;
    readonly stepBound: LogStepBoundWitness;
    readonly oneLogIsZero: true;
    readonly invNatScalesToOne: true;
    readonly powerLawSample: true;
}
export declare function logLipschitzReceipt(M?: number, k?: number): LogLipschitzReceipt;
export interface LogMonotoneWitness {
    readonly kind: "internalReal.logMonotone:witness";
    readonly base: number;
    readonly lower: number;
    readonly upper: number;
    readonly k: number;
    readonly lowerApprox: Rational;
    readonly upperApprox: Rational;
    readonly admissible: true;
    readonly holds: true;
}
export interface LogMonotoneObstruction {
    readonly kind: "internalReal.logMonotone-obstruction";
    readonly reason: "domain" | "order";
    readonly base: number;
    readonly lower: number;
    readonly upper: number;
    readonly k: number;
    readonly lowerApprox: Rational;
    readonly upperApprox: Rational;
    readonly admissible: boolean;
    readonly holds: boolean;
}
export type LogMonotoneJudgment = LogMonotoneWitness | LogMonotoneObstruction;
/** Finite rational approximation of `logNat_mono`: `M ≤ N -> log_b M ≤ log_b N`. */
export declare function logMonotone(base: number, lower: number, upper: number, k: number): LogMonotoneJudgment;
export interface NatLogMulBoundsWitness {
    readonly kind: "internalReal.natLogMulBounds:witness";
    readonly base: number;
    readonly left: number;
    readonly right: number;
    readonly leftFloor: number;
    readonly rightFloor: number;
    readonly productFloor: number;
    readonly lowerHolds: true;
    readonly upperHolds: true;
}
export interface NatLogMulBoundsObstruction {
    readonly kind: "internalReal.natLogMulBounds-obstruction";
    readonly reason: "domain" | "lower" | "upper";
    readonly base: number;
    readonly left: number;
    readonly right: number;
    readonly leftFloor: number;
    readonly rightFloor: number;
    readonly productFloor: number;
    readonly lowerHolds: boolean;
    readonly upperHolds: boolean;
}
export type NatLogMulBoundsJudgment = NatLogMulBoundsWitness | NatLogMulBoundsObstruction;
/** Finite exact carrier for `RelMath.InternalReals.natLog_mul_bounds`. */
export declare function natLogMulBounds(base: number, left: number, right: number): NatLogMulBoundsJudgment;
/** The fixed Lean theorem `log₂ 2 = 1`, as an exact rational carrier. */
export declare const binaryShiftEntropy: any;
export interface LogarithmReceipt {
    readonly kind: "internalReal.logarithm:witness";
    readonly sourceModule: "RelMath.Real.Logarithm";
    readonly theorems: readonly [
        "RelMath.InternalReals.natLog_spec",
        "RelMath.InternalReals.logSeq_le_succ",
        "RelMath.InternalReals.logNat_self",
        "RelMath.InternalReals.fullShiftEntropy_two",
        "RelMath.InternalReals.logNat_mono",
        "RelMath.InternalReals.fullShiftEntropy_mono",
        "RelMath.InternalReals.natLog_mul_bounds",
        "RelMath.InternalReals.logNat_mul",
        "RelMath.InternalReals.logRatN_scale",
        "RelMath.InternalReals.logRatN_self",
        "RelMath.InternalReals.logRatN_mono",
        "RelMath.InternalReals.golden_log_nested"
    ];
    readonly base: 2;
    readonly sample: {
        readonly n: 8;
        readonly k: 2;
        readonly floorLog: 3;
        readonly approximation: Rational;
    };
    readonly natLogSpecLower: true;
    readonly natLogSpecUpper: true;
    readonly logSeqSelf: true;
    readonly binaryEntropy: typeof ratOne;
    readonly monotone: LogMonotoneWitness;
    readonly mulBounds: NatLogMulBoundsWitness;
    readonly rationalOneHasZeroLog: true;
    readonly goldenNestedCrossProducts: readonly [15, 16, 64, 65, 39, 40];
    readonly goldenNested: true;
    readonly boundary: "finite floor-log and rational-order carrier; arbitrary Bishop real equality remains proof-side";
}
/** Receipt for the constructive logarithm/entropy spine in `RelMath.Real.Logarithm`. */
export declare function logarithmReceipt(): LogarithmReceipt;
/** The Fibonacci sequence `F₀ = F₁ = 1`, from `RelMath.Real.GoldenLog`. */
export declare function fib(n: number): number;
export interface GoldenCassiniWitness {
    readonly kind: "internalReal.goldenCassini:witness";
    readonly n: number;
    readonly left: number;
    readonly right: 1 | -1;
    readonly holds: true;
}
export interface GoldenCassiniObstruction {
    readonly kind: "internalReal.goldenCassini-obstruction";
    readonly n: number;
    readonly left: number;
    readonly right: 1 | -1;
    readonly holds: false;
}
export type GoldenCassiniJudgment = GoldenCassiniWitness | GoldenCassiniObstruction;
/** The finite executable witness for Cassini's identity `F_{n+2}F_n - F_{n+1}² = (-1)^n`. */
export declare function goldenCassini(n: number): GoldenCassiniJudgment;
export interface GoldenConvergentLogGapWitness {
    readonly kind: "internalReal.goldenConvergentLogGap:witness";
    readonly n: number;
    readonly k: number;
    readonly fibonacci: number;
    readonly square: number;
    readonly gap: Rational;
    readonly bound: Rational;
    readonly cassini: GoldenCassiniWitness;
    readonly admissible: true;
    readonly holds: true;
}
export interface GoldenConvergentLogGapObstruction {
    readonly kind: "internalReal.goldenConvergentLogGap-obstruction";
    readonly reason: "domain" | "bound" | "cassini";
    readonly n: number;
    readonly k: number;
    readonly fibonacci: number;
    readonly square: number;
    readonly gap: Rational;
    readonly bound: Rational;
    readonly cassini: GoldenCassiniJudgment;
    readonly admissible: boolean;
    readonly holds: boolean;
}
export type GoldenConvergentLogGapJudgment = GoldenConvergentLogGapWitness | GoldenConvergentLogGapObstruction;
/**
 * Finite carrier for `RelMath.InternalReals.convergent_log_gap`.
 *
 * Cassini reduces the adjacent convergent-ratio gap to numerator `1`; the log
 * width is then bounded by `1/(k+1)` once `2(k+1) ≤ F_{n+1}²`.
 */
export declare function goldenConvergentLogGap(n: number, k: number): GoldenConvergentLogGapJudgment;
/** The metallic recurrence `F₀ = 0`, `F₁ = 1`, `F_{k+2} = nF_{k+1} + F_k`. */
export declare function metallicNum(n: number, k: number): number;
export interface MetallicCassiniWitness {
    readonly kind: "internalReal.metallicCassini:witness";
    readonly n: number;
    readonly k: number;
    readonly left: number;
    readonly right: 1 | -1;
    readonly holds: true;
}
export interface MetallicCassiniObstruction {
    readonly kind: "internalReal.metallicCassini-obstruction";
    readonly n: number;
    readonly k: number;
    readonly left: number;
    readonly right: 1 | -1;
    readonly holds: false;
}
export type MetallicCassiniJudgment = MetallicCassiniWitness | MetallicCassiniObstruction;
/** Finite carrier for `RelMath.Aperiodic.StepN.metallic_cassini`. */
export declare function metallicCassini(n: number, k: number): MetallicCassiniJudgment;
export interface MetallicConvergentGapWitness {
    readonly kind: "internalReal.metallicConvergentGap:witness";
    readonly n: number;
    readonly i: number;
    readonly numerator: 1;
    readonly denominator: number;
    readonly gap: Rational;
    readonly telescopingBound: Rational;
    readonly cassini: MetallicCassiniWitness;
    readonly admissible: true;
    readonly holds: true;
}
export interface MetallicConvergentGapObstruction {
    readonly kind: "internalReal.metallicConvergentGap-obstruction";
    readonly reason: "domain" | "bound" | "cassini";
    readonly n: number;
    readonly i: number;
    readonly numerator: 1;
    readonly denominator: number;
    readonly gap: Rational;
    readonly telescopingBound: Rational;
    readonly cassini: MetallicCassiniJudgment;
    readonly admissible: boolean;
    readonly holds: boolean;
}
export type MetallicConvergentGapJudgment = MetallicConvergentGapWitness | MetallicConvergentGapObstruction;
/** Finite carrier for the metallic convergent gap bound `|cᵢ₊₁-cᵢ| ≤ 1/Fᵢ₊₁ - 1/Fᵢ₊₂`. */
export declare function metallicConvergentGap(n: number, i: number): MetallicConvergentGapJudgment;
export interface MetallicRootWitness {
    readonly kind: "internalReal.metallicRoot:witness";
    readonly n: number;
    readonly radicand: number;
    readonly leftConstant: number;
    readonly rightConstant: number;
    readonly sqrtCoefficient: number;
    readonly equation: "(n+sqrt(n^2+4))^2=(n+n)*(n+sqrt(n^2+4))+4";
    readonly holds: true;
}
export interface MetallicRootObstruction {
    readonly kind: "internalReal.metallicRoot-obstruction";
    readonly n: number;
    readonly radicand: number;
    readonly leftConstant: number;
    readonly rightConstant: number;
    readonly sqrtCoefficient: number;
    readonly equation: "(n+sqrt(n^2+4))^2=(n+n)*(n+sqrt(n^2+4))+4";
    readonly holds: false;
}
export type MetallicRootJudgment = MetallicRootWitness | MetallicRootObstruction;
/**
 * Symbolic exact carrier for `RelMath.Aperiodic.StepN.metallic_root`.
 *
 * Expanding both sides gives the same `sqrt(n^2+4)` coefficient `2n`; the
 * constant equality reduces to `n^2 + (n^2+4) = 2n^2 + 4`.
 */
export declare function metallicRoot(n: number): MetallicRootJudgment;
export declare function metallicConvergent(n: number, k: number): Rational;
export interface MetallicRealReceipt {
    readonly kind: "internalReal.metallicReal:witness";
    readonly sourceModule: "RelMath.Aperiodic.StepN.MetallicReal";
    readonly theorems: readonly [
        "RelMath.Aperiodic.StepN.cassini_step",
        "RelMath.Aperiodic.StepN.cassini_base",
        "RelMath.Aperiodic.StepN.metallic_cassini",
        "RelMath.Aperiodic.StepN.metallicNum_ge",
        "RelMath.Aperiodic.StepN.metallicNum_den_pos",
        "RelMath.Aperiodic.StepN.conv_diff",
        "RelMath.Aperiodic.StepN.abs_conv_diff",
        "RelMath.Aperiodic.StepN.metallicNum_strict",
        "RelMath.Aperiodic.StepN.gap_step_bound",
        "RelMath.Aperiodic.StepN.conv_telescope"
    ];
    readonly n: number;
    readonly support: number;
    readonly cassiniValues: readonly number[];
    readonly cassiniFlips: true;
    readonly cassiniMagnitudeOne: true;
    readonly growsAtLeastLinearly: true;
    readonly denominatorsPositive: true;
    readonly gapStep: MetallicConvergentGapWitness;
    readonly telescope: {
        readonly start: number;
        readonly distance: number;
        readonly endpointGap: Rational;
        readonly telescopingBound: Rational;
        readonly holds: true;
    };
}
export declare function metallicRealReceipt(n?: number, support?: number, start?: number, distance?: number): MetallicRealReceipt;
export declare function metallicPowerCoef(n: number, k: number): readonly [number, number];
export interface MetallicPowerLensReceipt {
    readonly kind: "internalReal.metallicPowerLens:witness";
    readonly sourceModule: "RelMath.Aperiodic.StepN.MetallicPowerLens";
    readonly theorem: "RelMath.Aperiodic.StepN.metallic_power_expansion";
    readonly n: number;
    readonly power: number;
    readonly root: MetallicRootWitness;
    readonly coef: readonly [number, number];
    readonly nextCoef: readonly [number, number];
    readonly baseZero: readonly [0, 1];
    readonly baseOne: readonly [1, 0];
    readonly recurrenceHolds: true;
    readonly rootEquationHolds: true;
}
export declare function metallicPowerLensReceipt(n?: number, power?: number): MetallicPowerLensReceipt;
export declare function expTerm(n: number): Rational;
export declare function expSeq(N: number): Rational;
export interface ExpSeriesReceipt {
    readonly kind: "internalReal.expSeries:witness";
    readonly sourceModule: "RelMath.Real.ExpSeries";
    readonly theorems: readonly [
        "RelMath.InternalReals.factorial_ge_self",
        "RelMath.InternalReals.factorial_mono",
        "RelMath.InternalReals.term_halving",
        "RelMath.InternalReals.term_antitone",
        "RelMath.InternalReals.expTerm_nonneg",
        "RelMath.InternalReals.cap_dec",
        "RelMath.InternalReals.cap_mono",
        "RelMath.InternalReals.expSeq_summable"
    ];
    readonly support: number;
    readonly factorialDominatesSelf: true;
    readonly factorialMonotone: true;
    readonly halvingIndex: number;
    readonly termHalving: true;
    readonly termsAntitone: true;
    readonly termsNonnegative: true;
    readonly capDecreases: true;
    readonly summable: {
        readonly N: number;
        readonly M: number;
        readonly partial: Rational;
        readonly bound: Rational;
        readonly holds: true;
    };
}
export declare function expSeriesReceipt(support?: number, N?: number, M?: number): ExpSeriesReceipt;
export interface MetallizationDichotomyReceipt {
    readonly kind: "aperiodic.metallizationDichotomy:witness";
    readonly sourceModule: "RelMath.Aperiodic.MetallizationDichotomy";
    readonly theorem: "RelMath.Aperiodic.metallization_dichotomy";
    readonly metallic: MetallicPowerLensReceipt;
    readonly chromatic: ChromaticLorentzianReceipt;
    readonly exponential: ExpSeriesReceipt;
    readonly finiteMetallicExpansion: true;
    readonly chromaticNonIdempotent: true;
    readonly exponentialSummable: true;
}
export declare function metallizationDichotomyReceipt(): MetallizationDichotomyReceipt;
export declare const charPolySalem: any;
export declare const salemTrace: any;
export declare function charPolyMetallic(n: number): readonly number[];
export declare function evalIntPoly(coefficients: readonly number[], x: number): number;
export declare function reciprocal(coefficients: readonly number[]): boolean;
export interface SquareRootTraceRootWitness {
    readonly kind: "internalReal.squareRootTraceRoot:witness";
    readonly name: "salem-trace" | "golden";
    readonly radicand: number;
    readonly leftConstant: number;
    readonly rightConstant: number;
    readonly sqrtCoefficient: 2;
    readonly equation: "(1+sqrt(c))^2=sqrt(c)+sqrt(c)+(c+1)";
    readonly holds: true;
}
export interface SquareRootTraceRootObstruction {
    readonly kind: "internalReal.squareRootTraceRoot-obstruction";
    readonly name: "salem-trace" | "golden";
    readonly radicand: number;
    readonly leftConstant: number;
    readonly rightConstant: number;
    readonly sqrtCoefficient: 2;
    readonly equation: "(1+sqrt(c))^2=sqrt(c)+sqrt(c)+(c+1)";
    readonly holds: false;
}
export type SquareRootTraceRootJudgment = SquareRootTraceRootWitness | SquareRootTraceRootObstruction;
export declare function salemTraceRoot(): SquareRootTraceRootJudgment;
export declare function goldenRoot(): SquareRootTraceRootJudgment;
export interface SalemPisotWitness {
    readonly kind: "internalReal.salemPisot:witness";
    readonly salemPolynomial: readonly number[];
    readonly salemTrace: readonly number[];
    readonly metallicPolynomial: readonly number[];
    readonly salemReciprocal: true;
    readonly metallicReciprocal: false;
    readonly salemUnitCircleSigns: readonly [number, number];
    readonly salemRealRootSigns: readonly [number, number];
    readonly pisotContractingSigns: readonly [number, number];
    readonly salemDeterminant: 1;
    readonly pisotDeterminant: -1;
    readonly salemCayleyHamilton: true;
    readonly salemTraceRoot: SquareRootTraceRootWitness;
    readonly goldenRoot: SquareRootTraceRootWitness;
    readonly boundary: "unit-circle trace signs are finite evidence; complex-root topology remains proof-side";
}
/** Finite arithmetic carrier for `RelMath.Aperiodic.StepN.Salem` and `SalemRoot`. */
export declare function salemPisotReceipt(): SalemPisotWitness;
export declare const properEdgeColouringsCount = 2;
export declare const properTriangleColouringsCount = 6;
export interface EdgeColouringEntropyWitness {
    readonly kind: "internalReal.edgeColouringEntropy:witness";
    readonly graph: "K2";
    readonly colors: 2;
    readonly properColourings: 2;
    readonly entropy: Rational;
    readonly equalsBinaryShiftEntropy: true;
}
/** The finite carrier for `edge_colouring_entropy`: a properly 2-coloured edge carries one bit. */
export declare const edgeColouringEntropy: EdgeColouringEntropyWitness;
export interface TriangleColouringEntropyApproximation {
    readonly kind: "internalReal.triangleColouringEntropy:approximation";
    readonly graph: "K3";
    readonly colors: 3;
    readonly properColourings: 6;
    readonly k: number;
    readonly entropyApprox: Rational;
}
/** The finite count side of `properTriangleColourings_count`, plus its log₂ approximant. */
export declare function triangleColouringEntropy(k: number): TriangleColouringEntropyApproximation;
