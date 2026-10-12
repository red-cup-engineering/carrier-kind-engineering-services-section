import { isOpenWork, workStatusFor } from "./work-events.mjs";
import { isObjectRecord } from "../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export function foldWorkEvents(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const generatedAt = requiredText(options.generatedAt, "generatedAt");
  const items = new Map();
  for (const row of events) {
    if (!Array.isArray(row) || row.length !== 4 || !isObjectRecord(row[2])) continue;
    const [id, attribute, value] = row;
    if (typeof id !== "string" || value.kind !== "operations-manifold.work.event" || typeof value.at !== "string" || typeof value.eventId !== "string") continue;
    if (attribute === "operations-manifold.work.started" && typeof value.title === "string" && typeof value.intent === "string" && typeof value.success === "string") {
      const item = {
        kind: "planned-transition.work-item", id, title: value.title, intent: value.intent, success: value.success,
        status: value.status ?? "active", workKind: value.workKind ?? "task",
        workStatus: value.workStatus ?? workStatusFor(value.status ?? "active"), owner: value.owner ?? "operations-manifold",
        assignedTo: [...(value.assignedTo ?? [])], priority: value.priority ?? null, deadline: value.deadline ?? null,
        gate: value.gate ?? "stop", dependsOn: [...(value.dependsOn ?? [])], contributesTo: [...(value.contributesTo ?? [])],
        blockedBy: value.blockedBy ?? null, focus: value.focus ?? null, agent: value.agent ?? "codex", session: value.session ?? null,
        createdAt: value.at, updatedAt: value.at, completedAt: null, outcome: null, eventIds: [value.eventId], notes: [],
        evidence: [...evidenceFor(value)],
      };
      items.set(id, item);
      continue;
    }
    const item = items.get(id);
    if (item === undefined) continue;
    if (value.at > item.updatedAt) item.updatedAt = value.at;
    if (value.status !== undefined) { item.status = value.status; item.workStatus = workStatusFor(value.status); }
    for (const field of ["workKind", "workStatus", "owner", "priority", "deadline", "gate", "blockedBy", "session"]) if (value[field] !== undefined) item[field] = value[field];
    for (const field of ["assignedTo", "dependsOn", "contributesTo"]) if (Array.isArray(value[field])) item[field] = [...value[field]];
    if (typeof value.note === "string") item.notes.push(value.note);
    if (typeof value.outcome === "string") { item.outcome = value.outcome; item.status = "complete"; item.workStatus = "done"; item.completedAt = value.at; }
    if (!item.eventIds.includes(value.eventId)) item.eventIds.push(value.eventId);
    item.evidence.push(...evidenceFor(value).filter((entry) => !item.evidence.includes(entry)));
  }
  const projected = Object.freeze([...items.values()]
    .map(freezeItem)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title)));
  return Object.freeze({
    kind: "planned-transition.work-snapshot", generatedAt, eventCount: events.length,
    counts: countsFor(projected), latest: projected[0]?.id ?? null,
    active: Object.freeze(projected.filter(isOpenWork).map((item) => item.id)),
    blocking: Object.freeze(projected.filter((item) => isOpenWork(item) && item.gate === "stop").map((item) => item.id)),
    items: projected,
  });
}

export function projectWorkSnapshot(snapshot, params = {}) {
  const detail = optionalText(params.detail) ?? "summary";
  if (detail === "full") return snapshot;
  if (detail === "items" || detail === "page" || ["limit", "offset", "focus", "status", "workStatus", "gate", "agent", "session"].some((field) => params[field] !== undefined)) {
    return pageWorkSnapshot(snapshot, params);
  }
  return summarizeWorkSnapshot(snapshot);
}

export function summarizeWorkSnapshot(snapshot) {
  const { items, ...rest } = snapshot;
  return Object.freeze({ ...rest, kind: "planned-transition.work-snapshot-summary", itemCount: items.length });
}

export function judgeWorkStopGate(snapshot, params = {}) {
  const session = optionalText(params.session ?? params.session_id);
  const blocking = snapshot.items.filter((item) => isOpenWork(item) && item.gate === "stop" && (session === null || item.session === session));
  if (blocking.length > 0) return Object.freeze({
    kind: "planned-transition.work-stop-gate", passed: false, generatedAt: snapshot.generatedAt, session,
    blocking: Object.freeze(blocking.map((item) => Object.freeze({ id: item.id, title: item.title, success: item.success }))),
    message: session === null ? "Active stop-gated work remains." : `Stop-gated work remains for session ${session}.`,
  });
  return Object.freeze({ kind: "planned-transition.work-stop-gate", passed: true, generatedAt: snapshot.generatedAt, session, blocking: Object.freeze([]), message: session === null ? "No active work blocks stopping." : `No work for session ${session} blocks stopping.` });
}

