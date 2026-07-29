import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { operationsManifoldStateDir, operationsManifoldStatePath, workspacePackageAliases } from "./package-surface.mts";
import { boundedInteger } from "./records.mts";

const API_INDEX_PATH = operationsManifoldStatePath("jsnode-api-surface");
const API_PACKAGE_INDEX_PATH = operationsManifoldStatePath("jsnode-api-surface.packages");
const API_PACKAGE_DIR = operationsManifoldStateDir("jsnode-api-surface");

export type ApiIndexSymbol = Readonly<{
  package: string;
  packagePath: string;
  module: string;
  import: string;
  file: string;
  name: string;
  kind: string;
  signature: string;
  documented: boolean;
}>;

export type ApiIndexPackage = Readonly<{
  name: string;
  path: string;
  aliases: readonly string[];
  symbols: number;
}>;

export type ApiIndexState = Readonly<{
  kind: "operations-manifold.jsnode.api-index";
  generatedAt: string;
  source: "package-source-doc-symbols";
  packages: readonly ApiIndexPackage[];
  symbols: readonly ApiIndexSymbol[];
}>;

export type ApiIndexQueryParams = Readonly<{
  package?: string | undefined;
  pkg?: string | undefined;
  focus?: string | undefined;
  match?: string | undefined;
  q?: string | undefined;
  name?: string | undefined;
  kind?: string | undefined;
  limit?: string | number | undefined;
  refresh?: string | boolean | undefined;
}>;

export type ApiIndexQueryResult = Readonly<{
  kind: "operations-manifold.jsnode.api-surface";
  index: Readonly<{
    path: string;
    generatedAt: string | null;
    stale: boolean;
    packages: number;
    symbols: number;
  }>;
  filters: Readonly<{
    package?: string;
    requestedPackage?: string;
    match?: string;
    kind?: string;
    limit: number;
  }>;
  totals: Readonly<{
    matchedSymbols: number;
  }>;
  functions: readonly ApiIndexSymbol[];
  types: readonly ApiIndexSymbol[];
  symbols: readonly ApiIndexSymbol[];
}>;

export async function refreshApiIndex(repoRoot: string): Promise<ApiIndexState> {
  const [
    { eachWorkspacePackageDir },
    { readPackageDocSymbols },
  ] = await Promise.all([
    import("@emsenn/organizing-with-jsnode/workspaces"),
    import("@emsenn/organizing-with-jsnode/modules"),
  ]);
  const packages: ApiIndexPackage[] = [];
  const symbols: ApiIndexSymbol[] = [];
  for (const pkg of eachWorkspacePackageDir(repoRoot)) {
    const packagePath = path.relative(repoRoot, pkg.dir).split(path.sep).join("/");
    const packageSymbols: ApiIndexSymbol[] = [];
    let sourceSymbols;
    try {
      sourceSymbols = readPackageDocSymbols(pkg.dir, { excludeDirs: ["scripts"] });
    } catch {
      continue;
    }
    for (const symbol of sourceSymbols) {
      const moduleImport = symbol.module === "." ? pkg.name : `${pkg.name}/${symbol.module}`;
      packageSymbols.push(Object.freeze({
        package: pkg.name,
        packagePath,
        module: symbol.module,
        import: moduleImport,
        file: path.relative(repoRoot, symbol.file).split(path.sep).join("/"),
        name: symbol.name,
        kind: symbol.kind,
        signature: compactText(symbol.signature),
        documented: symbol.doc.trim() !== "",
      }));
    }
    symbols.push(...packageSymbols);
    packages.push(Object.freeze({
      name: pkg.name,
      path: packagePath,
      aliases: Object.freeze(workspacePackageAliases(pkg.name, packagePath)),
      symbols: packageSymbols.length,
    }));
  }

  const state = Object.freeze({
    kind: "operations-manifold.jsnode.api-index" as const,
    generatedAt: new Date().toISOString(),
    source: "package-source-doc-symbols" as const,
    packages: Object.freeze(packages.sort((a, b) => a.name.localeCompare(b.name))),
    symbols: Object.freeze(symbols.sort((a, b) =>
      a.package.localeCompare(b.package) || a.module.localeCompare(b.module) || a.name.localeCompare(b.name)
    )),
  });
  await writeApiIndex(repoRoot, state);
  await writePackageIndexes(repoRoot, state);
  return state;
}

