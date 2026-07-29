import path from "node:path";

import {
  coarseConsumersOfPackage,
  consumersOfSymbol,
  workspaceConsumptionIndex,
} from "./consumption.mjs";
import { egoGraph, workspaceDependencyGraph, type WorkspaceDependencyGraph } from "./graph.mjs";
import { workspaceTypeIndex } from "./type-index.mjs";
import { discoverWorkspace, eachWorkspacePackageDir } from "./workspace.mjs";
import { readPackageDocSymbols } from "../modules/package-surface.mjs";

export type PackageAtlasModule = Readonly<{
  module: string;
  import: string;
  file: string;
  symbols: readonly {
    readonly name: string;
    readonly kind: string;
    readonly signature: string;
    readonly documented: boolean;
    readonly doc: string;
  }[];
}>;

export type PackageAtlasFacet = Readonly<{
  axis: "package" | "module" | "symbol" | "dependency";
  role: string;
  evidence: readonly string[];
}>;

export type PackageAtlasView = Readonly<{
  kind: "jsnode.package-atlas";
  package: {
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly layer: string;
    readonly lifecycle: string;
    readonly maturity: string;
    readonly tags: readonly string[];
    readonly exports: readonly string[];
    readonly dependencies: readonly string[];
    readonly deps: readonly {
      readonly name: string;
      readonly range: string;
      readonly kind: string;
    }[];
    readonly manifest: {
      readonly license: string | null;
      readonly private: boolean;
      readonly moduleType: "module" | "commonjs" | null;
      readonly engines: Readonly<Record<string, string>>;
      readonly scripts: readonly string[];
      readonly bins: readonly string[];
      readonly repository: string | null;
      readonly homepage: string | null;
    };
    readonly path: string;
  };
  graph: WorkspaceDependencyGraph;
  facets: readonly PackageAtlasFacet[];
  dependents: readonly string[];
  modules: readonly PackageAtlasModule[];
  functions: readonly {
    readonly name: string;
    readonly domain: readonly string[];
    readonly codomain?: string;
    readonly consumers: readonly string[];
  }[];
  types: readonly {
    readonly name: string;
    readonly kind: string;
    readonly bases: readonly string[];
  }[];
  coarseConsumers: readonly string[];
}>;

export type ModuleAtlasView = Readonly<{
  kind: "jsnode.module-atlas";
  package: PackageAtlasView["package"];
  module: PackageAtlasModule;
  siblingModules: readonly string[];
  facets: readonly PackageAtlasFacet[];
}>;

export type SymbolAtlasView = Readonly<{
  kind: "jsnode.symbol-atlas";
  package: PackageAtlasView["package"];
  symbol: PackageAtlasModule["symbols"][number] & Readonly<{ module: string; import: string; file: string }>;
  functions: readonly PackageAtlasView["functions"][number][];
  types: readonly PackageAtlasView["types"][number][];
  consumers: readonly string[];
  facets: readonly PackageAtlasFacet[];
}>;

export type PackageAtlasOptions = Readonly<{
  detail?: "surface" | "full";
}>;

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((a, b) => a.localeCompare(b)));
}

function facet(axis: PackageAtlasFacet["axis"], role: string, evidence: readonly string[]): PackageAtlasFacet {
  return Object.freeze({ axis, role, evidence: uniqueSorted(evidence) });
}

