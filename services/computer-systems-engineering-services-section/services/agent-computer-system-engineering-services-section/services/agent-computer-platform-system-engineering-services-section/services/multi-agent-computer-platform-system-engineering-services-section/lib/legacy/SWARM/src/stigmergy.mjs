import { charge, chargeValue, chargeValueName, valueOf } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";
// stigmergy.mjs — stigmergic coordination over the shared EAVT trace.
//
// The corpus's stigmergy note (computer/docs/dev/notes/stigmergy-environment-trace-fields.md) states
// it plainly: stigmergy is "the coordination mechanism in which agents influence each other indirectly
// by modifying a shared environment, with later agents responding to the modifications rather than to
// the agents that made them. The channel of coordination is the environment itself. There are no
// addresses, no recipients, no messages." The note's §5 maps this onto THIS machine: "the OS's
// append-only EAVT log IS an environment-trace field E_t : L → V" — the location space L is the typed
// term namespace, the value space V is the FOUR/charge alphabet (the QUALITATIVE, sign-based regime),
// deposition is appending datoms, sensing is a local fold over the cells of interest.
//
// So swarm needs NO message bus. A worker DEPOSITS a mark by appending a {e,a,v,t} row at a field cell;
// another worker SENSES it by folding the trace at that cell. Two corpus-faithful differences from
// classical pheromones, both kept: (1) NO destructive evaporation — the trace is append-only and
// monotone (knowledge ascent), so "recency" is a read-time weighting over the truth projection, never
// a write; (2) PARACONSISTENT values — a cell can hold ⊤ when two workers deposit disagreeing marks,
// and ⊤ is a HELD value, not a fault. This module is the deposit/sense surface over the EAVT field.

import read from "@561-group/computer/typed-term-memory-system/reading";
import { joinKnowledge, present } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";


import { stableId } from "./cognition.mjs";
import { writeTrace } from "./events.mjs";
import { memoryRootOf } from "./memory.mjs";

// the stigmergic field lives under a single term per field name; each cell is a (predicate=mark,
// object=value) proposition the way EAVT memory already files them. The field term is the "location".
function fieldTerm(field) {
  return `stigmergy/fields/${field}`;
}

// deposit(root, field, mark, value, by, options) — a worker DEPOSITS a mark at a field cell. This is a
// local, append-only write: a {e: field, a: mark, v: value, t} row, with the depositor recorded as a
// witness in the transaction id (so the trace keeps WHO without the mark being addressed TO anyone).
// No recipient, no performative — a later worker FINDS it by sensing. Returns the written trace.
export function deposit(root, field, mark, value, by = "", options = {}) {
  const term = fieldTerm(field);
  const now = options.now ?? new Date().toISOString();
  const t = options.t ?? stableId([field, mark, value, by, now], "deposit");
  // a deposit is a memory write at the field term: the predicate is the mark, the object its value.
  // recordMessage-style writes go through TTMS write; here we append a single mark row via writeTrace's
  // memory writer is governed for trace terms — instead deposit writes the mark directly to the field.
  const doc = { [mark]: value, depositedBy: by, depositedAt: now };
  // writeTrace appends the doc's cells as rows under the field term (append-only, monotone).
  return writeTrace(root, term, doc, { ...options, t });
}

// sense(root, field, options) — a worker SENSES the field: a LOCAL fold over the trace at the field
// term, returning each mark's settled charge and its FOUR reading. This is the "recipient finds it"
// read — no addressee, just a fold of the shared trace. The fold is the substrate's lossless settle
// (every depositor's witness unioned); a mark two workers disagree on reads ⊤ (held), surfaced here.
export function sense(root, field, options = {}) {
  const settled = read(memoryRootOf(root), fieldTerm(field));
  const marks = settled.assignments.map((assignment) => ({
    mark: assignment.cell.predicate.const ?? assignment.cell.predicate,
    object: assignment.cell.object.const ?? assignment.cell.object,
    charge: assignment.charge,
    value: chargeValueName(valueOf(assignment.charge)),
    contradicted: valueOf(assignment.charge).name === "stable",
  }));
  return Object.freeze({
    kind: "swarm.stigmergy.sense",
    field,
    marks,
    contradictedMarks: marks.filter((m) => m.contradicted),
  });
}

// gradient(root, field, mark, options) — the QUANTITATIVE read the corpus's note distinguishes: the
// aggregate SUPPORT for a single mark across every deposit, as a count of positive vs negative
// witnesses (the trace's stand-in for pheromone concentration). The note keeps this read-time, never a
// destructive evaporation: it weights by the trace, the trace is never decayed. A `decay` ∈ [0,1] may
// be supplied to weight older witnesses less — a READ-TIME recency weighting, exactly as the note says.
export function gradient(root, field, mark, options = {}) {
  const settled = read(memoryRootOf(root), fieldTerm(field));
  const cells = settled.assignments.filter(
    (a) => (a.cell.predicate.const ?? a.cell.predicate) === mark,
  );
  let aggregate = charge(chargeValue("absurd"));
  let positive = 0;
  let negative = 0;
  for (const cell of cells) {
    aggregate = joinKnowledge(aggregate, cell.charge);
    const [pos, neg] = present(cell.charge);
    if (pos.name === "present") positive += cell.charge.evidence[0].length;
    if (neg.name === "present") negative += cell.charge.evidence[1].length;
  }
  const decay = Number.isFinite(options.decay) ? Math.max(0, Math.min(1, options.decay)) : 0;
  // read-time recency weighting (optional): later witnesses keep full weight, earlier ones (1-decay).
  const strength = decay > 0
    ? cells.reduce((acc, cell, i) => acc + (1 - decay) ** (cells.length - 1 - i), 0)
    : positive - negative;
  return Object.freeze({
    kind: "swarm.stigmergy.gradient",
    field,
    mark,
    aggregate,
    value: chargeValueName(valueOf(aggregate)),
    positiveWitnesses: positive,
    negativeWitnesses: negative,
    strength,
    deposits: cells.length,
  });
}
