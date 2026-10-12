import { type LeanCapabilityAuthorityReport, type LeanCapabilityClaim, type LeanCapabilityClaimIndex, type LeanCapabilitySurface, type LeanDeclarationCatalog, type LeanDeclarationIndex, type LeanEnvironment, type LeanFormalizationClaim, type LeanFormalizationReport, type LeanImportGraph, type LeanModule, type LeanObligationCoverage, type LeanTheoremReferenceCoverage, type LeanTheoremReferenceIndex, type LeanTheoremSpine } from "./schema.mjs";
export type { LeanCapabilityAuthorityReport, LeanCapabilityClaim, LeanCapabilityClaimIndex, LeanCapabilitySurface, LeanDeclarationCatalog, LeanDeclarationIndex, LeanEnvironment, LeanFormalizationClaim, LeanFormalizationReport, LeanImportGraph, LeanModule, LeanObligationCoverage, LeanTheoremReferenceCoverage, LeanTheoremReferenceIndex, LeanTheoremSpine, } from "./schema.mjs";
type LeanCapabilityReference = LeanCapabilityClaim["governs"][number];
export type LeanCapabilitySurfaceAction = Readonly<{
    verb: string;
    domain?: Readonly<{
        id: string;
    }>;
    codomain?: Readonly<{
        id: string;
    }>;
}>;
export type LeanCapabilitySurfaceSchemaLike = Readonly<{
    id: string;
}>;
export type LeanCapabilitySurfacePackageSurface = Readonly<{
    exports?: Readonly<{
        entries: readonly Readonly<{
            specifier: string;
        }>[];
    }>;
    commitments?: readonly Readonly<{
        face: string;
        name: string;
    }>[];
}>;
export type LeanTextClaimObservationOptions = Readonly<{
    knownTheorems?: readonly string[];
    knownDeclarations?: readonly string[];
}>;
export declare function leanImportGraph(input: LeanEnvironment | readonly LeanModule[]): LeanImportGraph;
export declare function leanDeclarationCatalog(input: LeanEnvironment | readonly LeanModule[]): LeanDeclarationCatalog;
/** A Lean import DAG is a finite causal set (an import edge is "imported
 *  precedes importer"), so module tiering is the causal HEIGHT STRATIFICATION,
 *  read by the carried kinematics rather than a hand Kahn walk. An import
 *  cycle surfaces as the closed-timelike-curve obstruction instead of its
 *  members silently vanishing from every tier. */
export declare function topologicalSortLeanModules(input: LeanImportGraph | LeanEnvironment | readonly LeanModule[]): readonly (readonly string[])[];
export declare function leanTheoremSpine(input: LeanEnvironment | readonly LeanModule[], names?: readonly string[]): LeanTheoremSpine;
export declare function leanObligationCoverage(spine: LeanTheoremSpine, declarationIndex: LeanDeclarationIndex | Readonly<{
    declarations: readonly string[];
}>): LeanObligationCoverage;
export declare function leanFormalizationClaim(input: Readonly<{
    theorem: string;
    source?: string;
    theoremMaturity?: string;
    environmentMaturity?: string;
    obligations?: readonly string[];
}>): LeanFormalizationClaim;
export declare function leanFormalizationClaimFromCertificate(certificate: unknown, source?: string): LeanFormalizationClaim;
export declare function leanFormalizationReport(claim: LeanFormalizationClaim, input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[]): LeanFormalizationReport;
export declare function leanCapabilitySurface(input: Readonly<{
    actions?: readonly string[];
    schemas?: readonly string[];
    exports?: readonly string[];
}>): LeanCapabilitySurface;
export declare function leanCapabilitySurfaceFromOperations(actions: readonly LeanCapabilitySurfaceAction[], extra?: Readonly<{
    schemas?: readonly string[];
    exports?: readonly string[];
}>): LeanCapabilitySurface;
export declare function leanCapabilitySurfaceFromPackageSurface(input: Readonly<{
    actions?: readonly LeanCapabilitySurfaceAction[];
    schemas?: readonly LeanCapabilitySurfaceSchemaLike[];
    packageSurface?: LeanCapabilitySurfacePackageSurface;
    exports?: readonly string[];
}>): LeanCapabilitySurface;
export declare function leanCapabilityClaim(input: Readonly<{
    theorem: string;
    source?: string;
    governs: readonly LeanCapabilityReference[];
}>): LeanCapabilityClaim;
export declare function leanCapabilityClaimsFromText(text: string, source?: string, options?: LeanTextClaimObservationOptions): LeanCapabilityClaimIndex;
export declare function mergeLeanCapabilityClaimIndexes(indexes: readonly LeanCapabilityClaimIndex[], source?: string): LeanCapabilityClaimIndex;
export declare function leanCapabilityAuthorityReport(claims: readonly LeanCapabilityClaim[], surface: LeanCapabilitySurface, input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[]): LeanCapabilityAuthorityReport;
export declare function leanTheoremReferencesFromText(text: string, source?: string, options?: LeanTextClaimObservationOptions): LeanTheoremReferenceIndex;
export declare function mergeLeanTheoremReferenceIndexes(indexes: readonly LeanTheoremReferenceIndex[], source?: string): LeanTheoremReferenceIndex;
export declare function leanTheoremReferenceCoverage(index: LeanTheoremReferenceIndex, input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[]): LeanTheoremReferenceCoverage;
export declare function isLeanEnvironment(input: LeanEnvironment | readonly LeanModule[]): input is LeanEnvironment;
export declare function isLeanImportGraph(input: LeanImportGraph | LeanEnvironment | readonly LeanModule[]): input is LeanImportGraph;
export declare function isLeanTheoremSpine(input: LeanEnvironment | LeanTheoremSpine | readonly LeanModule[]): input is LeanTheoremSpine;
