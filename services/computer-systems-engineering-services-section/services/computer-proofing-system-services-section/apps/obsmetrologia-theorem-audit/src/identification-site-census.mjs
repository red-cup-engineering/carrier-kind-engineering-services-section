/**
 * Pure parsing and aggregation algebra for the whole-library Obsmetrologia
 * identification-site census. No I/O: callers run
 * `scripts/census-set-of-identification-sites.lean` via `lake env lean`
 * and pass the captured stdout in here. A stipulated identification (a
 * direct use of `Quot.sound`/`Quot.mk`/`Quot.lift`/`Quotient.*`) is a
 * site; a theorem inherits every site in its house-constant closure.
 */
import { moduleOf } from "./theorem-census.mjs";

const SITES_PREFIX = "#sites\t";
const SITE_PREFIX = "#site\t";

/**
 * Parse the Lean census program's stdout: one `#sites\t<n>` total line,
 * `n` `#site\t<name>` lines naming every distinct site, then one
 * `theorem\tsiteCount\tcomma-joined sites` row per house theorem. Any other
 * line beginning with `#` (e.g. `#excluded-auto-generated\t<count>`) is a
 * header this parser does not itself consume and is skipped generically,
 * never mistaken for a theorem row.
 *
 * @param {string} text - Combined stdout of the identification-site census program.
 * @returns {{sites: string[], rows: Array<{theorem: string, siteCount: number, sites: string[]}>}}
 */
export function parseSiteRows(text) {
  const lines = String(text).split(/\r?\n/);
  const sites = [];
  const rows = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith(SITES_PREFIX)) continue;
    if (line.startsWith(SITE_PREFIX)) {
      sites.push(line.slice(SITE_PREFIX.length));
      continue;
    }
    if (line.startsWith("#")) continue;
    const firstTab = line.indexOf("\t");
    if (firstTab === -1) continue;
    const theorem = line.slice(0, firstTab);
    const rest = line.slice(firstTab + 1);
    const secondTab = rest.indexOf("\t");
    const countField = secondTab === -1 ? rest : rest.slice(0, secondTab);
    const sitesField = secondTab === -1 ? "" : rest.slice(secondTab + 1);
    const theoremSites = sitesField === "" ? [] : sitesField.split(",");
    rows.push({ theorem, siteCount: Number(countField), sites: theoremSites });
  }
  return { sites, rows };
}

/**
 * Aggregate a parsed identification-site census into totals, the
 * per-theorem site-count histogram, the 30 sites inherited by the most
 * theorems, the distinct sites grouped by their module, and the
 * per-module zero/one/two-or-more theorem breakdown.
 *
 * @param {{sites: string[], rows: Array<{theorem: string, siteCount: number, sites: string[]}>}} parsed
 * @returns {{
 *   theorems: number,
 *   sites: number,
 *   siteCountDistribution: Record<string, number>,
 *   mostInherited: Array<[string, number]>,
 *   sitesByModule: Record<string, number>,
 *   byModule: Record<string, {theorems: number, zeroSites: number, oneSite: number, twoOrMore: number}>,
 * }}
 */
export function summarizeSites({ sites, rows }) {
  const siteCountDistribution = {};
  const inheritCounts = new Map();
  const byModule = {};
  for (const row of rows) {
    const key = String(row.siteCount);
    siteCountDistribution[key] = (siteCountDistribution[key] ?? 0) + 1;
    for (const site of row.sites) {
      inheritCounts.set(site, (inheritCounts.get(site) ?? 0) + 1);
    }
    const moduleName = moduleOf(row.theorem);
    const moduleStats = byModule[moduleName] ?? (byModule[moduleName] = {
      theorems: 0,
      zeroSites: 0,
      oneSite: 0,
      twoOrMore: 0,
    });
    moduleStats.theorems += 1;
    if (row.siteCount === 0) moduleStats.zeroSites += 1;
    else if (row.siteCount === 1) moduleStats.oneSite += 1;
    else moduleStats.twoOrMore += 1;
  }
  const mostInherited = [...inheritCounts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 30);
  const sitesByModule = {};
  for (const site of sites) {
    const moduleName = moduleOf(site);
    sitesByModule[moduleName] = (sitesByModule[moduleName] ?? 0) + 1;
  }
  return {
    theorems: rows.length,
    sites: sites.length,
    siteCountDistribution,
    mostInherited,
    sitesByModule,
    byModule,
  };
}

/**
 * The identification discipline this census measures, as prose for the
 * record's `reading` field.
 */
export const IDENTIFICATION_SITE_READING =
  "A stipulated identification (any direct use of Quot.sound, Quot.mk, Quot.lift, or a Quotient.* " +
  "constant) is a site; a theorem inherits every site in its house-constant dependency closure. " +
  "Owner-ruled 2026-09-03: the library is meant to spend exactly one identification, at the " +
  "articulating root, with everything downstream inheriting it — siteCount <= 1 with the one site " +
  "at the root is settled, more is postulated. Today 118 sites exist, and the root " +
  "(Primitive/Mark, Articulation/Articulating) has none.";

/**
 * Assemble the final identification-site census record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   parsed: {sites: string[], rows: Array<{theorem: string, siteCount: number, sites: string[]}>},
 * }} options
 * @returns {{
 *   type: "ObsmetrologiaIdentificationSiteCensus",
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   reading: string,
 *   summary: ReturnType<typeof summarizeSites>,
 * }}
 */
export function assembleSiteRecord({ checkedAt, packageRoot, leanSourcePath, parsed }) {
  return {
    type: "ObsmetrologiaIdentificationSiteCensus",
    checkedAt,
    packageRoot,
    leanSourcePath,
    reading: IDENTIFICATION_SITE_READING,
    summary: summarizeSites(parsed),
  };
}
