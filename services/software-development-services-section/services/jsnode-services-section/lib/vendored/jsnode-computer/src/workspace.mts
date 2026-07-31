/**
 * workspace — filesystem reading into node-topology carriers.
 *
 * `eachWorkspacePackageDir` is the *single* walk of the repo strata (lib, apps,
 * services, sites, ops): it yields every directory holding a readable
 * package.json as (name, dir, manifest), minus the configured exclusions. Every
 * other discovery path is built on it — `discoverWorkspace` here,
 * `discoverPackageDirs` and the consumption index, the type index, the CLI's
 * package resolver — so the strata are walked by exactly one piece of code and
 * an exclusion is honoured everywhere at once.
 *
 * `readJSNodePackage` reads a single package.json into a JSNodePackage carrier.
 * `discoverWorkspace` collects every discovered package into a JSNodeWorkspace.
 *
 * Layer is derived from directory position, not from package.json content.
 * The internal dependency *graph* reads runtime deps only; the carrier also
 * keeps every declared dependency (dev/peer/optional) with its version range,
 * plus the plain manifest facts (license, engines, scripts, module type,
 * repository) the normie tools read.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import {
  JSNODE_LAYERS,
  jsNodePackage,
  jsNodeWorkspace,
  type JSNodeLayer,
  type JSNodePackage,
  type JSNodeWorkspace,
  type TypeCatalog,
  type PackageDependency,
  type DependencyKind,
} from "@emsenn/jsnode/topology";
import { introspectDirectory } from "@emsenn/javascript-computer";

export type { JSNodePackage, JSNodeWorkspace };

/** Whether to project the package's built `dist/` declarations into its API
 *  surface (the type category). Off by default: introspection runs the
 *  TypeScript compiler per package, so discovery stays cheap unless asked. */
export interface ReadOptions {
  readonly introspect?: boolean;
}

/** Which packages to omit from discovery. Each pattern matches a package `name`
 *  exactly, or as a `*` wildcard (`@scope/*-experimental`). Omitted or empty
 *  means exclude nothing — the caller passes what it wants gone (the CLI from
 *  `--exclude`, a programmatic caller from its own argument). */
export interface WorkspaceFilter {
  readonly exclude?: readonly string[];
}

/** A package as found on disk: declared name, absolute directory, parsed
 *  manifest. The strata walk hands these to every consumer so a manifest read
 *  once is never read again. */
export interface DiscoveredPackage {
  readonly name: string;
  readonly dir: string;
  readonly manifest: Record<string, unknown>;
}

