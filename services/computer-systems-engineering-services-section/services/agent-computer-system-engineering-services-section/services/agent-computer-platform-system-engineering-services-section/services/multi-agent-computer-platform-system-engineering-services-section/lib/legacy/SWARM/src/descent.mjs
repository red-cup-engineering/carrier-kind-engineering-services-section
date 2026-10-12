import { articulate } from "@red-cup-engineering/metrologic/bilattice/descent";
import { predicate } from "@red-cup-engineering/metrologic/bilattice/descent";
import { posit } from "@red-cup-engineering/metrologic/bilattice/descent";
import { settle } from "@red-cup-engineering/metrologic/bilattice/descent";

import being from "@561-group/tab/being";

import { proseToSection, sectionToCells, cellsToEavtRows, converseMapOf, invertConverse } from "./prose.mjs";
import { closeAgentFiber, governContested, readPotential, DEFAULT_GOVERNANCE_REGIME } from "./ontology.mjs";

export function descendUtterance(utterance) {
  const articulated = articulate(utterance);
  const predicated = predicate(articulated);
  const posited = posit(predicated);
  const settled = settle(posited);
  return { articulated, predicated, posited, settled };
}

export function traceSummary(trace) {
  return ["articulated", "predicated", "settled", "witnessed"].filter((key) => trace[key]);
}

// descendProse — the EPISTEMIC SPINE over a model reply: prose -> panini-cells -> TAB-closure ->
// governance, all PURE (in-memory) and APPEND-ONLY. It does NOT replace the raw text or the
// math-kernel descent; it runs ALONGSIDE them, structuring the reply into charged cells the swarm
// trace can hold, then closing the agent's fiber to its LFP (against ⊤) and governing the contested
// (⊤) cells at the cautious lazy rate. The raw text stays the witness; this is held beside it.
//
// descendProse(subject, text, opts?) ->
//   { section, cells, eavtRows, converse, closed, governed }
//     section   — the poiesis charged section (the panini parse of the prose)
//     cells     — the EAVT-ready charged rows { subject, predicate, object, charge, glyph }
//     eavtRows  — the { e, a, v, t } carrier rows (t/⊤ positive, f converse, ⊥ emits NOTHING — a ⊥
//                 is a NAMED GAP, never hallucinated into the trace as an assertion)
//     converse  — the converse map the fold uses to read f / ⊤ cells
//     closed    — closeAgentFiber's result: the closed fiber (LFP), fired trace, the contested ⊤
//                 cells that rode THROUGH (held, never repaired), and the append-only fired rows
//     governed  — governContested's result: which ⊤ cells were processed this pass at the cautious
//                 rate, which deferred (carried, not lost), and the regime — ⊤ never erased
//
// `subject` defaults to the section's parsed subject (or "agent"); `opts.priorRows` are the agent's
// already-accumulated EAVT rows the new cells close against; `opts.governance` selects the regime.
export function descendProse(subject, text, opts = {}) {
  const section = proseToSection(typeof text === "string" ? text : "");
  const cells = sectionToCells(section);
  const eavtRows = cellsToEavtRows(cells, opts.t ?? "prose");
  const converse = converseMapOf(cells);
  const fiberSubject = subject ?? section.subject ?? "agent";

  // re-key the prose rows onto the closing subject (the section's subject is the grammatical subject
  // of the prose; the closing fiber is the AGENT). Prior rows close together with the new ones.
  const subjectRows = eavtRows.map((r) => ({ ...r, e: fiberSubject }));
  const priorRows = Array.isArray(opts.priorRows) ? opts.priorRows : [];
  const allRows = priorRows.concat(subjectRows);

  const closed = closeAgentFiber(fiberSubject, allRows, {
    converse,
    ...(Array.isArray(opts.rules) ? { rules: opts.rules } : {}),
    t: opts.closeT ?? "close",
  });

  const governed = governContested(fiberSubject, closed.rows ?? allRows.concat(closed.appendRows), {
    converse,
    governance: opts.governance ?? DEFAULT_GOVERNANCE_REGIME,
    ...(opts.budget != null ? { budget: opts.budget } : {}),
    ...(Array.isArray(opts.routings) ? { routings: opts.routings } : {}),
  });

  return { subject: fiberSubject, section, cells, eavtRows: subjectRows, converse, closed, governed };
}

// META_PREDICATES — TAB's own machinery rows that fold into the fiber but are NOT belief cells: the
// `articulating` opening rows (their opened questions surface as named ⊥ gaps, handled below) and the
// `closure-rule`/proposal rows (the agent's rule-system, not a belief about the world). Excluded from
// the live-face belief projection so they neither pose as a t/f standing nor mask a real gap.
const META_PREDICATES = new Set(["articulating", "closure-rule", "closure-rule-proposal", "has-converse", "enacted-by"]);

