/**
 * Pure parsing/aggregation for the whole-library Obsmetrologia
 * regime-instantiation census (mode per theorem: hypothesized/hand-built/
 * derived/table-only/mixed). No I/O: callers run
 * `scripts/census-set-of-regime-instantiations.lean` via `lake env lean`
 * and pass the captured stdout in here.
 */
import { moduleOf } from "./theorem-census.mjs";

const DATUM_PREFIX = "#datum\t";

/** The seven physics-lineage modules the census checks for zero regime-bearing theorems. */
export const PHYSICS_MODULES = [
  "KineticTheory",
  "Thermodynamics",
  "CausalSets",
  "QuantumContextuality",
  "AperiodicOrder",
  "ReactionNetworks",
  "DenseMatter",
];

/**
 * Split a comma-joined field into a list, treating the empty string as "no items".
 *
 * @param {string} field
 * @returns {string[]}
 */
function splitCsv(field) {
  return field === "" ? [] : field.split(",");
}

/**
 * Parse the Lean census program's stdout: `#datum\t<name>\t<true|false|unknown>`
 * lines (every concrete `ClosureRegimeData` literal in the library) followed
 * by one 7-field tab-separated row per watched theorem:
 * `theorem\thypothesized(0|1)\thypothesizedTypes\thandBuilt\tderived\tregimeConstantsUsed\tconcludesAperiodic(0|1)`.
 * Any other line beginning with `#` (e.g. `#excluded-auto-generated\t<count>`)
 * is a header this parser does not itself consume and is skipped
 * generically, never mistaken for a theorem row.
 *
 * @param {string} text - Combined stdout of the regime-instantiation census program.
 * @returns {{
 *   datums: Array<{name: string, countableCofinalityFalse: boolean|null}>,
 *   rows: Array<{
 *     theorem: string,
 *     hypothesized: boolean,
 *     hypothesizedTypes: string[],
 *     handBuilt: string[],
 *     derived: string[],
 *     regimeConstantsUsed: string[],
 *     concludesAperiodic: boolean,
 *   }>,
 * }}
 */
export function parseCensusRows(text) {
  const lines = String(text).split(/\r?\n/);
  const datums = [];
  const rows = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith(DATUM_PREFIX)) {
      const rest = line.slice(DATUM_PREFIX.length);
      const tabIndex = rest.indexOf("\t");
      const name = tabIndex === -1 ? rest : rest.slice(0, tabIndex);
      const flagField = tabIndex === -1 ? "" : rest.slice(tabIndex + 1);
      const countableCofinalityFalse =
        flagField === "false" ? true : flagField === "true" ? false : null;
      datums.push({ name, countableCofinalityFalse });
      continue;
    }
    if (line.startsWith("#")) continue;
    const fields = line.split("\t");
    if (fields.length < 7) continue;
    const [theorem, hypField, hypTypesField, handBuiltField, derivedField, usedField, aperiodicField] = fields;
    rows.push({
      theorem,
      hypothesized: hypField === "1",
      hypothesizedTypes: splitCsv(hypTypesField),
      handBuilt: splitCsv(handBuiltField),
      derived: splitCsv(derivedField),
      regimeConstantsUsed: splitCsv(usedField),
      concludesAperiodic: aperiodicField === "1",
    });
  }
  return { datums, rows };
}

/**
 * The contributing-mode tags for one row, before collapsing to a single mode
 * label — `["hypothesized", "derived"]` for a row where both apply, `["table-only"]`
 * when none of the three positive signals apply.
 *
 * @param {{hypothesized: boolean, handBuilt: string[], derived: string[]}} row
 * @returns {Array<"hypothesized"|"hand-built"|"derived"|"table-only">}
 */
export function modeTags(row) {
  const tags = [];
  if (row.hypothesized) tags.push("hypothesized");
  if (row.handBuilt.length > 0) tags.push("hand-built");
  if (row.derived.length > 0) tags.push("derived");
  if (tags.length === 0) tags.push("table-only");
  return tags;
}

/**
 * The row's single mode label: its one contributing tag, or `"mixed"` when
 * more than one applies.
 *
 * @param {{hypothesized: boolean, handBuilt: string[], derived: string[]}} row
 * @returns {"hypothesized"|"hand-built"|"derived"|"table-only"|"mixed"}
 */
export function modeOf(row) {
  const tags = modeTags(row);
  return tags.length > 1 ? "mixed" : tags[0];
}

