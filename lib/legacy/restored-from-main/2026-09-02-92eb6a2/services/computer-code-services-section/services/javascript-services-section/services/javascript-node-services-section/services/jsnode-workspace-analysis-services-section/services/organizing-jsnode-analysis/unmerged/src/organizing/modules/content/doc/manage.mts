/**
 * manage — workspace-aware reading and re-documenting of a package's source.
 *
 * reference.mts and coverage.mts *read* a package's API surface; this layer lets
 * a documenter *act* on it by package + symbol name, without hand-navigating
 * file paths: locate the source file a symbol lives in, read the symbol's full
 * text (body and all), and write its docstring back. The syntactic engine — the
 * TypeScript parse, the JSDoc splice — is ../../javascript/index.mjs; this adds
 * file resolution over a package's `src` tree and the read/write-to-disk
 * wrappers. The code body is never in the edit path: only the comment layer is
 * rewritten, which is what makes bulk re-documentation safe.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  locateDocSymbols,
  readSymbolSource,
  setJsDoc,
  type DeclaredSymbol,
} from "../../documentation-edit.mjs";
import {
  moduleSubpathOf,
  packageSourceRoot,
} from "../../package-surface.mjs";
import {
  sourceModuleFiles,
} from "../../source.mjs";
import type { ReadApiOptions } from "./reference.mjs";

/** Where a symbol was found: its module (source dir relative to `src`, `.` for
 *  the root), the absolute file path, and the located declaration. */
export interface SymbolLocation {
  readonly module: string;
  readonly file: string;
  readonly symbol: DeclaredSymbol;
}

function packageApiFiles(pkgDir: string, opts: ReadApiOptions): readonly string[] {
  return sourceModuleFiles(
    packageSourceRoot(pkgDir, opts),
    opts.excludeDirs === undefined ? {} : { excludeDirs: opts.excludeDirs },
  ).filter((file) => file.endsWith(".mts"));
}

/** Options for addressing a single symbol. This is a projection control over
 *  the package API read, not admitted data: symbol identity is found from the
 *  source surface and package carriers. `file` scopes the search to one source
 *  file (matched by suffix against the package-relative or absolute path) —
 *  essential for safe concurrent edits and for addressing a symbol whose name
 *  is not unique across the package. */
export interface LocateOptions extends ReadApiOptions {
  readonly file?: string;
}

/** Locate one exported symbol across a package's source. With `opts.file`, only
 *  that file is searched; otherwise returns the first match in sorted file order
 *  (the public surface keeps symbol names unique in practice). `undefined` when
 *  no matching export exists. */
export function locatePackageSymbol(
  pkgDir: string,
  name: string,
  opts: LocateOptions = {},
): SymbolLocation | undefined {
  const want = opts.file === undefined ? undefined : opts.file.split(path.sep).join("/");
  const sourceRoot = packageSourceRoot(pkgDir, opts);
  for (const file of packageApiFiles(pkgDir, opts)) {
    if (want !== undefined && !file.split(path.sep).join("/").endsWith(want)) continue;
    const symbol = locateDocSymbols(file).find((s) => s.name === name);
    if (symbol) return { module: moduleSubpathOf(sourceRoot, file), file, symbol };
  }
  return undefined;
}

/** Read the full source text of a symbol in a package. `includeDoc` prepends its
 *  existing JSDoc. Returns `undefined` when the symbol is not found. */
export function readPackageSymbol(
  pkgDir: string,
  name: string,
  opts: { readonly includeDoc?: boolean } & LocateOptions = {},
): string | undefined {
  const found = locatePackageSymbol(pkgDir, name, opts);
  if (!found) return undefined;
  return readSymbolSource(found.file, name, { includeDoc: opts.includeDoc ?? false });
}

/** A package symbol's documentary state, for listing/auditing a module. */
export interface SymbolEntry {
  readonly module: string;
  readonly name: string;
  readonly kind: DeclaredSymbol["kind"];
  readonly documented: boolean;
}

/** List every exported symbol in a package (optionally one module), with its
 *  documentary state — the "read the module's surface" view. */
export function listPackageSymbols(
  pkgDir: string,
  opts: { readonly module?: string } & ReadApiOptions = {},
): readonly SymbolEntry[] {
  const out: SymbolEntry[] = [];
  const sourceRoot = packageSourceRoot(pkgDir, opts);
  for (const file of packageApiFiles(pkgDir, opts)) {
    const module = moduleSubpathOf(sourceRoot, file);
    if (opts.module !== undefined && module !== opts.module) continue;
    for (const s of locateDocSymbols(file)) {
      out.push({ module, name: s.name, kind: s.kind, documented: s.documented });
    }
  }
  return out;
}

/** Write `doc` as the JSDoc of `name` in its package source file, replacing any
 *  existing block. Returns the location written. Throws when the symbol is not
 *  found. Only the comment layer changes; the code body is preserved verbatim. */
export function setPackageSymbolDoc(
  pkgDir: string,
  name: string,
  doc: string,
  opts: { readonly width?: number } & LocateOptions = {},
): SymbolLocation {
  const found = locatePackageSymbol(pkgDir, name, opts);
  if (!found) {
    const where = opts.file !== undefined ? ` in ${opts.file}` : "";
    throw new Error(`no exported symbol named "${name}"${where} in ${pkgDir}`);
  }
  const source = readFileSync(found.file, "utf8");
  const next = setJsDoc(source, name, doc, opts.width !== undefined ? { width: opts.width } : {});
  writeFileSync(found.file, next);
  return found;
}
