import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { address } from "@561-group/computer/typed-filepath-addressing-system/addressing";
import read from "@561-group/computer/typed-term-memory-system/reading";
import write from "@561-group/computer/typed-term-memory-system/writing";

// the term's EAVT log path: TFAS addressing pinned to the jsonl/EAVT type (formerly TTMS's logPath).
const logPath = (root, term) => address(root, term, "jsonl");

import { createEventSchema, projectEvents, topicOf } from "@561-group/computer/event-projection";

import { readRecord, stableId } from "./cognition.mjs";
import { memoryRootOf } from "./memory.mjs";
import { officeNameFor } from "./offices.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";

// === swarm's event taxonomy, expressed as an OS event-projection SCHEMA ==========================
// @561-group/computer/event-projection turns a cycle's append-only {e,a,v,t} row-deltas into
// topic-channeled event streams; its taxonomy is a PARAMETER (createEventSchema), generalized off
// swarm's own events.mjs (the lift note says so). Swarm now passes its OWN schema back in: swarm
// events are records filed at `events/<type>/<id>`, so each is a GROUP keyed by that id-prefix, its
// cells (eventType / state / decision / actor / workId / phase) accumulated into one projected event.
// The coarse channels are swarm's lifecycle topics; the ⊤ (held-contradiction) projection rides along.
export const SWARM_EVENT_TOPICS = Object.freeze(["assignment", "execution", "review", "audit", "failure"]);

// each fine swarm eventType maps to its own coarse topic (lifecycle stage). topicOf reads this map.
const SWARM_TYPE_TOPIC = Object.freeze({
  assignment: "assignment",
  execution: "execution",
  review: "review",
  audit: "audit",
  failure: "failure",
});

const SWARM_TYPE_ORDER = Object.freeze({ assignment: 0, execution: 1, review: 2, audit: 3, failure: 4 });

// one group per event record: an entity `events/<type>/<id>` accumulates its row cells into fields,
// then emits a single event tagged by its eventType. The projector folds the multi-row record to one.
const SWARM_EVENT_GROUP = Object.freeze({
  type: "swarm-event",
  idPrefix: "events/",
  cells: {
    eventType: "eventType",
    workId: "workId",
    workTitle: "workTitle",
    actor: "actor",
    actorOffice: "actorOffice",
    toOffice: "toOffice",
    state: "state",
    decision: "decision",
    phase: "phase",
    auditKind: "auditKind",
  },
  emit: (f, t) => {
    if (!f.eventType) return null;
    return { type: f.eventType, ...f, t };
  },
});

// the swarm event schema: swarm's lifecycle topics + the per-record group + the ⊤ projection (kept on
// so a contradicted event cell still surfaces as a held value). createEventSchema is the OS surface.
export const SWARM_EVENT_SCHEMA = createEventSchema({
  topics: SWARM_EVENT_TOPICS,
  typeTopic: SWARM_TYPE_TOPIC,
  typeOrder: SWARM_TYPE_ORDER,
  rules: [],                       // swarm events are records, not per-row signals: all grouping.
  groups: [SWARM_EVENT_GROUP],
});

// projectSwarmEvents(rows, schema?) — project a delta of swarm event rows into topic-tagged events
// through the OS projector. swarmEventTopicOf(type) reads the coarse channel of a fine event type.
export function projectSwarmEvents(rows, schema = SWARM_EVENT_SCHEMA) {
  return projectEvents(rows, schema);
}

export function swarmEventTopicOf(type) {
  return topicOf(type, SWARM_EVENT_SCHEMA);
}

function walkJsonl(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonl(path));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(path);
  }
  return out;
}