// Compile a name pattern (exact, or with `*` wildcards) into an anchored regexp.
function compilePattern(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function excluderFor(patterns: readonly string[]): (name: string) => boolean {
  if (patterns.length === 0) return () => false;
  const res = patterns.map(compilePattern);
  return (name) => res.some((re) => re.test(name));
}

/** The single walk of the repo strata. Yields every directory under a known
 *  layer that holds a readable package.json, minus the excluded names. A
 *  directory with no manifest (an archive tree, a stray folder) is skipped, so
 *  only real packages surface. */
export function* eachWorkspacePackageDir(
  root: string,
  filter: WorkspaceFilter = {},
): Generator<DiscoveredPackage> {
  const isExcluded = excluderFor(filter.exclude ?? []);
  for (const layer of JSNODE_LAYERS) {
    const layerDir = path.join(root, layer);
    let entries: string[];
    try {
      entries = readdirSync(layerDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const dir = path.join(layerDir, entry);
      let manifest: Record<string, unknown>;
      try {
        manifest = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as Record<string, unknown>;
      } catch {
        continue; // no readable manifest — not a package
      }
      const name = typeof manifest["name"] === "string" ? (manifest["name"] as string) : entry;
      if (isExcluded(name)) continue;
      yield { name, dir, manifest };
    }
  }
}

// Project a built package's .d.ts surface into a TypeCatalog, delegating the
// heavy compiler work to @emsenn/javascript-computer. Absent dist or empty
// surface yields no api.
function readPackageApi(dir: string): TypeCatalog | undefined {
  try {
    const catalog = introspectDirectory(path.join(dir, "dist"));
    return catalog.types.length || catalog.functions.length ? catalog : undefined;
  } catch {
    return undefined;
  }
}

function classifyLayer(dir: string): JSNodeLayer {
  const parts = dir.split(path.sep);
  for (const layer of JSNODE_LAYERS) {
    if (parts.includes(layer)) return layer;
  }
  return "lib";
}

function extractExports(manifest: Record<string, unknown>): string[] {
  const raw = manifest["exports"];
  if (raw === null || typeof raw !== "object") return [];
  return Object.keys(raw as Record<string, unknown>).filter(
    (k) => k !== "./package.json",
  );
}

function extractDependencies(manifest: Record<string, unknown>): string[] {
  const deps = manifest["dependencies"];
  if (deps === null || typeof deps !== "object") return [];
  return Object.keys(deps as Record<string, unknown>);
}

// A package's `keywords` are its tags on the meme floor: the `deprecated`
// keyword is what the deprecated-sweep reads to find packages slated for
// retirement. Without this, `tags` was always empty and `searchPackages`'
// tag-rank and the sweep had nothing to match.
function extractTags(manifest: Record<string, unknown>): string[] {
  const kw = manifest["keywords"];
  if (!Array.isArray(kw)) return [];
  return kw.filter((k): k is string => typeof k === "string");
}

// ---------- the plain manifest facts (the normie metadata) ----------

const DEP_FIELDS: ReadonlyArray<readonly [string, DependencyKind]> = [
  ["dependencies", "runtime"],
  ["devDependencies", "dev"],
  ["peerDependencies", "peer"],
  ["optionalDependencies", "optional"],
];

// Every declared dependency across all four kinds, each with its version range —
// the superset of the runtime name-list. The drift and consistency tools read
// this; the dependency graph still reads only the runtime names.
function extractDeps(manifest: Record<string, unknown>): PackageDependency[] {
  const out: PackageDependency[] = [];
  for (const [field, kind] of DEP_FIELDS) {
    const raw = manifest[field];
    if (raw === null || typeof raw !== "object") continue;
    for (const [name, range] of Object.entries(raw as Record<string, unknown>)) {
      out.push({ name, range: typeof range === "string" ? range : "*", kind });
    }
  }
  return out;
}

function extractEngines(manifest: Record<string, unknown>): Record<string, string> {
  const raw = manifest["engines"];
  if (raw === null || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function extractScriptNames(manifest: Record<string, unknown>): string[] {
  const raw = manifest["scripts"];
  if (raw === null || typeof raw !== "object") return [];
  return Object.keys(raw as Record<string, unknown>);
}

// A repository can be a string or { type, url }; normalize to a URL-ish string.
function extractRepository(manifest: Record<string, unknown>): string | null {
  const raw = manifest["repository"];
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object") {
    const url = (raw as Record<string, unknown>)["url"];
    if (typeof url === "string") return url;
  }
  return null;
}

function extractModuleType(manifest: Record<string, unknown>): "module" | "commonjs" | null {
  const t = manifest["type"];
  return t === "module" || t === "commonjs" ? t : null;
}

// Build a carrier from an already-parsed manifest (the strata walk hands these
// over), so discovery never re-reads a file it has already read.
function manifestToPackage(
  dir: string,
  manifest: Record<string, unknown>,
  opts: ReadOptions,
): JSNodePackage {
  const name = typeof manifest["name"] === "string" ? manifest["name"] : path.basename(dir);
  const version = typeof manifest["version"] === "string" ? manifest["version"] : "0.0.0";
  const description = typeof manifest["description"] === "string" ? manifest["description"] : "";
  const api = opts.introspect ? readPackageApi(dir) : undefined;
  const license = typeof manifest["license"] === "string" ? manifest["license"] : null;
  return jsNodePackage({
    name,
    version,
    description,
    layer: classifyLayer(dir),
    tags: extractTags(manifest),
    exports: extractExports(manifest),
    dependencies: extractDependencies(manifest),
    deps: extractDeps(manifest),
    license,
    private: manifest["private"] === true,
    moduleType: extractModuleType(manifest),
    engines: extractEngines(manifest),
    scripts: extractScriptNames(manifest),
    repository: extractRepository(manifest),
    homepage: typeof manifest["homepage"] === "string" ? manifest["homepage"] : null,
    ...(api !== undefined ? { api } : {}),
  });
}

export async function readJSNodePackage(
  dir: string,
  opts: ReadOptions = {},
): Promise<JSNodePackage | undefined> {
  const manifestPath = path.join(dir, "package.json");
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch {
    return undefined;
  }
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  return manifestToPackage(dir, manifest, opts);
}

export async function discoverWorkspace(
  root: string,
  opts: ReadOptions & WorkspaceFilter = {},
): Promise<JSNodeWorkspace> {
  const packages: JSNodePackage[] = [];
  for (const { dir, manifest } of eachWorkspacePackageDir(root, opts)) {
    packages.push(manifestToPackage(dir, manifest, opts));
  }
  return jsNodeWorkspace(root, packages);
}