function pageWorkSnapshot(snapshot, params) {
  const filters = Object.fromEntries(["focus", "status", "workStatus", "gate", "agent", "session"].map((field) => [field, optionalText(params[field])]));
  const offset = boundedInteger(params.offset, 0, Number.MAX_SAFE_INTEGER, 0);
  const limit = boundedInteger(params.limit, 1, 100, 25);
  const filtered = snapshot.items.filter((item) => matches(item, filters));
  const items = Object.freeze(filtered.slice(offset, offset + limit).map(summarizeWorkItem));
  return Object.freeze({ kind: "planned-transition.work-snapshot-page", summary: summarizeWorkSnapshot(snapshot), ...filters, offset, limit, itemCount: filtered.length, returned: items.length, items });
}

function matches(item, filters) {
  return (filters.focus === null || searchable(item).includes(filters.focus.toLowerCase()))
    && (filters.status === null || item.status === filters.status)
    && (filters.workStatus === null || item.workStatus === filters.workStatus)
    && (filters.gate === null || item.gate === filters.gate)
    && (filters.agent === null || item.agent === filters.agent || item.owner === filters.agent || item.assignedTo.includes(filters.agent))
    && (filters.session === null || item.session === filters.session);
}
function searchable(item) { return [item.id, item.title, item.intent, item.success, item.owner, item.focus, item.agent, item.session, item.outcome, item.workKind, item.workStatus, ...item.assignedTo, ...item.dependsOn, ...item.contributesTo, ...item.notes, ...item.evidence].filter((value) => value !== null).join(" ").toLowerCase(); }
function summarizeWorkItem(item) { return Object.freeze({ kind: "planned-transition.work-item-summary", id: item.id, title: item.title, status: item.status, workKind: item.workKind, workStatus: item.workStatus, owner: item.owner, assignedTo: item.assignedTo, agent: item.agent, priority: item.priority, gate: item.gate, focus: item.focus, session: item.session, blockedBy: item.blockedBy, dependsOn: item.dependsOn, contributesTo: item.contributesTo, createdAt: item.createdAt, updatedAt: item.updatedAt, completedAt: item.completedAt, intent: truncate(item.intent), success: truncate(item.success), outcome: item.outcome === null ? null : truncate(item.outcome), notesCount: item.notes.length, evidenceCount: item.evidence.length, latestNote: item.notes.at(-1) === undefined ? null : truncate(item.notes.at(-1)) }); }
function evidenceFor(value) { return Object.freeze([`work-event:${value.eventId}`, ...(Array.isArray(value.evidence) ? value.evidence.filter((entry) => typeof entry === "string") : [])]); }
function freezeItem(item) { return Object.freeze({ ...item, assignedTo: Object.freeze([...item.assignedTo]), dependsOn: Object.freeze([...item.dependsOn]), contributesTo: Object.freeze([...item.contributesTo]), eventIds: Object.freeze([...item.eventIds]), notes: Object.freeze([...item.notes]), evidence: Object.freeze([...item.evidence]) }); }
function countsFor(items) { const counts = { active: 0, blocked: 0, complete: 0, open: 0, retired: 0 }; for (const item of items) { if (item.workStatus === "abandoned" || item.workStatus === "deferred") counts.retired += 1; else if (item.status === "complete" || item.workStatus === "done") counts.complete += 1; else { counts[item.status] += 1; if (isOpenWork(item)) counts.open += 1; } } return Object.freeze(counts); }
function truncate(value, max = 600) { return value.length <= max ? value : `${value.slice(0, max - 1)}…`; }
function boundedInteger(value, min, max, fallback) { const parsed = Number(value); return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback; }
function optionalText(value) { if (value === undefined || value === null) return null; const text = String(value).trim(); return text === "" ? null : text; }
function requiredText(value, name) { const text = optionalText(value); if (text === null) throw new TypeError(`${name} must be a nonempty string`); return text; }
