import { lstat } from "node:fs/promises";
import path from "node:path";
import { discoverArchives } from "./discover-archives.mjs";

/**
 * Attach each archive discovery to the nearest enclosing Git worktree and say
 * whether it already lives below that worktree's exact `lib/legacy` root.
 * This deliberately reports ownership facts only; destination selection is a
 * human or caller-supplied policy decision.
 */
export async function mapArchiveWorktrees(root) {
  const report = await discoverArchives(root);
  const entries = await Promise.all(report.archives.map(async (archive) => {
    if (archive.classification === "git-metadata") return Object.freeze({ ...archive, worktree: null, legacyState: "git-metadata" });
    const location = path.resolve(report.root, archive.path);
    const worktree = await nearestWorktree(location, report.root);
    if (worktree === null) return Object.freeze({ ...archive, worktree: null, legacyState: "no-worktree" });
    const legacyRoot = path.join(worktree, "lib", "legacy");
    const toLegacy = path.relative(legacyRoot, location);
    return Object.freeze({
      ...archive,
      worktree,
      legacyState: toLegacy === "" || (!toLegacy.startsWith(`..${path.sep}`) && toLegacy !== "..") ? "inside-legacy" : "outside-legacy"
    });
  }));
  return Object.freeze({ kind: "archive-worktree-map/v1", root: report.root, archives: Object.freeze(entries) });
}

async function nearestWorktree(location, scanRoot) {
  let candidate = location;
  for (;;) {
    if (await isGitMarker(path.join(candidate, ".git"))) return candidate;
    if (candidate === scanRoot) return null;
    const parent = path.dirname(candidate);
    if (parent === candidate) return null;
    candidate = parent;
  }
}

async function isGitMarker(location) {
  try {
    const value = await lstat(location);
    return value.isFile() || value.isDirectory();
  } catch {
    return false;
  }
}

export function archiveWorktreeMapNdjson(report) {
  const entries = report.archives.map((archive) => ({ kind: "archive-worktree-map-entry/v1", root: report.root, ...archive }));
  return [...entries, { kind: "archive-worktree-map-root/v1", root: report.root }].map((row) => JSON.stringify(row)).join("\n") + "\n";
}
