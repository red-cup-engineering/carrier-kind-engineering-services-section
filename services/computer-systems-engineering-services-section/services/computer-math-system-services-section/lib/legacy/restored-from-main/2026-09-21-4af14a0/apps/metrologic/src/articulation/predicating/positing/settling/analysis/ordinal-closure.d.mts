/**
 * analysis/ordinal-closure - finite/symbolic executable shadow of
 * RelMath.Closure.OrdinalCore and RelMath.Closure.Ordinal.
 *
 * The existing settling closure workbench owns the actual zero/successor/limit
 * ordinal constructors. This module packages the Lean-facing facts that are
 * runtime-checkable without pretending that arbitrary `Nat -> Ord` functions are
 * executable data: finite successor towers, named omega limits, shape-based
 * regime reads, and the old Boolean classifier as the ordinal's shadow.
 */
import { finiteClosureRegime, type ClosureRegime, type Ordinal } from "../closure.mjs";
import { type ClosureRegimeData } from "../value-category.mjs";
export type OrdinalSummary = {
    readonly kind: "ordinalClosure.summary.zero";
} | {
    readonly kind: "ordinalClosure.summary.successor";
    readonly predecessor: OrdinalSummary;
} | {
    readonly kind: "ordinalClosure.summary.limit";
    readonly name: "omega" | "omegaShift";
    readonly fundamentalPrefix: readonly OrdinalSummary[];
};
export interface FiniteOrdinalRead {
    readonly kind: "ordinalClosure.finiteRead:witness";
    readonly stage: number;
    readonly ordinal: OrdinalSummary;
    readonly isFinite: true;
    readonly finiteWitnessValue: number;
    readonly regime: typeof finiteClosureRegime;
    readonly belowOmega: true;
    readonly monotoneBelowNext: true;
}
export interface NamedLimitRead {
    readonly kind: "ordinalClosure.namedLimit:witness";
    readonly name: "omega" | "omegaShift";
    readonly ordinal: OrdinalSummary;
    readonly isFinite: false;
    readonly prefixBelowLimit: true;
    readonly regimeWhenScott: ClosureRegime;
    readonly regimeWhenNonScottCountable: ClosureRegime;
    readonly regimeWhenNonScottUncountable: ClosureRegime;
}
export interface ClassifierShadowRead {
    readonly kind: "ordinalClosure.classifierShadow:witness";
    readonly data: ClosureRegimeData;
    readonly ordinalIsFinite: boolean;
    readonly finiteFlagMatchesOrdinal: true;
    readonly regimeOfOrdinal: ClosureRegime;
    readonly classifiedRegime: ClosureRegime;
    readonly matches: true;
}
export interface OrdinalClosureReceipt {
    readonly kind: "ordinalClosure.receipt:witness";
    readonly finite: FiniteOrdinalRead;
    readonly omega: NamedLimitRead;
    readonly omegaShift: NamedLimitRead;
    readonly classifierShadow: ClassifierShadowRead;
    readonly limitLubBoundary: "named-fundamental-sequence-prefix";
    readonly arbitraryLimitBoundary: "proof-side Nat -> Ord functions";
}
export declare function ofNat(stage: number): Ordinal;
export declare function isFiniteOrdinal(ordinal: Ordinal): boolean;
export declare function regimeOfOrdinal(ordinal: Ordinal, scottContinuous: boolean, countableCofinality: boolean): ClosureRegime;
export declare function finiteRead(stage: number): FiniteOrdinalRead;
export declare function namedLimitRead(name: "omega" | "omegaShift", prefixLength?: number): NamedLimitRead;
export declare function classifierShadow(data: ClosureRegimeData, ordinal: Ordinal): ClassifierShadowRead;
export declare function receipt(stage?: number): OrdinalClosureReceipt;
