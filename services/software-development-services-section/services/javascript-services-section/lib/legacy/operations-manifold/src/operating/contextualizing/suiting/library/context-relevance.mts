import path from "node:path";

import { packageScriptCatalogFromPackage, type PackageScript } from "@emsenn/organizing-with-jsnode/packages";
import { eachWorkspacePackageDir, type DiscoveredPackage } from "@emsenn/organizing-with-jsnode/workspaces";

import { readApiIndex, refreshApiIndex, type ApiIndexSymbol } from "../../../../api-index.mts";
import { operationsManifoldStatePath } from "../../../../package-surface.mts";
import { boundedInteger, optionalText } from "../../../../records.mts";

export type ContextRelevanceParams = Readonly<{
  prompt?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  focus?: string | undefined;
  limit?: string | number | undefined;
  refresh?: string | boolean | undefined;
}>;

export type RelevantFunction = Readonly<{
  package: string;
  packagePath: string;
  name: string;
  import: string;
  file: string;
  signature: string;
  keywords: readonly string[];
}>;

export type RelevantScript = Readonly<{
  package: string;
  packagePath: string;
  bin: string;
  target: string;
  keywords: readonly string[];
}>;

export type RelevantKeywordSurface = Readonly<{
  keyword: string;
  functions: readonly RelevantFunction[];
  types: readonly RelevantFunction[];
  scripts: readonly RelevantScript[];
}>;

export type ContextRelevance = Readonly<{
  kind: "operations-manifold.context.relevance";
  generatedAt: string;
  query: string;
  focus: string | null;
  keywords: readonly string[];
  functions: readonly RelevantFunction[];
  types: readonly RelevantFunction[];
  scripts: readonly RelevantScript[];
  keywordSurfaces: readonly RelevantKeywordSurface[];
  interfaces: readonly {
    bin: string;
    href: string;
    method: "POST";
    mcp: string;
    openapi: string;
    purpose: string;
    params: Readonly<Record<string, string>>;
  }[];
  evidence: readonly string[];
}>;

export async function deriveContextRelevance(repoRoot: string, params: ContextRelevanceParams = {}): Promise<ContextRelevance> {
  if (params.refresh === true || params.refresh === "true" || params.refresh === "1") await refreshApiIndex(repoRoot);
  const query = optionalText(params.prompt ?? params.q ?? params.intent) ?? "operations manifold context relevance";
  const focus = optionalText(params.focus);
  const limit = boundedInteger(params.limit, { min: 1, max: 48, fallback: 12 });
  const keywords = keywordTerms(query);
  const index = await readApiIndex(repoRoot);
  const [functions, types, scripts] = await Promise.all([
    Promise.resolve(relevantSymbols(index.symbols, keywords, "function", limit, focus)),
    Promise.resolve(relevantSymbols(index.symbols, keywords, "type", limit, focus)),
    relevantScripts(repoRoot, keywords, limit, focus),
  ]);
  return Object.freeze({
    kind: "operations-manifold.context.relevance" as const,
    generatedAt: new Date().toISOString(),
    query,
    focus,
    keywords,
    functions,
    types,
    scripts,
    keywordSurfaces: keywordSurfaces(functions, types, scripts, keywords),
    interfaces: Object.freeze([
      iface("read-jsnode-functions", "inspect keyword-matched exported functions and their signatures", { q: keywords[0] ?? query, limit: String(limit) }),
      iface("read-jsnode-types", "inspect keyword-matched exported type carriers", { q: keywords[0] ?? query, limit: String(limit) }),
      iface("derive-codebase-profile", "project matching codebase carriers and applicable functions", { focus: focus ?? "sites/ops.561.group", intent: query, limit: String(limit) }),
      iface("project-context-suit", "compose current goals, work, context, and likely follow-up surfaces", { focus: focus ?? "sites/ops.561.group", intent: query }),
    ]),
    evidence: Object.freeze([
      operationsManifoldStatePath("jsnode-api-surface"),
      "readApiIndex",
      "package.json#bin",
      "@emsenn/organizing-with-jsnode/packages.packageScriptCatalogFromPackage",
      "@emsenn/organizing-with-jsnode/workspaces.eachWorkspacePackageDir",
    ]),
  });
}

