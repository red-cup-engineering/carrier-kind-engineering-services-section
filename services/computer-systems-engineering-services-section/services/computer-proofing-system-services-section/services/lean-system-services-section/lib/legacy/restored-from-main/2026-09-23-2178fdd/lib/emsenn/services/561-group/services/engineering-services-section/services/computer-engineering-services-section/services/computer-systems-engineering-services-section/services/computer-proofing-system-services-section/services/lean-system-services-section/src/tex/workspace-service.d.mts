import { type TexWorkspaceRead } from "./schema.mjs";
import type { LeanDeclarationCatalog } from "../view.mjs";
export type { TexWorkspaceRead, TexWorkspaceReadRequest, TexWorkspaceSource, TexWorkspaceToolObservation, TexWorkspaceToolObservationRequest, } from "./schema.mjs";
export interface TexWorkspaceReadOptions {
    readonly maxDepth?: number;
    readonly ignore?: readonly string[];
    readonly texRoots?: readonly string[];
    readonly blueprintRoots?: readonly string[];
    readonly versoRoots?: readonly string[];
    readonly leanDeclarations?: LeanDeclarationCatalog;
}
/** Read a live TeX/Blueprint/Verso authoring tree into one admitted TeX workspace read. */
export declare function readTexWorkspace(root: string, options?: TexWorkspaceReadOptions): TexWorkspaceRead;