/**
 * Aggregate a parsed regime-instantiation census into mode counts (overall
 * and per module), the datum roster with their `countableCofinality` flags,
 * the theorems concluding `aperiodic` and by which mode, and which of the
 * seven physics-lineage modules carry zero regime-bearing theorems.
 *
 * @param {{datums: Array<{name: string, countableCofinalityFalse: boolean|null}>, rows: Array<object>}} parsed
 * @returns {{
 *   total: number,
 *   modeCounts: Record<string, number>,
 *   byModule: Record<string, Record<string, number>>,
 *   datumCount: number,
 *   datumsWithCountableCofinalityFalse: number,
 *   datums: Array<{name: string, module: string, countableCofinalityFalse: boolean|null}>,
 *   aperiodicConclusions: Array<{theorem: string, module: string, mode: string}>,
 *   aperiodicByMode: Record<string, number>,
 *   physicsModulesWithZeroRegimeTheorems: string[],
 * }}
 */
export function summarizeCensus({ datums, rows }) {
  const modeCounts = {};
  const byModule = {};
  const aperiodicConclusions = [];
  const aperiodicByMode = {};
  const modulesSeen = new Set();

  for (const row of rows) {
    const mode = modeOf(row);
    modeCounts[mode] = (modeCounts[mode] ?? 0) + 1;
    const moduleName = moduleOf(row.theorem);
    modulesSeen.add(moduleName);
    const moduleCounts = byModule[moduleName] ?? (byModule[moduleName] = {});
    moduleCounts[mode] = (moduleCounts[mode] ?? 0) + 1;
    if (row.concludesAperiodic) {
      aperiodicConclusions.push({ theorem: row.theorem, module: moduleName, mode });
      aperiodicByMode[mode] = (aperiodicByMode[mode] ?? 0) + 1;
    }
  }

  const datumRows = datums.map((datum) => ({
    name: datum.name,
    module: moduleOf(datum.name),
    countableCofinalityFalse: datum.countableCofinalityFalse,
  }));
  const datumsWithCountableCofinalityFalse = datumRows.filter(
    (datum) => datum.countableCofinalityFalse === true,
  ).length;

  const physicsModulesWithZeroRegimeTheorems = PHYSICS_MODULES.filter(
    (moduleName) => !modulesSeen.has(moduleName),
  );

  return {
    total: rows.length,
    modeCounts,
    byModule,
    datumCount: datums.length,
    datumsWithCountableCofinalityFalse,
    datums: datumRows,
    aperiodicConclusions,
    aperiodicByMode,
    physicsModulesWithZeroRegimeTheorems,
  };
}

/**
 * Prose for the record's `reading` field, stating only what `summary` shows
 * — assembled from the live counts rather than a string frozen at authoring
 * time, so it never drifts from a rerun's actual numbers.
 *
 * @param {ReturnType<typeof summarizeCensus>} summary
 * @returns {string}
 */
export function describeReading(summary) {
  const modeList = Object.entries(summary.modeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mode, count]) => `${count} ${mode}`)
    .join(", ");
  const zeroPhysics = summary.physicsModulesWithZeroRegimeTheorems.length > 0
    ? summary.physicsModulesWithZeroRegimeTheorems.join(", ")
    : "none";
  return (
    `${summary.total} regime-bearing theorems: ${modeList}. ` +
    `${summary.datumCount} concrete ClosureRegimeData datums exist, ${summary.datumsWithCountableCofinalityFalse} ` +
    `with countableCofinality = false. ${summary.aperiodicConclusions.length} theorems conclude aperiodic. ` +
    `Physics-lineage modules with zero regime-bearing theorems: ${zeroPhysics}.`
  );
}

/**
 * Assemble the final regime-instantiation census record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   parsed: {datums: Array<object>, rows: Array<object>},
 * }} options
 * @returns {{
 *   type: "ObsmetrologiaRegimeInstantiationCensus",
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   reading: string,
 *   summary: ReturnType<typeof summarizeCensus>,
 * }}
 */
export function assembleCensusRecord({ checkedAt, packageRoot, leanSourcePath, parsed }) {
  const summary = summarizeCensus(parsed);
  return {
    type: "ObsmetrologiaRegimeInstantiationCensus",
    checkedAt,
    packageRoot,
    leanSourcePath,
    reading: describeReading(summary),
    summary,
  };
}