function keywordSurfaces(
  functions: readonly RelevantFunction[],
  types: readonly RelevantFunction[],
  scripts: readonly RelevantScript[],
  keywords: readonly string[],
): readonly RelevantKeywordSurface[] {
  return Object.freeze(keywords.map((keyword) => Object.freeze({
    keyword,
    functions: Object.freeze(functions.filter((item) => item.keywords.includes(keyword)).slice(0, 6)),
    types: Object.freeze(types.filter((item) => item.keywords.includes(keyword)).slice(0, 4)),
    scripts: Object.freeze(scripts.filter((item) => item.keywords.includes(keyword)).slice(0, 4)),
  })).filter((item) => item.functions.length > 0 || item.types.length > 0 || item.scripts.length > 0));
}

function relevantSymbols(symbols: readonly ApiIndexSymbol[], keywords: readonly string[], kind: "function" | "type", limit: number, focus: string | null): readonly RelevantFunction[] {
  const byKey = new Map<string, RelevantFunction>();
  for (const symbol of symbols) {
    if (kind === "function" && symbol.kind !== "function") continue;
    if (kind === "type" && (symbol.kind === "function" || symbol.kind === "variable")) continue;
    const match = matchedKeywords(symbol, keywords);
    if (match.length === 0) continue;
    byKey.set(`${symbol.package}:${symbol.name}:${symbol.file}`, symbolReading(symbol, match));
  }
  const sorted = [...byKey.values()]
    .sort((left, right) => score(right, keywords, focus) - score(left, keywords, focus) || left.package.localeCompare(right.package) || left.name.localeCompare(right.name));
  return balancedRelevantFunctions(sorted, keywords, limit, focus);
}

async function relevantScripts(repoRoot: string, keywords: readonly string[], limit: number, focus: string | null): Promise<readonly RelevantScript[]> {
  const scripts: RelevantScript[] = [];
  for (const pkg of relevantScriptPackages(repoRoot, focus)) {
    const packagePath = relativePackagePath(repoRoot, pkg.dir);
    const catalog = scriptCatalog(pkg);
    if (catalog === null) continue;
    for (const script of catalog.scripts) {
      const match = matchedScriptKeywords(script, catalog.package, packagePath, keywords);
      if (match.length === 0) continue;
      scripts.push(Object.freeze({ package: catalog.package, packagePath, bin: script.name, target: script.target, keywords: Object.freeze(match) }));
    }
  }
  const sorted = scripts
    .sort((left, right) => scriptScore(right, keywords, focus) - scriptScore(left, keywords, focus) || left.package.localeCompare(right.package) || left.bin.localeCompare(right.bin));
  return balancedRelevantScripts(sorted, keywords, limit, focus);
}

function balancedRelevantFunctions(candidates: readonly RelevantFunction[], keywords: readonly string[], limit: number, focus: string | null): readonly RelevantFunction[] {
  return balancedRelevantItems(candidates, keywords, limit, focus, {
    key: functionKey,
    name: (candidate) => candidate.name,
    package: (candidate) => candidate.package,
    packagePath: (candidate) => candidate.packagePath,
    keywords: (candidate) => candidate.keywords,
  });
}

function balancedRelevantScripts(candidates: readonly RelevantScript[], keywords: readonly string[], limit: number, focus: string | null): readonly RelevantScript[] {
  return balancedRelevantItems(candidates, keywords, limit, focus, {
    key: scriptKey,
    name: (candidate) => candidate.bin,
    package: (candidate) => candidate.package,
    packagePath: (candidate) => candidate.packagePath,
    keywords: (candidate) => candidate.keywords,
  });
}