export async function refreshFocusedApiIndex(repoRoot: string, requested: string): Promise<ApiIndexState> {
  const [{ eachWorkspacePackageDir }, packages, current] = await Promise.all([
    import("@emsenn/organizing-with-jsnode/workspaces"),
    readApiPackages(repoRoot),
    readApiIndex(repoRoot),
  ]);
  const packageName = resolvePackage({ ...emptyApiIndex(), packages }, requested);
  const workspace = [...eachWorkspacePackageDir(repoRoot)].find((pkg) => pkg.name === packageName || workspacePackageAliases(pkg.name, path.relative(repoRoot, pkg.dir).split(path.sep).join("/")).includes(requested));
  if (workspace === undefined) return refreshApiIndex(repoRoot);

  const refreshed = await readWorkspacePackageSymbols(repoRoot, workspace);
  const nextPackages = replacePackage(packages, refreshed.pkg);
  const state = Object.freeze({
    kind: "operations-manifold.jsnode.api-index" as const,
    generatedAt: new Date().toISOString(),
    source: "package-source-doc-symbols" as const,
    packages: Object.freeze(nextPackages),
    symbols: Object.freeze([
      ...current.symbols.filter((symbol) => symbol.package !== refreshed.pkg.name),
      ...refreshed.symbols,
    ].sort((a, b) => a.package.localeCompare(b.package) || a.module.localeCompare(b.module) || a.name.localeCompare(b.name))),
  });
  await writeApiIndex(repoRoot, state);
  await writeApiPackageRegistry(repoRoot, state.generatedAt, state.packages);
  await writePackageIndex(repoRoot, state, refreshed.pkg);
  return Object.freeze({ ...state, packages: Object.freeze([refreshed.pkg]), symbols: refreshed.symbols });
}

export async function queryApiIndex(repoRoot: string, params: ApiIndexQueryParams = {}): Promise<ApiIndexQueryResult> {
  const shouldRefresh = params.refresh === true || params.refresh === "true" || params.refresh === "1";
  const limit = boundedInteger(params.limit, { min: 1, max: 500, fallback: 80 });
  const requestedPackage = stringParam(params.package ?? params.pkg ?? params.focus);
  const state = shouldRefresh
    ? await refreshApiIndex(repoRoot)
    : requestedPackage === undefined
      ? await readApiIndex(repoRoot)
      : await readFocusedApiIndex(repoRoot, requestedPackage);
  const packageName = requestedPackage === undefined ? undefined : resolvePackage(state, requestedPackage);
  const match = stringParam(params.match ?? params.q ?? params.name);
  const kind = stringParam(params.kind);
  const matched = state.symbols
    .filter((symbol) => packageName === undefined || symbol.package === packageName)
    .filter((symbol) => kind === undefined || symbol.kind === kind)
    .filter((symbol) => match === undefined || symbolMatches(symbol, match));
  const functions = Object.freeze(matched.filter((symbol) => symbol.kind === "function").slice(0, limit));
  const types = Object.freeze(matched.filter((symbol) => symbol.kind !== "function" && symbol.kind !== "variable").slice(0, limit));
  const symbols = Object.freeze(matched.slice(0, limit));
  return Object.freeze({
    kind: "operations-manifold.jsnode.api-surface" as const,
    index: Object.freeze({
      path: API_INDEX_PATH,
      generatedAt: state.generatedAt === "" ? null : state.generatedAt,
      stale: state.generatedAt === "",
      packages: state.packages.length,
      symbols: state.symbols.length,
    }),
    filters: Object.freeze({
      ...(packageName === undefined ? {} : { package: packageName }),
      ...(requestedPackage === undefined ? {} : { requestedPackage }),
      ...(match === undefined ? {} : { match }),
      ...(kind === undefined ? {} : { kind }),
      limit,
    }),
    totals: Object.freeze({ matchedSymbols: matched.length }),
    functions,
    types,
    symbols,
  });
}

