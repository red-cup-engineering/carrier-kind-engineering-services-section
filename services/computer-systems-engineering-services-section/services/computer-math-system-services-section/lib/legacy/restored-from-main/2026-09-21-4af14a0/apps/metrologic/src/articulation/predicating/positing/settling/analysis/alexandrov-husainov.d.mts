/**
 * analysis/alexandrov-husainov - finite executable shadow of
 * RelMath.Cohomology.AlexandrovHusainov.
 *
 * Lean proves Alexandrov opens as up-sets, arbitrary intersection/union of
 * opens, specialization-order recovery, continuous iff monotone, and Čech-side
 * acyclicity while leaving Husainov's derived-functor comparison open. This
 * module exposes the finite poset/up-set carrier and the computable comparison
 * boundary.
 */
export interface FinitePosetCarrier {
    readonly kind: "alexandrovHusainov.poset";
    readonly points: readonly string[];
    readonly leq: readonly (readonly [string, string])[];
}
export interface OpenSetCarrier {
    readonly kind: "alexandrovHusainov.openSet";
    readonly points: readonly string[];
}
export interface MonotoneMapCarrier {
    readonly kind: "alexandrovHusainov.monotoneMap";
    readonly source: readonly string[];
    readonly target: readonly string[];
    readonly map: Readonly<Record<string, string>>;
}
export interface AlexandrovTopologyReceipt {
    readonly kind: "alexandrovHusainov.topology:witness";
    readonly poset: FinitePosetCarrier;
    readonly opens: readonly OpenSetCarrier[];
    readonly emptyOpen: true;
    readonly universeOpen: true;
    readonly binaryIntersectionOpen: true;
    readonly binaryUnionOpen: true;
    readonly arbitraryFiniteIntersectionOpen: true;
    readonly arbitraryFiniteUnionOpen: true;
    readonly principalUpSetsOpen: true;
    readonly specializationRecoversOrder: true;
}
export interface ContinuousMonotoneReceipt {
    readonly kind: "alexandrovHusainov.continuousMonotone:witness";
    readonly source: FinitePosetCarrier;
    readonly target: FinitePosetCarrier;
    readonly map: MonotoneMapCarrier;
    readonly monotone: true;
    readonly preimagesOfOpensAreOpen: true;
    readonly continuousIffMonotoneOnFiniteMaps: true;
}
export interface HusainovBoundaryReceipt {
    readonly kind: "alexandrovHusainov.husainovBoundary:documented";
    readonly cechH1VanishesOnBoundedSites: true;
    readonly cechAboveOneTrivial: true;
    readonly derivedFunctorComparisonImplemented: false;
    readonly obstruction: readonly string[];
}
export interface AlexandrovHusainovReceipt {
    readonly kind: "alexandrovHusainov.receipt:witness";
    readonly topology: AlexandrovTopologyReceipt;
    readonly continuousMonotone: ContinuousMonotoneReceipt;
    readonly husainov: HusainovBoundaryReceipt;
    readonly openFrontier: readonly string[];
}
export declare function finitePoset(pointsInput: readonly string[], leqInput: readonly (readonly [string, string])[]): FinitePosetCarrier;
export declare const defaultPoset: FinitePosetCarrier;
export declare function openSet(points: readonly string[]): OpenSetCarrier;
export declare function isUpSet(poset: FinitePosetCarrier, open: OpenSetCarrier): boolean;
export declare function principalUpSet(poset: FinitePosetCarrier, point: string): OpenSetCarrier;
export declare const intersection: (family: readonly OpenSetCarrier[], universe: readonly string[]) => OpenSetCarrier;
export declare const union: (family: readonly OpenSetCarrier[]) => OpenSetCarrier;
export declare const allOpenSets: (poset: FinitePosetCarrier) => readonly OpenSetCarrier[];
export declare function specializes(poset: FinitePosetCarrier, x: string, y: string): boolean;
export declare function monotoneMap(source: FinitePosetCarrier, target: FinitePosetCarrier, mapInput: Readonly<Record<string, string>>): MonotoneMapCarrier;
export declare function topologyReceipt(poset?: FinitePosetCarrier): AlexandrovTopologyReceipt;
export declare function continuousMonotoneReceipt(source?: FinitePosetCarrier, target?: FinitePosetCarrier, mapInput?: Readonly<Record<string, string>>): ContinuousMonotoneReceipt;
export declare function husainovBoundaryReceipt(): HusainovBoundaryReceipt;
export declare function receipt(): AlexandrovHusainovReceipt;
