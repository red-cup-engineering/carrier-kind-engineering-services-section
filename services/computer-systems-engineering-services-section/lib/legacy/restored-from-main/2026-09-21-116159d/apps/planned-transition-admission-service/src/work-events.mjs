import { createHash } from "node:crypto";

const ACTIVE_STATUSES = new Set(["active", "blocked", "complete"]);
const WORK_STATUSES = new Set(["open", "in-progress", "blocked", "review", "done", "deferred", "abandoned", "reopened"]);
const WORK_KINDS = new Set([
  "task", "goal", "milestone", "enterprise", "endeavor", "campaign", "objective", "project",
  "expedition", "plan", "workflow", "procedure", "process", "inquiry", "derivation", "phase",
  "sprint", "question", "decision", "friction-note", "triage-note",
]);

export function admitWorkStart(params, options = {}) {
  const at = requiredText(options.at ?? params.at, "at");
  const title = requiredText(params.title ?? params.q, "work title");
  const intent = requiredText(params.intent, "work intent");
  const success = requiredText(params.success, "work success criteria");
  const focus = optionalText(params.focus);
  const agent = optionalText(params.agent) ?? "codex";
  const session = optionalText(params.session ?? params.session_id);
  const status = "active";
  const value = Object.freeze({
    kind: "operations-manifold.work.event",
    event: "started",
    eventId: `work-event:${hash({ at, title, intent, success, focus, agent, session }).slice(0, 24)}`,
    at,
    title,
    intent,
    success,
    status,
    workKind: workKind(params.workKind ?? params.kind),
    workStatus: workStatusFor(status),
    owner: slug(optionalText(params.ownedBy ?? params.owner) ?? "operations-manifold"),
    assignedTo: Object.freeze(textList(params.assignedTo).map(slug)),
    ...(optionalText(params.priority) === null ? {} : { priority: optionalText(params.priority) }),
    ...(optionalText(params.deadline) === null ? {} : { deadline: optionalText(params.deadline) }),
    gate: workGate(params.gate),
    dependsOn: textList(params.dependsOn),
    contributesTo: textList(params.contributesTo),
    ...(optionalText(params.blockedBy) === null ? {} : { blockedBy: optionalText(params.blockedBy) }),
    ...(focus === null ? {} : { focus }),
    agent,
    ...(session === null ? {} : { session }),
    evidence: textList(params.evidence),
    source: optionalText(params.source) ?? "planned-transition-admission-service",
  });
  const id = `work:${slug(title)}:${hash({ title, intent, at }).slice(0, 12)}`;
  return admission(id, "operations-manifold.work.started", value);
}

export function admitWorkUpdate(snapshot, params, options = {}) {
  const at = requiredText(options.at ?? params.at, "at");
  const id = resolveWorkId(snapshot, params.id);
  const status = activeStatus(params.status);
  const workStatus = optionalWorkStatus(params.workStatus ?? params.status);
  const workKindValue = optionalWorkKind(params.workKind ?? params.kind);
  const fields = {
    note: optionalText(params.note ?? params.q),
    owner: optionalText(params.ownedBy ?? params.owner),
    priority: optionalText(params.priority),
    deadline: optionalText(params.deadline),
    gate: optionalWorkGate(params.gate),
    blockedBy: optionalText(params.blockedBy),
    session: optionalText(params.session ?? params.session_id),
  };
  const lists = {
    assignedTo: textList(params.assignedTo), dependsOn: textList(params.dependsOn),
    contributesTo: textList(params.contributesTo), evidence: textList(params.evidence),
  };
  if (status === null && workStatus === null && workKindValue === null
      && Object.values(fields).every((value) => value === null)
      && Object.values(lists).every((value) => value.length === 0)) {
    throw new TypeError("work update requires note, status, metadata, or evidence");
  }
  const value = Object.freeze({
    kind: "operations-manifold.work.event", event: "updated",
    eventId: `work-event:${hash({ id, at, status, fields, lists }).slice(0, 24)}`,
    at,
    ...(status === null ? {} : { status }),
    ...(workKindValue === null ? {} : { workKind: workKindValue }),
    ...(workStatus === null ? {} : { workStatus }),
    ...(fields.owner === null ? {} : { owner: slug(fields.owner) }),
    ...(lists.assignedTo.length === 0 ? {} : { assignedTo: Object.freeze(lists.assignedTo.map(slug)) }),
    ...(fields.priority === null ? {} : { priority: fields.priority }),
    ...(fields.deadline === null ? {} : { deadline: fields.deadline }),
    ...(fields.gate === null ? {} : { gate: fields.gate }),
    ...(lists.dependsOn.length === 0 ? {} : { dependsOn: lists.dependsOn }),
    ...(lists.contributesTo.length === 0 ? {} : { contributesTo: lists.contributesTo }),
    ...(fields.blockedBy === null ? {} : { blockedBy: fields.blockedBy }),
    ...(fields.session === null ? {} : { session: fields.session }),
    ...(fields.note === null ? {} : { note: fields.note }),
    evidence: lists.evidence,
    source: optionalText(params.source) ?? "planned-transition-admission-service",
  });
  return admission(id, "operations-manifold.work.updated", value);
}

