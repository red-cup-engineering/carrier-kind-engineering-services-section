/**
 * Pure parsing and aggregation algebra for the whole-library Obsmetrologia
 * identification-key census. No I/O: callers run
 * `scripts/census-set-of-identification-keys.lean` via `lake env lean` and
 * pass the captured stdout in here.
 *
 * An identification is *spent* where `Quot.sound` or `Quotient.sound` is
 * applied. A house spend is keyed by the relation or setoid it identifies
 * along (the head constant of the `r`/`s` argument); a spend made inside a
 * Lean-core constant is keyed `core:<constant>` (so `funext`, which core
 * proves by `Quot.sound`, is one key). A theorem inherits every key in the
 * transitive closure of the constants it uses, core and house alike. The
 * number of *distinct keys* a theorem inherits is the number of independent
 * identifications it rests on — the quantity the 2026-09-03 ruling prices,
 * which the identification-*site* census over-counts (it counts every
 * `Quot.mk`/`Quot.lift` use, which spend nothing) and under-counts (it
 * cannot see spends made inside core).
 */
import { moduleOf } from "./theorem-census.mjs";

const THEOREMS_PREFIX = "#theorems\t";
const KEYS_PREFIX = "#keys\t";
const KEY_PREFIX = "#key\t";
const HIST_PREFIX = "#hist\t";
const CORE_KEY_PREFIX = "core:";

/**
 * Whether a key names a spend made inside Lean core rather than in a house
 * constant.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function isCoreKey(key) {
  return String(key).startsWith(CORE_KEY_PREFIX);
}

/**
 * Parse the Lean census program's stdout: header lines `#theorems\t<n>`,
 * `#keys\t<n>`, `#key\t<name>\t<inheriting-theorems>`, `#hist\t<k>\t<n>`
 * (all informational, recomputed from rows below), then one
 * `theorem\tkeyCount\tcomma-joined keys` row per house theorem. Any other
 * line beginning with `#` (e.g. `#excluded-auto-generated\t<count>`) is a
 * header this parser does not itself consume and is skipped generically,
 * never mistaken for a theorem row.
 *
 * @param {string} text - Combined stdout of the identification-key census program.
 * @returns {{keys: string[], rows: Array<{theorem: string, keyCount: number, keys: string[]}>}}
 */
export function parseKeyRows(text) {
  const lines = String(text).split(/\r?\n/);
  const keys = [];
  const rows = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith(THEOREMS_PREFIX) || line.startsWith(KEYS_PREFIX) || line.startsWith(HIST_PREFIX)) continue;
    if (line.startsWith(KEY_PREFIX)) {
      const body = line.slice(KEY_PREFIX.length);
      const tab = body.indexOf("\t");
      keys.push(tab === -1 ? body : body.slice(0, tab));
      continue;
    }
    if (line.startsWith("#")) continue;
    const firstTab = line.indexOf("\t");
    if (firstTab === -1) continue;
    const theorem = line.slice(0, firstTab);
    const rest = line.slice(firstTab + 1);
    const secondTab = rest.indexOf("\t");
    const countField = secondTab === -1 ? rest : rest.slice(0, secondTab);
    const keysField = secondTab === -1 ? "" : rest.slice(secondTab + 1);
    const theoremKeys = keysField === "" ? [] : keysField.split(",");
    rows.push({ theorem, keyCount: Number(countField), keys: theoremKeys });
  }
  return { keys, rows };
}

/**
 * Aggregate a parsed identification-key census: totals, the per-theorem
 * distinct-key histogram, every key ranked by the theorems inheriting it
 * (split into house and core), the settled/postulated split against a
 * named root key, and the per-module zero/one/two-or-more breakdown.
 *
 * A theorem is *identification-free* when it inherits no key, *settled*
 * (relative to `rootKey`) when the only key it inherits is the root, and
 * *postulated* when it inherits any key other than the root. Without a
 * root key nothing is settled; every identified theorem is postulated.
 *
 * @param {{keys: string[], rows: Array<{theorem: string, keyCount: number, keys: string[]}>}} parsed
 * @param {{rootKey?: string|null}} [options]
 * @returns {{
 *   theorems: number,
 *   keys: number,
 *   houseKeys: number,
 *   coreKeys: number,
 *   keyCountDistribution: Record<string, number>,
 *   keysRanked: Array<[string, number]>,
 *   identificationFree: number,
 *   onlyCoreKeys: number,
 *   anyHouseKey: number,
 *   rootKey: string|null,
 *   settled: number,
 *   postulated: number,
 *   byModule: Record<string, {theorems: number, zeroKeys: number, oneKey: number, twoOrMore: number}>,
 * }}
 */
