/**
 * copy-dist-assets - mirror non-TypeScript source assets into dist.
 *
 * `tsc` emits .mjs/.d.mts and maps. Any plain source assets still present under
 * emitted package compartments are copied to the same relative path under
 * `dist`. SchemaContract schemas are not copied files; OpenAPI and MCP serialize them
 * from schema declarations.
 */
import { existsSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(scriptDir, "..");
const sourceRoots = ["lib", "src", "sites", "services", "apps"]
  .map((name) => join(pkgDir, name))
  .filter((root) => existsSync(root));
const distDir = join(pkgDir, "dist");

function* assetFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* assetFiles(full);
    else if (
      !entry.name.endsWith(".mts")
      && !entry.name.endsWith(".mjs")
      && !entry.name.endsWith(".mjs.map")
      && !entry.name.endsWith(".d.mts")
      && !entry.name.endsWith(".d.mts.map")
    ) yield full;
  }
}

let copied = 0;
for (const root of sourceRoots) {
  for (const file of assetFiles(root)) {
    // Mirror under dist preserving the package-compartment prefix (matches tsc rootDir ".").
    const dest = join(distDir, relative(pkgDir, file));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    copied += 1;
  }
}
process.stderr.write(`copy-dist-assets: ${copied} asset(s) -> dist/\n`);
