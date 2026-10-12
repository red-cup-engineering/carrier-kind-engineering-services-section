/**
 * analysis/causal - finite Lorentzian causal-set reads.
 *
 * Executable carrier shadows for `RelMath.Lorentzian.Causal` and
 * `RelMath.Lorentzian.MyrheimMeyer`: Boolean causal transitive closure,
 * no-closed-timelike-curve obstruction, apex counts, rational ordering
 * fractions, strict-regime H1-zero, and the diamond/chain/antichain witnesses.
 */
import { type Rational } from "./exact-number.mjs";
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export interface CausalLink {
    readonly from: string;
    readonly to: string;
}
export interface CausalSetCarrier {
    readonly kind: "lorentzian.causalSet";
    readonly events: readonly string[];
    readonly links: readonly CausalLink[];
}
export interface CausalSettlementWitness {
    readonly kind: "lorentzian.causalSettle:witness";
    readonly events: readonly string[];
    readonly directLinks: readonly CausalLink[];
    readonly closure: readonly CausalLink[];
    readonly apexCount: number;
    readonly orderedPairCount: number;
    readonly orderingFraction: Rational;
    readonly nscCount: 0;
    readonly eulerCharacteristic: number;
    readonly regime: "ordinal.closure.regime.finite";
    readonly h1Vanishes: true;
}
export interface CausalSettlementObstruction {
    readonly kind: "lorentzian.causalSettle-obstruction";
    readonly reason: "duplicate-event" | "unknown-event" | "closed-timelike-curve";
    readonly events: readonly string[];
    readonly directLinks: readonly CausalLink[];
    readonly closure: readonly CausalLink[];
    readonly offending?: CausalLink;
    /** One deterministic closed path of direct links; empty except for a closed timelike curve. */
    readonly cycle: readonly string[];
}
export declare const isCausalSettlementObstruction: (value: unknown) => value is CausalSettlementObstruction;
export type CausalSettlementJudgment = CausalSettlementWitness | CausalSettlementObstruction;
/** One Boolean causal closure step: `v(a,c) or exists b. v(a,b) and v(b,c)`. */
export declare function causalStep(events: readonly string[], links: readonly CausalLink[]): readonly CausalLink[];
/** The finite fixed point of repeated Boolean causal closure. */
export declare function causalClosure(events: readonly string[], links: readonly CausalLink[]): readonly CausalLink[];
/** Count strictly-causally-ordered pairs, i.e. apex pairs off the diagonal. */
export declare function apexCount(events: readonly string[], links: readonly CausalLink[]): number;
/** The strict interval `(from,to)`: events strictly after `from` and strictly before `to`. */
export declare function interval(carrier: CausalSetCarrier, from: string, to: string): readonly string[] | CausalSettlementObstruction;
/** The strict interval abundance `|I(from,to)|`. */
export declare function intervalCard(carrier: CausalSetCarrier, from: string, to: string): number | CausalSettlementObstruction;
/** Strict-past events whose interval abundance into `event` is exactly `layer`. */
export declare function pastLayer(carrier: CausalSetCarrier, event: string, layer: number): readonly string[] | CausalSettlementObstruction;
/** Count a strict-past layer. */
export declare function layerCount(carrier: CausalSetCarrier, event: string, layer: number): number | CausalSettlementObstruction;
/** The ordered off-diagonal pair count `N * (N - 1)`. */
export declare function orderedPairCount(eventCount: number): number;
/** The rational Myrheim-Meyer input `2|Apex| / (N(N-1))`. */
export declare function orderingFraction(events: readonly string[], links: readonly CausalLink[]): Rational;
export declare function settleCausalSet(carrier: CausalSetCarrier): CausalSettlementJudgment;
export declare const diamondCausalSet: CausalSetCarrier;
export declare const chainCausalSet: CausalSetCarrier;
export declare const antichainCausalSet: CausalSetCarrier;
export declare const diamondPortrait: any;
export declare const chainPortrait: any;
export declare const antichainPortrait: any;
export declare const geometryIndependentOfTopology: any;
/** The incidence-algebra Mobius function of the finite causal order. */
export declare function causalMobius(carrier: CausalSetCarrier, from: string, to: string): number | CausalSettlementObstruction;
/** The past-layer Mobius coefficient `c_k(x) = sum_{z in L_k(x)} mu(z,x)`. */
export declare function mobiusLayerCoefficient(carrier: CausalSetCarrier, event: string, layer: number): number | CausalSettlementObstruction;
export interface CausalMobiusReceipt {
    readonly kind: "lorentzian.causalMobius.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.CausalMobius";
    readonly theorems: readonly [
        "RelMath.Lorentzian.CausalMobius.mobius_self",
        "RelMath.Lorentzian.CausalMobius.mobius_zero_of_not_above",
        "RelMath.Lorentzian.CausalMobius.diamond_mobius_profile",
        "RelMath.Lorentzian.CausalMobius.diamond_layer_coeffs",
        "RelMath.Lorentzian.CausalMobius.mobAux_fuel_stable",
        "RelMath.Lorentzian.CausalMobius.mobius_orthogonality_causal",
        "RelMath.Lorentzian.CausalMobius.diamond_mobius_orthogonality_saturated",
        "RelMath.Lorentzian.CausalMobius.diamond_chainCount",
        "RelMath.Lorentzian.CausalMobius.diamond_philip_hall",
        "RelMath.Lorentzian.CausalMobius.mobius_eq_hallSum"
    ];
    readonly mobiusProfileAtTop: Readonly<Record<string, number>>;
    readonly layerCoefficientsAtTop: Readonly<Record<string, number>>;
    readonly intervalOrthogonalityAtDiamond: true;
    readonly saturatedOrthogonalityAtDiamond: true;
    readonly mobiusSelfAtTop: 1;
    readonly offOrderZeroAtMiddle: 0;
    readonly chainCountAtApex: readonly [1, 2, 0];
    readonly hallSumAtApex: 1;
    readonly mobiusEqualsHallSumAtApex: true;
}
export declare function causalMobiusReceipt(): CausalMobiusReceipt;
export declare const cDiamond: (layer: number) => number;
export declare const bdCoeff2: (layer: number) => number;
export declare const bdCoeff4: (layer: number) => number;
export declare function bdMoment(coeff: (layer: number) => number, support: number, degree: number): number;
export declare function occupationProfile(carrier: CausalSetCarrier, event: string, support: number): readonly number[] | CausalSettlementObstruction;
export declare function bdLayerSum(coeff: (layer: number) => number, profile: readonly number[], support?: number): number;
export declare function dalembertianBD(carrier: CausalSetCarrier, coeff: (layer: number) => number, field: Readonly<Record<string, number>>, event: string): number | CausalSettlementObstruction;
export declare function dalembertianStrict(carrier: CausalSetCarrier, field: Readonly<Record<string, number>>, event: string): number | CausalSettlementObstruction;
export declare function causalDalembertian(carrier: CausalSetCarrier, field: Readonly<Record<string, number>>, event: string): number | CausalSettlementObstruction;
export declare function localCurvature(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction;
export declare function bdAction(carrier: CausalSetCarrier): number | CausalSettlementObstruction;
export declare function strictAction(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction;
export declare function rangeSum(values: (layer: number) => number, support: number): number;
/** The layer-grouped Benincasa-Dowker action `sum_k c(k) * |L_k(x)|`. */
export declare function bdLayerAction(carrier: CausalSetCarrier, coeff: (layer: number) => number, event: string, support?: number): number | CausalSettlementObstruction;
/** Fuel-bounded longest strict causal chain length from `from` to `to`. */
export declare function longestChain(carrier: CausalSetCarrier, from: string, to: string, fuel?: number): number | CausalSettlementObstruction;
/** The saturated finite causal-set proper time: the longest strict chain. */
export declare function properTime(carrier: CausalSetCarrier, from: string, to: string): number | CausalSettlementObstruction;
/** Group a finite causal carrier by longest-chain height. */
export declare function causalHeightStrata(carrier: CausalSetCarrier): readonly (readonly string[])[] | CausalSettlementObstruction;
export interface CausalDistanceReceipt {
    readonly kind: "lorentzian.causalDistance.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.CausalDistance";
    readonly theorems: readonly [
        "RelMath.Lorentzian.CausalDistance.longestChain_step",
        "RelMath.Lorentzian.CausalDistance.longestChain_fuel_stable",
        "RelMath.Lorentzian.CausalDistance.longestChain_saturated",
        "RelMath.Lorentzian.CausalDistance.properTime_lt_step",
        "RelMath.Lorentzian.CausalDistance.longestChain_concat",
        "RelMath.Lorentzian.CausalDistance.reverse_triangle_general",
        "RelMath.Lorentzian.CausalDistance.diamond_properTime",
        "RelMath.Lorentzian.CausalDistance.diamond_spacelike_zero",
        "RelMath.Lorentzian.CausalDistance.diamond_reverse_triangle",
        "RelMath.Lorentzian.CausalDistance.diamond_reverse_triangle_general"
    ];
    readonly properTimes: Readonly<Record<string, number>>;
    readonly saturatedFuelAtCardinality: true;
    readonly strictStepAddsTick: true;
    readonly concatReverseTriangle: true;
    readonly generalReverseTriangleAtDiamond: true;
    readonly spacelikeMiddlePairZero: true;
    readonly reverseTriangleAtDiamond: true;
}
export declare function causalDistanceReceipt(): CausalDistanceReceipt;
export declare function rowCurvature(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction;
export declare function curvatureDefect(carrier: CausalSetCarrier, event: string): number | CausalSettlementObstruction;
export declare function curvatureTensor(carrier: CausalSetCarrier, event: string, direction: string): number | CausalSettlementObstruction;
export declare function symCurvature(carrier: CausalSetCarrier, event: string, direction: string): number | CausalSettlementObstruction;
export interface CausalCohomologyReceipt {
    readonly kind: "lorentzian.causalCohomology.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.CausalCohomology";
    readonly theorems: readonly ["delta1_delta0", "coboundary_cocycle", "wavefront_empty_coboundary", "causal_cochain_complex"];
    readonly causalSettle: CausalSettlementWitness;
    readonly delta1Delta0Zero: true;
    readonly coboundariesAreCocycles: true;
    readonly emptyWavefrontTrivialClass: true;
}
export interface CausalCohomologyH2Receipt {
    readonly kind: "lorentzian.causalCohomologyH2.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.CausalCohomologyH2";
    readonly theorems: readonly ["delta2_delta1", "coboundary2_cocycle2", "symplectic_form_class_in_h2", "causal_cohomology_h2"];
    readonly h1Complex: CausalCohomologyReceipt;
    readonly delta2Delta1Zero: true;
    readonly twoCoboundariesAreTwoCocycles: true;
    readonly closedTwoFormClassInH2: true;
}
export interface CausalCohomologyNReceipt {
    readonly kind: "lorentzian.causalCohomologyN.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.CausalCohomologyN";
    readonly theorems: readonly ["delta_cons", "delta_sub", "delta_delta", "coboundary_cocycle", "causal_cohomology_n"];
    readonly h2Complex: CausalCohomologyH2Receipt;
    readonly coneContractionForm: true;
    readonly deltaLinearOnDifferences: true;
    readonly deltaSquaresToZeroAllDegrees: true;
}
export interface CurvatureActionWiringReceipt {
    readonly kind: "lorentzian.curvatureActionWiring.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.CurvatureActionWiring";
    readonly theorems: readonly [
        "sym_row_trace",
        "localCurvature_eq_tensorTrace_add_row",
        "totalSymRicci_eq_two_bdAction",
        "curvature_action_wiring"
    ];
    readonly bdAction: number;
    readonly totalSymRicci: number;
    readonly actionIsHalfSymmetricTrace: true;
    readonly antisymmetricTraceVanishes: true;
}
export declare function causalCohomologyReceipt(carrier?: CausalSetCarrier): CausalCohomologyReceipt | CausalSettlementObstruction;
export declare function causalCohomologyH2Receipt(carrier?: CausalSetCarrier): CausalCohomologyH2Receipt | CausalSettlementObstruction;
export declare function causalCohomologyNReceipt(carrier?: CausalSetCarrier): CausalCohomologyNReceipt | CausalSettlementObstruction;
export declare function curvatureActionWiringReceipt(carrier?: CausalSetCarrier): CurvatureActionWiringReceipt | CausalSettlementObstruction;
export interface BdgMobiusActionReceipt {
    readonly kind: "lorentzian.bdgMobiusAction.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.BDGMobiusAction";
    readonly theorems: readonly [
        "RelMath.Lorentzian.BDGMobiusAction.endoCoeff_layerConstant",
        "RelMath.Lorentzian.BDGMobiusAction.strictAction_eq_bdLayerAction",
        "RelMath.Lorentzian.BDGMobiusAction.diamond_strictAction_eq_bd",
        "RelMath.Lorentzian.BDGMobiusAction.diamond_bdAction_eq_count_add_strict",
        "RelMath.Lorentzian.BDGMobiusAction.bdg_mobius_action_wiring"
    ];
    readonly endogenous: EndogenousCoefficientReceipt;
    readonly strictActionAtTop: number;
    readonly bdLayerActionAtTop: number;
    readonly fullBdAction: number;
    readonly eventCountPlusStrictActions: number;
    readonly layerConstantFactorization: true;
    readonly strictEqualsLayerAction: true;
    readonly fullActionDecomposes: true;
}
export declare function bdgMobiusActionReceipt(): BdgMobiusActionReceipt;
export interface BenincasaDowkerReceipt {
    readonly kind: "lorentzian.benincasaDowker:witness";
    readonly mobiusProfileAtTop: Readonly<Record<string, number>>;
    readonly layerCoefficientsAtTop: Readonly<Record<string, number>>;
    readonly diamondLayerConstant: true;
    readonly diamondStrictEqualsBD: true;
    readonly bdCoeff2Moments: readonly [number, number, number];
    readonly bdCoeff2Admissible: true;
    readonly bdCoeff4PlainMoments: readonly [number, number, number];
    readonly bdSumZero: true;
}
export declare function benincasaDowkerReceipt(): BenincasaDowkerReceipt;
export interface CausalDalembertianReceipt {
    readonly kind: "lorentzian.causalDalembertian:witness";
    readonly zeroFieldAnnihilated: true;
    readonly additiveAtTop: true;
    readonly expectationCommutes: true;
    readonly unitFieldAtTop: number;
    readonly strictPastAtTop: number;
}
export declare function causalDalembertianReceipt(): CausalDalembertianReceipt;
export interface EndogenousCoefficientReceipt {
    readonly kind: "lorentzian.endogenousCoefficients:witness";
    readonly endoCoeffAtTop: readonly [number, number, number];
    readonly strictActionAtTop: number;
    readonly actionIsLayerSum: true;
    readonly factorsThroughDiamondCoefficients: true;
}
export declare function endogenousCoefficientReceipt(): EndogenousCoefficientReceipt;
export interface EinsteinHilbertReceipt {
    readonly kind: "lorentzian.einsteinHilbert:witness";
    readonly localCurvature: Readonly<Record<string, number>>;
    readonly bdAction: number;
    readonly boundaryCountsAction: true;
}
export declare function einsteinHilbertReceipt(carrier?: CausalSetCarrier): EinsteinHilbertReceipt | CausalSettlementObstruction;
export interface LambekCurvatureReceipt {
    readonly kind: "lorentzian.lambekCurvature:witness";
    readonly rowCurvature: Readonly<Record<string, number>>;
    readonly curvatureDefect: Readonly<Record<string, number>>;
    readonly totalDefect: 0;
    readonly boundaryLocalized: true;
}
export declare function lambekCurvatureReceipt(carrier?: CausalSetCarrier): LambekCurvatureReceipt | CausalSettlementObstruction;
export interface LambekRicciReceipt {
    readonly kind: "lorentzian.lambekRicci:witness";
    readonly boundaryTensor: Readonly<Record<string, number>>;
    readonly diagonalVanishes: true;
    readonly antisymmetric: true;
    readonly scalarTrace: Readonly<Record<string, number>>;
    readonly tensorTotal: 0;
}
export declare function lambekRicciReceipt(carrier?: CausalSetCarrier): LambekRicciReceipt | CausalSettlementObstruction;
export interface SprinklingAverageReceipt {
    readonly kind: "lorentzian.sprinklingAverage:witness";
    readonly diamondOccupationProfile: readonly [number, number, number];
    readonly diamondBd2LayerSum: number;
    readonly diamondCDiamondLayerSum: number;
    readonly bdCoeff2MomentResponse: readonly [number, number, number];
    readonly pairSprinklingAverage: number;
    readonly expectationCommutesWithLayerSum: true;
}
export declare function sprinklingAverageReceipt(): SprinklingAverageReceipt;
export interface CausalIntervalReceipt {
    readonly kind: "lorentzian.causalInterval:witness";
    readonly theorems: readonly [
        "RelMath.Lorentzian.CausalInterval.mem_between",
        "RelMath.Lorentzian.CausalInterval.intervalCard_zero_iff",
        "RelMath.Lorentzian.CausalInterval.mem_pastLayer",
        "RelMath.Lorentzian.CausalInterval.diamond_layer_profile",
        "RelMath.Lorentzian.CausalInterval.diamond_layers_partition_past"
    ];
    readonly event: string;
    readonly strictPast: readonly string[];
    readonly layerProfile: readonly [number, number, number];
    readonly pastCount: number;
    readonly membershipMatchesOrderBracketing: true;
    readonly intervalCardZeroIffEmpty: true;
    readonly pastLayerMembershipMatchesAbundance: true;
    readonly diamondLayerProfile: true;
    readonly diamondLayersPartitionPast: true;
}
export declare function causalIntervalReceipt(carrier?: CausalSetCarrier, event?: string): CausalIntervalReceipt | CausalSettlementObstruction;
export interface CausalConeFieldReceipt {
    readonly kind: "lorentzian.coneField:witness";
    readonly events: readonly string[];
    readonly closure: readonly CausalLink[];
    readonly futureCones: readonly {
        readonly event: string;
        readonly future: readonly string[];
        readonly past: readonly string[];
    }[];
    readonly spacelikePairs: readonly (readonly [string, string])[];
    readonly orderLaws: {
        readonly reflexive: true;
        readonly transitive: true;
        readonly antisymmetric: true;
        readonly spacelikeSymmetric: true;
    };
}
export declare function coneFieldReceipt(carrier: CausalSetCarrier): CausalConeFieldReceipt | CausalSettlementObstruction;
export interface CausalLaplacianReceipt {
    readonly kind: "lorentzian.causalLaplacian:witness";
    readonly seed: readonly string[];
    readonly closure: readonly string[];
    readonly harmonic: true;
    readonly gapOne: true;
    readonly leastFutureClosed: true;
}
export declare function causalLaplacianReceipt(carrier: CausalSetCarrier, seed: readonly string[]): CausalLaplacianReceipt | CausalSettlementObstruction;
export interface LightObservationReceipt {
    readonly kind: "lorentzian.lightObservation:witness";
    readonly signatures: readonly {
        readonly event: string;
        readonly past: readonly string[];
        readonly future: readonly string[];
    }[];
    readonly separating: true;
    readonly recoversCausalOrder: true;
}
export interface CausalAlexandrovReceipt {
    readonly kind: "lorentzian.causalAlexandrov:witness";
    readonly specializationRecoversOrder: true;
    readonly strictReachabilityIsSpecializationNe: true;
    readonly futureConesOpen: true;
    readonly topologyGeneratedByCausalOrder: true;
}
export declare function causalAlexandrovReceipt(carrier: CausalSetCarrier): CausalAlexandrovReceipt | CausalSettlementObstruction;
export interface CausalAlexandrovTopologyReceipt {
    readonly kind: "lorentzian.causalAlexandrovTopology:witness";
    readonly theorems: readonly [
        "RelMath.Lorentzian.CausalAlexandrovTopology.closedFuture_isOpen",
        "RelMath.Lorentzian.CausalAlexandrovTopology.future_isOpen",
        "RelMath.Lorentzian.CausalAlexandrovTopology.specializes_iff_causalLe",
        "RelMath.Lorentzian.CausalAlexandrovTopology.reaches_iff_specializes_ne",
        "RelMath.Lorentzian.CausalAlexandrovTopology.spacelike_iff_no_specialization",
        "RelMath.Lorentzian.CausalAlexandrovTopology.causalContinuous_iff_monotone",
        "RelMath.Lorentzian.CausalAlexandrovTopology.causal_alexandrov_recovers_cones"
    ];
    readonly closedFuturesOpen: true;
    readonly strictFuturesOpen: true;
    readonly specializesIffCausalLe: true;
    readonly reachesIffSpecializesNe: true;
    readonly spacelikeIffNoSpecialization: true;
    readonly causalContinuousIffMonotone: true;
    readonly recoversCones: true;
    readonly futureCones: readonly {
        readonly event: string;
        readonly closedFuture: readonly string[];
        readonly strictFuture: readonly string[];
    }[];
}
export declare function causalAlexandrovTopologyReceipt(carrier?: CausalSetCarrier): CausalAlexandrovTopologyReceipt | CausalSettlementObstruction;
export declare function lightObservationReceipt(carrier: CausalSetCarrier): LightObservationReceipt | CausalSettlementObstruction;
export interface DiamondSpectralPortraitReceipt {
    readonly kind: "lorentzian.diamondSpectralPortrait:witness";
    readonly orderingFraction: Rational;
    readonly eulerCharacteristic: number;
    readonly spacelikeMiddlePair: readonly [string, string];
    readonly futureCounts: readonly number[];
    readonly pastTopCount: number;
    readonly causalLaplacian: CausalLaplacianReceipt;
}
export declare function diamondSpectralPortraitReceipt(): DiamondSpectralPortraitReceipt;
export interface CausalNetReceipt {
    readonly kind: "lorentzian.causalNet:witness";
    readonly regionPreorder: true;
    readonly spacelikeRegionsSymmetric: true;
    readonly spacelikeRegionsDisjoint: true;
    readonly diamondIsotony: true;
}
export declare function causalNetReceipt(_carrier: CausalSetCarrier): CausalNetReceipt;
export interface ParaconsistentConeReportReceipt {
    readonly kind: "lorentzian.paraconsistentConeReport:witness";
    readonly sourceModule: "RelMath.Lorentzian.ParaconsistentConeField";
    readonly booleanConsistent: true;
    readonly mergeCommutative: true;
    readonly mergeInflationary: true;
    readonly reachableIffBoolean: true;
    readonly trueCharge: ChargeValueName;
    readonly falseCharge: ChargeValueName;
    readonly contradictoryMerge: ChargeValueName;
}
export declare function paraconsistentConeReportReceipt(): ParaconsistentConeReportReceipt;
export interface MicrolocalSupportReceipt {
    readonly kind: "lorentzian.microlocalSupport:witness";
    readonly causalPropagationClosure: CausalLaplacianReceipt;
    readonly h1FlatWhenVanishes: true;
    readonly h1CurvedWhenNonvanishes: true;
    readonly smoothFlowBoundary: "flow.nsc-firing-support";
}
export declare function microlocalSupportReceipt(carrier: CausalSetCarrier, seed: readonly string[]): MicrolocalSupportReceipt | CausalSettlementObstruction;
export interface MyrheimMeyerRealShadowReceipt {
    readonly kind: "lorentzian.myrheimMeyerRealShadow:witness";
    readonly rationalOrderingFraction: Rational;
    readonly internalRealShadow: "5/6";
    readonly dimensionInverse: "documented-boundary";
}
export declare function myrheimMeyerRealShadowReceipt(): MyrheimMeyerRealShadowReceipt;
