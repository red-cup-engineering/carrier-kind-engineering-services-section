import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const SOURCE_FILE = /\.(?:[cm]?js|[cm]?ts|jsx|tsx)$/u;
const IGNORED_DIRECTORIES = new Set([".git", "coverage", "dist", "node_modules"]);

const digest = (text) => createHash("sha256").update(text).digest("hex");
const portable = (root, path) => relative(root, path).replaceAll("\\", "/");

function sourceFiles(root, directory = root, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || IGNORED_DIRECTORIES.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) sourceFiles(root, path, files);
    else if (entry.isFile() && SOURCE_FILE.test(entry.name)) files.push(path);
  }
  return files.sort((left, right) => portable(root, left).localeCompare(portable(root, right)));
}

function normalizedSource(source) {
  return source.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).join("\n");
}

/**
 * Read an explicit package/codebase root into a deterministic cost and exact
 * redundancy projection. This observer never edits a source file; callers can
 * send an identified duplicate group to function-movement-service if a human
 * elects to prepare a bounded consolidation artifact.
 */
export function measureJsnodeCodebase(codebaseRoot) {
  if (typeof codebaseRoot !== "string" || !codebaseRoot) throw new TypeError("codebaseRoot must be an explicit path");
  const root = resolve(codebaseRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new TypeError("codebaseRoot must be an existing directory");
  const files = sourceFiles(root).map((path) => {
    const source = readFileSync(path, "utf8"), normalized = normalizedSource(source);
    return Object.freeze({
      path: portable(root, path),
      bytes: Buffer.byteLength(source),
      lines: source.split(/\r?\n/u).length,
      nonblankLines: normalized ? normalized.split("\n").length : 0,
      sourceDigest: `sha256:${digest(source)}`,
      normalizedDigest: `sha256:${digest(normalized)}`,
    });
  });
  const byNormalizedDigest = new Map();
  for (const file of files) byNormalizedDigest.set(file.normalizedDigest, [...(byNormalizedDigest.get(file.normalizedDigest) ?? []), file]);
  const duplicateGroups = [...byNormalizedDigest.values()]
    .filter((group) => group.length > 1)
    .map((group) => Object.freeze({
      normalizedDigest: group[0].normalizedDigest,
      files: Object.freeze(group.map(({ path }) => path)),
      retainedBytes: group[0].bytes,
      redundantBytes: group.slice(1).reduce((total, file) => total + file.bytes, 0),
    }))
    .sort((left, right) => left.files[0].localeCompare(right.files[0]));
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
  return Object.freeze({
    type: "JSNodeCodebaseMeasurement",
    version: 1,
    codebaseRoot: root,
    files: Object.freeze(files),
    duplicateGroups: Object.freeze(duplicateGroups),
    totals: Object.freeze({
      files: files.length,
      bytes: totalBytes,
      nonblankLines: files.reduce((total, file) => total + file.nonblankLines, 0),
      duplicateGroups: duplicateGroups.length,
      redundantBytes: duplicateGroups.reduce((total, group) => total + group.redundantBytes, 0),
    }),
    nextActuator: duplicateGroups.length === 0 ? null : "function-movement-service",
    writeAuthority: "receiver-only",
  });
}