// carrierFaces — project a descendProse result INTO the two shapes the LIVE faces read, so an agent's
// held ⊤ actually surfaces in their audit channel. This is APPEND-ONLY enrichment built PURELY from the
// already-computed spine — it recomputes NOTHING about the agent's beliefs, only re-presents the settled
// fiber in the carrier shapes. A ⊤ cell stays ⊤ (held), a ⊥ cell stays a NAMED gap, evidence is LINEAR.
//
// It re-folds the spine's settled EAVT rows ONCE MORE with the witness view on (being's opt-in
// per-cell justifying-row carrier), so each cell's evidence is the lossless [posWitnesses, negWitnesses]
// pair — no witness dropped. The converse map is inverted to the fold orientation (converse -> positive)
// exactly as closeAgentFiber does, so the witnessed fiber matches the closed fiber cell-for-cell.
//
// carrierFaces(result, opts?) ->
//   { fiber, standing }
//     fiber    — mud's shape: [{ predicate, object, value:<charge{pos,neg}>, evidence:[pos[],neg[]] }]
//                (mud's deriveState reads result.fiber and runs contestedCells over it; a ⊤ cell carries
//                 pos:1,neg:1 with BOTH witness faces intact).
//     standing — web's shape: { "P/object": <charge{pos,neg}> } (web's auditCells/gaps read a standing
//                map; a ⊤ cell is {pos:1,neg:1}, a ⊥ cell {pos:0,neg:0} — a named gap, never invented).
// opts.priorRows — the agent's already-accumulated rows the spine closed against (so the witnessed
//                  re-fold sees the SAME rows the close did). Defaults to the spine's own eavtRows.
export function carrierFaces(result, opts = {}) {
  const subject = result?.subject ?? "agent";
  const converse = invertConverse(result?.converse ?? {});
  const priorRows = Array.isArray(opts.priorRows) ? opts.priorRows : [];
  const spineRows = Array.isArray(result?.eavtRows) ? result.eavtRows : [];
  const appendRows = Array.isArray(result?.closed?.appendRows) ? result.closed.appendRows : [];
  const rows = priorRows.concat(spineRows, appendRows);

  // re-fold WITH witness so the lossless evidence carrier is recoverable per cell — nothing dropped.
  // META rows (TAB's own articulating/closure-rule machinery) are not belief cells; they are handled
  // separately (opened questions become named ⊥ gaps below) and excluded from the belief projection.
  const witnessed = being(subject, rows, { converse, witness: true }).fiber.filter((c) => !META_PREDICATES.has(c.predicate));

  const fiber = witnessed.map((c) => ({
    predicate: c.predicate,
    object: c.object,
    // mud reads a {pos,neg} charge under `.value`; the spine cell carries {pos,neg,glyph} — strip glyph.
    value: { pos: c.value.pos, neg: c.value.neg },
    // evidence LINEAR: both faces' justifying rows, as [posWitnesses, negWitnesses]. Witnesses kept.
    evidence: [c.witness?.pos ?? [], c.witness?.neg ?? []],
  }));

  const standing = {};
  for (const c of witnessed) {
    const name = c.object == null ? `${c.predicate}` : `${c.predicate}/${c.object}`;
    standing[name] = { pos: c.value.pos, neg: c.value.neg };
  }

  // NAMED GAPS: cells the trace OPENED (an `articulating` row) yet left undetermined are genuine ⊥
  // questions — distinct from ⊥-absent (never-raised). Surface each as a {pos:0,neg:0} standing entry so
  // the gap is NAMED on the live faces, never invented as a t/f and never silently dropped. The opened
  // cell's name is read off readPotential; an already-determined cell is left as its settled value.
  const opened = readPotential(subject, rows, { converse: result?.converse ?? {} }).opened ?? [];
  const gapFiber = [];
  for (const q of opened) {
    const name = q.object == null ? `${q.predicate}` : `${q.predicate}/${q.object}`;
    if (name in standing) continue; // it got answered — its settled value already stands
    standing[name] = { pos: 0, neg: 0 }; // ⊥ — a named gap, not invented
    gapFiber.push({ predicate: q.predicate, object: q.object ?? null, value: { pos: 0, neg: 0 }, evidence: [[], []] });
  }

  return { fiber: fiber.concat(gapFiber), standing };
}

// proseTraceSummary — the calm, audit-on-demand summary of a descendProse result: the glyph counts
// (how many cells settled t/f/⊥/⊤), whether the close quiesced, and the count of contested ⊤ cells
// held and governed. Calm by default: it reports the SHAPE, the ⊤ contradictions recoverable in
// `result.closed.contested` / `result.governed.processed`, never flaunted.
export function proseTraceSummary(result) {
  const cells = Array.isArray(result?.cells) ? result.cells : [];
  const glyphCounts = { t: 0, f: 0, "⊥": 0, "⊤": 0 };
  for (const c of cells) glyphCounts[c.glyph] = (glyphCounts[c.glyph] ?? 0) + 1;
  return {
    cells: cells.length,
    glyphs: glyphCounts,
    fired: result?.closed?.fired?.length ?? 0,
    quiescent: !!result?.closed?.quiescent,
    contested: result?.closed?.contested?.length ?? 0,
    governedProcessed: result?.governed?.processed?.length ?? 0,
    governedDeferred: result?.governed?.deferred?.length ?? 0,
    regime: result?.governed?.regime ?? null,
  };
}
