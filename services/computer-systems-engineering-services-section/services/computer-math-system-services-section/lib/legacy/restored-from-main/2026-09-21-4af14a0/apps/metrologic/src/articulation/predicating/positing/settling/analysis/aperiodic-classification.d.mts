/**
 * analysis/aperiodic-classification - finite executable shadow of the
 * aperiodic `cl-inv` / moduli / direct-limit / synonymy cluster.
 *
 * This packages the runtime-computable part of:
 * - RelMath.Aperiodic.Classification
 * - RelMath.Aperiodic.AndersonPutnam
 * - RelMath.Aperiodic.Moduli
 * - RelMath.Aperiodic.Universality
 * - RelMath.Aperiodic.StepN.FixedPoint
 * - RelMath.Aperiodic.CoClassifying
 * - RelMath.Aperiodic.SynonymyAntonymy
 * - RelMath.Aperiodic.Autopoiesis
 * - RelMath.Aperiodic.AperiodicSettleFrame
 * - RelMath.Aperiodic.ClassificationReduction
 * - RelMath.Aperiodic.GeometricMldComplete
 *
 * It carries the finite integer-coordinate, explicit matrix/table, and
 * settled-value-kernel shadows Lean makes computational. Genuine q-fuzzy
 * Verdier duality, cross-dimension shift equivalence, a real sheaf/topology
 * kernel, and the primitive transfinite closure-operator identification remain
 * proof-side/frontier material.
 */