function rowsAt(path) {
  try {
    return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// === the ⊤-resolution contract for events.mjs (docs/dev/notes/.../the ⊤-resolution contract) =======
// docFromRows used to be `for (const row of rows) doc[row.a] = row.v;` — last-writer-collapse, which
// silently dropped a contested cell to whichever row iterated last. We now fold the CANONICAL section
// (settledSection keeps distinct objects for one (subject,predicate) as DISTINCT cells, so a held-⊤
// survives) and resolve each predicate BY ITS CLASS (contract §4, events.mjs):
//   R (relational, multi-valued): findings / tracePaths / actions — surface the SET of all objects.
//   B (belief: a held contradiction is the point): state / decision — if >1 surviving object (two
//     witnesses settling one event to opposite verdicts) surface the HELD value, never last-writer.
//   F (functional, default): resolve to the ROW-ORDER (append-order) last object — NOT newest-t (t is
//     id-valued pre-P0 and mis-orders) — and surface a scalar. Row order is the raw JSONL line order,
//     read ONLY to recover order, never to re-fold values.
const EVENT_RELATIONAL = new Set(["findings", "tracePaths", "actions"]);
const EVENT_BELIEF = new Set(["state", "decision"]);

// a cell is a per-cell held-⊤ when its charge carries BOTH the positive and the negative bit
// (value [pos, neg]) — the same object affirmed AND denied (swarm-sheaf charge {pos,neg}).
const cellContradicted = (charge) => charge?.value?.[0] === true && charge?.value?.[1] === true;

const objectOf = (cell) => cell?.object?.const ?? cell?.object;
const predicateOf = (cell) => cell?.predicate?.const ?? cell?.predicate;

// structural equality of two stored row-values: scalars compare by ===, objects/arrays by jcs-stable
// JSON, so an object/array-valued cell still recovers its append-order row.
const sameValue = (a, b) =>
  a === b ||
  (a !== null && b !== null && typeof a === "object" && typeof b === "object" &&
    JSON.stringify(a) === JSON.stringify(b));

// recover the append-order (raw JSONL line) index of the row that last wrote (predicate,object).
function lastRowIndex(rows, predicate, object) {
  let idx = -1;
  for (let i = 0; i < rows.length; i += 1) if (rows[i]?.a === predicate && sameValue(rows[i]?.v, object)) idx = i;
  return idx;
}

// fold a settled section + its raw rows (for append-order ONLY) into a doc, per the contract classes.
function docFromSection(section, rows, { e } = {}) {
  const byPredicate = new Map();
  for (const assignment of section.assignments ?? []) {
    const key = predicateOf(assignment.cell);
    if (key === undefined || key === null) continue;
    if (!byPredicate.has(key)) byPredicate.set(key, []);
    byPredicate.get(key).push(assignment);
  }

  const doc = {};
  for (const [predicate, cells] of byPredicate) {
    if (EVENT_RELATIONAL.has(predicate)) {
      // Class R — surface the SET of all objects, de-duplicated, append-order for stability. The
      // event writers store findings/tracePaths/actions as a single ARRAY-valued cell (auditEvent /
      // failureEvent write `[...]`), so a cell whose object is already an array is FLATTENED into the
      // set (never re-wrapped); multiple cells (a genuinely contested append) union into one set.
      const seen = new Set();
      const set = [];
      const sorted = cells.sort(
        (x, y) => lastRowIndex(rows, predicate, objectOf(x.cell)) - lastRowIndex(rows, predicate, objectOf(y.cell)),
      );
      for (const a of sorted) {
        const obj = objectOf(a.cell);
        for (const item of Array.isArray(obj) ? obj : [obj]) {
          const k = item !== null && typeof item === "object" ? JSON.stringify(item) : String(item);
          if (seen.has(k)) continue;
          seen.add(k);
          set.push(item);
        }
      }
      doc[predicate] = set;
      continue;
    }

    const held = cells.filter((a) => cellContradicted(a.charge));
    const contested = held.length > 0 || (EVENT_BELIEF.has(predicate) && cells.length > 1);
    if (contested) {
      // Class B — keep the ⊤ HELD: surface BOTH charges and BOTH witnesses, never pick a winner.
      doc[predicate] = {
        contradicted: true,
        charges: cells.map((a) => ({ object: objectOf(a.cell), charge: a.charge })),
        witnesses: cells.flatMap((a) =>
          witnessOf(section, { e, a: predicate, v: objectOf(a.cell) }),
        ),
      };
      continue;
    }

    // Class F (default) — resolve to the row-order (append-order) LAST object; surface a scalar.
    let best = cells[0];
    let bestIdx = lastRowIndex(rows, predicate, objectOf(best.cell));
    for (const a of cells.slice(1)) {
      const idx = lastRowIndex(rows, predicate, objectOf(a.cell));
      if (idx >= bestIdx) {
        best = a;
        bestIdx = idx;
      }
    }
    doc[predicate] = objectOf(best.cell);
  }
  return doc;
}

function workDoc(work) {
  return work?.doc ?? work ?? {};
}

function workTermOf(work) {
  return work?.term ?? workDoc(work).term ?? "";
}

function eventTerm(eventType, id) {
  return `events/${eventType}/${id}`;
}

export function writeTrace(root, term, doc, options = {}) {
  const written = write(memoryRootOf(root), term, doc, options.t !== undefined ? { t: options.t } : {});
  return {
    term,
    path: logPath(memoryRootOf(root), term),
    log: logPath(memoryRootOf(root), term),
    count: written.count,
    doc: readRecord(root, term),
    read: read(memoryRootOf(root), term),
  };
}

export function writeEvent(root, eventType, fields = {}, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const id = fields.id ?? stableId([eventType, fields.workId, fields.actor, fields.state, fields.assignmentPath, now], "event");
  const term = eventTerm(eventType, id);
  return writeTrace(root, term, {
    kind: "swarm.event",
    id,
    eventType,
    created: now,
    ...fields,
  }, { ...options, t: options.t ?? id });
}

export function assignWork(root, work, assignee, actor, readinessTrace, options = {}) {
  const doc = workDoc(work);
  const assigneeOffice = typeof assignee === "string" ? assignee : officeNameFor(assignee);
  return writeEvent(root, "assignment", {
    workId: doc.id,
    workTerm: workTermOf(work),
    workTitle: doc.title,
    toOffice: assigneeOffice,
    assignedBy: actor.name,
    actor: actor.name,
    actorOffice: officeNameFor(actor),
    readinessTerm: readinessTrace?.term ?? "",
    readinessPath: readinessTrace?.path ?? readinessTrace?.log ?? "",
    delegatedBy: options.delegatedBy ?? "",
    delegationOffice: options.delegationOffice ?? "",
    delegationAction: options.delegationAction ?? "",
    delegationDecisionPath: options.delegationDecisionPath ?? "",
    state: "assigned",
  }, options);
}

export function executionEvent(root, work, actor, state, fields = {}, options = {}) {
  const doc = workDoc(work);
  return writeEvent(root, "execution", {
    workId: doc.id,
    workTerm: workTermOf(work),
    workTitle: doc.title,
    actor: actor.name,
    actorOffice: officeNameFor(actor),
    state,
    assignmentTerm: fields.assignmentTerm ?? "",
    assignmentPath: fields.assignmentPath ?? "",
    delegatedBy: fields.delegatedBy ?? options.delegatedBy ?? "",
    delegationOffice: fields.delegationOffice ?? options.delegationOffice ?? "",
    delegationAction: fields.delegationAction ?? options.delegationAction ?? "",
    delegationDecisionPath: fields.delegationDecisionPath ?? options.delegationDecisionPath ?? "",
    note: fields.note ?? "",
  }, options);
}

export function reviewEvent(root, work, actor, decision, fields = {}, options = {}) {
  const doc = workDoc(work);
  return writeEvent(root, "review", {
    workId: doc.id,
    workTerm: workTermOf(work),
    workTitle: doc.title,
    actor: actor.name,
    actorOffice: officeNameFor(actor),
    decision,
    state: decision,
    targetEventTerm: fields.targetEventTerm ?? "",
    targetEventPath: fields.targetEventPath ?? "",
    delegatedBy: fields.delegatedBy ?? options.delegatedBy ?? "",
    delegationOffice: fields.delegationOffice ?? options.delegationOffice ?? "",
    delegationAction: fields.delegationAction ?? options.delegationAction ?? "",
    delegationDecisionPath: fields.delegationDecisionPath ?? options.delegationDecisionPath ?? "",
    note: fields.note ?? "",
  }, options);
}

export function auditEvent(root, actor, auditKind, fields = {}, options = {}) {
  return writeEvent(root, "audit", {
    actor: actor.name,
    actorOffice: officeNameFor(actor),
    auditKind,
    delegatedOffice: fields.delegatedOffice ?? "",
    targetKind: fields.targetKind ?? "",
    targetTitle: fields.targetTitle ?? "",
    decision: fields.decision ?? "",
    state: fields.state ?? fields.decision ?? "",
    findings: fields.findings ?? [],
    tracePaths: fields.tracePaths ?? [],
    note: fields.note ?? "",
    evidence: fields.evidence ?? "SWARM governance audit: audit acts produce witness traces over existing ledger and work evidence",
  }, options);
}

function sanitizeErrorMessage(message = "") {
  return String(message)
    .replace(/Bearer\s+[-._~+/=A-Za-z0-9]+/g, "Bearer [redacted]")
    .replace(/(api[_-]?key["':=\s]+)[-._~+/=A-Za-z0-9]+/gi, "$1[redacted]");
}

export function failureEvent(root, actor, error, fields = {}, options = {}) {
  return writeEvent(root, "failure", {
    actor: actor.name,
    actorOffice: officeNameFor(actor),
    provider: actor.provider ?? "",
    model: actor.model ?? "",
    state: "failed",
    phase: fields.phase ?? "",
    prompt: fields.prompt ?? "",
    actions: fields.actions ?? [],
    tracePaths: fields.tracePaths ?? [],
    errorName: error?.name ?? "Error",
    errorMessage: sanitizeErrorMessage(error?.message ?? String(error ?? "")),
    causeName: error?.cause?.name ?? "",
    causeMessage: sanitizeErrorMessage(error?.cause?.message ?? ""),
    evidence: "SWARM trace-native runtime: failed turns leave witness events so later morphisms can audit provider, office, and tool failures",
  }, options);
}

export function listEvents(root, options = {}) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, "events");
  return walkJsonl(base).map((path) => {
    const rows = rowsAt(path);                  // raw rows: term (rows[0].e) + append-order ONLY.
    const term = rows[0]?.e;
    // fold the CANONICAL section, not the raw rows — so a contested cell survives as a held value
    // (settledSection keeps distinct objects distinct) instead of last-writer-collapsing.
    const section = term ? settledSection(memoryRoot, term) : { assignments: [] };
    return { path, term, doc: docFromSection(section, rows, { e: term }), rows };
  }).filter((record) => {
    if (!record.term) return false;
    if (options.eventType && record.doc.eventType !== options.eventType) return false;
    if (options.workId && record.doc.workId !== options.workId) return false;
    if (options.toOffice && record.doc.toOffice !== options.toOffice) return false;
    if (options.actorOffice && record.doc.actorOffice !== options.actorOffice) return false;
    return true;
  }).sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")));
}

export function latestAssignmentFor(root, officeName) {
  const assignments = listEvents(root, { eventType: "assignment", toOffice: officeName });
  return assignments.at(-1) ?? null;
}
