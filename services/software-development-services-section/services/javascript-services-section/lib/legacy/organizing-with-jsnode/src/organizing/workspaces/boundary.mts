/**
 * boundary — package boundary linting for JSNode workspace packages.
 *
 * Every workspace package ships its built `dist/` and keeps `src/` to itself:
 * `main`/`exports`/`bin` must resolve to `./dist/*.mjs`; `types` targets must
 * resolve to built native NodeNext declaration files (`*.d.mts`). Nothing may point at
 * `./src/` or a raw `.ts`/`.mts`; `src/` must hold no compiled `.ts`; `dist/`
 * must actually contain built `.mjs` and declarations. That boundary is the
 * contract that lets a consumer import a package without a TypeScript toolchain.
 *
 * This was a loose, repo-local script under `scripts/package-boundary/`. It now
 * lives here as a tested package/workspace operation: the core
 * {@link packageBoundaryFailures} is a *pure* function of already-read values
 * (manifest + the src/dist file lists), and {@link lintPackageBoundary} is the
 * thin filesystem wrapper around it.
 *
 * Only node builtins are imported, so loading this module pulls in no workspace
 * dependency.
 */
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { sourceModuleFiles } from "../modules/source.mjs";
import { detectPackageKind, type PackageKind } from "../packages/kind.mjs";
import { readJSNodePackageManifest } from "./workspace.mjs";

/** The already-read inputs the boundary contract is a pure function of. This
 *  is a boundary projection shape: package identity and manifest facts enter
 *  the core through `JSNodePackage` Mark/Utterance carriers, while this record
 *  only carries the file-list evidence needed to judge the dist/src boundary. */
export interface PackageBoundaryInput {
  /** The parsed package.json. */
  readonly manifest: Record<string, unknown>;
  /** Paths (any form) of every file under `src/`. */
  readonly srcFiles: readonly string[];
  /** Paths (any form) of every file under `dist/`. */
  readonly distFiles: readonly string[];
}

/** Flatten an `exports` value (string | conditions object, nested) to its
 *  string targets. */
function exportTargets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return Object.values(value).flatMap(exportTargets);
}

function isDeclarationTarget(target: string): boolean {
  return target.endsWith(".d.mts");
}

function isRawTypeScriptTarget(target: string): boolean {
  return (
    (target.endsWith(".ts") && !target.endsWith(".d.ts")) ||
    (target.endsWith(".mts") && !target.endsWith(".d.mts"))
  );
}

/** The boundary failures of a package, as a pure function of its manifest and
 *  file lists. Empty array ⇔ the package honours the boundary. */
export function packageBoundaryFailures(input: PackageBoundaryInput): string[] {
  const { manifest, srcFiles, distFiles } = input;
  const failures: string[] = [];
  const exports = (manifest["exports"] ?? {}) as Record<string, unknown>;

  for (const [field, expected] of [
    ["main", { prefix: "./dist/", suffix: ".mjs", declaration: false }],
    ["types", { prefix: "./dist/", suffix: ".d.mts", declaration: true }],
  ] as const) {
    const target = manifest[field];
    if (target === undefined) continue;
    if (typeof target !== "string") {
      failures.push(`${field} must be a string when present`);
      continue;
    }
    if (target.startsWith("./src/")) failures.push(`${field} points to source target ${target}`);
    if (isRawTypeScriptTarget(target)) {
      failures.push(`${field} points to TypeScript target ${target}`);
    }
    if (
      !target.startsWith(expected.prefix) ||
      (expected.declaration ? !isDeclarationTarget(target) : !target.endsWith(expected.suffix))
    ) {
      failures.push(`${field} points to ${target}, expected ${expected.prefix}*${expected.suffix}`);
    }
  }

  for (const [key, value] of Object.entries(exports)) {
    if (key === "./package.json" || key.startsWith("./schema/")) continue;
    for (const target of exportTargets(value)) {
      if (target.startsWith("./src/")) failures.push(`${key} exports source target ${target}`);
      if (isRawTypeScriptTarget(target)) {
        failures.push(`${key} exports TypeScript target ${target}`);
      }
    }
  }

  const tsFiles = srcFiles.filter((file) => file.endsWith(".ts"));
  if (tsFiles.length > 0) failures.push(`src contains .ts files: ${tsFiles.join(", ")}`);

  if (!distFiles.some((file) => file.endsWith(".mjs"))) failures.push("dist contains no .mjs files");
  if (!distFiles.some(isDeclarationTarget)) failures.push("dist contains no declaration files");

  const bin = manifest["bin"];
  if (bin !== undefined && bin !== null && typeof bin === "object") {
    for (const [name, target] of Object.entries(bin as Record<string, unknown>)) {
      if (typeof target !== "string" || !target.startsWith("./dist/") || !target.endsWith(".mjs")) {
        failures.push(`bin ${name} points to ${String(target)}, expected ./dist/*.mjs`);
      }
    }
  }

  return failures;
}

/** The result of linting one package directory. This is a projection report:
 *  its failures are conformance findings over a package whose manifest facts
 *  normalize through `JSNodePackage` utterances, not an independent package
 *  data model. */
export interface PackageBoundaryResult {
  readonly name: string;
  readonly packageKind: PackageKind;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly failures: readonly string[];
}

async function listFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

/** Read a package directory and lint its dist/src boundary. Throws when no
 *  package.json is present (the caller named a non-package). */
export async function lintPackageBoundary(packageDir: string): Promise<PackageBoundaryResult> {
  const dir = path.resolve(packageDir);
  const srcDir = path.join(dir, "src");
  const distDir = path.join(dir, "dist");
  const manifestPath = path.join(dir, "package.json");
  if (!existsSync(manifestPath)) throw new Error(`No package.json found at ${manifestPath}`);
  const manifest = readJSNodePackageManifest(dir);
  if (manifest === undefined) throw new Error(`No package.json found at ${manifestPath}`);
  const name = typeof manifest["name"] === "string" ? (manifest["name"] as string) : dir;
  const packageKind = detectPackageKind(dir, manifest);
  if (packageKind !== "jsnode") {
    return { name, packageKind, ok: true, skipped: true, failures: [] };
  }
  const [srcFiles, distFiles] = await Promise.all([
    Promise.resolve(existsSync(srcDir) ? sourceModuleFiles(srcDir, { includeTests: true }).map((f) => path.relative(dir, f)) : []),
    listFiles(distDir).then((fs) => fs.map((f) => path.relative(dir, f))),
  ]);
  const failures = packageBoundaryFailures({ manifest, srcFiles, distFiles });
  return { name, packageKind, ok: failures.length === 0, skipped: false, failures };
}
