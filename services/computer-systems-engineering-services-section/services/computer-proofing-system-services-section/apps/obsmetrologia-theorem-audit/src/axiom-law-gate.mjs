/**
 * Pure logic for the axiom-law gate. No I/O: callers get rows
 * `{name, axioms}` from `runCensus` (`scripts/census-set-of-theorem-axioms.mjs`,
 * itself over `scripts/census-set-of-theorem-axioms.lean`) and pass them
 * in here.
 *
 * The law: a house theorem may rest on `Quot.sound` alone (a house
 * identification) and on no other axiom. `propext` and `Classical.choice`
 * are violations. `sorryAx` is not: it is how Lean reports a theorem whose
 * statement is written and whose proof is still to come, so a theorem
 * carrying it is *frontier* — stated, not proved — and is counted as such.
 * The law still applies to a frontier theorem's other axioms.
 */
import { moduleOf, profileOf } from "./theorem-census.mjs";
import { ALLOWED_AXIOMS } from "./proof-work-order.mjs";

/** The only axiom a house theorem is allowed to carry: one law, defined once in
 * `proof-work-order.mjs` and re-exported here so the whole-library gate and the
 * per-order gate can never disagree. */
export { ALLOWED_AXIOMS };

/** The axiom Lean reports for a `sorry`: the mark of a stated, unproved theorem. */
export const FRONTIER_AXIOM = "sorryAx";

/**
 * Whether an axiom list violates the law: it carries any axiom other than
 * one of `ALLOWED_AXIOMS` or the frontier mark `sorryAx`.
 *
 * @param {string[]} axioms
 * @returns {boolean}
 */
export function isViolation(axioms) {
  const allowed = new Set([...ALLOWED_AXIOMS, FRONTIER_AXIOM]);
  return axioms.some((axiom) => !allowed.has(axiom));
}

/**
 * Whether an axiom list carries `sorryAx`: the theorem is frontier, stated
 * with its proof still to come (directly or through a lemma it uses).
 *
 * @param {string[]} axioms
 * @returns {boolean}
 */
export function isFrontier(axioms) {
  return axioms.includes(FRONTIER_AXIOM);
}

/**
 * Aggregate census rows against the axiom law: totals, the violation and
 * frontier counts and names, the axiom-profile histogram (reusing
 * `profileOf`'s sorry/choice/propext+Quot.sound/Quot.sound/propext/none
 * classification), the per-module violation counts, and the 30
 * most-violating modules.
 *
 * @param {Array<{name: string, axioms: string[]}>} rows
 * @returns {{
 *   total: number,
 *   violations: number,
 *   frontier: number,
 *   frontierTheorems: string[],
 *   violatingTheorems: string[],
 *   profiles: Record<string, number>,
 *   byModule: Record<string, {theorems: number, violations: number}>,
 *   topViolatingModules: Array<[string, number]>,
 * }}
 */
export function summarizeAxiomLaw(rows) {
  const profiles = {};
  const byModule = {};
  const frontierTheorems = [];
  const violatingTheorems = [];
  let violations = 0;
  for (const row of rows) {
    const profile = profileOf(row.axioms);
    profiles[profile] = (profiles[profile] ?? 0) + 1;

    const moduleName = moduleOf(row.name);
    const moduleStats = byModule[moduleName] ?? (byModule[moduleName] = { theorems: 0, violations: 0 });
    moduleStats.theorems += 1;

    if (isViolation(row.axioms)) {
      violations += 1;
      violatingTheorems.push(row.name);
      moduleStats.violations += 1;
    }
    if (isFrontier(row.axioms)) frontierTheorems.push(row.name);
  }
  const topViolatingModules = Object.entries(byModule)
    .filter(([, stats]) => stats.violations > 0)
    .map(([moduleName, stats]) => [moduleName, stats.violations])
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 30);
  return {
    total: rows.length,
    violations,
    frontier: frontierTheorems.length,
    frontierTheorems,
    violatingTheorems,
    profiles,
    byModule,
    topViolatingModules,
  };
}

/**
 * Decide the gate's pass/fail outcome: the gate fails when current
 * violations exceed the baseline. Frontier theorems are reported, not
 * failed. With no baseline on record, the ratchet cannot be violated.
 *
 * @param {{violations: number, baseline: number|null}} options
 * @returns {{pass: boolean, overBaseline: boolean, exitCode: 0|1}}
 */
export function decideGate({ violations, baseline }) {
  const overBaseline = typeof baseline === "number" && violations > baseline;
  const pass = !overBaseline;
  return { pass, overBaseline, exitCode: pass ? 0 : 1 };
}

/**
 * Decide whether the on-disk baseline should be written and to what
 * value, given `--init`/`--ratchet` flags and the current violation
 * count. `--init` only creates a baseline that does not yet exist (never
 * overwrites one); `--ratchet` only ever lowers an existing baseline
 * (never raises it, so a regression cannot silently widen the gate).
 * Neither flag, or a no-op case (ratchet with nothing to lower), leaves
 * the baseline untouched.
 *
 * @param {{existing: number|null, violations: number, init: boolean, ratchet: boolean}} options
 * @returns {{write: boolean, baseline: number|null, reason: "init"|"ratchet"|"unchanged"|"missing"}}
 */
export function decideBaselineUpdate({ existing, violations, init, ratchet }) {
  if (existing === null || existing === undefined) {
    if (init) return { write: true, baseline: violations, reason: "init" };
    return { write: false, baseline: null, reason: "missing" };
  }
  if (ratchet && violations < existing) {
    return { write: true, baseline: violations, reason: "ratchet" };
  }
  return { write: false, baseline: existing, reason: "unchanged" };
}

/**
 * The axiom-law discipline this gate enforces, as prose for the record's
 * `reading` field.
 */
export const AXIOM_LAW_READING =
  "A house theorem may rest on Quot.sound alone; propext and Classical.choice are violations. A " +
  "theorem carrying sorryAx is frontier: its statement is written and its proof is still to come; " +
  "it is counted, not failed, and the law applies to its other axioms. The baseline is a ratchet, not a target — " +
  "--ratchet only ever lowers it toward the current violation count, --init only ever creates it " +
  "when absent, and the gate fails whenever current violations exceed the recorded baseline.";

/**
 * Assemble the final axiom-law gate record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   rows: Array<{name: string, axioms: string[]}>,
 *   baseline: number|null,
 *   gate: ReturnType<typeof decideGate>,
 * }} options
 * @returns {{
 *   type: "ObsmetrologiaAxiomLawGate",
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   reading: string,
 *   allowedAxioms: string[],
 *   baseline: number|null,
 *   gate: ReturnType<typeof decideGate>,
 *   summary: ReturnType<typeof summarizeAxiomLaw>,
 * }}
 */
export function assembleGateRecord({ checkedAt, packageRoot, leanSourcePath, rows, baseline, gate }) {
  return {
    type: "ObsmetrologiaAxiomLawGate",
    checkedAt,
    packageRoot,
    leanSourcePath,
    reading: AXIOM_LAW_READING,
    allowedAxioms: ALLOWED_AXIOMS,
    baseline,
    gate,
    summary: summarizeAxiomLaw(rows),
  };
}
