import { readdir, readFile, stat } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";

const DEFAULT_EXCLUDED_DIRECTORIES = Object.freeze(new Set([
  ".git", "cache", "node_modules", "out",
]));

function requireFunction(value, coordinate) {
  if (typeof value !== "function") throw new TypeError(`${coordinate} must be a function`);
  return value;
}

async function visit(candidate, root, options, relations) {
  const details = await stat(candidate);
  const relativePath = relative(root, candidate) || basename(candidate);
  if (details.isDirectory()) {
    if (candidate !== root && options.excludedDirectories.has(basename(candidate))) return;
    const entries = await readdir(candidate, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      await visit(resolve(candidate, entry.name), root, options, relations);
    }
    return;
  }
  if (!details.isFile() || !options.include({ path: candidate, relativePath })) return;
  const source = await readFile(candidate, "utf8");
  if (source.includes("\0")) return;
  const found = await options.relationFunction({ path: candidate, relativePath, source });
  if (found === undefined || found === null) return;
  const values = Array.isArray(found) ? found : [found];
  for (const relation of values) {
    if (relation === undefined || relation === null) continue;
    relations.push(Object.freeze({ path: relativePath, ...relation }));
  }
}

/** Search one bounded path while delegating all relation semantics to the caller. */
export async function searchPathForRelations({
  path,
  relationFunction,
  include = () => true,
  excludedDirectories = DEFAULT_EXCLUDED_DIRECTORIES,
}) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be nonempty text");
  requireFunction(relationFunction, "relationFunction");
  requireFunction(include, "include");
  if (!(excludedDirectories instanceof Set)) throw new TypeError("excludedDirectories must be a Set");
  const root = resolve(path);
  const relations = [];
  await visit(root, root, { relationFunction, include, excludedDirectories }, relations);
  return Object.freeze({
    type: "PathRelationSearch",
    root,
    relations: Object.freeze(relations),
  });
}