import { type ClosureRegime } from "../closure.mjs";
import { type ClosureRegimeData } from "../value-category.mjs";
import { type BigradedDiamondReceipt, type BigradedDiamondTowerReceipt, type VaryingFamilyReceipt } from "./bigraded-diamond.mjs";
import { type SalemPisotWitness } from "./internal-real.mjs";
export type FiringType = "truthOnly" | "falsityOnly" | "both";
export interface H1Class {
    readonly kind: "aperiodic.h1.class";
    readonly coord: number;
}
export interface H1Homology {
    readonly kind: "aperiodic.h1.homology";
    readonly dualCoord: number;
}
export interface AperiodicSettling {
    readonly kind: "aperiodic.settling.carrier";
    readonly regime: ClosureRegime;
    readonly clInv: H1Class;
    readonly vanishingRespected: true;
}
export interface CohSettling {
    readonly kind: "aperiodic.cohSettling.carrier";
    readonly base: AperiodicSettling;
    readonly h0: number;
}
export interface CohInvariant {
    readonly kind: "aperiodic.cohInvariant";
    readonly h0: number;
    readonly clInv: H1Class;
    readonly regime: ClosureRegime;
}
export interface CohomologicalEquivalenceReceipt {
    readonly kind: "aperiodic.cohomologicalEquivalence.receipt:witness";
    readonly left: CohSettling;
    readonly right: CohSettling;
    readonly invariant: CohInvariant;
    readonly fullCohEquiv: true;
    readonly fullCohEquivIsEquivalence: true;
    readonly fullRefinesClInvEquiv: true;
    readonly flatClInvCollapse: true;
    readonly aperiodicNotTrivial: true;
    readonly negationCohomologicallyInvisible: true;
    readonly geometricMldBoundary: "geometric MLD converse is carried by settled-value-kernel receipts";
}
export interface LocalDerivabilityReceipt {
    readonly kind: "aperiodic.localDerivability:witness";
    readonly relation: "equality" | "shared-clInv";
    readonly mldRefinesCohEquiv: true;
}
export interface CommonBaseSettling {
    readonly kind: "aperiodic.commonBase.settling";
    readonly firings: readonly number[];
}
export type CommonBaseClInv = Readonly<Record<string, number>>;
export interface CommonBaseDerivation {
    readonly kind: "aperiodic.commonBase.derivation:witness";
    readonly source: CommonBaseSettling;
    readonly target: CommonBaseSettling;
    readonly permutation: readonly number[];
    readonly preservesFirings: true;
}
export interface CommonBaseClassificationReceipt {
    readonly kind: "aperiodic.commonBase.classification.receipt:witness";
    readonly left: CommonBaseSettling;
    readonly right: CommonBaseSettling;
    readonly leftClInv: CommonBaseClInv;
    readonly rightClInv: CommonBaseClInv;
    readonly derivation: CommonBaseDerivation;
    readonly baseMLDRefl: true;
    readonly baseMLDSymm: true;
    readonly baseMLDTrans: true;
    readonly baseClInvOfBaseMLD: true;
    readonly baseMLDOfClInvEq: true;
    readonly commonBaseClassification: true;
    readonly crossBaseBridge: "geometric cross-base MLD is carried by the settled-value-kernel receipt";
}
export interface AperiodicFramePoint {
    readonly kind: "aperiodic.frame.point";
    readonly settling: AperiodicSettling;
    readonly stage: number;
}
export interface AperiodicSettleFrameReceipt {
    readonly kind: "aperiodic.settleFrame.receipt:witness";
    readonly witness: AperiodicFramePoint;
    readonly trivial: AperiodicFramePoint;
    readonly stepped: AperiodicFramePoint;
    readonly settledWitness: AperiodicFramePoint;
    readonly settledTrivial: AperiodicFramePoint;
    readonly stepNotIdempotent: true;
    readonly settleStepAbsorbs: true;
    readonly witnessSeparated: true;
    readonly aperiodicGeoMldIffCohEquiv: true;
    readonly transfiniteCarrierBoundary: "stage non-idempotence is finite-witnessed; ordinal cofinality remains proof-side";
}
export interface ClassificationReductionReceipt {
    readonly kind: "aperiodic.classificationReduction.receipt:witness";
    readonly coarsestRelation: "cohEquiv";
    readonly classificationIffComplete: true;
    readonly existsCompleteLocalDerivability: true;
    readonly reductionIsRealizable: true;
    readonly geometricBridge: "RelMath.Aperiodic.GeometricMldComplete supplies the nontrivial geometric completeness witness";
}
export interface GeometricMldDerivation {
    readonly kind: "aperiodic.geometricMld.derivation:witness";
    readonly source: AperiodicFramePoint;
    readonly target: AperiodicFramePoint;
    readonly settledSource: AperiodicFramePoint;
    readonly settledTarget: AperiodicFramePoint;
    readonly relation: "settled-value-kernel";
    readonly bisimulationUpToClosure: true;
    readonly constructedMorphism: true;
}
export interface GeometricMldCompleteReceipt {
    readonly kind: "aperiodic.geometricMldComplete.receipt:witness";
    readonly left: AperiodicSettling;
    readonly right: AperiodicSettling;
    readonly derivation: GeometricMldDerivation;
    readonly geometricMldRefl: true;
    readonly geometricMldSymm: true;
    readonly geometricMldTrans: true;
    readonly geometricMldPreservesClInv: true;
    readonly geometricMldIffCohEquiv: true;
    readonly geometricLocalDerivabilityComplete: true;
    readonly classificationReductionDischarged: true;
    readonly primitiveClosureBoundary: "independent primitive transfinite closureOp equals clInv readout remains proof-side";
}
export interface UpToClosureCoinductionReceipt {
    readonly kind: "aperiodic.upToClosureCoinduction.receipt:witness";
    readonly sourceModule: "RelMath.Aperiodic.UpToClosureCoinduction";
    readonly theorems: readonly [
        "bisimUTC_sound",
        "geoMld_iff_settleEq",
        "crossBase_classification"
    ];
    readonly geometricMldComplete: GeometricMldCompleteReceipt;
    readonly relation: "settled-value-kernel";
    readonly bisimulationUpToClosure: true;
    readonly crossBaseConverseDischarged: true;
    readonly boundary: "proved on the realized idempotent settling coalgebra";
}
export interface TransfiniteUpToClosureReceipt {
    readonly kind: "aperiodic.transfiniteUpToClosure.receipt:witness";
    readonly sourceModule: "RelMath.Aperiodic.TransfiniteUpToClosure";
    readonly theorems: readonly [
        "orbit_le_closure",
        "settle_coalgebraOrbitLimit",
        "bisimUTC_settle_limit",
        "transfinite_ladder_climb"
    ];
    readonly upToClosure: UpToClosureCoinductionReceipt;
    readonly settleFrame: AperiodicSettleFrameReceipt;
    readonly limitStageCarriesSettledValue: true;
    readonly coinductionClimbsLimit: true;
    readonly realizedCarrier: "strict-finite idempotent closure";
    readonly frontierBoundary: "genuinely transfinite non-idempotent carrier remains frontier";
}
export interface ClassificationReceipt {
    readonly kind: "aperiodic.classification.receipt:witness";
    readonly strictSettling: AperiodicSettling;
    readonly scottSettling: AperiodicSettling;
    readonly aperiodicWitness: AperiodicSettling;
    readonly synonym: readonly [AperiodicSettling, AperiodicSettling];
    readonly cohEquivIsEquivalence: true;
    readonly strictScottClInvZero: true;
    readonly aperiodicCanBeNonzero: true;
    readonly mldRefinesCohEquiv: true;
    readonly geometricConverseBoundary: "geometric converse is implemented separately by GeometricMldComplete";
}
export interface StageElement {
    readonly kind: "aperiodic.stageElement";
    readonly stage: number;
    readonly coord: number;
}
export interface DirectLimitReceipt {
    readonly kind: "aperiodic.andersonPutnam.receipt:witness";
    readonly left: StageElement;
    readonly right: StageElement;
    readonly eventuallyEqual: true;
    readonly colimitClass: H1Class;
    readonly stageIndependent: true;
    readonly coconeLaw: true;
    readonly perGradeQuartet: BigradedDiamondTowerReceipt;
    readonly stepTwoIsFour: true;
}
export interface StepRule {
    readonly kind: "aperiodic.stepRule.carrier";
    readonly n: number;
    readonly substitution: readonly (readonly number[])[];
    readonly primitive: boolean;
    readonly coord: number;
}
export interface ModuliPoint {
    readonly kind: "aperiodic.moduliPoint";
    readonly coord: number;
}
export interface ModuliReceipt {
    readonly kind: "aperiodic.moduli.receipt:witness";
    readonly rule: StepRule;
    readonly shifted: StepRule;
    readonly point: ModuliPoint;
    readonly shiftedPoint: ModuliPoint;
    readonly stepShiftPreservesPrimitive: true;
    readonly stepShiftPreservesCoord: true;
    readonly stepShiftPreservesModuliPoint: true;
    readonly chainInclusion: true;
    readonly stratifiedOrResiduePartition: true;
    readonly negationGaugeInvisible: true;
    readonly coarseMldBoundary: "open coarse moduli equals structural MLD classes";
}
export interface FixedPointReceipt {
    readonly kind: "aperiodic.stepNFixedPoint.receipt:witness";
    readonly embedded: StageElement;
    readonly shifted: StageElement;
    readonly minfinityClass: H1Class;
    readonly embedDepthIndependent: true;
    readonly sigmaInfinityShiftsDepth: true;
    readonly sigmaInfinityFixed: true;
    readonly rgFixedPoint: true;
}
export type IntMatrix = readonly (readonly number[])[];
export interface ShiftEquivalenceReceipt {
    readonly kind: "aperiodic.shiftEquivalence.receipt:witness";
    readonly dimension: number;
    readonly matrix: IntMatrix;
    readonly shiftedMatrix: IntMatrix;
    readonly r: IntMatrix;
    readonly s: IntMatrix;
    readonly strongShiftEquivalent: true;
    readonly shiftEquivalent: true;
    readonly seReflexive: true;
    readonly seSymmetric: true;
    readonly seTransitiveByChains: true;
    readonly universalityClassIsSeClass: true;
    readonly clInvCoordinateInvariant: true;
    readonly fixedDimensionBoundary: "cross-dimension SE and dimension groups remain proof-side";
}
export interface CoClassifyingReceipt {
    readonly kind: "aperiodic.coClassifying.receipt:witness";
    readonly cohomology: H1Class;
    readonly homology: H1Homology;
    readonly inverse: H1Class;
    readonly dSpatialBijective: true;
    readonly zeroPreserving: true;
    readonly coClInvEqualsDSpatialClInv: true;
    readonly sameDataAsCohEquiv: true;
    readonly verdierBoundary: "q-fuzzy and derived Verdier duality remain proof-side";
}
export interface StrongSettling {
    readonly kind: "aperiodic.strongSettling.carrier";
    readonly base: AperiodicSettling;
    readonly tau: FiringType;
}
export interface SynonymyAntonymyReceipt {
    readonly kind: "aperiodic.synonymyAntonymy.receipt:witness";
    readonly source: StrongSettling;
    readonly twist: StrongSettling;
    readonly synonymyEquivalence: true;
    readonly negationInvisibleToSynonymy: true;
    readonly flipInvolutive: true;
    readonly antonymySymmetric: true;
    readonly antonymyRefinesSynonymy: true;
    readonly truthOnlyMoves: true;
}
export interface AutopoiesisReceipt {
    readonly kind: "aperiodic.autopoiesis.receipt:witness";
    readonly diamond: BigradedDiamondReceipt;
    readonly varying: VaryingFamilyReceipt;
    readonly tower: BigradedDiamondTowerReceipt;
    readonly autopoieticCoreIffFixedBoth: true;
    readonly fourCorners: 4;
    readonly historySeparationAperiodic: true;
    readonly historyValueOrderBoundary: "history-filtration nuclei are not value-order nuclei";
}
export interface SalemPisotRegimeReceipt {
    readonly kind: "aperiodic.salemPisotRegime.receipt:witness";
    readonly salem: SalemPisotWitness;
    readonly salemData: ClosureRegimeData;
    readonly pisotData: ClosureRegimeData;
    readonly salemRegime: ClosureRegime;
    readonly pisotRegime: ClosureRegime;
    readonly salemAperiodic: true;
    readonly pisotStrict: true;
    readonly splitIsRegimeSplit: true;
    readonly boundary: "neutral-direction-to-aperiodic is carried as finite regime data, not analytic contraction proof";
}
export interface DefectReceipt {
    readonly kind: "aperiodic.defect.receipt:witness";
    readonly sourceModule: "RelMath.Cohomology.Defect";
    readonly theorems: readonly [
        "RelMath.Aperiodic.HasDefect",
        "RelMath.Aperiodic.no_defect_of_settles",
        "RelMath.Aperiodic.no_defect_of_vanishing",
        "RelMath.Aperiodic.hasDefect_curved",
        "RelMath.Aperiodic.hasDefect_nonvanishing",
        "RelMath.Aperiodic.aperiodicWitness_hasDefect",
        "RelMath.Aperiodic.defect_exists"
    ];
    readonly flat: AperiodicSettling;
    readonly scott: AperiodicSettling;
    readonly witness: AperiodicSettling;
    readonly flatDefectFree: true;
    readonly vanishingDefectFree: true;
    readonly defectCurved: true;
    readonly defectNonvanishing: true;
    readonly aperiodicWitnessHasDefect: true;
    readonly defectExists: true;
}
export interface AperiodicClassificationReceipt {
    readonly kind: "aperiodic.classificationCluster.receipt:witness";
    readonly classification: ClassificationReceipt;
    readonly cohomologicalEquivalence: CohomologicalEquivalenceReceipt;
    readonly commonBase: CommonBaseClassificationReceipt;
    readonly aperiodicSettleFrame: AperiodicSettleFrameReceipt;
    readonly classificationReduction: ClassificationReductionReceipt;
    readonly geometricMldComplete: GeometricMldCompleteReceipt;
    readonly directLimit: DirectLimitReceipt;
    readonly moduli: ModuliReceipt;
    readonly fixedPoint: FixedPointReceipt;
    readonly universality: ShiftEquivalenceReceipt;
    readonly coClassifying: CoClassifyingReceipt;
    readonly synonymyAntonymy: SynonymyAntonymyReceipt;
    readonly autopoiesis: AutopoiesisReceipt;
    readonly salemPisotRegime: SalemPisotRegimeReceipt;
    readonly defect: DefectReceipt;
    readonly openFrontier: readonly string[];
}
export declare function h1Class(coord: number): H1Class;
export declare const h1Zero: H1Class;
export declare function h1Homology(dualCoord: number): H1Homology;
export declare const h1HomologyZero: H1Homology;
export declare function settling(regime: ClosureRegime, coord: number): AperiodicSettling;
export declare function aperiodicWitness(coord?: number): AperiodicSettling;
export declare function inflationRegimeData(onUnitCircle: boolean): ClosureRegimeData;
export declare function inflationRegime(onUnitCircle: boolean): ClosureRegime;
export declare function cohEquiv(left: AperiodicSettling, right: AperiodicSettling): boolean;
export declare function hasDefect(value: AperiodicSettling): boolean;
export declare function isCurvedRegime(regime: ClosureRegime): boolean;
export declare function cohSettling(base: AperiodicSettling, h0: number): CohSettling;
export declare function cohInvariant(value: CohSettling): CohInvariant;
export declare function fullCohEquiv(left: CohSettling, right: CohSettling): boolean;
export declare function cohomologicalEquivalenceReceipt(): CohomologicalEquivalenceReceipt;
export declare function commonBaseSettling(firings: readonly number[]): CommonBaseSettling;
export declare function baseClInvAt(settlingValue: CommonBaseSettling, stage: number): number;
export declare function baseClInv(settlingValue: CommonBaseSettling): CommonBaseClInv;
export declare function baseMLD(left: CommonBaseSettling, right: CommonBaseSettling): boolean;
export declare function commonBaseDerivation(left: CommonBaseSettling, right: CommonBaseSettling): CommonBaseDerivation;
export declare function commonBaseClassificationReceipt(): CommonBaseClassificationReceipt;
export declare function aperiodicFramePoint(settlingValue: AperiodicSettling, stage: number): AperiodicFramePoint;
export declare function canonicalAperiodic(coord: number): AperiodicSettling;
export declare function aperiodicStep(point: AperiodicFramePoint): AperiodicFramePoint;
export declare function aperiodicSettle(point: AperiodicFramePoint): AperiodicFramePoint;
export declare function aperiodicFrameSettledEqual(left: AperiodicFramePoint, right: AperiodicFramePoint): boolean;
export declare function aperiodicSettleFrameReceipt(): AperiodicSettleFrameReceipt;
export declare function classificationReductionReceipt(): ClassificationReductionReceipt;
export declare function geometricMld(left: AperiodicSettling, right: AperiodicSettling): boolean;
export declare function geometricMldDerivation(left: AperiodicSettling, right: AperiodicSettling): GeometricMldDerivation;
export declare function geometricMldCompleteReceipt(): GeometricMldCompleteReceipt;
export declare function upToClosureCoinductionReceipt(): UpToClosureCoinductionReceipt;
export declare function transfiniteUpToClosureReceipt(): TransfiniteUpToClosureReceipt;
export declare function classificationReceipt(): ClassificationReceipt;
export declare function stageElement(stage: number, coord: number): StageElement;
export declare function eventuallyEqual(left: StageElement, right: StageElement): boolean;
export declare function colimitClass(element: StageElement): H1Class;
export declare function directLimitReceipt(): DirectLimitReceipt;
export declare function stepRule(n: number, substitution: readonly (readonly number[])[], primitive: boolean, coord: number): StepRule;
export declare function stepShift(rule: StepRule): StepRule;
export declare function toModuli(rule: StepRule): ModuliPoint;
export declare function moduliReceipt(): ModuliReceipt;
export declare function fixedPointReceipt(): FixedPointReceipt;
export declare function shiftEquivalenceReceipt(): ShiftEquivalenceReceipt;
export declare function dSpatial(value: H1Class): H1Homology;
export declare function dSpatialInv(value: H1Homology): H1Class;
export declare function coClassifyingReceipt(coord?: number): CoClassifyingReceipt;
export declare function flipFiring(type: FiringType): FiringType;
export declare function strongSettling(base: AperiodicSettling, tau: FiringType): StrongSettling;
export declare function negTwist(source: StrongSettling): StrongSettling;
export declare function synonymyAntonymyReceipt(): SynonymyAntonymyReceipt;
export declare function autopoiesisReceipt(): AutopoiesisReceipt;
export declare function salemPisotRegimeReceipt(): SalemPisotRegimeReceipt;
export declare function defectReceipt(): DefectReceipt;
export declare function receipt(): AperiodicClassificationReceipt;
