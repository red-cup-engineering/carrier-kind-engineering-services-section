import { type LeanLakefile } from "../codec/lakefile.mjs";
import { type LeanCapabilityClaimIndex, type LeanDeclarationCatalog, type LeanDeclarationIndex, type LeanEnvironment, type LeanImportGraph, type LeanObligationCoverage, type LeanTheoremSpine, type LeanTheoremReferenceCoverage, type LeanTheoremReferenceIndex } from "../view.mjs";
import { type TexWorkspaceRead } from "../tex/workspace-service.mjs";
import { type LeanWorkspaceReadOptions } from "./index.mjs";
import type { LeanWorkspaceModuleSource } from "../schema.mjs";
export type { LeanWorkspaceReadOptions } from "./index.mjs";
export type { LeanWorkspaceModuleSource } from "../schema.mjs";
export interface LeanWorkspaceCore {
    readonly root: string;
    readonly rootModule: string;
    readonly moduleSources: readonly LeanWorkspaceModuleSource[];
    readonly conformanceSources: readonly LeanWorkspaceModuleSource[];
    readonly modules: LeanEnvironment["modules"];
    readonly conformanceModules: LeanEnvironment["modules"];
    readonly toolchain?: LeanEnvironment["toolchain"];
    readonly lakefile?: LeanLakefile;
    readonly declarationIndex?: LeanDeclarationIndex;
    readonly environment: LeanEnvironment;
    readonly declarationCatalog: LeanDeclarationCatalog;
    readonly importGraph: LeanImportGraph;
    readonly theoremSpine: LeanTheoremSpine;
    readonly obligationCoverage?: LeanObligationCoverage;
    readonly theoremReferences?: LeanTheoremReferenceIndex;
    readonly theoremReferenceCoverage?: LeanTheoremReferenceCoverage;
    readonly capabilityClaims?: LeanCapabilityClaimIndex;
    readonly texWorkspaceRead?: TexWorkspaceRead;
}
/** Scan a Lean project directory into module sources. Exported so a consuming
 *  application's own workspace reads (e.g. a bounded topic read) can reuse
 *  the same scan-root and skip-directory laws without re-deriving them. */
export declare function collectLeanSources(root: string, lakefile: LeanLakefile | undefined, options: LeanWorkspaceReadOptions): readonly LeanWorkspaceModuleSource[];
/** Scan reference source files (Node, Markdown, TeX, Lean) under a project's
 *  documentation/source roots for theorem-name mentions. Exported for the
 *  same reuse reason as `collectLeanSources`. */
export declare function sourceReferenceFiles(root: string, options: LeanWorkspaceReadOptions): readonly string[];
/**
 * Read a live Lean project directory into its admitted core: environment,
 * declaration catalog, import graph, theorem spine, obligation/reference
 * coverage, source-text capability claims, and an optional TeX/Blueprint/Verso
 * workspace fiber. This is the whole portable Lean-workspace read; a
 * consuming application layers its own package-capability-surface,
 * session-record, and content-addressing concerns on top of the value this
 * returns.
 */
export declare function readLeanWorkspaceCore(root: string, options?: LeanWorkspaceReadOptions): LeanWorkspaceCore;
