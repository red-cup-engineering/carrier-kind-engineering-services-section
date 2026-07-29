/**
 * surface — read a workspace package's *documentary* surface off disk.
 *
 * This is the I/O edge of the content computer: it walks a package's authored
 * source, projects each file through `../../javascript/index.mjs`'s
 * `extractDocSurface` (verbatim signatures + JSDoc), folds the per-file symbols
 * into one deduplicated public surface, and reads the manifest description and
 * any existing README as intake context. Load-bearing rank — how many other
 * packages consume each symbol — enters as an injected `ranks` value so the
 * pure ranking machinery (and its heavy workspace sweep) stays the caller's
 * choice, never forced on a single-symbol run.
 *
 * Everything downstream (prompting, gating, formatting) takes a PackageSurface
 * as a value and never touches the filesystem.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import type { DocSymbol } from "../../documentation.mjs";
import { readPackageDocSymbols } from "../../package-surface.mjs";
import { readJSNodePackageManifest } from "../../../workspaces/workspace.mjs";

/** One exported symbol plus the source file it was read from and its
 *  load-bearing rank (consumer count; 0 when unknown or unconsumed). */
export interface SurfaceSymbol extends DocSymbol {
  readonly file: string;
  readonly rank: number;
}

/** A package read as a documentary surface: its identity, its public symbols
 *  (ranked, most load-bearing first), and the existing prose to draw on. */
export interface PackageSurface {
  readonly name: string;
  readonly description: string;
  readonly dir: string;
  readonly symbols: readonly SurfaceSymbol[];
  readonly existingReadme?: string;
}

/** Projection controls for reading a package's documentary surface. Ranking
 *  data is injected as a read of the workspace consumption carrier; this shape
 *  does not admit a separate symbol model. */
export interface ReadSurfaceOptions {
  /** Consumer count per exported symbol name, from the workspace consumption
   *  index. Injected so the heavy sweep is the caller's choice. */
  readonly ranks?: ReadonlyMap<string, number>;
}

/** Read one package directory into a PackageSurface. Symbols are deduplicated
 *  by name (a name re-declared across modules collapses to one public symbol —
 *  the documented declaration wins over an undocumented re-export), then sorted
 *  by load-bearing rank descending so the most consumed symbols lead. */
export function readPackageSurface(dir: string, options: ReadSurfaceOptions = {}): PackageSurface {
  const manifest = readJSNodePackageManifest(dir) ?? {};

  const ranks = options.ranks ?? new Map<string, number>();
  const byName = new Map<string, SurfaceSymbol>();
  for (const sym of readPackageDocSymbols(dir)) {
      const existing = byName.get(sym.name);
      if (existing !== undefined && (existing.doc !== "" || sym.doc === "")) continue;
      byName.set(sym.name, Object.freeze({ ...sym, rank: ranks.get(sym.name) ?? 0 }));
  }

  const symbols = [...byName.values()].sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));

  const readmePath = path.join(dir, "README.md");
  const existingReadme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : undefined;

  return Object.freeze({
    name: typeof manifest["name"] === "string" ? manifest["name"] : path.basename(dir),
    description: typeof manifest["description"] === "string" ? manifest["description"] : "",
    dir,
    symbols: Object.freeze(symbols),
    ...(existingReadme === undefined ? {} : { existingReadme }),
  });
}

/** The set of every API name this surface vouches for: its own exported
 *  symbols plus every type named in their signatures. The no-hallucinated-API
 *  gate checks the model's output against this vocabulary. */
export function surfaceVocabulary(surface: PackageSurface): ReadonlySet<string> {
  const vocab = new Set<string>();
  for (const sym of surface.symbols) {
    vocab.add(sym.name);
    for (const name of typeNamesIn(sym.signature)) vocab.add(name);
  }
  return vocab;
}

/** The names that exist as runtime VALUE bindings — functions, classes,
 *  consts, plain values. Interfaces and type aliases are erased at runtime, so
 *  reusing their names as local variables is safe; only these create the TDZ
 *  shadowing hazard the example-fidelity gate guards against. */
export function surfaceValueExports(surface: PackageSurface): ReadonlySet<string> {
  const values = new Set<string>();
  for (const sym of surface.symbols) {
    if (sym.kind === "interface" || sym.kind === "type-alias") continue;
    values.add(sym.name);
  }
  return values;
}

/** Identifier-shaped tokens in a signature — used to seed the known
 *  vocabulary with the types a symbol already names (its params, returns,
 *  heritage). Deliberately permissive: over-admitting a real type name is
 *  harmless; the gate's job is to catch *invented* names. */
function typeNamesIn(signature: string): readonly string[] {
  return [...signature.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map((m) => m[1] ?? "");
}