export async function readApiIndex(repoRoot: string): Promise<ApiIndexState> {
  try {
    const text = await readFile(path.join(repoRoot, API_INDEX_PATH), "utf8");
    return JSON.parse(text) as ApiIndexState;
  } catch {
    return emptyApiIndex();
  }
}

export async function readFocusedApiIndex(repoRoot: string, requested: string): Promise<ApiIndexState> {
  const packages = await readApiPackages(repoRoot);
  const packageName = resolvePackage({ ...emptyApiIndex(), packages }, requested);
  if (packageName === undefined) {
    return Object.freeze({ ...emptyApiIndex(), packages });
  }
  const pkg = packages.find((item) => item.name === packageName);
  try {
    const text = await readFile(path.join(repoRoot, packageIndexPath(packageName)), "utf8");
    const state = JSON.parse(text) as ApiIndexState;
    if (pkg !== undefined && await focusedApiIndexStale(repoRoot, state, pkg)) return refreshFocusedApiIndex(repoRoot, requested);
    return Object.freeze({ ...state, packages });
  } catch {
    return refreshFocusedApiIndex(repoRoot, requested);
  }
}

async function readWorkspacePackageSymbols(repoRoot: string, pkg: { readonly name: string; readonly dir: string }): Promise<Readonly<{ pkg: ApiIndexPackage; symbols: readonly ApiIndexSymbol[] }>> {
  const { readPackageDocSymbols } = await import("@emsenn/organizing-with-jsnode/modules");
  const packagePath = path.relative(repoRoot, pkg.dir).split(path.sep).join("/");
  const symbols: ApiIndexSymbol[] = [];
  for (const symbol of readPackageDocSymbols(pkg.dir, { excludeDirs: ["scripts"] })) {
    const moduleImport = symbol.module === "." ? pkg.name : `${pkg.name}/${symbol.module}`;
    symbols.push(Object.freeze({
      package: pkg.name,
      packagePath,
      module: symbol.module,
      import: moduleImport,
      file: path.relative(repoRoot, symbol.file).split(path.sep).join("/"),
      name: symbol.name,
      kind: symbol.kind,
      signature: compactText(symbol.signature),
      documented: symbol.doc.trim() !== "",
    }));
  }
  return Object.freeze({
    pkg: Object.freeze({
      name: pkg.name,
      path: packagePath,
      aliases: Object.freeze(workspacePackageAliases(pkg.name, packagePath)),
      symbols: symbols.length,
    }),
    symbols: Object.freeze(symbols.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name))),
  });
}

