// synthetic-world — the PROVING GROUND that gates live deploy on obstruction descent.
//
// THE CLAIM (refounding plan P7, docs/dev/notes/2026-06-05-refounding-verified-map-and-migration.md:162-166):
// "Synthetic environment as the live-deploy gate. New `synthetic-world` on wheatstone localWorld +
// swarm-sheaf; split deriveState out of mud.mjs. Scenario engine induces obstructions (disagreeing
// safety evidence → ⊤; dependency loop → H¹≠0; saturation past the knee) and scores governance by
// H¹ descent to 0 under the target regime; a green synthetic run gates live deploy."
//
// HOW THE PIECES COMPOSE on the substrate this repo actually derives:
//   - WORLD STATE IS A PREDICATION GRAPH on a SEPARATE EAVT root (a sub-root of the live root, so the
//     proving ground never touches live memory). Every act is an affirm-only {e,a,v,t} cell; the world
//     is read through settledSection (the canonical fold) from "./swarm-sheaf.mjs" — never a hand-parse.
//   - DEPOSIT / SENSE go through stigmergy.mjs: a worker DEPOSITS a safety mark at a field cell, another
//     SENSES the field by folding the trace. No message bus, no addressee — the environment is the channel.
//   - THE OBSTRUCTION MEASURE is, for now, the COUNT OF HELD-⊤ CELLS in the substrate section's
//     `contradicted` list (section() returns {affirmed, denied, contradicted}; a cell folds to ⊤ —
//     pos AND neg — when a predicate `p` and its converse `not-p` are both affirmed on one (subject,object)).
//     This is exactly the held contradiction safety-cohomology.mjs gates dispatch on (dispatch.mjs:61-63,
//     safety.mjs:47 "dispatch.mjs reads section().contradicted"). It is NEVER collapsed at write — the ⊤
//     is HELD; only a lawful governance act drives it to settle.
//
//   FOLLOWUP (cohomologyH1): the obstruction measure here is the held-⊤ COUNT, the obstruction PROXY the
//   plan names while the derived ℤ-linear H¹ (coker δ⁰, H1.rank = E − rankD0) is being lifted from
//   math-playground into @red-cup-engineering/metrologic. When swarm-sheaf gains cohomologyH1(section) (plan P1 DEFERRED,
//   :125-128), the measure UPGRADES from "count of contradicted cells" to that exact rank. We MUST NOT
//   import the playground and MUST NOT gate on an assumed κ=ω₁ value (plan :146, risk #4); the held-⊤
//   count is the sound floor until the rank lands. A dependency-loop scenario is a known H¹-witness that
//   the rank will SEE but the bare contradicted-count alone does not — recorded as an obstruction edge.
//
//   GOVERNANCE DRIVES ⊤ → 0. The substrate is append-only and monotone, so resolution is NOT a destructive
//   rewrite: a governance act deposits a RETRACTION TOMBSTONE — a {e,a,v:null,t} row at a later t (the
//   substrate fold honors `retractedAfter`, dropping the disagreeing converse evidence). The ⊤ was held
//   the whole time; the resolving act makes the cell settle. A scenario PASSES iff governance drives the
//   held-⊤ count to 0.

import { localWorld } from "@561-group/wheatstone/world";
import { TOP, glyph, holds, isDetermined } from "@561-group/tab/value";
import { contestedCells } from "@561-group/tab/governing";
import { settle, section } from "@561-group/computer/posix-holography/eavt-substrate";
import { address } from "@561-group/computer/typed-filepath-addressing-system/addressing";
import { readFileSync } from "node:fs";

import { settledSection } from "./swarm-sheaf.mjs";
import { deposit, sense } from "./stigmergy.mjs";
import { memoryRootOf } from "./memory.mjs";

// ============================================================================
// PART 1 — the swarm-owned PROJECTION (split OUT of mud.mjs per plan P7 :164).
//   message()-result → carrier faces. The wheatstone localWorld carrier STAYS canonical in mud.mjs;
//   this is the swarm-internal projection it (and the synthetic world) reads through. Behavior is
//   preserved EXACTLY — mud.mjs re-exports deriveState from here so the barrel + tests are untouched.
// ============================================================================

