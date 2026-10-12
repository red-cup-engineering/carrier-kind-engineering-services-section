import type { LeanLakefile } from "../codec/lakefile.mjs";
import type { LeanWorkspaceReadOptionsMaterial } from "../schema.mjs";
export type { LeanWorkspaceReadOptionsMaterial } from "../schema.mjs";
export interface LeanWorkspaceReadOptions {
    readonly rootModule?: string;
    readonly maxDepth?: number;
    readonly ignore?: readonly string[];
    readonly moduleRoots?: readonly string[];
    readonly declarationIndexPaths?: readonly string[];
    readonly referenceRoots?: readonly string[];
    readonly referenceExtensions?: readonly string[];
    readonly includeTexWorkspaceFibers?: boolean;
    readonly texRoots?: readonly string[];
    readonly blueprintRoots?: readonly string[];
    readonly versoRoots?: readonly string[];
}
export declare function leanWorkspaceRootModuleFromLakefile(lakefile: LeanLakefile | undefined, fallback: string): string;
export declare function leanWorkspaceModuleNameFromPath(root: string, file: string, moduleRoots: readonly string[]): string;
export declare function leanWorkspaceDefaultModuleRoots(): readonly string[];
export declare const leanWorkspaceIgnoredDirectories: any;
export declare const leanWorkspaceDefaultDeclarationIndexPaths: any;
export declare const leanWorkspaceDefaultReferenceRoots: any;
export declare const leanWorkspaceDefaultReferenceExtensions: any;
export declare function leanWorkspaceLakeLibraryRoots(lakefile: LeanLakefile | undefined): readonly string[];
export declare function leanWorkspaceScanRootCandidates(root: string, lakefile: LeanLakefile | undefined): readonly string[];
export declare function leanWorkspaceShouldSkipDirectory(name: string, ignore?: ReadonlySet<string>): boolean;
export declare function leanWorkspaceShouldSkipSource(root: string, target: string): boolean;
/** Project an admitted Lean-workspace read-options material to the read options used by the reader. */
export declare function leanWorkspaceReadOptionsFromMaterial(material: LeanWorkspaceReadOptionsMaterial): LeanWorkspaceReadOptions;
