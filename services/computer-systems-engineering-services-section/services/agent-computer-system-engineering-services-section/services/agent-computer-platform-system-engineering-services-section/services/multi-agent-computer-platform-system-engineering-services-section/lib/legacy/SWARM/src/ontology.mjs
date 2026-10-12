// ontology — the TAB ONTOLOGY/EPISTEMICS import. This module imports TAB's published seam (working/
// articulating/governing/value) and gives swarm-facing helpers that drive an agent's accumulated
// charged cells through the four-regime descent the swarm rebuild is wiring its epistemic SPINE on:
//
//   closeAgentFiber  — WORKING regime. Run TAB's closeFiber/readRules to drive an agent's own
//                      rule-system to its LEAST FIXED POINT, CLOSING AGAINST ⊤: a rule may fire on a
//                      ⊤ antecedent, the contradiction rides through intact, never repaired.
//   openPotential    — APERIODIC seed. Use TAB's articulating potential/articulatingRow to OPEN
//                      undetermined cells as ⊥-OPENED questions (held-open), distinct from ⊥-ABSENT.
//   governContested  — GOVERNING regime. Use TAB's govern/regimeBudget to manage the agent's ⊤ cells
//                      at a chosen RATE, never erasing them (the ⊤ stays; only its routing rate caps).
//
// DEFAULTS — the cautious forks the rebuild fixed:
//   - governance regime default 'kyriarchical'  (mapped onto TAB's reproduction regimes; the cautious
//     default is the lazy, incremental 'scott-continuous' rate with a small budget).
//   - the ⊤-PROCESSING rate default 'scott-continuous' with a small budget (the sensible lazy default),
//     while keeping 'strict' (process all) and 'aperiodic' (drift, process none) selectable.
//
// The four-corner tests (isTop/holds/isDetermined/glyph) come from TAB's value seam — we do NOT
// reimplement the bilattice here.
//
// All helpers are PURE reads over in-memory EAVT rows / settled fibers (the same { e, a, v, t } rows
// being folds) and emit data to APPEND; nothing here mutates history or touches disk. Witnesses kept.

import being from "@561-group/tab/being";
import { invertConverse } from "./prose.mjs";
import { closeFiber, readRules, contested } from "@561-group/tab/working";
import { ARTICULATING, articulatingRow, openings, openSpec, potential } from "@561-group/tab/articulating";
import { REGIMES, contestedCells, govern, regimeBudget } from "@561-group/tab/governing";
import { TOP, isTop, holds, isDetermined, glyph } from "@561-group/tab/value";

// DEFAULT_GOVERNANCE_REGIME — the cautious governance fork. 'kyriarchical' is the swarm-facing name;
// it maps to TAB's lazy reproduction rate (scott-continuous) so contested ⊤ cells are metabolized a
// few at a time, never erased, never all-at-once.
export const DEFAULT_GOVERNANCE_REGIME = "kyriarchical";

// DEFAULT_TOP_RATE — the cautious ⊤-processing rate. Lazy by default; small per-pass budget.
export const DEFAULT_TOP_RATE = "scott-continuous";
export const DEFAULT_TOP_BUDGET = 1;

// the swarm governance name -> TAB reproduction regime. 'kyriarchical' (the cautious default) routes
// to the lazy 'scott-continuous' rate; the bare TAB regimes pass through. An unknown name falls back
// to the cautious default rather than throwing — governance never crashes the turn.
const GOVERNANCE_TO_REGIME = new Map([
  ["kyriarchical", "scott-continuous"],
  ["strict", "strict"],
  ["scott-continuous", "scott-continuous"],
  ["aperiodic", "aperiodic"],
]);

function regimeFor(governance) {
  return GOVERNANCE_TO_REGIME.get(governance) ?? DEFAULT_TOP_RATE;
}