export function summarizeKeys({ rows }, { rootKey = null } = {}) {
  const keyCountDistribution = {};
  const inheritCounts = new Map();
  const byModule = {};
  let identificationFree = 0;
  let onlyCoreKeys = 0;
  let anyHouseKey = 0;
  let settled = 0;
  let postulated = 0;
  for (const row of rows) {
    const distinct = [...new Set(row.keys)];
    const count = distinct.length;
    const bucket = String(count);
    keyCountDistribution[bucket] = (keyCountDistribution[bucket] ?? 0) + 1;
    for (const key of distinct) {
      inheritCounts.set(key, (inheritCounts.get(key) ?? 0) + 1);
    }
    const houseKeys = distinct.filter((key) => !isCoreKey(key));
    if (count === 0) identificationFree += 1;
    else if (houseKeys.length === 0) onlyCoreKeys += 1;
    if (houseKeys.length > 0) anyHouseKey += 1;
    if (count > 0) {
      if (rootKey !== null && count === 1 && distinct[0] === rootKey) settled += 1;
      else postulated += 1;
    }
    const moduleName = moduleOf(row.theorem);
    const moduleStats = byModule[moduleName] ?? (byModule[moduleName] = {
      theorems: 0,
      zeroKeys: 0,
      oneKey: 0,
      twoOrMore: 0,
    });
    moduleStats.theorems += 1;
    if (count === 0) moduleStats.zeroKeys += 1;
    else if (count === 1) moduleStats.oneKey += 1;
    else moduleStats.twoOrMore += 1;
  }
  const keysRanked = [...inheritCounts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const houseKeys = keysRanked.filter(([key]) => !isCoreKey(key)).length;
  return {
    theorems: rows.length,
    keys: keysRanked.length,
    houseKeys,
    coreKeys: keysRanked.length - houseKeys,
    keyCountDistribution,
    keysRanked,
    identificationFree,
    onlyCoreKeys,
    anyHouseKey,
    rootKey,
    settled,
    postulated,
    byModule,
  };
}

/**
 * The identification discipline this census measures, as prose for the
 * record's `reading` field.
 */
export const IDENTIFICATION_KEY_READING =
  "An identification is spent where Quot.sound or Quotient.sound is applied. A house spend is " +
  "keyed by the relation or setoid it identifies along; a spend made inside a Lean-core constant " +
  "(funext above all: core proves function extensionality by Quot.sound) is keyed core:<constant>. " +
  "A theorem inherits every key in its full dependency closure, core and house alike; the number " +
  "of distinct keys it inherits is the number of independent identifications it rests on. " +
  "Owner-ruled 2026-09-03: the library is meant to spend exactly one identification, at the " +
  "articulating root, with everything downstream inheriting it — a theorem whose only key is the " +
  "root is settled, any other key is postulated. Reading through an identification (Quot.mk, " +
  "Quot.lift, Quotient.lift) spends nothing and is not a key; the identification-site census " +
  "counts those uses and so over-prices, while missing every spend made inside core.";

/**
 * Assemble the final identification-key census record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   leanSource?: string,
 *   rootKey?: string|null,
 *   parsed: {keys: string[], rows: Array<{theorem: string, keyCount: number, keys: string[]}>},
 * }} options
 * @returns {{
 *   type: "ObsmetrologiaIdentificationKeyCensus",
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   leanSource: string|undefined,
 *   reading: string,
 *   summary: ReturnType<typeof summarizeKeys>,
 * }}
 */
export function assembleKeyRecord({ checkedAt, packageRoot, leanSourcePath, leanSource, rootKey = null, parsed }) {
  return {
    type: "ObsmetrologiaIdentificationKeyCensus",
    checkedAt,
    packageRoot,
    leanSourcePath,
    leanSource,
    reading: IDENTIFICATION_KEY_READING,
    summary: summarizeKeys(parsed, { rootKey }),
  };
}