// A charge is { pos, neg } over a (lossless) evidence carrier — the tab/value shape. We never re-roll
// it; we only READ it. A cell is { predicate, object, value, evidence? }.
const isCharge = (v) => v && typeof v === "object" && "pos" in v && "neg" in v;

// chargeGlyph — the CALM four-valued face of a charge: t / f / ⊥ / ⊤. Reads, never collapses.
export function chargeGlyph(value) {
  if (!isCharge(value)) return "⊥"; // unseen/undetermined stays ⊥ — a named gap, not an invented t/f
  return glyph(value);
}

// normalizeFiber — coerce whatever message() handed us into a fiber of cells the law-tools read. We
// look for an explicit fiber/charges array first (the agent's settled cells), and accept cells shaped
// { predicate, object, value:<charge> }. Anything missing a charge keeps a ⊥ value (a gap), never a
// fabricated determination. This is READ-ONLY: charges pass through untouched.
export function normalizeFiber(source) {
  const cells = Array.isArray(source) ? source : [];
  return cells.map((c) => {
    const value = isCharge(c?.value) ? c.value : { pos: 0, neg: 0 }; // ⊥ gap, not invented
    return {
      predicate: c?.predicate ?? null,
      object: c?.object ?? null,
      value,
      ...(c?.evidence !== undefined ? { evidence: c.evidence } : {}),
    };
  });
}

// deriveState — turn a swarm message() result into the carrier's two faces:
//   { line }  — the CALM human-readable prose (never carries the ⊤ glyph).
//   { gmcp }  — the structured AUDIT payload: agent, office, standing, and the contested[] ⊤ cells
//               with their charges intact and recoverable.
// `result` is the shape message() returns: { reply, agent, trace, ... }. We also read an optional
// `state`/`charges`/`fiber` the orchestration (or office actions) may attach — if absent, the payload
// simply carries no charges (an empty fiber), never fabricated ones.
export function deriveState(result, { agentName } = {}) {
  const reply = typeof result?.reply === "string" ? result.reply : String(result?.reply ?? "");
  const agent = result?.agent ?? null;
  const name = agent?.name ?? agentName ?? null;
  const office = result?.office?.name ?? result?.office ?? agent?.office ?? null;

  // The fiber of settled charges, if the orchestration surfaced one. We read several conventional
  // attachment points but NEVER invent cells when none are present.
  const fiberSource =
    result?.fiber ?? result?.charges ?? result?.state?.fiber ?? result?.state?.charges ?? [];
  const fiber = normalizeFiber(fiberSource);

  // contestedCells reads the fiber and returns the ⊤ cells — the HELD contradictions. We pair each with
  // its glyph and its charge so the contradiction is fully recoverable in the audit channel.
  const top = contestedCells(fiber).map((cell) => {
    const full = fiber.find((c) => c.predicate === cell.predicate && c.object === cell.object) ?? {};
    return {
      predicate: cell.predicate,
      object: cell.object,
      glyph: glyph(TOP), // "⊤" — the contradiction, named, in the AUDIT payload only
      charge: full.value ?? TOP,
      ...(full.evidence !== undefined ? { evidence: full.evidence } : {}),
    };
  });

  // The agent's standing — a CALM summary. `holds` is true when the charge believes-true (t or ⊤); we
  // report holds without flaunting WHICH. An undetermined aggregate is a named gap, not a guess.
  const settledCells = fiber.filter((c) => isDetermined(c.value));
  const standing = {
    holds: top.length > 0 ? true : settledCells.some((c) => holds(c.value)),
    settled: settledCells.length,
    contested: top.length, // count only — the ⊤ detail lives in `contested` below
    gap: fiber.length - settledCells.length, // ⊥ cells, NAMED, never hidden
  };

  const gmcp = {
    agent: name,
    office,
    standing,
    contested: top, // the held ⊤ cells, charge intact, recoverable — calm presentation, audit on demand
    trace: result?.trace
      ? {
          articulated: !!result.trace.articulated,
          predicated: !!result.trace.predicated,
          settled: !!result.trace.settled,
          witnessed: !!result.trace.witnessed,
        }
      : null,
  };

  return { line: reply, gmcp };
}

