/**
 * Pure parsing and aggregation algebra for the whole-library Obsmetrologia
 * theorem/axiom census. No I/O: callers run
 * `scripts/census-set-of-theorem-axioms.lean` via `lake env lean` and pass
 * the captured stdout in here.
 */

/**
 * Parse the tab-separated `name\taxioms` rows printed by
 * `census-set-of-theorem-axioms.lean` into row objects. Blank lines are
 * skipped; any line beginning with `#` is a header line (e.g.
 * `#excluded-auto-generated\t<count>`) and is skipped too, since this
 * parser consumes no header data of its own; an empty axioms field parses
 * to an empty array (the "none" profile), a comma-separated field parses
 * to its list of axiom names.
 *
 * @param {string} text - Combined stdout of the Lean census program.
 * @returns {Array<{name: string, axioms: string[]}>} One row per printed line, in file order.
 */
export function parseCensusRows(text) {
  const lines = String(text).split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("#")) continue;
    const tabIndex = line.indexOf("\t");
    const name = tabIndex === -1 ? line : line.slice(0, tabIndex);
    const axiomField = tabIndex === -1 ? "" : line.slice(tabIndex + 1);
    const axioms = axiomField === "" ? [] : axiomField.split(",");
    rows.push({ name, axioms });
  }
  return rows;
}

/**
 * Classify one theorem's axiom list into its Landauer-bit profile. `sorry`
 * (Lean's `sorryAx`) and `Classical.choice` are erasures that dominate any
 * other axiom present, so they take precedence over the propext/Quot.sound
 * combinations; among those four, both-present beats either alone.
 *
 * @param {string[]} axioms - Axiom names as printed by `collectAxioms` (e.g. ["propext", "Quot.sound"]).
 * @returns {"none"|"propext"|"propext+Quot.sound"|"Quot.sound"|"choice"|"sorry"} The profile name.
 */
export function profileOf(axioms) {
  const set = new Set(axioms);
  if (set.has("sorryAx")) return "sorry";
  if (set.has("Classical.choice")) return "choice";
  const hasPropext = set.has("propext");
  const hasQuotSound = set.has("Quot.sound");
  if (hasPropext && hasQuotSound) return "propext+Quot.sound";
  if (hasQuotSound) return "Quot.sound";
  if (hasPropext) return "propext";
  return "none";
}

/**
 * The second dot-separated segment of a fully-qualified Lean name — the
 * Obsmetrologia module a theorem belongs to (e.g.
 * "Obsmetrologia.Closure.Collatz.foo" -> "Closure").
 *
 * @param {string} fullName
 * @returns {string} The module segment, or the full name when it has fewer than two segments.
 */
export function moduleOf(fullName) {
  const segments = String(fullName).split(".");
  return segments.length > 1 ? segments[1] : fullName;
}

/**
 * Aggregate census rows into the totals, axiom-profile histogram,
 * per-module profile breakdown, and the list of theorems carrying `sorry`.
 *
 * @param {Array<{name: string, axioms: string[]}>} rows
 * @returns {{
 *   total: number,
 *   profiles: Record<string, number>,
 *   byModule: Record<string, Record<string, number>>,
 *   sorryTheorems: string[],
 * }}
 */
export function summarizeCensus(rows) {
  const profiles = {};
  const byModule = {};
  const sorryTheorems = [];
  for (const row of rows) {
    const profile = profileOf(row.axioms);
    profiles[profile] = (profiles[profile] ?? 0) + 1;
    const moduleName = moduleOf(row.name);
    const moduleProfiles = byModule[moduleName] ?? (byModule[moduleName] = {});
    moduleProfiles[profile] = (moduleProfiles[profile] ?? 0) + 1;
    if (profile === "sorry") sorryTheorems.push(row.name);
  }
  return { total: rows.length, profiles, byModule, sorryTheorems };
}

/**
 * Assemble the final theorem-axiom census record document, in the shape of
 * the 2026-09-03 hand-run census record.
 *
 * @param {{checkedAt: string, packageRoot: string, leanSourcePath: string, rows: Array<{name: string, axioms: string[]}>}} options
 * @returns {{
 *   type: "ObsmetrologiaTheoremAxiomCensus",
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   summary: {total: number, profiles: Record<string, number>, byModule: Record<string, Record<string, number>>, sorryTheorems: string[]},
 * }}
 */
export function assembleCensusRecord({ checkedAt, packageRoot, leanSourcePath, rows }) {
  return {
    type: "ObsmetrologiaTheoremAxiomCensus",
    checkedAt,
    packageRoot,
    leanSourcePath,
    summary: summarizeCensus(rows),
  };
}
