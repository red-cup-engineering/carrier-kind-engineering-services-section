import { type H1Class } from "./aperiodic-classification.mjs";
import { type ChargedCell, type CochainCarrier, type ShortExactSequenceReceipt } from "./settling-associated-sheaf.mjs";
import { type TruthKnowledgeSectionDecompositionReceipt } from "./bigraded-cohomology.mjs";
export interface CechPatchCarrier {
    readonly kind: "settlingCohomologyH1.patch";
    readonly name: string;
    readonly cells: readonly string[];
}
export interface LocalSectionCarrier {
    readonly kind: "settlingCohomologyH1.localSection";
    readonly patch: string;
    readonly section: CochainCarrier;
}
export interface Cech1DatumCarrier {
    readonly kind: "settlingCohomologyH1.cech1";
    readonly cells: readonly string[];
    readonly cover: readonly CechPatchCarrier[];
    readonly localSections: readonly LocalSectionCarrier[];
}
export interface H0Receipt {
    readonly kind: "settlingCohomologyH1.h0:witness";
    readonly valuation: readonly ChargedCell[];
    readonly cells: readonly string[];
    readonly designatedCells: readonly string[];
    readonly count: number;
    readonly truthContent: boolean;
    readonly h0IsDesignatedCount: true;
    readonly positiveIffTruthContent: true;
}
export interface GluingReceipt {
    readonly kind: "settlingCohomologyH1.gluing:witness";
    readonly datum: Cech1DatumCarrier;
    readonly glued: CochainCarrier;
    readonly cocycle: true;
    readonly coboundary: true;
    readonly separated: true;
    readonly uniqueGluingOnFiniteSupport: true;
}
export interface ClassifyingInvariantReceipt {
    readonly kind: "settlingCohomologyH1.classifyingInvariant:witness";
    readonly identityCochain: CochainCarrier;
    readonly classifyingInvariant: H1Class;
    readonly identityVanishesOffTruthMask: true;
    readonly clInvDatumCocycle: true;
    readonly clInvCoboundary: true;
    readonly classifyingInvariantZero: true;
    readonly zeroOnlyInStrictScottReceipt: true;
}
export interface SettlingCohomologyH1Receipt {
    readonly kind: "settlingCohomologyH1.receipt:witness";
    readonly h0: H0Receipt;
    readonly h1: GluingReceipt;
    readonly classifyingInvariant: ClassifyingInvariantReceipt;
    readonly ses: ShortExactSequenceReceipt;
    readonly bigradedLes: TruthKnowledgeSectionDecompositionReceipt;
    readonly strictScottRegimeGate: true;
    readonly hnAboveOneZero: true;
    readonly h1Vanishes: true;
    readonly transfiniteAperiodicBoundary: true;
    readonly frontier: readonly string[];
}
export declare function patch(name: string, cells: readonly string[]): CechPatchCarrier;
export declare function localSection(patchName: string, section: CochainCarrier): LocalSectionCarrier;
export declare function cech1(cellsInput: readonly string[], coverInput: readonly CechPatchCarrier[], localSectionsInput: readonly LocalSectionCarrier[]): Cech1DatumCarrier;
export declare function h0(valuationInput?: readonly ChargedCell[], cellsInput?: readonly string[]): H0Receipt;
export declare function cocycle(datum: Cech1DatumCarrier): boolean;
export declare function glue(datum: Cech1DatumCarrier): CochainCarrier;
export declare function coboundary(datum: Cech1DatumCarrier, global: CochainCarrier): boolean;
export declare function separated(datum: Cech1DatumCarrier, left: CochainCarrier, right: CochainCarrier): boolean;
export declare function gluingReceipt(datum?: Cech1DatumCarrier): GluingReceipt;
export declare function identityCochain(valuationInput?: readonly ChargedCell[], cellsInput?: readonly string[]): CochainCarrier;
export declare function clInvDatum(valuationInput?: readonly ChargedCell[], coverInput?: readonly CechPatchCarrier[]): Cech1DatumCarrier;
export declare function classifyingInvariantReceipt(valuationInput?: readonly ChargedCell[], coverInput?: readonly CechPatchCarrier[]): ClassifyingInvariantReceipt;
export declare function strictScottRegimeGate(): boolean;
export declare const defaultCells: readonly string[];
export declare const defaultCover: readonly CechPatchCarrier[];
export declare const defaultGlobalCochain: CochainCarrier;
export declare const defaultCechDatum: Cech1DatumCarrier;
export declare function receipt(): SettlingCohomologyH1Receipt;
