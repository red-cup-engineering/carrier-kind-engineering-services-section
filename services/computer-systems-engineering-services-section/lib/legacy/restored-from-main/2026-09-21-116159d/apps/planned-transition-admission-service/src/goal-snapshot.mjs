import { isObjectRecord } from "../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

const STATUSES = ["proposed", "assigned", "active", "blocked", "deferred", "complete", "withdrawn"];
function isOpen(goal) { return goal.status !== "complete" && goal.status !== "withdrawn"; }
function frozenGoal(goal) {
  const closure = Object.freeze({ goalCells: Object.freeze([Object.freeze({ cell: `${goal.id}:accepted-outcome`, determinedAtDispatch: goal.status === "complete" })]), rules: Object.freeze([Object.freeze({ name: "goal-intent-to-work-plan", branching: goal.status !== "complete" })]) });
  return Object.freeze({ ...goal, eventIds: Object.freeze(goal.eventIds), notes: Object.freeze(goal.notes), evidence: Object.freeze(goal.evidence), closure, workType: closure.rules.some(({ branching }) => branching) ? "workflow" : "task", workItem: Object.freeze({ kind: "planned-transition.goal-work-item", id: `work-for:${goal.id}`, goal: goal.id, title: goal.title, intent: goal.text, focus: goal.focus, status: isOpen(goal) ? "open" : "done", evidence: Object.freeze([...goal.evidence]) }) });
}

/** Fold supplied goal EAVT rows into a deterministic goal snapshot. */
export function foldGoalEvents(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const goals = new Map();
  for (const row of events) {
    if (!Array.isArray(row) || row.length !== 4 || !isObjectRecord(row[2])) continue;
    const [id, attribute, value] = row;
    if (typeof id !== "string" || value.kind !== "planned-transition.goal.event" || typeof value.at !== "string" || typeof value.eventId !== "string") continue;
    if (attribute === "planned-transition.goal.submitted" && typeof value.text === "string") {
      goals.set(id, { kind: "planned-transition.goal", id, title: value.title ?? value.text.slice(0, 88), text: value.text, status: value.status ?? "proposed", priority: value.priority ?? 50, focus: value.focus ?? null, createdAt: value.at, updatedAt: value.at, eventIds: [value.eventId], notes: [], evidence: [`goal-event:${value.eventId}`] });
      continue;
    }
    const goal = goals.get(id); if (goal === undefined) continue;
    if (attribute === "planned-transition.goal.status" && STATUSES.includes(value.status)) goal.status = value.status;
    if (attribute === "planned-transition.goal.note" && typeof value.note === "string") goal.notes.push(value.note);
    goal.updatedAt = goal.updatedAt > value.at ? goal.updatedAt : value.at; if (!goal.eventIds.includes(value.eventId)) goal.eventIds.push(value.eventId); goal.evidence.push(`goal-event:${value.eventId}`);
  }
  const projected = Object.freeze([...goals.values()].map(frozenGoal).sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt)));
  const counts = Object.fromEntries([...STATUSES, "open"].map((status) => [status, status === "open" ? projected.filter(isOpen).length : projected.filter((goal) => goal.status === status).length]));
  return Object.freeze({ kind: "planned-transition.goal-snapshot", generatedAt: String(options.generatedAt ?? new Date().toISOString()), eventCount: events.length, counts: Object.freeze(counts), open: Object.freeze(projected.filter(isOpen).map(({ id }) => id)), goals: projected });
}

export function projectGoalSnapshot(snapshot, params = {}) {
  if (params.detail === "full") return snapshot;
  const { goals, ...summary } = snapshot;
  return Object.freeze({ ...summary, kind: "planned-transition.goal-snapshot-summary", goalCount: goals.length });
}
