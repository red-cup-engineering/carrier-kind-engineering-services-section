/**
 * Pure parsing and aggregation algebra for the whole-library Obsmetrologia
 * spine-lineage census. No I/O: callers run
 * `scripts/census-set-of-spine-lineage.lean` via `lake env lean` and pass
 * the captured stdout in here.
 *
 * The "articulating spine" is the tiered chain of house namespaces the
 * owner's rule says everything derives from: 1-mark, 2-utterance,
 * 3-articulating, 4-predicating, 5-positing, 6-settling. For every house
 * theorem, the Lean program walks its transitive house-constant closure
 * and records every tier touched. A theorem touching no spine constant in
 * its dependency closure is standalone mathematics under the namespace,
 * not derived from articulating — the owner's rule is that everything
 * derives from articulating.
 */
import { moduleOf } from "./theorem-census.mjs";

const THEOREMS_PREFIX = "#theorems\t";
const TOUCHING_PREFIX = "#touching-spine\t";
const DEEPEST_PREFIX = "#deepest\t";
const MODULE_PREFIX = "#module\t";

/** Every tier name, standalone first, shallowest to deepest. */
export const TIERS = [
  "0-none",
  "1-mark",
  "2-utterance",
  "3-articulating",
  "4-predicating",
  "5-positing",
  "6-settling",
];

/**
 * Parse the Lean census program's stdout: header lines `#theorems\t<n>`,
 * `#touching-spine\t<n>`, `#deepest\t<tier>\t<count>`, and
 * `#module\t<module>\t<theorems>\t<touching>\t<tier=count ...>` (all
 * informational, recomputed from rows below), then one
 * `theorem\tdeepestTier\tcomma-joined tiers` row per house theorem. Any
 * other line beginning with `#` (e.g. `#excluded-auto-generated\t<count>`)
 * is a header this parser does not itself consume and is skipped
 * generically, never mistaken for a theorem row.
 *
 * @param {string} text - Combined stdout of the spine-lineage census program.
 * @returns {{rows: Array<{theorem: string, deepestTier: string, tiers: string[]}>}}
 */
export function parseSpineRows(text) {
  const lines = String(text).split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line) continue;
    if (
      line.startsWith(THEOREMS_PREFIX) ||
      line.startsWith(TOUCHING_PREFIX) ||
      line.startsWith(DEEPEST_PREFIX) ||
      line.startsWith(MODULE_PREFIX)
    ) {
      continue;
    }
    if (line.startsWith("#")) continue;
    const firstTab = line.indexOf("\t");
    if (firstTab === -1) continue;
    const theorem = line.slice(0, firstTab);
    const rest = line.slice(firstTab + 1);
    const secondTab = rest.indexOf("\t");
    const deepestTier = secondTab === -1 ? rest : rest.slice(0, secondTab);
    const tiersField = secondTab === -1 ? "" : rest.slice(secondTab + 1);
    const tiers = tiersField === "" ? [] : tiersField.split(",");
    rows.push({ theorem, deepestTier, tiers });
  }
  return { rows };
}

/**
 * Aggregate a parsed spine-lineage census, purely from rows (the Lean
 * program's header lines are informational only): totals, how many
 * theorems touch no spine tier at all (standalone), the deepest-tier
 * distribution, the per-module breakdown (theorems/touching/standalone
 * plus a deepest-tier histogram), and the modules with zero theorems
 * touching the spine.
 *
 * @param {{rows: Array<{theorem: string, deepestTier: string, tiers: string[]}>}} parsed
 * @returns {{
 *   theorems: number,
 *   touchingSpine: number,
 *   standaloneCount: number,
 *   deepestTierDistribution: Record<string, number>,
 *   byModule: Record<string, {theorems: number, touching: number, standalone: number, deepest: Record<string, number>}>,
 *   standaloneModules: string[],
 * }}
 */
export function summarizeSpineLineage({ rows }) {
  const deepestTierDistribution = {};
  const byModule = {};
  let touchingSpine = 0;
  for (const row of rows) {
    const touches = row.tiers.length > 0;
    if (touches) touchingSpine += 1;
    deepestTierDistribution[row.deepestTier] = (deepestTierDistribution[row.deepestTier] ?? 0) + 1;
    const moduleName = moduleOf(row.theorem);
    const moduleStats = byModule[moduleName] ?? (byModule[moduleName] = {
      theorems: 0,
      touching: 0,
      standalone: 0,
      deepest: {},
    });
    moduleStats.theorems += 1;
    if (touches) moduleStats.touching += 1;
    else moduleStats.standalone += 1;
    moduleStats.deepest[row.deepestTier] = (moduleStats.deepest[row.deepestTier] ?? 0) + 1;
  }
  const standaloneModules = Object.keys(byModule)
    .filter((moduleName) => byModule[moduleName].touching === 0)
    .sort();
  return {
    theorems: rows.length,
    touchingSpine,
    standaloneCount: rows.length - touchingSpine,
    deepestTierDistribution,
    byModule,
    standaloneModules,
  };
}

/**
 * The spine-lineage discipline this census measures, as prose for the
 * record's `reading` field.
 */
export const SPINE_LINEAGE_READING =
  "The articulating spine is the tiered chain of house namespaces the owner's rule says " +
  "everything derives from (1-mark, 2-utterance, 3-articulating, 4-predicating, 5-positing, " +
  "6-settling). For every house theorem this census walks its transitive house-constant " +
  "closure and records every tier touched. A theorem touching no spine constant in its " +
  "dependency closure is standalone mathematics under the namespace, not derived from " +
  "articulating; the owner's rule is that everything derives from articulating.";

/**
 * Assemble the final spine-lineage census record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   leanSource?: string,
 *   parsed: {rows: Array<{theorem: string, deepestTier: string, tiers: string[]}>},
 * }} options
 * @returns {{
 *   type: "ObsmetrologiaSpineLineageCensus",
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   leanSource: string|undefined,
 *   reading: string,
 *   summary: ReturnType<typeof summarizeSpineLineage>,
 * }}
 */
export function assembleSpineRecord({ checkedAt, packageRoot, leanSourcePath, leanSource, parsed }) {
  return {
    type: "ObsmetrologiaSpineLineageCensus",
    checkedAt,
    packageRoot,
    leanSourcePath,
    leanSource,
    reading: SPINE_LINEAGE_READING,
    summary: summarizeSpineLineage(parsed),
  };
}
