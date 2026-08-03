import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import path from "node:path";

const ARCHIVE_NAMES = new Set(["archive", "_archive"]);
const executeFile = promisify(execFile);

async function isDirectory(location) {
  try {
    return (await stat(location)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Inventory real directories named exactly `archive` or `_archive` below an
 * explicit root. Symlinks are deliberately not followed, so the inventory is
 * bounded by that root and does not report an alias as a second archive.
 *
 * `/usr/bin/find` is the standard filesystem walker on this machine.  It is
 * used instead of opening every Git object directory serially: the latter
 * made an exhaustive scan of a large checkout impractically slow.  No path
 * family is pruned; Git metadata is returned and explicitly classified.
 */
export async function discoverArchives(root) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("root must be a non-empty path string");
  }

  const resolvedRoot = path.resolve(root);
  if (!(await isDirectory(resolvedRoot))) {
    throw new Error(`root is not a readable directory: ${resolvedRoot}`);
  }

  const { stdout } = await executeFile("/usr/bin/find", [
    resolvedRoot, "-type", "d", "(", "-name", "archive", "-o", "-name", "_archive", ")", "-print0"
  ], { encoding: "buffer", maxBuffer: 16 * 1024 * 1024 });
  const rawArchives = stdout.toString("utf8").split("\0").flatMap((location) => {
    if (location === "") return [];
    const relativePath = path.relative(resolvedRoot, location) || ".";
    const segments = relativePath.split(path.sep);
    const name = path.basename(location);
    return [Object.freeze({
      path: relativePath.split(path.sep).join("/"),
      name,
      classification: path.basename(resolvedRoot) === ".git" || segments.includes(".git") ? "git-metadata" : "working-tree"
    })];
  }).sort((left, right) => left.path.localeCompare(right.path));
  const paths = new Set(rawArchives.map((archive) => archive.path));
  const archives = rawArchives.map((archive) => {
    const segments = archive.path.split("/");
    let parent = "";
    let nestedUnder = null;
    for (const segment of segments.slice(0, -1)) {
      parent = parent === "" ? segment : `${parent}/${segment}`;
      if (paths.has(parent)) nestedUnder = parent;
    }
    return Object.freeze({ ...archive, nestedUnder });
  });
  return Object.freeze({
    kind: "archive-discovery/v1",
    root: resolvedRoot,
    archives: Object.freeze(archives)
  });
}

export function archiveDiscoveryNdjson(report) {
  const root = { kind: "archive-discovery-root/v1", root: report.root };
  const entries = report.archives.map((archive) => ({
    kind: "archive-discovery-entry/v1",
    root: report.root,
    ...archive
  }));
  return [...entries, root].map((row) => JSON.stringify(row)).join("\n") + "\n";
}
