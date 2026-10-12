/**
 * @packageDocumentation
 *
 * fs-effects - the small Node filesystem effect boundary this package's
 * workspace readers need: existence/stat checks, directory listing, and
 * UTF-8 reads. Pure Lean/Blueprint/Verso/TeX reading laws live beside their
 * schemas; this module owns only the host filesystem calls those readers
 * make while walking a project directory.
 */
import { type Dirent, type Stats } from "node:fs";
/** True when a host filesystem path exists. */
export declare function pathExists(filePath: string): boolean;
/** Read host directory entries as Dirent records. */
export declare function readDirectoryEntries(dirPath: string): readonly Dirent[];
/** Read host filesystem stat information, returning null when unavailable. */
export declare function statPathOrNull(filePath: string): Stats | null;
/** Read UTF-8 file content at a host filesystem boundary. */
export declare function readFileUtf8(filePath: string): string;
export interface WalkFilesOptions {
    /** Directory levels below `start` still read; unbounded by default. */
    readonly maxDepth?: number;
    /** Return true to prune a directory (it is not descended into). */
    readonly pruneDirectory?: (name: string, fullPath: string) => boolean;
    /** File admission predicate; every file by default. */
    readonly includeFile?: (name: string, fullPath: string) => boolean;
}
/**
 * Walk a directory tree depth-first in sorted-name order and return the
 * admitted file paths. Unreadable directories degrade to silence (host
 * boundary); pruning and admission are the caller's filters.
 */
export declare function walkFiles(start: string, options?: WalkFilesOptions): readonly string[];
