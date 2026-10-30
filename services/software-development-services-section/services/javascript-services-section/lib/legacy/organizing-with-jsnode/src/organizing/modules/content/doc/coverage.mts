/**
 * coverage — measure JSDoc coverage of a package's exported API surface.
 *
 * A public symbol is "documented" iff it carries a leading JSDoc description
 * (a `/** … *​/` block above the declaration). `docCoverage` is pure over the
 * modules read by `reference.readPackageApi`; the `gaps` it returns name every
 * undocumented export, so a documenter — human or agent — gets an exact
 * worklist rather than a vague "improve the docs". The `ratio` is the single
 * number a CI gate or audit can track: a package's API-doc debt at a glance.
 */
import { readPackageApi, type ApiModule, type ReadApiOptions } from "./reference.mjs";
import type { DocSymbolKind } from "../../documentation.mjs";

/** One undocumented exported symbol: where it lives and what it is. */
export interface CoverageGap {
  readonly module: string;
  readonly name: string;
  readonly kind: DocSymbolKind;
}

export interface DocCoverage {
  readonly total: number;
  readonly documented: number;
  readonly undocumented: number;
  /** documented / total, in [0, 1]. `1` for an empty surface (vacuously fully
   *  documented — nothing is missing). */
  readonly ratio: number;
  readonly gaps: readonly CoverageGap[];
}

/** Compute JSDoc coverage over already-read API modules. Pure: no I/O. */
export function docCoverage(modules: readonly ApiModule[]): DocCoverage {
  let total = 0;
  let documented = 0;
  const gaps: CoverageGap[] = [];
  for (const m of modules) {
    for (const sym of m.symbols) {
      total += 1;
      if (sym.doc.trim() !== "") {
        documented += 1;
      } else {
        gaps.push({ module: m.subpath, name: sym.name, kind: sym.kind });
      }
    }
  }
  const undocumented = total - documented;
  const ratio = total === 0 ? 1 : documented / total;
  return { total, documented, undocumented, ratio, gaps };
}

/** Read a package's source and compute its JSDoc coverage in one step. The
 *  filesystem reader; `docCoverage` is the pure core it wraps. */
export function packageDocCoverage(
  pkgDir: string,
  opts: ReadApiOptions = {},
): DocCoverage {
  return docCoverage(readPackageApi(pkgDir, opts));
}
