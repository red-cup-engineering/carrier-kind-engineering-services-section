/**
 * reference — read a package's *real* API surface from source and render it as
 * a Markdown API reference.
 *
 * The other generators here read package.json (the *declared* contract: name,
 * exports, deps). This one reads the *operational* contract: every exported
 * symbol's verbatim signature and its leading JSDoc, via
 * ../../javascript/index.mjs's `extractDocSurface`. `readPackageApi` walks the
 * package's `src` tree and groups the documented symbols by module (the source
 * directory, which lines up with the export subpaths); `generateApiReference`
 * renders that grouping to Markdown.
 *
 * The split keeps `generateApiReference` pure — modules in, Markdown out, no
 * I/O — so it is trivially testable; `readPackageApi` is the thin filesystem
 * reader. Output is fully sorted so regenerating a reference yields a stable
 * diff. Re-export-only `index.mts` files declare nothing and so contribute no
 * symbols; the real declarations come from the sibling module files.
 */
import type { DocSymbol } from "../../documentation.mjs";
import { readPackageDocSymbols } from "../../package-surface.mjs";

/** One module's documentary surface: a subpath label (the source directory
 *  relative to `src`, with `.` for the package root) and the exported symbols
 *  declared under it, already sorted. */
export interface ApiModule {
  readonly subpath: string;
  readonly symbols: readonly DocSymbol[];
}

/** Projection controls for reading the source API surface before it is folded
 *  into package documentation. The package identity and exported symbols are
 *  read from source and package carriers; this option record only bounds that
 *  projection. */
export interface ReadApiOptions {
  /** Source directory name to walk, relative to the package dir. Default `src`. */
  readonly srcDir?: string;
  /** Directory basenames to skip entirely (e.g. CLI entrypoints). Default
   *  `["scripts"]` — bin scripts are behavior, not library API. */
  readonly excludeDirs?: readonly string[];
}

const DEFAULT_EXCLUDE_DIRS: readonly string[] = ["scripts"];

/** Walk a package's `src` tree and return its API surface grouped by module.
 *  Skips `*.test.mts`, type-only `.d.mts`, and the excluded directories. A
 *  package that was never built still reads fine — this reads source, not
 *  `dist`. */
export function readPackageApi(
  pkgDir: string,
  opts: ReadApiOptions = {},
): readonly ApiModule[] {
  const byModule = new Map<string, DocSymbol[]>();
  const symbols = readPackageDocSymbols(pkgDir, {
    ...(opts.srcDir === undefined ? {} : { srcDir: opts.srcDir }),
    excludeDirs: opts.excludeDirs ?? DEFAULT_EXCLUDE_DIRS,
  });
  for (const symbol of symbols) {
    const bucket = byModule.get(symbol.module) ?? [];
    bucket.push(symbol);
    byModule.set(symbol.module, bucket);
  }

  // Sort modules (root first, then lexicographically) and symbols within each
  // (by name, then signature) for a stable, regenerable reference.
  return [...byModule.entries()]
    .map(([subpath, symbols]): ApiModule => ({
      subpath,
      symbols: [...symbols].sort(byNameThenSignature),
    }))
    .sort((a, b) => moduleOrder(a.subpath, b.subpath));
}

function byNameThenSignature(a: DocSymbol, b: DocSymbol): number {
  return a.name === b.name
    ? a.signature.localeCompare(b.signature)
    : a.name.localeCompare(b.name);
}

function moduleOrder(a: string, b: string): number {
  if (a === b) return 0;
  if (a === ".") return -1;
  if (b === ".") return 1;
  return a.localeCompare(b);
}

/** Render grouped API modules to a Markdown reference. Pure: no I/O. The
 *  package name forms the H1 and the per-module subpath headings (`name/sub`),
 *  so the output reads as the import surface a consumer actually sees. */
export function generateApiReference(
  pkgName: string,
  modules: readonly ApiModule[],
): string {
  const lines: string[] = [];
  lines.push(`# ${pkgName} — API reference`, "");
  lines.push(
    "> Generated from source by `jsnode-doc-computer reference`. Each entry is " +
      "the exported symbol's verbatim signature and its leading JSDoc; regenerate " +
      "after changing the public surface.",
    "",
  );

  const populated = modules.filter((m) => m.symbols.length > 0);
  if (populated.length === 0) {
    lines.push("_No exported, documented symbols found in source._", "");
    return lines.join("\n");
  }

  // A compact contents list of the modules, for quick navigation.
  lines.push("## Modules", "");
  for (const m of populated) lines.push(`- \`${importLabel(pkgName, m.subpath)}\``);
  lines.push("");

  for (const m of populated) {
    lines.push(`## \`${importLabel(pkgName, m.subpath)}\``, "");
    for (const sym of m.symbols) {
      lines.push(`### \`${sym.name}\` — ${sym.kind}`, "");
      lines.push("```ts", sym.signature, "```", "");
      lines.push(sym.doc.trim() === "" ? "_Undocumented._" : sym.doc.trim(), "");
    }
  }

  return lines.join("\n");
}

function importLabel(pkgName: string, subpath: string): string {
  return subpath === "." ? pkgName : `${pkgName}/${subpath}`;
}