function includesAny(value: string, terms: readonly string[]): boolean {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function packageFacets(input: Readonly<{
  pkg: PackageAtlasView["package"];
  modules: readonly PackageAtlasModule[];
  dependents: readonly string[];
}>): readonly PackageAtlasFacet[] {
  const { pkg, modules, dependents } = input;
  const out: PackageAtlasFacet[] = [];
  const moduleNames = modules.map((module) => module.module);
  const importLabels = modules.map((module) => module.import);
  const symbols = modules.flatMap((module) => module.symbols.map((symbol) => `${module.import}:${symbol.name}:${symbol.kind}:${symbol.signature}`));
  const deps = pkg.deps.map((dep) => dep.name);
  const scripts = pkg.manifest.scripts;
  const bins = pkg.manifest.bins;

  if (pkg.exports.length > 0 || modules.length > 0) out.push(facet("package", "library-surface", [...pkg.exports, ...importLabels]));
  if (scripts.length > 0 || bins.length > 0) out.push(facet("package", "operator-surface", [...scripts.map((script) => `script:${script}`), ...bins.map((bin) => `bin:${bin}`)]));
  if (pkg.manifest.private) out.push(facet("package", "workspace-internal", ["package.json private=true"]));
  if (dependents.length > 0) out.push(facet("dependency", "provider", dependents));
  if (pkg.dependencies.length > 0) out.push(facet("dependency", "consumer", pkg.dependencies));

  if (moduleNames.some((name) => includesAny(name, ["codec", "codecs"]))) out.push(facet("module", "codec-boundary", moduleNames.filter((name) => includesAny(name, ["codec", "codecs"]))));
  if (moduleNames.some((name) => includesAny(name, ["holography"]))) out.push(facet("module", "holography-boundary", moduleNames.filter((name) => includesAny(name, ["holography"]))));
  if (moduleNames.some((name) => includesAny(name, ["agent", "agents", "orchestration", "mcp"]))) out.push(facet("module", "agent-operations", moduleNames.filter((name) => includesAny(name, ["agent", "agents", "orchestration", "mcp"]))));
  if (moduleNames.some((name) => includesAny(name, ["app", "serve", "view", "html", "http"]))) out.push(facet("module", "web-transport", moduleNames.filter((name) => includesAny(name, ["app", "serve", "view", "html", "http"]))));
  if (moduleNames.some((name) => includesAny(name, ["workspace", "package", "module", "symbol"]))) out.push(facet("module", "workspace-introspection", moduleNames.filter((name) => includesAny(name, ["workspace", "package", "module", "symbol"]))));

  if (symbols.some((symbol) => includesAny(symbol, ["parse", "render", "encode", "decode", "repr", "html", "json", "svg"]))) {
    out.push(facet("symbol", "codec-function", symbols.filter((symbol) => includesAny(symbol, ["parse", "render", "encode", "decode", "repr", "html", "json", "svg"])).slice(0, 12)));
  }
  if (symbols.some((symbol) => includesAny(symbol, ["create", "serve", "handler", "app", "route"]))) {
    out.push(facet("symbol", "transport-constructor", symbols.filter((symbol) => includesAny(symbol, ["create", "serve", "handler", "app", "route"])).slice(0, 12)));
  }
  if (symbols.some((symbol) => includesAny(symbol, ["read", "discover", "index", "search", "graph", "atlas"]))) {
    out.push(facet("symbol", "reader-projection", symbols.filter((symbol) => includesAny(symbol, ["read", "discover", "index", "search", "graph", "atlas"])).slice(0, 12)));
  }

  if (deps.some((dep) => dep === "@emsenn/http-server" || dep === "@emsenn/organizing-with-the-web")) out.push(facet("dependency", "web-capability", deps.filter((dep) => dep === "@emsenn/http-server" || dep === "@emsenn/organizing-with-the-web")));
  if (deps.some((dep) => dep === "@emsenn/organizing-with-jsnode")) out.push(facet("dependency", "jsnode-capability", ["@emsenn/organizing-with-jsnode"]));
  if (deps.some((dep) => dep.includes("llm") || dep.includes("animating"))) out.push(facet("dependency", "agentic-capability", deps.filter((dep) => dep.includes("llm") || dep.includes("animating"))));

  return Object.freeze(out);
}

function packageModules(repoRoot: string, pkgName: string, pkgDir: string): readonly PackageAtlasModule[] {
  try {
    const byModule = new Map<string, {
      file: string;
      symbols: {
        name: string;
        kind: string;
        signature: string;
        documented: boolean;
        doc: string;
      }[];
    }>();
    for (const symbol of readPackageDocSymbols(pkgDir, { excludeDirs: ["scripts"] })) {
      const bucket = byModule.get(symbol.module) ?? {
        file: path.relative(repoRoot, symbol.file),
        symbols: [],
      };
      bucket.symbols.push({
        name: symbol.name,
        kind: symbol.kind,
        signature: symbol.signature,
        documented: symbol.doc.trim() !== "",
        doc: symbol.doc,
      });
      byModule.set(symbol.module, bucket);
    }
    return Object.freeze([...byModule.entries()]
      .map(([module, entry]) => Object.freeze({
        module,
        import: module === "." ? pkgName : `${pkgName}/${module}`,
        file: entry.file,
        symbols: Object.freeze(entry.symbols
          .sort((a, b) => a.name.localeCompare(b.name) || a.signature.localeCompare(b.signature))
          .map((symbol) => Object.freeze(symbol))),
      }))
      .sort((a, b) => (a.module === "." ? -1 : b.module === "." ? 1 : a.module.localeCompare(b.module))));
  } catch {
    return Object.freeze([]);
  }
}

export async function packageAtlas(repoRoot: string, name: string, options: PackageAtlasOptions = {}): Promise<PackageAtlasView | null> {
  const focus = name.trim();
  if (focus === "") return null;
  const workspace = await discoverWorkspace(repoRoot);
  const pkg = workspace.packages.find((candidate) => candidate.name === focus);
  if (pkg === undefined) return null;
  const discovered = [...eachWorkspacePackageDir(repoRoot)].find((candidate) => candidate.name === focus);
  if (discovered === undefined) return null;

  const full = workspaceDependencyGraph(workspace);
  const graph = egoGraph(full, focus, { upDepth: 1, downDepth: 1 });
  const packageReading = Object.freeze({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    layer: pkg.layer,
    lifecycle: pkg.lifecycle,
    maturity: pkg.maturity,
    tags: pkg.tags,
    exports: pkg.exports,
    dependencies: pkg.dependencies,
    deps: pkg.deps,
    manifest: pkg.manifest,
    path: path.relative(repoRoot, discovered.dir),
  });
  const modules = packageModules(repoRoot, pkg.name, discovered.dir);
  const dependents = uniqueSorted(full.edges.filter((edge) => edge.to === focus).map((edge) => edge.from));
  const detail = options.detail ?? "surface";
  const typeIndex = detail === "full" ? workspaceTypeIndex(repoRoot) : null;
  const consumption = detail === "full" ? workspaceConsumptionIndex(repoRoot) : null;
  const subtypes = typeIndex?.subtypes.filter((subtype) => subtype.pkg === focus) ?? [];

  return Object.freeze({
    kind: "jsnode.package-atlas" as const,
    package: packageReading,
    graph,
    facets: packageFacets({ pkg: packageReading, modules, dependents }),
    dependents,
    modules,
    functions: Object.freeze((typeIndex?.functions ?? [])
      .filter((fn) => fn.pkg === focus)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((fn) => Object.freeze({
        name: fn.name,
        domain: fn.domain,
        ...(fn.codomain === undefined ? {} : { codomain: fn.codomain }),
        consumers: uniqueSorted(consumption === null ? [] : consumersOfSymbol(consumption, focus, fn.name).map((consumer) => consumer.consumer)),
      }))),
    types: Object.freeze((typeIndex?.types ?? [])
      .filter((type) => type.pkg === focus)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((type) => Object.freeze({
        name: type.name,
        kind: type.kind,
        bases: uniqueSorted(subtypes.filter((subtype) => subtype.sub === type.name).map((subtype) => subtype.base)),
      }))),
    coarseConsumers: uniqueSorted(consumption === null ? [] : coarseConsumersOfPackage(consumption, focus).map((consumer) => consumer.consumer)),
  });
}

export async function moduleAtlas(repoRoot: string, pkgName: string, moduleName: string, options: PackageAtlasOptions = {}): Promise<ModuleAtlasView | null> {
  const atlas = await packageAtlas(repoRoot, pkgName, options);
  if (atlas === null) return null;
  const module = atlas.modules.find((candidate) => candidate.module === moduleName || candidate.import === moduleName);
  if (module === undefined) return null;
  return Object.freeze({
    kind: "jsnode.module-atlas" as const,
    package: atlas.package,
    module,
    siblingModules: atlas.modules.map((candidate) => candidate.module),
    facets: atlas.facets.filter((facet) => facet.axis === "module" && facet.evidence.some((evidence) => evidence === module.module || evidence === module.import)),
  });
}

export async function symbolAtlas(repoRoot: string, pkgName: string, symbolName: string, options: PackageAtlasOptions = {}): Promise<SymbolAtlasView | null> {
  const atlas = await packageAtlas(repoRoot, pkgName, options);
  if (atlas === null) return null;
  const module = atlas.modules.find((candidate) => candidate.symbols.some((symbol) => symbol.name === symbolName));
  const symbol = module?.symbols.find((candidate) => candidate.name === symbolName);
  if (module === undefined || symbol === undefined) return null;
  const functions = atlas.functions.filter((fn) => fn.name === symbolName);
  const types = atlas.types.filter((type) => type.name === symbolName);
  return Object.freeze({
    kind: "jsnode.symbol-atlas" as const,
    package: atlas.package,
    symbol: Object.freeze({ ...symbol, module: module.module, import: module.import, file: module.file }),
    functions,
    types,
    consumers: uniqueSorted(functions.flatMap((fn) => fn.consumers)),
    facets: atlas.facets.filter((facet) => facet.axis === "symbol" && facet.evidence.some((evidence) => evidence.includes(`:${symbolName}:`))),
  });
}