export function admitWorkCompletion(snapshot, params, options = {}) {
  const at = requiredText(options.at ?? params.at, "at");
  const id = resolveWorkId(snapshot, params.id);
  const outcome = requiredText(params.outcome ?? params.q, "work completion outcome");
  const evidence = textList(params.evidence);
  const value = Object.freeze({
    kind: "operations-manifold.work.event", event: "completed",
    eventId: `work-event:${hash({ id, at, outcome, evidence }).slice(0, 24)}`,
    at, status: "complete", outcome, evidence,
    source: optionalText(params.source) ?? "planned-transition-admission-service",
  });
  return admission(id, "operations-manifold.work.completed", value);
}

function admission(id, attribute, value) {
  return Object.freeze({
    kind: "planned-transition.work-event-admission", accepted: true, id, value,
    event: Object.freeze([id, attribute, value, Object.freeze({ at: value.at, eventId: value.eventId })]),
  });
}

export function resolveWorkId(snapshot, requested) {
  const explicit = optionalText(requested);
  if (explicit !== null) {
    if (!snapshot?.items?.some((item) => item.id === explicit)) throw new Error(`work item not found: ${explicit}`);
    return explicit;
  }
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const active = items.find((item) => isOpenWork(item) && item.gate === "stop") ?? items.find(isOpenWork);
  if (active === undefined) throw new Error("no active work item");
  return active.id;
}

export function isOpenWork(item) {
  return item.status !== "complete" && item.workStatus !== "done" && item.workStatus !== "abandoned" && item.workStatus !== "deferred";
}

export function workStatusFor(status) { return status === "complete" ? "done" : status === "blocked" ? "blocked" : "in-progress"; }
function activeStatus(value) { const text = optionalText(value); return text !== null && ACTIVE_STATUSES.has(text) ? text : null; }
function workKind(value) { const text = optionalText(value); return text !== null && WORK_KINDS.has(text) ? text : "task"; }
function optionalWorkKind(value) { const text = optionalText(value); return text !== null && WORK_KINDS.has(text) ? text : null; }
function optionalWorkStatus(value) { const text = optionalText(value); return text !== null && WORK_STATUSES.has(text) ? text : null; }
function workGate(value) { return optionalText(value) === "record" ? "record" : "stop"; }
function optionalWorkGate(value) { const text = optionalText(value); return text === "stop" || text === "record" ? text : null; }
function textList(value) { const list = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : []; return Object.freeze(list.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean)); }
function optionalText(value) { if (value === undefined || value === null) return null; const text = String(value).trim(); return text === "" ? null : text; }
function requiredText(value, name) { const text = optionalText(value); if (text === null) throw new TypeError(`${name} must be a nonempty string`); return text; }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "work"; }
function hash(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
