/**
 * @packageDocumentation
 *
 * fs-effects - the small Node filesystem effect boundary this package's
 * workspace readers need: existence/stat checks, directory listing, and
 * UTF-8 reads. Pure Lean/Blueprint/Verso/TeX reading laws live beside their
 * schemas; this module owns only the host filesystem calls those readers
 * make while walking a project directory.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { walkPosixPathsSync } from "@red-cup-engineering/filepath-services-section/walk-posix-paths";
/** True when a host filesystem path exists. */
export function pathExists(filePath) {
    return existsSync(filePath);
}
/** Read host directory entries as Dirent records. */
export function readDirectoryEntries(dirPath) {
    return Object.freeze(readdirSync(dirPath, { withFileTypes: true }));
}
/** Read host filesystem stat information, returning null when unavailable. */
export function statPathOrNull(filePath) {
    try {
        return statSync(filePath);
    }
    catch {
        return null;
    }
}
/** Read UTF-8 file content at a host filesystem boundary. */
export function readFileUtf8(filePath) {
    return readFileSync(filePath, "utf8");
}
/**
 * Walk a directory tree depth-first in sorted-name order and return the
 * admitted file paths. Unreadable directories degrade to silence (host
 * boundary); pruning and admission are the caller's filters.
 */
export function walkFiles(start, options = {}) {
    const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
    const files = walkPosixPathsSync({
        root: start,
        paths: "absolute",
        result: "paths",
        missing: "empty",
        unreadable: "skip",
        ...(maxDepth === Number.POSITIVE_INFINITY ? {} : { maxDepth }),
    }).files;
    return Object.freeze(files.filter((full) => {
        const segments = path.relative(start, full).split(path.sep);
        let ancestor = start;
        for (let index = 0; index < segments.length - 1; index += 1) {
            ancestor = path.join(ancestor, segments[index]);
            if (options.pruneDirectory?.(segments[index], ancestor) === true)
                return false;
        }
        const name = segments[segments.length - 1];
        return options.includeFile?.(name, full) ?? true;
    }));
}
