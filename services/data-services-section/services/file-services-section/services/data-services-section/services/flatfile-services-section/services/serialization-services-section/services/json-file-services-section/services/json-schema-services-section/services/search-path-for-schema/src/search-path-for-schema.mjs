import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createSchema, unfoldSchema } from "../../../dist/index.mjs";

const EXCLUDED = Object.freeze(new Set([".git", "node_modules", "dist", "data", "out", "cache"]));

async function candidatePaths(root) {
  const details = await stat(root);
  if (details.isFile()) return [root];
  if (!details.isDirectory()) throw new TypeError("path must name a file or directory");
  const found = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!EXCLUDED.has(entry.name)) await walk(path);
      } else if (entry.isFile() && entry.name.endsWith(".schema.json")) found.push(path);
    }
  }
  await walk(root);
  return found;
}

export async function searchPathForSchema(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be nonempty text");
  const requested = resolve(path);
  const root = await realpath(requested);
  if ((await lstat(requested)).isSymbolicLink() || root !== requested) throw new TypeError("path must be canonical and must not be a symbolic link");
  const schemas = [], refusals = [];
  for (const candidate of await candidatePaths(root)) {
    try {
      const parsed = JSON.parse(await readFile(candidate, "utf8"));
      const receipt = createSchema(parsed, undefined, { allowUnknownAnnotations: true });
      schemas.push(Object.freeze({
        path: candidate,
        schema: receipt.schema.$id,
        identity: receipt.identity,
        assertions: unfoldSchema(receipt.schema, { base: receipt.schema.$id, t: receipt.identity.ni }),
      }));
    } catch (error) {
      refusals.push(Object.freeze({ path: candidate, reason: error.message }));
    }
  }
  return Object.freeze({ type: "PathSchemaSearch", root, searched: schemas.length + refusals.length, schemas: Object.freeze(schemas), refusals: Object.freeze(refusals) });
}