// ============================================================================
// PART 2 — the PROVING GROUND. World state on a SEPARATE EAVT root; deposit/sense via stigmergy; the
//   obstruction measure over the substrate section's contradicted (held-⊤) cells; a scenario engine that
//   DELIBERATELY induces obstructions and scores governance by held-⊤ descent to 0.
// ============================================================================

// The proving ground lives under a sub-root so it never touches live memory. A synthetic field name is
// kept under "synthetic/" so its stigmergy field term is isolated from any live field of the same name.
function syntheticRoot(root) {
  return `${root}/synthetic`;
}
function syntheticField(name) {
  return `synthetic/${name}`;
}

// The default converse convention (same as safety-cohomology.mjs:102): a predicate `not-<p>` is the
// NEGATIVE face of `<p>`. A worker deposits `p` to affirm safety and `not-p` to deny it; the two settle
// to ⊤ on one (subject,object). The governance layer may override with an explicit converse map.
function defaultConverse(rows) {
  const map = {};
  for (const r of rows) {
    const a = String(r.a ?? "");
    if (a.startsWith("not-")) map[a] = a.slice("not-".length);
  }
  return map;
}

// read the raw {e,a,v,t} rows of a synthetic field's EAVT log. The substrate settle needs the RAW rows
// (settledSection folds them away; the obstruction read re-settles under the converse to surface ⊤).
// Tolerant of an absent log (an untouched field has no obstruction). This is the ONLY hand-read in the
// module, and it reads exactly what safety-cohomology.mjs:36-43 reads — the raw converse evidence.
function fieldRows(root, fieldName) {
  const memRoot = memoryRootOf(syntheticRoot(root));
  const term = `stigmergy/fields/${syntheticField(fieldName)}`;
  try {
    return readFileSync(address(memRoot, term, "jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// depositSafety(root, fieldName, sector, by, { affirm }) — a worker DEPOSITS a safety verdict on a
// sector via stigmergy. affirm=true deposits `clear` (the sector is safe), affirm=false deposits
// `not-clear` (the converse — the sector is NOT safe). Two workers depositing OPPOSITE verdicts on one
// sector drive the cell to held-⊤. Returns the stigmergy deposit trace.
export function depositSafety(root, fieldName, sector, by, options = {}) {
  const affirm = options.affirm !== false;
  const mark = affirm ? "clear" : "not-clear";
  return deposit(syntheticRoot(root), syntheticField(fieldName), mark, sector, by, options);
}

// retractSafety(root, fieldName, sector, by, { face }) — a GOVERNANCE act that resolves a held-⊤ by
// depositing a RETRACTION TOMBSTONE for the named converse face. The substrate fold honors the
// `retractedAfter` tombstone (a {e,a,v:null,t} row drops earlier rows for that predicate), so the
// disagreeing converse evidence is superseded and the cell settles. APPEND-ONLY: the trace grows, the
// ⊤ was held the whole time, and the resolving act makes it settle — never a destructive rewrite.
export function retractSafety(root, fieldName, sector, by, options = {}) {
  const face = options.face ?? "not-clear"; // retract the denial by default → the cell settles affirmed
  return deposit(syntheticRoot(root), syntheticField(fieldName), face, null, by, options);
}

// obstructionMeasure(root, fields, options) — THE LIVE-DEPLOY GATE READ. For each named synthetic field,
// re-settle its raw trace under the converse and read section().contradicted — the held-⊤ cells. The
// measure is the COUNT of those cells across all fields (the obstruction PROXY, until cohomologyH1 lands;
// see the followup note at the top). nonZero is the gate: governance must drive count to 0. We also carry
// the dependencyLoops the scenario recorded as obstruction EDGES — a known H¹ witness the bare
// contradicted-count does not see, surfaced here so the upgrade to the ℤ-linear rank can fold them in.
export function obstructionMeasure(root, fields = [], options = {}) {
  const list = [].concat(fields ?? []);
  const contradicted = [];
  for (const fieldName of list) {
    const term = `stigmergy/fields/${syntheticField(fieldName)}`;
    const rows = fieldRows(root, fieldName);
    const converse = options.converse ?? defaultConverse(rows);
    let parts;
    try {
      parts = section(settle(term, rows, { converse }));
    } catch {
      parts = { contradicted: [] };
    }
    for (const cell of parts.contradicted ?? []) {
      contradicted.push({ field: fieldName, predicate: cell.predicate, object: cell.object });
    }
  }
  const loops = [].concat(options.dependencyLoops ?? []);
  return Object.freeze({
    kind: "swarm.synthetic.obstruction",
    fields: list,
    contradicted, // the held-⊤ cells — never collapsed, surfaced with their (predicate,object)
    count: contradicted.length, // THE MEASURE (the obstruction proxy; cohomologyH1 rank is the followup)
    nonZero: contradicted.length > 0,
    // dependency loops are recorded as obstruction edges: a cycle in the world's dependency graph is a
    // known H¹ witness (a non-trivial cocycle) the derived ℤ-linear rank WILL see; the bare held-⊤ count
    // does not, so we carry them explicitly until cohomologyH1(section) folds them into the rank.
    dependencyLoops: loops,
    obstructed: contradicted.length > 0 || loops.length > 0,
  });
}

// senseField(root, fieldName) — a worker SENSES a synthetic field through the canonical stigmergy fold.
// Returns the stigmergy sense (each mark's settled charge + FOUR reading + contradiction flag).
export function senseField(root, fieldName) {
  return sense(syntheticRoot(root), syntheticField(fieldName));
}

// worldSection(root, fieldName) — the world state as a PREDICATION GRAPH, read through settledSection
// (the canonical fold) from "./swarm-sheaf.mjs". This is the world's read surface: distinct objects for
// one (subject,predicate) stay distinct cells, so the proving ground reads the graph, never a collapse.
export function worldSection(root, fieldName) {
  const term = `stigmergy/fields/${syntheticField(fieldName)}`;
  return settledSection(memoryRootOf(syntheticRoot(root)), term);
}

// runScenario(root, scenario) — the SCENARIO ENGINE. A scenario is a script of acts over the synthetic
// world that DELIBERATELY induces an obstruction (disagreeing safety evidence → ⊤; a dependency loop),
// then lets a governance act attempt to drive the held-⊤ count to 0. It is scored by descent: the
// obstruction is measured AFTER induction (must be non-zero — the scenario actually induced one) and
// AFTER governance (must be zero to PASS — governance drove H¹ to 0).
//
// A scenario is { name, fields, induce(api), govern(api)?, dependencyLoops? } where:
//   - api.depositSafety(field, sector, by, {affirm})  deposits a safety verdict (a worker act)
//   - api.retractSafety(field, sector, by, {face})    a governance act: retract a converse face → settle
//   - fields  the synthetic fields the obstruction measure reads
//   - dependencyLoops  optional recorded obstruction edges (a cycle in the world's dependency graph)
// induce() is required (it makes the obstruction); govern() is optional (a scenario with no governance
// stays obstructed and FAILS — that is the gate doing its job).
export function runScenario(root, scenario) {
  const fields = [].concat(scenario.fields ?? []);
  const loops = [].concat(scenario.dependencyLoops ?? []);
  const api = {
    depositSafety: (field, sector, by, opts) => depositSafety(root, field, sector, by, opts),
    retractSafety: (field, sector, by, opts) => retractSafety(root, field, sector, by, opts),
    sense: (field) => senseField(root, field),
    section: (field) => worldSection(root, field),
  };

  // 1. INDUCE — run the scenario's acts that deliberately create the obstruction.
  if (typeof scenario.induce !== "function") {
    throw new TypeError("runScenario: scenario.induce(api) is required — a scenario must induce an obstruction");
  }
  scenario.induce(api);
  const induced = obstructionMeasure(root, fields, { dependencyLoops: loops });

  // 2. GOVERN — let the governance act (if any) attempt to drive the held-⊤ count to 0.
  let governLoops = loops;
  if (typeof scenario.govern === "function") {
    const cleared = scenario.govern(api);
    // governance MAY clear recorded dependency loops too (e.g. by breaking the cycle) — it returns the
    // loops that remain; default: governance does not touch loops unless it says so.
    if (Array.isArray(cleared)) governLoops = cleared;
  }
  const resolved = obstructionMeasure(root, fields, { dependencyLoops: governLoops });

  // 3. SCORE by DESCENT — the scenario PASSES iff it actually induced an obstruction AND governance drove
  // the measure to 0. A scenario that never induced one proves nothing (inconclusive, not a pass); a
  // scenario governance could not clear FAILS (the gate refuses live deploy).
  const inducedObstruction = induced.obstructed;
  const descended = resolved.count === 0 && resolved.dependencyLoops.length === 0;
  return Object.freeze({
    kind: "swarm.synthetic.scenario",
    name: scenario.name ?? "(unnamed)",
    induced, // the measure right after induction — count MUST be > 0 for the scenario to be valid
    resolved, // the measure right after governance — count MUST be 0 for the scenario to PASS
    inducedObstruction,
    descended,
    pass: inducedObstruction && descended,
  });
}

// syntheticWorld(opts) — the carrier face of the proving ground. It is a wheatstone localWorld (the
// canonical carrier, UNCHANGED — same { kind, connect, send, onLine, onGMCP, ... } shape) whose onSend
// drives a scenario step and surfaces the obstruction measure on the gmcp audit channel. The world is a
// drop-in for any localWorld client (wheatstone's TUI included). It reads its state through this module's
// settledSection-backed worldSection and stigmergy deposit/sense — never a hand-parse, never a collapse.
//   opts.root        REQUIRED — the live root; the proving ground lives under `${root}/synthetic`.
//   opts.fields      the synthetic fields the obstruction measure reads (default []).
//   opts.gmcpPackage the GMCP package for the audit payload (default "Swarm.Synthetic").
//   opts.kind        carrier kind label (default "synthetic").
export function syntheticWorld(opts = {}) {
  const root = opts.root;
  if (typeof root !== "string" || !root) {
    throw new TypeError("syntheticWorld: opts.root (the live root; proving ground lives under root/synthetic) is required");
  }
  const fields = [].concat(opts.fields ?? []);
  const gmcpPackage = opts.gmcpPackage ?? "Swarm.Synthetic";
  const kind = opts.kind ?? "synthetic";

  async function onSend(text, emit) {
    const line = String(text ?? "");
    if (!line.trim()) return;
    // a line is a calm prompt; the audit channel carries the CURRENT obstruction measure (held-⊤ count),
    // surfaced never loud — the ⊤ rides the gmcp channel, the line stays calm.
    const measure = obstructionMeasure(root, fields, { dependencyLoops: opts.dependencyLoops ?? [] });
    emit.line(
      measure.obstructed
        ? `(the proving ground holds ${measure.count} contested cell${measure.count === 1 ? "" : "s"}; deploy is gated)`
        : `(the proving ground is clear; ${fields.length} field${fields.length === 1 ? "" : "s"} settled)`,
    );
    emit.gmcp(gmcpPackage, {
      kind,
      obstructionCount: measure.count,
      contested: measure.contradicted, // the held-⊤ cells, recoverable in the audit channel
      dependencyLoops: measure.dependencyLoops,
      gated: measure.obstructed, // live deploy is gated while obstructed — the synthetic run is the gate
    });
  }

  return localWorld({
    kind,
    onConnect: opts.onConnect,
    onSend,
    onClose: opts.onClose,
  });
}
