/**
 * @packageDocumentation
 *
 * fs-effects - the small Node filesystem effect boundary this package's
 * workspace readers need: existence/stat checks, directory listing, and
 * UTF-8 reads. Pure Lean/Blueprint/Verso/TeX reading laws live beside their
 * schemas; this module owns only the host filesystem calls those readers
 * make while walking a project directory.
 */
import { existsSync, readdirSync, readFileSync, statSync, type Dirent, type Stats } from "node:fs";
import path from "node:path";

/** True when a host filesystem path exists. */
export function pathExists(filePath: string): boolean {
  return existsSync(filePath);
}

/** Read host directory entries as Dirent records. */
export function readDirectoryEntries(dirPath: string): readonly Dirent[] {
  return Object.freeze(readdirSync(dirPath, { withFileTypes: true }));
}

/** Read host filesystem stat information, returning null when unavailable. */
export function statPathOrNull(filePath: string): Stats | null {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

/** Read UTF-8 file content at a host filesystem boundary. */
export function readFileUtf8(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

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
export function walkFiles(start: string, options: WalkFilesOptions = {}): readonly string[] {
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
  const files: string[] = [];
  const visit = (dir: string, depth: number): void => {
    if (depth > maxDepth) return;
    let entries: readonly Dirent[];
    try {
      entries = readDirectoryEntries(dir);
    } catch {
      return;
    }
    for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (options.pruneDirectory?.(entry.name, full) === true) continue;
        visit(full, depth + 1);
      } else if (entry.isFile() && (options.includeFile?.(entry.name, full) ?? true)) {
        files.push(full);
      }
    }
  };
  visit(start, 0);
  return Object.freeze(files);
}
