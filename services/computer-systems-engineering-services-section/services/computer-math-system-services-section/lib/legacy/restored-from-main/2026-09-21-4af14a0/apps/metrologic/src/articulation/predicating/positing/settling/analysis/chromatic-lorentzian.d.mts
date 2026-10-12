/**
 * analysis/chromatic-lorentzian - non-idempotent causal-chain settling.
 *
 * Executable shadow of RelMath.Aperiodic.ChromaticLorentzian and
 * RelMath.Lorentzian.ChromaticLorentzianAction on finite prefixes of Nat:
 * one-step mark propagation is not idempotent, past-closure absorbs it, and
 * the integer backward difference is inverse to cumulative past-sum.
 */
export type BoolMarking = readonly boolean[];
export type IntField = readonly number[];
export interface ChromaticLorentzianReceipt {
    readonly kind: "aperiodic.chromaticLorentzian.receipt:witness";
    readonly seed: BoolMarking;
    readonly stepSeed: BoolMarking;
    readonly stepStepSeed: BoolMarking;
    readonly settledSeed: BoolMarking;
    readonly stepNotIdempotent: true;
    readonly settleStepAbsorption: true;
    readonly settleOrbitConstant: true;
    readonly geoMldRefl: true;
    readonly geoMldSymm: true;
    readonly geoMldTrans: true;
    readonly geoMldIffSettleEq: true;
    readonly crossBaseClassification: true;
    readonly transfiniteHeightBoundary: "finite prefixes witness omega-style propagation, not uncountable aperiodic height";
}
export interface ChromaticLorentzianActionReceipt {
    readonly kind: "lorentzian.chromaticLorentzianAction.receipt:witness";
    readonly field: IntField;
    readonly boxPastSum: true;
    readonly pastSumBox: true;
    readonly boxUnit: readonly number[];
    readonly bdActionChain: true;
    readonly settleIffPastSumPositive: true;
    readonly chainBdActionFour: 1;
    readonly chromaticLorentzianAction: true;
}
export declare function step(marking: BoolMarking): BoolMarking;
export declare function settle(marking: BoolMarking): BoolMarking;
export declare function mark0(length: number): BoolMarking;
export declare function orbit(marking: BoolMarking, count: number): BoolMarking;
export declare const geoMld: (left: BoolMarking, right: BoolMarking) => boolean;
export declare function box(field: IntField): IntField;
export declare function pastSum(field: IntField): IntField;
export declare function indicator(marking: BoolMarking): IntField;
export declare const unitField: (length: number) => IntField;
export declare function bdActionChain(length: number): number;
export declare function receipt(seed?: BoolMarking): ChromaticLorentzianReceipt;
export declare function actionReceipt(field?: IntField): ChromaticLorentzianActionReceipt;
