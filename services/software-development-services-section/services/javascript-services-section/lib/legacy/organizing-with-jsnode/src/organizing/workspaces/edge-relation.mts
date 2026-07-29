/**
 * edge-relation — what relates two workspace packages along one dependency edge.
 *
 * Given a consumer and a provider, this resolves every symbol the consumer
 * imports from the provider — its kind (a provider function / type / other
 * value), whether it is type-only, and, for each consumer module that imports
 * it, the local binding name and the consumer declarations that use it. It is
 * the read behind a clickable package-graph edge: "click the line A → B, see
 * exactly what A pulls from B and where A uses it."
 *
 * Composes the cheap syntactic reads — `namedImportsFrom` / `enclosingReferences`
 * (modules/references) and `readImports` (modules/imports) for coarse reaches —
 * with the built `WorkspaceTypeIndex` for kind classification. Usage is a
 * syntactic over-approximation; see modules/references.
 */
import path from "node:path";
import { eachWorkspacePackageDir, type WorkspaceFilter } from "./workspace.mjs";
import { sourceModuleFiles } from "../modules/source.mjs";
import { parseJSNodeSourceFile } from "../modules/syntax.mjs";
import { readImports } from "../modules/imports.mjs";
import { namedImportsFrom, enclosingReferences } from "../modules/references.mjs";
import { workspaceTypeIndex, type WorkspaceTypeIndex } from "./type-index.mjs";

/** One consumer module's use of a provider symbol: where it is bound and the
 *  declarations that reference it. */
export interface EdgeSymbolModule {
  /** Consumer source file, relative to the repo root. */
  readonly file: string;
  /** The local name the module binds the symbol to. */
  readonly local: string;
  /** Consumer declarations that reference the binding (syntactic). */
  readonly usedIn: readonly string[];
}

/** One symbol crossing the edge: a provider export the consumer names. */
export interface EdgeSymbol {
  readonly name: string;
  /** `function`/`type` per the provider's built surface; `value` when the name
   *  is imported but is not a built function/type (unbuilt, or a const/enum). */
  readonly kind: "function" | "type" | "value";
  readonly typeOnly: boolean;
  readonly modules: readonly EdgeSymbolModule[];
}

/** A coarse reach that names no symbol (namespace import, star re-export, dynamic
 *  import) — it relates the packages but cannot be resolved to specific symbols. */
export interface EdgeCoarseReach {
  readonly mode: "namespace" | "star-reexport" | "dynamic";
  readonly file: string;
}

/** Everything relating a consumer to a provider along one edge. */
export interface PackageEdgeRelation {
  readonly consumer: string;
  readonly provider: string;
  /** True when at least one symbol or coarse reach was found. */
  readonly related: boolean;
  readonly symbols: readonly EdgeSymbol[];
  readonly coarse: readonly EdgeCoarseReach[];
}

function providerSymbolKinds(typeIndex: WorkspaceTypeIndex, provider: string): {
  functions: ReadonlySet<string>;
  types: ReadonlySet<string>;
} {
  const functions = new Set<string>();
  const types = new Set<string>();
  for (const f of typeIndex.functions) if (f.pkg === provider) functions.add(f.name);
  for (const t of typeIndex.types) if (t.pkg === provider) types.add(t.name);
  return { functions, types };
}

interface SymbolAccumulator {
  typeOnly: boolean;
  readonly modules: EdgeSymbolModule[];
}

/** Resolve what relates `consumer` to `provider`: the symbols it imports, their
 *  kinds, and the consumer declarations that use them. */
export function packageEdgeRelation(
  root: string,
  consumer: string,
  provider: string,
  filter: WorkspaceFilter = {},
): PackageEdgeRelation {
  const consumerDir = [...eachWorkspacePackageDir(root, filter)].find((entry) => entry.name === consumer)?.dir;
  if (consumerDir === undefined) {
    return { consumer, provider, related: false, symbols: [], coarse: [] };
  }

  const fromProvider = (specifier: string): boolean =>
    specifier === provider || specifier.startsWith(`${provider}/`);
  const { functions, types } = providerSymbolKinds(workspaceTypeIndex(root, filter), provider);

  const symbols = new Map<string, SymbolAccumulator>();
  const coarse: EdgeCoarseReach[] = [];

  for (const file of sourceModuleFiles(consumerDir)) {
    const relative = path.relative(root, file);
    const source = parseJSNodeSourceFile(file);

    // Coarse reaches that name no symbol, read off the binding modes.
    for (const binding of readImports(source.getFullText(), file)) {
      if (binding.specifier === undefined || !fromProvider(binding.specifier)) continue;
      if (binding.mode === "namespace" || binding.mode === "star-reexport" || binding.mode === "dynamic") {
        coarse.push({ mode: binding.mode, file: relative });
      }
    }

    const named = namedImportsFrom(source, fromProvider);
    if (named.length === 0) continue;
    const usedIn = enclosingReferences(source, new Set(named.map((binding) => binding.local)));
    for (const binding of named) {
      let accumulator = symbols.get(binding.providerName);
      if (!accumulator) symbols.set(binding.providerName, (accumulator = { typeOnly: true, modules: [] }));
      accumulator.typeOnly = accumulator.typeOnly && binding.typeOnly;
      accumulator.modules.push({
        file: relative,
        local: binding.local,
        usedIn: [...(usedIn.get(binding.local) ?? [])].sort(),
      });
    }
  }

  const resolved: EdgeSymbol[] = [...symbols.entries()]
    .map(([name, accumulator]) => ({
      name,
      kind: functions.has(name) ? "function" : types.has(name) ? "type" : "value",
      typeOnly: accumulator.typeOnly,
      modules: accumulator.modules,
    } as EdgeSymbol))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    consumer,
    provider,
    related: resolved.length > 0 || coarse.length > 0,
    symbols: resolved,
    coarse,
  };
}