function balancedRelevantItems<T>(
  candidates: readonly T[],
  keywords: readonly string[],
  limit: number,
  focus: string | null,
  reading: Readonly<{
    key: (candidate: T) => string;
    name: (candidate: T) => string;
    package: (candidate: T) => string;
    packagePath: (candidate: T) => string;
    keywords: (candidate: T) => readonly string[];
  }>,
): readonly T[] {
  if (keywords.length <= 1) return Object.freeze(candidates.slice(0, limit));
  const selected: T[] = [];
  const seen = new Set<string>();
  const quota = Math.max(2, Math.floor(limit / keywords.length));
  for (const keyword of keywords) {
    const bucket = candidates.filter((candidate) => reading.keywords(candidate).includes(keyword));
    const selection: T[] = [];
    const add = (values: readonly T[], selectionLimit: number) => {
      for (const value of values) {
        if (selection.length >= selectionLimit) return;
        const key = reading.key(value);
        if (seen.has(key) || selection.some((item) => reading.key(item) === key)) continue;
        selection.push(value);
      }
    };
    add(bucket.filter((candidate) => exactNameKeywordMatch(reading.name(candidate), keyword)), Math.min(2, quota));
    add(bucket.filter((candidate) => matchesPackageFocus(reading.package(candidate), reading.packagePath(candidate), focus)), Math.max(1, Math.ceil(quota / 2)));
    add(bucket.filter((candidate) => !matchesPackageFocus(reading.package(candidate), reading.packagePath(candidate), focus)), quota);
    pushUniqueItems(selected, seen, selection, reading.key);
  }
  pushUniqueItems(selected, seen, candidates, reading.key);
  return Object.freeze(selected.slice(0, limit));
}