// closeAgentFiber — the WORKING pass. Given an agent's subject and its accumulated EAVT rows (the
// { e, a, v, t } rows the agent's cells fold from — including any (rule-id, "closure-rule", {when,
// then}) rows that ARE its rule-system), settle the fiber, read the rule-system off it (or take an
// explicit `rules` array), and close to the LEAST FIXED POINT against ⊤.
//
// closeAgentFiber(subject, rows, opts?) ->
//   { fiber, fired:[{rule,predicate,object}], steps, quiescent, diverged, contested, appendRows }
//     fiber      — the closed fiber (the LFP), with any ⊤ cells STILL in it (held, not repaired)
//     fired      — the firing trace (which rule fired which consequent), in order
//     contested  — the ⊤ cells the closed fiber holds (the paraconsistency witness — rode through)
//     appendRows — the fired consequents as APPEND-ONLY EAVT rows { e, a, v, t } the caller appends
//                  to the agent's trace (never mutating prior rows; the close is monotone)
// PURE: never touches disk. converse map (opts.converse) is the swarm-facing POSITIVE -> CONVERSE map
// (converseMapOf's orientation); it is INVERTED to CONVERSE -> POSITIVE before being is told, so a not-P
// row registers as negative evidence ON P and an affirm+deny over the same cell MEET as a ⊤ on the real
// predicate P (not on a separate `not-P` cell). Without the inversion the contradiction never folds.
export function closeAgentFiber(subject, rows, opts = {}) {
  if (typeof subject !== "string" || !subject) throw new TypeError("closeAgentFiber: subject must be a non-empty string");
  const eavt = Array.isArray(rows) ? rows : [];
  const converse = opts.converse ? invertConverse(opts.converse) : null;
  const seedFiber = being(subject, eavt, converse ? { converse } : {}).fiber;
  const rules = Array.isArray(opts.rules) ? opts.rules : readRules(seedFiber);
  const t = opts.t ?? "close";
  const result = closeFiber(subject, eavt, rules, {
    t: (seq) => `${t}:${String(seq).padStart(4, "0")}`,
  });
  // the closed fiber re-read with the converse map, so contested() sees ⊤ cells the agent's f-rows made.
  const closedFiber = being(subject, result.rows, converse ? { converse } : {}).fiber;
  const appendRows = result.fired.map((f, i) => ({
    e: subject,
    a: f.predicate,
    v: f.object,
    t: `${t}:${String(i + 1).padStart(4, "0")}`,
  }));
  return {
    fiber: closedFiber,
    fired: result.fired,
    steps: result.steps,
    quiescent: result.quiescent,
    diverged: result.diverged,
    contested: contested(closedFiber),
    appendRows,
  };
}

// openPotential — the APERIODIC seed. Emit an APPEND-ONLY `articulating` row that OPENS each named
// (predicate, object) cell as a ⊥-OPENED question (a held-open question), distinct from ⊥-ABSENT.
// Opening a cell is never a fifth value and never determines it — it is a SECOND fact (the cell was
// asked). Returns the rows to append. A reader uses `readPotential` to partition opened vs answered.
//
// openPotential(subject, specs, opts?) -> [{ e, a, v, t }]
//   specs: [{ predicate, object? }]  — the cells to hold open (an unpinned object opens generally)
export function openPotential(subject, specs, opts = {}) {
  if (typeof subject !== "string" || !subject) throw new TypeError("openPotential: subject must be a non-empty string");
  const t = opts.t ?? "open";
  const rows = [];
  let seq = 0;
  for (const spec of Array.isArray(specs) ? specs : []) {
    const norm = openSpec(spec);
    if (!norm) continue; // malformed — no invented opening
    rows.push(articulatingRow(subject, norm.predicate, norm.object, `${t}:${String(++seq).padStart(4, "0")}`));
  }
  return rows;
}

// readPotential — partition an agent's settled fiber by the articulation distinction (TAB's
// potential): which opened cells are STILL ⊥ (genuine ⊥-opened questions), which got answered
// (determined), which determined cells were never opened (spontaneous). Surfaces the aperiodic seed.
export function readPotential(subject, rows, opts = {}) {
  const eavt = Array.isArray(rows) ? rows : [];
  const converse = opts.converse ? invertConverse(opts.converse) : null;
  const thing = { entity: subject, fiber: being(subject, eavt, converse ? { converse } : {}).fiber };
  return potential(thing);
}

// governContested — the GOVERNING pass. Manage the agent's ⊤ cells at the chosen reproduction RATE,
// NEVER erasing them. Reads the ⊤ cells off the settled fiber, takes a budget of them (per the
// regime), emits the affect-routing rows to APPEND for those (the caller appends; the ⊤ stays), and
// reports what was DEFERRED to the next pass (carried, not lost).
//
// governContested(subject, rows, opts?) ->
//   { processed, deferred, affectAppends, affectRules, regime, rate, governance }
// DEFAULT governance 'kyriarchical' -> lazy 'scott-continuous' rate, budget DEFAULT_TOP_BUDGET.
// opts.governance selects the swarm name; opts.regime overrides the TAB regime directly; opts.budget
// sets the scott-continuous per-pass cap. The ⊤ cells are never deleted — only their routing rate.
export function governContested(subject, rows, opts = {}) {
  const eavt = Array.isArray(rows) ? rows : [];
  const converse = opts.converse ? invertConverse(opts.converse) : null;
  const fiber = being(subject, eavt, converse ? { converse } : {}).fiber;
  const governance = opts.governance ?? DEFAULT_GOVERNANCE_REGIME;
  const regime = opts.regime ?? regimeFor(governance);
  const budget = opts.budget ?? DEFAULT_TOP_BUDGET;
  const result = govern({
    subject,
    fiber,
    regime,
    routings: Array.isArray(opts.routings) ? opts.routings : [],
    budget,
  });
  return { ...result, governance };
}

// re-export the TAB value seam helpers the swarm reads on, so callers test four-corner status WITHOUT
// reimplementing the bilattice. These are TAB's, unmodified.
export { isTop, holds, isDetermined, glyph, TOP };
export { REGIMES, regimeBudget, contestedCells };
export { ARTICULATING };
