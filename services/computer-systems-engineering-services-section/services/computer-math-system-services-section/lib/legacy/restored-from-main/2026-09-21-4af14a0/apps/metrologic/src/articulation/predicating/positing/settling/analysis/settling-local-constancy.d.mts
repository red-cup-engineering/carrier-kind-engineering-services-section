import { type BitopologicalSettlingSiteReceipt } from "./bitopological-settling-site.mjs";
import { type KZCoherenceReceipt, type OneCellCarrier, type SheafCarrier } from "./kz-coherent-sheaf.mjs";
export interface SectionIsoReceipt {
    readonly kind: "settlingLocalConstancy.sectionIso:witness";
    readonly left: string;
    readonly right: string;
    readonly equal: true;
    readonly reflexive: true;
    readonly symmetric: true;
    readonly transitiveOnSample: true;
}
export interface PredicateLocalConstancyReceipt {
    readonly kind: "settlingLocalConstancy.predicate:witness";
    readonly sheaf: SheafCarrier;
    readonly coherence: KZCoherenceReceipt;
    readonly identityPinned: true;
    readonly predicateUniform: true;
    readonly predicateLocallyConstantIffUniform: true;
}
export interface SettlingLocalConstancyReceipt {
    readonly kind: "settlingLocalConstancy.settling:witness";
    readonly sheaf: SheafCarrier;
    readonly samePredicateLegPairs: readonly (readonly [OneCellCarrier, OneCellCarrier])[];
    readonly sectionMapsEqual: true;
    readonly everySheafSettlingLocallyConstantStrict: true;
    readonly temporalLegProofIrrelevant: true;
}
export interface ConstantSheafLocalConstancyReceipt {
    readonly kind: "settlingLocalConstancy.constantSheaf:witness";
    readonly sheaf: SheafCarrier;
    readonly value: string;
    readonly predicateLocallyConstant: PredicateLocalConstancyReceipt;
    readonly settlingLocallyConstant: SettlingLocalConstancyReceipt;
    readonly restrictionsAreIdentityIsomorphisms: true;
}
export interface VanishingRegimeLocalConstancyReceipt {
    readonly kind: "settlingLocalConstancy.vanishingRegime:witness";
    readonly h1VanishesInStrict: true;
    readonly h1VanishesInScott: true;
    readonly h1VanishesInTransfinite: false;
    readonly h1VanishesInAperiodic: false;
    readonly vanishingRegimeIsStrictOrScott: true;
    readonly h1VanishingUnconditionalInStrictModel: true;
    readonly aperiodicDichotomyFrontier: "aperiodic non-local-constancy is not witnessed by the Nat-indexed strict runtime model";
}
export interface SettlingLocalConstancyModuleReceipt {
    readonly kind: "settlingLocalConstancy.receipt:witness";
    readonly site: BitopologicalSettlingSiteReceipt;
    readonly predicate: PredicateLocalConstancyReceipt;
    readonly settling: SettlingLocalConstancyReceipt;
    readonly constantSheaf: ConstantSheafLocalConstancyReceipt;
    readonly regime: VanishingRegimeLocalConstancyReceipt;
    readonly frontier: readonly string[];
}
export declare function sectionIso(left: string, right: string): SectionIsoReceipt;
export declare function predicateLocalConstancyReceipt(carrier?: SheafCarrier): PredicateLocalConstancyReceipt;
export declare function settlingLocalConstancyReceipt(carrier?: SheafCarrier): SettlingLocalConstancyReceipt;
export declare function constantSheaf(value?: string): SheafCarrier;
export declare function constantSheafLocalConstancyReceipt(value?: string): ConstantSheafLocalConstancyReceipt;
export declare function vanishingRegimeLocalConstancyReceipt(): VanishingRegimeLocalConstancyReceipt;
export declare function receipt(carrier?: SheafCarrier): SettlingLocalConstancyModuleReceipt;