function pushUniqueItems<T>(out: T[], seen: Set<string>, values: readonly T[], keyOf: (value: T) => string): void {
  for (const value of values) {
    const key = keyOf(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
}

function functionKey(value: RelevantFunction): string {
  return `${value.package}:${value.name}:${value.file}`;
}

function scriptKey(value: RelevantScript): string {
  return `${value.package}:${value.bin}:${value.target}`;
}

function exactNameKeywordMatch(name: string, keyword: string): boolean {
  return surfaceTerms([name]).some((term) => term === keyword);
}

function symbolReading(symbol: ApiIndexSymbol, keywords: readonly string[]): RelevantFunction {
  return Object.freeze({
    package: symbol.package,
    packagePath: symbol.packagePath,
    name: symbol.name,
    import: symbol.import,
    file: symbol.file,
    signature: symbol.signature,
    keywords: Object.freeze(keywords),
  });
}

function matchedKeywords(symbol: ApiIndexSymbol, keywords: readonly string[]): readonly string[] {
  const terms = surfaceTerms([
    symbol.name,
    symbol.signature,
    symbol.import,
    symbol.file,
    symbol.package,
    symbol.packagePath,
    symbol.module,
  ]);
  return Object.freeze(keywords.filter((keyword) => terms.some((term) => termMatches(term, keyword))));
}

function score(value: RelevantFunction, keywords: readonly string[], focus: string | null): number {
  const nameTerms = surfaceTerms([value.name]);
  const signatureTerms = surfaceTerms([value.signature]);
  const importTerms = surfaceTerms([value.import]);
  const fileTerms = surfaceTerms([value.file]);
  const packageTerms = surfaceTerms([value.package, value.packagePath]);
  const nameMatches = matchCount(nameTerms, keywords);
  const signatureMatches = matchCount(signatureTerms, keywords);
  const importMatches = matchCount(importTerms, keywords);
  const fileMatches = matchCount(fileTerms, keywords);
  const packageMatches = matchCount(packageTerms, keywords);
  return nameMatches * 12 + signatureMatches * 6 + packageMatches * 5 + importMatches * 4 + fileMatches * 2 + value.keywords.length * 8 + focusScore(value.package, value.packagePath, focus);
}

function scriptScore(value: RelevantScript, keywords: readonly string[], focus: string | null): number {
  const binMatches = matchCount(surfaceTerms([value.bin]), keywords);
  const targetMatches = matchCount(surfaceTerms([value.target]), keywords);
  const packageMatches = matchCount(surfaceTerms([value.package, value.packagePath]), keywords);
  return binMatches * 12 + packageMatches * 5 + targetMatches * 4 + value.keywords.length * 8 + focusScore(value.package, value.packagePath, focus);
}

function focusScore(packageName: string, packagePath: string, focus: string | null): number {
  return focusWeight(packageName, packagePath, focus);
}

function focusWeight(packageName: string, packagePath: string, focus: string | null): number {
  if (focus === null) return 0;
  const normalizedFocus = normalizeFocus(focus);
  const normalizedPackagePath = normalizeFocus(packagePath);
  const normalizedPackageName = packageName.toLowerCase();
  if (normalizedPackagePath === normalizedFocus) return 36;
  if (normalizedFocus.endsWith(`/${normalizedPackagePath}`)) return 30;
  if (normalizedPackagePath.endsWith(`/${normalizedFocus}`)) return 30;
  if (normalizedFocus.includes("operations-manifold") && normalizedPackageName === "@emsenn/operations-manifold") return 36;
  return 0;
}

function matchesPackageFocus(packageName: string, packagePath: string, focus: string | null): boolean {
  return focusWeight(packageName, packagePath, focus) > 0;
}

function normalizeFocus(value: string): string {
  return value.trim().toLowerCase().replace(/^\.\//u, "").replace(/\/+$/u, "");
}

function relevantScriptPackages(repoRoot: string, focus: string | null): readonly DiscoveredPackage[] {
  const packages = [...eachWorkspacePackageDir(repoRoot)];
  const focused = focus === null
    ? []
    : packages.filter((pkg) => matchesPackageFocus(pkg.name, relativePackagePath(repoRoot, pkg.dir), focus));
  const rest = packages.filter((pkg) => !focused.some((item) => item.dir === pkg.dir));
  return Object.freeze([...focused, ...rest]);
}

function relativePackagePath(repoRoot: string, packageDir: string): string {
  return path.relative(repoRoot, packageDir).split(path.sep).join("/");
}

function scriptCatalog(pkg: DiscoveredPackage) {
  try {
    return packageScriptCatalogFromPackage({ packageDir: pkg.dir, packageName: pkg.name, manifest: pkg.manifest, basePath: "/" }).catalog;
  } catch {
    return null;
  }
}

function matchedScriptKeywords(script: PackageScript, packageName: string, packagePath: string, keywords: readonly string[]): readonly string[] {
  const terms = surfaceTerms([
    script.name,
    script.target,
    script.executable,
    script.summary ?? "",
    script.description ?? "",
    packageName,
    packagePath,
  ]);
  return Object.freeze(keywords.filter((keyword) => terms.some((term) => termMatches(term, keyword))));
}

function keywordTerms(value: string): readonly string[] {
  const stop = new Set(["about", "after", "agent", "and", "are", "around", "before", "codex", "context", "continue", "current", "emsenn", "fix", "for", "from", "function", "group", "have", "hey", "home", "into", "keyword", "know", "like", "make", "manifold", "mention", "name", "operation", "our", "package", "please", "relevance", "script", "show", "shown", "site", "surface", "surfaced", "surfacing", "that", "their", "there", "these", "this", "through", "using", "verify", "visible", "wiring", "with", "working", "would", "your"]);
  const terms = identifierTerms(value)
    .map(normalizeKeywordTerm)
    .filter((term) => term.length >= 3)
    .filter((term) => /[a-z]/u.test(term))
    .filter((term) => !stop.has(term));
  return Object.freeze([...new Set(terms)].slice(0, 16));
}

function surfaceTerms(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.flatMap(identifierTerms).map(normalizeKeywordTerm).filter((term) => term !== ""))]);
}

function identifierTerms(value: string): readonly string[] {
  return Object.freeze(value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((term) => term !== ""));
}

function matchCount(terms: readonly string[], keywords: readonly string[]): number {
  return keywords.filter((keyword) => terms.some((term) => termMatches(term, keyword))).length;
}

function termMatches(term: string, keyword: string): boolean {
  return term === keyword || (keyword.length >= 4 && term.startsWith(keyword));
}

function normalizeKeywordTerm(term: string): string {
  if (term.endsWith("ies") && term.length > 5) return `${term.slice(0, -3)}y`;
  if (term.endsWith("s") && term.length > 4 && !term.endsWith("ss")) return term.slice(0, -1);
  return term;
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>) {
  return Object.freeze({
    bin,
    href: `/${bin}`,
    method: "POST" as const,
    mcp: `operations-manifold.${bin}`,
    openapi: `/openapi.json#/paths/~1${bin}/post`,
    purpose,
    params: Object.freeze({ ...params }),
  });
}
