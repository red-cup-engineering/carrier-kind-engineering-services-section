/**
 * analysis/transfinite-cell-complex - finite executable shadow of
 * RelMath.Cohomology.TransfiniteCellComplex.
 *
 * Lean carries the general theorem for arbitrary cell types and modeled limit
 * ordinals. This module earns the finite runtime content: finite-dimensional
 * cells, face dimension drop, downward-closed finite subcomplexes, directed
 * union/colimit checks, and the finite-prefix settling-continuity equation.
 */
import { type ChargeOperatorCarrier, type FiniteValuation } from "./flow.mjs";
export interface CellCarrier {
    readonly kind: "transfiniteCellComplex.cell";
    readonly name: string;
    readonly dimension: number;
}
export interface FaceIncidenceCarrier {
    readonly face: string;
    readonly coface: string;
}
export interface CellComplexCarrier {
    readonly kind: "transfiniteCellComplex.complex";
    readonly cells: readonly CellCarrier[];
    readonly faces: readonly FaceIncidenceCarrier[];
}
export interface FiniteSubcomplexCarrier {
    readonly kind: "transfiniteCellComplex.finiteSubcomplex";
    readonly cells: readonly string[];
}
export interface TransfiniteCellComplexReceipt {
    readonly kind: "transfiniteCellComplex.colimit:witness";
    readonly complex: CellComplexCarrier;
    readonly finiteSubcomplexes: readonly FiniteSubcomplexCarrier[];
    readonly everyCellFiniteDimensional: true;
    readonly faceDimensionDrops: true;
    readonly generatedSubcomplexesDownwardClosed: true;
    readonly everyCellInSomeFiniteSubcomplex: true;
    readonly finiteSubcomplexesDirected: true;
    readonly inColimitIffSomeFinite: true;
    readonly noLimitCellsBeyondUnion: true;
    readonly frontier: "omega-one cardinality and arbitrary covering families remain proof-side";
}
export interface SettlingContinuityReceipt {
    readonly kind: "transfiniteCellComplex.settlingContinuity:witness";
    readonly seed: FiniteValuation;
    readonly prefixLength: number;
    readonly prefix: readonly FiniteValuation[];
    readonly limitJoin: FiniteValuation;
    readonly upperBound: true;
    readonly leastUpperBoundOnSamples: true;
    readonly noNewContentAtLimit: true;
    readonly closureOrbitContinuous: true;
    readonly boundary: "finite-prefix-limit-model";
}
export interface TransfiniteCellComplexCombinedReceipt {
    readonly kind: "transfiniteCellComplex.receipt:witness";
    readonly colimit: TransfiniteCellComplexReceipt;
    readonly continuity: SettlingContinuityReceipt;
}
export declare function cell(name: string, dimension: number): CellCarrier;
export declare function cellComplex(cellsInput: readonly CellCarrier[], facesInput: readonly FaceIncidenceCarrier[]): CellComplexCarrier;
export declare function generatedFiniteSubcomplex(complex: CellComplexCarrier, seedCells: readonly string[]): FiniteSubcomplexCarrier;
export declare function finiteSubcomplex(complex: CellComplexCarrier, cellsInput: readonly string[]): FiniteSubcomplexCarrier;
export declare const subcomplexIncludes: (left: FiniteSubcomplexCarrier, right: FiniteSubcomplexCarrier) => boolean;
export declare function unionSubcomplex(complex: CellComplexCarrier, left: FiniteSubcomplexCarrier, right: FiniteSubcomplexCarrier): FiniteSubcomplexCarrier;
export declare function transfiniteComplexReceipt(complex?: CellComplexCarrier): TransfiniteCellComplexReceipt;
export declare function limitJoin(prefix: readonly FiniteValuation[]): FiniteValuation;
export declare function settlingContinuityReceipt(operator?: ChargeOperatorCarrier, seed?: FiniteValuation, prefixLength?: number): SettlingContinuityReceipt;
export declare const defaultComplex: CellComplexCarrier;
export declare const defaultSeed: FiniteValuation;
export declare function receipt(): TransfiniteCellComplexCombinedReceipt;