async function writeApiIndex(repoRoot: string, state: ApiIndexState): Promise<void> {
  const file = path.join(repoRoot, API_INDEX_PATH);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(state)}\n`);
}

async function writePackageIndexes(repoRoot: string, state: ApiIndexState): Promise<void> {
  await writeApiPackageRegistry(repoRoot, state.generatedAt, state.packages);
  await mkdir(path.join(repoRoot, API_PACKAGE_DIR), { recursive: true });
  for (const pkg of state.packages) await writePackageIndex(repoRoot, state, pkg);
}

async function writeApiPackageRegistry(repoRoot: string, generatedAt: string, packages: readonly ApiIndexPackage[]): Promise<void> {
  const registry = Object.freeze({
    kind: "operations-manifold.jsnode.api-package-index" as const,
    generatedAt,
    packages,
  });
  const registryFile = path.join(repoRoot, API_PACKAGE_INDEX_PATH);
  await mkdir(path.dirname(registryFile), { recursive: true });
  await writeFile(registryFile, `${JSON.stringify(registry)}\n`);
}

async function writePackageIndex(repoRoot: string, state: ApiIndexState, pkg: ApiIndexPackage): Promise<void> {
  await mkdir(path.join(repoRoot, API_PACKAGE_DIR), { recursive: true });
  const packageState = Object.freeze({
    ...state,
    packages: Object.freeze([pkg]),
    symbols: Object.freeze(state.symbols.filter((symbol) => symbol.package === pkg.name)),
  });
  await writeFile(path.join(repoRoot, packageIndexPath(pkg.name)), `${JSON.stringify(packageState)}\n`);
}

async function readApiPackages(repoRoot: string): Promise<readonly ApiIndexPackage[]> {
  try {
    const text = await readFile(path.join(repoRoot, API_PACKAGE_INDEX_PATH), "utf8");
    const parsed = JSON.parse(text) as { readonly packages?: readonly ApiIndexPackage[] };
    return Object.freeze(parsed.packages ?? []);
  } catch {
    return Object.freeze([]);
  }
}

function packageIndexPath(name: string): string {
  return `${API_PACKAGE_DIR}/${encodeURIComponent(name)}.json`;
}

function replacePackage(packages: readonly ApiIndexPackage[], pkg: ApiIndexPackage): readonly ApiIndexPackage[] {
  const byName = new Map(packages.map((item) => [item.name, item]));
  byName.set(pkg.name, pkg);
  return Object.freeze([...byName.values()].sort((a, b) => a.name.localeCompare(b.name)));
}

async function focusedApiIndexStale(repoRoot: string, state: ApiIndexState, pkg: ApiIndexPackage): Promise<boolean> {
  const generatedAt = Date.parse(state.generatedAt);
  if (!Number.isFinite(generatedAt)) return true;
  const latestSource = await latestPackageSourceMtimeMs(path.join(repoRoot, pkg.path));
  return latestSource > generatedAt;
}

async function latestPackageSourceMtimeMs(packageDir: string): Promise<number> {
  const roots = ["package.json", "tsconfig.json", "tsconfig.build.json", "src"];
  let latest = 0;
  for (const root of roots) latest = Math.max(latest, await latestMtimeMs(path.join(packageDir, root)));
  return latest;
}

async function latestMtimeMs(target: string): Promise<number> {
  let info;
  try {
    info = await stat(target);
  } catch {
    return 0;
  }
  if (!info.isDirectory()) return info.mtimeMs;
  let latest = info.mtimeMs;
  const entries = await readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "data" || entry.name === "coverage" || entry.name.startsWith(".")) continue;
    latest = Math.max(latest, await latestMtimeMs(path.join(target, entry.name)));
  }
  return latest;
}

function emptyApiIndex(): ApiIndexState {
  return Object.freeze({
    kind: "operations-manifold.jsnode.api-index" as const,
    generatedAt: "",
    source: "package-source-doc-symbols" as const,
    packages: Object.freeze([]),
    symbols: Object.freeze([]),
  });
}

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function resolvePackage(state: ApiIndexState, requested: string): string | undefined {
  for (const pkg of state.packages) {
    if (pkg.aliases.includes(requested)) return pkg.name;
  }
  return undefined;
}

function symbolMatches(symbol: ApiIndexSymbol, match: string): boolean {
  const needles = queryTerms(match);
  if (needles.length === 0) return false;
  const terms = surfaceTerms([
    symbol.name,
    symbol.kind,
    symbol.signature,
    symbol.import,
    symbol.file,
    symbol.package,
    symbol.packagePath,
    symbol.module,
  ]);
  return needles.some((needle) => terms.some((term) => termMatches(term, needle)));
}

function compactText(value: string, max = 260): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}...`;
}

function queryTerms(value: string): readonly string[] {
  return Object.freeze([...new Set(identifierTerms(value)
    .map(normalizeTerm)
    .filter((term) => term.length >= 3)
    .filter((term) => /[a-z]/u.test(term)))]);
}

function surfaceTerms(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.flatMap(identifierTerms).map(normalizeTerm).filter((term) => term !== ""))]);
}

function identifierTerms(value: string): readonly string[] {
  return Object.freeze(value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((term) => term !== ""));
}

function normalizeTerm(term: string): string {
  if (term.endsWith("ies") && term.length > 5) return `${term.slice(0, -3)}y`;
  if (term.endsWith("s") && term.length > 4 && !term.endsWith("ss")) return term.slice(0, -1);
  return term;
}

function termMatches(term: string, needle: string): boolean {
  return term === needle || (needle.length >= 4 && term.startsWith(needle));
}
