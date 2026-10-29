import { cell } from "@emsenn/relating";
import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import {
  appendEavtLog,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  timeOfEavtMetadata,
  writeJsonState,
  type EavtLogStatePaths,
} from "./operating/recording/events/stating/library/eavt-log-state.mts";
import { hash, isRecord, jsonValue, maxIso, optionalText, pushUnique, requireText, slug as sharedSlug, stringOf } from "./records.mts";
import { deriveWorkType, officeTerm, predicate, term, workItem, workTask, type TaskClosure, type WorkItem, type WorkType } from "./work-carriers.mts";

const GOAL_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("goals");
const GOAL_LOG_RELATIVE = GOAL_LOG_STATE.log;
const GOAL_STATE_RELATIVE = GOAL_LOG_STATE.state;

export type GoalIntakeParams = Readonly<{
  text?: string | undefined;
  q?: string | undefined;
  title?: string | undefined;
  focus?: string | undefined;
  priority?: string | number | undefined;
  source?: string | undefined;
}>;

export type GoalEventName = "submitted" | "status" | "note";
export type GoalStatus = "proposed" | "assigned" | "active" | "blocked" | "deferred" | "complete" | "withdrawn";

export type GoalRecord = Readonly<{
  kind: "operations-manifold.goal";
  id: string;
  title: string;
  text: string;
  status: GoalStatus;
  priority: number;
  focus: string | null;
  createdAt: string;
  updatedAt: string;
  eventIds: readonly string[];
  notes: readonly string[];
  closure: TaskClosure;
  workType: WorkType;
  workItem: WorkItem;
  evidence: readonly string[];
}>;

export type GoalSnapshot = Readonly<{
  kind: "operations-manifold.goals.snapshot";
  generatedAt: string;
  log: string;
  state: string;
  cycle: readonly ["form", "eavt", "sensor", "eavt", "actuator", "eavt", "form"];
  eventCount: number;
  counts: Readonly<Record<GoalStatus | "open", number>>;
  open: readonly string[];
  goals: readonly GoalRecord[];
}>;

export type GoalIntakeResult = Readonly<{
  kind: "operations-manifold.goals.intake";
  accepted: true;
  event: EAVT;
  eavtJsonl: string;
  goal: GoalRecord;
  snapshot: GoalSnapshot;
}>;

type GoalEventValue = Readonly<{
  kind: "operations-manifold.goal.event";
  event: GoalEventName;
  eventId: string;
  at: string;
  title?: string;
  text?: string;
  status?: GoalStatus;
  priority?: number;
  focus?: string;
  note?: string;
  source?: string;
}>;

type MutableGoal = {
  kind: "operations-manifold.goal";
  id: string;
  title: string;
  text: string;
  status: GoalStatus;
  priority: number;
  focus: string | null;
  createdAt: string;
  updatedAt: string;
  eventIds: string[];
  notes: string[];
  evidence: string[];
};

export async function intakeGoal(repoRoot: string, params: GoalIntakeParams): Promise<GoalIntakeResult> {
  const now = new Date().toISOString();
  const text = requireText(params.text ?? params.q, "goal text");
  const title = titleForGoal(params.title, text);
  const focus = optionalText(params.focus);
  const priority = priorityFor(params.priority);
  const seed = { at: now, text, title, focus, priority, source: optionalText(params.source) ?? "operations-manifold.admit-goal-document" };
  const eventId = `goal-event:${hash(seed).slice(0, 24)}`;
  const goalId = `goal:${slug(title)}:${hash({ text, title, at: now }).slice(0, 12)}`;
  const value: GoalEventValue = Object.freeze({
    kind: "operations-manifold.goal.event" as const,
    event: "submitted" as const,
    eventId,
    at: now,
    title,
    text,
    status: "proposed" as const,
    priority,
    ...(focus === null ? {} : { focus }),
    source: optionalText(params.source) ?? "operations-manifold.admit-goal-document",
  });
  const event: EAVT = Object.freeze([
    goalId,
    "operations-manifold.goal.submitted",
    jsonValue(value),
    jsonValue({ at: now, eventId }),
  ]);

  await ensureGoalDirs(repoRoot);
  const eavtJsonl = await appendEavtLog(repoRoot, GOAL_LOG_STATE, [event]);
  const snapshot = await refreshGoalSnapshot(repoRoot);
  const goal = snapshot.goals.find((item) => item.id === goalId);
  if (goal === undefined) throw new Error(`goal was not projected after intake: ${goalId}`);
  return Object.freeze({ kind: "operations-manifold.goals.intake" as const, accepted: true as const, event, eavtJsonl, goal, snapshot });
}

export async function operationsManifoldGoals(repoRoot: string): Promise<GoalSnapshot> {
  await ensureGoalDirs(repoRoot);
  return refreshGoalSnapshot(repoRoot);
}

export async function refreshGoalSnapshot(repoRoot: string): Promise<GoalSnapshot> {
  const events = await readGoalLog(repoRoot);
  const snapshot = foldGoalEvents(events);
  await writeSnapshot(repoRoot, snapshot);
  return snapshot;
}

function foldGoalEvents(events: readonly EAVT[]): GoalSnapshot {
  const goals = new Map<string, MutableGoal>();
  for (const event of events) {
    const goalId = stringOf(event[0]);
    if (goalId === null) continue;
    const attr = stringOf(event[1]);
    const value = goalEventValue(event[2]);
    if (value === null) continue;
    const at = stringOf(value.at) ?? timeOf(event[3]) ?? new Date(0).toISOString();
    const existing = goals.get(goalId);

    if (attr === "operations-manifold.goal.submitted" && value.text !== undefined) {
      const goal: MutableGoal = existing ?? {
        kind: "operations-manifold.goal",
        id: goalId,
        title: value.title ?? titleForGoal(undefined, value.text),
        text: value.text,
        status: value.status ?? "proposed",
        priority: value.priority ?? 50,
        focus: value.focus ?? null,
        createdAt: at,
        updatedAt: at,
        eventIds: [],
        notes: [],
        evidence: [],
      };
      goal.title = value.title ?? goal.title;
      goal.text = value.text;
      goal.status = value.status ?? goal.status;
      goal.priority = value.priority ?? goal.priority;
      goal.focus = value.focus ?? goal.focus;
      goal.updatedAt = maxIso(goal.updatedAt, at);
      pushUnique(goal.eventIds, value.eventId);
      pushUnique(goal.evidence, `${GOAL_LOG_RELATIVE}#${value.eventId}`);
      goals.set(goalId, goal);
      continue;
    }

    if (existing === undefined) continue;
    if (attr === "operations-manifold.goal.status" && value.status !== undefined) existing.status = value.status;
    if (attr === "operations-manifold.goal.note" && value.note !== undefined) existing.notes.push(value.note);
    existing.updatedAt = maxIso(existing.updatedAt, at);
    pushUnique(existing.eventIds, value.eventId);
    pushUnique(existing.evidence, `${GOAL_LOG_RELATIVE}#${value.eventId}`);
  }

  const projected = [...goals.values()]
    .map(projectGoal)
    .sort((left, right) => right.priority - left.priority || left.createdAt.localeCompare(right.createdAt));
  const counts = countsFor(projected);
  return Object.freeze({
    kind: "operations-manifold.goals.snapshot" as const,
    generatedAt: new Date().toISOString(),
    log: GOAL_LOG_RELATIVE,
    state: GOAL_STATE_RELATIVE,
    cycle: Object.freeze(["form", "eavt", "sensor", "eavt", "actuator", "eavt", "form"] as const),
    eventCount: events.length,
    counts,
    open: Object.freeze(projected.filter(isOpenGoal).map((goal) => goal.id)),
    goals: Object.freeze(projected),
  });
}

function projectGoal(goal: MutableGoal): GoalRecord {
  const closure = goalClosure(goal);
  const workType = deriveWorkType(closure);
  const subject = term(["operations-manifold", "goal", goal.id]);
  const task = workTask({
    term: term(["operations-manifold", "goal", goal.id, "task"]),
    goals: Object.freeze([
      cell(subject, predicate(["advance"]), term(goal.focus === null ? ["operations-manifold", "state"] : ["focus", goal.focus])),
    ]),
    evidence: Object.freeze([
      term(["title", goal.title]),
      term(["text", goal.text]),
      term(["status", goal.status]),
      term(["priority", goal.priority]),
      term(["read-work-type", workType]),
      ...goal.evidence.map((entry) => term(["evidence", entry])),
    ]),
  });
  const item = workItem({
    term: term(["read-work", goal.id]),
    task,
    office: officeTerm("operations-manifold"),
    evidence: Object.freeze([
      term(["goal-id", goal.id]),
      term(["created-at", goal.createdAt]),
      term(["updated-at", goal.updatedAt]),
      term(["focus", goal.focus ?? "operations-manifold"]),
      term(["log", GOAL_LOG_RELATIVE]),
      term(["state", GOAL_STATE_RELATIVE]),
    ]),
  });
  return Object.freeze({
    kind: "operations-manifold.goal" as const,
    id: goal.id,
    title: goal.title,
    text: goal.text,
    status: goal.status,
    priority: goal.priority,
    focus: goal.focus,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    eventIds: Object.freeze([...goal.eventIds]),
    notes: Object.freeze([...goal.notes]),
    closure,
    workType,
    workItem: item,
    evidence: Object.freeze([...goal.evidence]),
  });
}

function goalClosure(goal: MutableGoal): TaskClosure {
  return Object.freeze({
    goalCells: Object.freeze([
      Object.freeze({
        cell: `${goal.id}:accepted-outcome`,
        determinedAtDispatch: goal.status === "complete",
      }),
    ]),
    rules: Object.freeze([
      Object.freeze({
        name: "goal-intent-to-read-work-plan",
        branching: goal.status !== "complete",
      }),
    ]),
  });
}

function countsFor(goals: readonly GoalRecord[]): Readonly<Record<GoalStatus | "open", number>> {
  const counts: Record<GoalStatus | "open", number> = {
    proposed: 0,
    assigned: 0,
    active: 0,
    blocked: 0,
    deferred: 0,
    complete: 0,
    withdrawn: 0,
    open: 0,
  };
  for (const goal of goals) {
    counts[goal.status] += 1;
    if (isOpenGoal(goal)) counts.open += 1;
  }
  return Object.freeze(counts);
}

async function readGoalLog(repoRoot: string): Promise<readonly EAVT[]> {
  return readEavtLog(repoRoot, GOAL_LOG_STATE);
}

async function writeSnapshot(repoRoot: string, snapshot: GoalSnapshot): Promise<void> {
  return writeJsonState(repoRoot, GOAL_LOG_STATE, snapshot);
}

async function ensureGoalDirs(repoRoot: string): Promise<void> {
  return ensureEavtLogStateDirs(repoRoot, GOAL_LOG_STATE);
}

function titleForGoal(title: string | undefined, text: string): string {
  const explicit = optionalText(title);
  if (explicit !== null) return explicit.slice(0, 120);
  const firstLine = text.split(/\r?\n/u).find((line) => line.trim() !== "") ?? text;
  return firstLine.trim().replace(/\s+/gu, " ").slice(0, 88) || "Untitled goal";
}

function priorityFor(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return clampPriority(value);
  const trimmed = optionalText(value);
  if (trimmed === null) return 50;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? clampPriority(parsed) : 50;
}

function clampPriority(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function goalEventValue(value: JsonValue): GoalEventValue | null {
  if (!isRecord(value) || value["kind"] !== "operations-manifold.goal.event") return null;
  const event = value["event"];
  const eventId = value["eventId"];
  const at = value["at"];
  const status = value["status"];
  if (event === undefined || !isGoalEventName(event) || typeof eventId !== "string" || typeof at !== "string") return null;
  return Object.freeze({
    kind: "operations-manifold.goal.event" as const,
    event,
    eventId,
    at,
    ...(typeof value["title"] === "string" ? { title: value["title"] } : {}),
    ...(typeof value["text"] === "string" ? { text: value["text"] } : {}),
    ...(status !== undefined && isGoalStatus(status) ? { status } : {}),
    ...(typeof value["priority"] === "number" ? { priority: clampPriority(value["priority"]) } : {}),
    ...(typeof value["focus"] === "string" ? { focus: value["focus"] } : {}),
    ...(typeof value["note"] === "string" ? { note: value["note"] } : {}),
    ...(typeof value["source"] === "string" ? { source: value["source"] } : {}),
  });
}

function isGoalEventName(value: JsonValue): value is GoalEventName {
  return value === "submitted" || value === "status" || value === "note";
}

function isGoalStatus(value: JsonValue): value is GoalStatus {
  return value === "proposed"
    || value === "assigned"
    || value === "active"
    || value === "blocked"
    || value === "deferred"
    || value === "complete"
    || value === "withdrawn";
}

function isOpenGoal(goal: GoalRecord): boolean {
  return goal.status !== "complete" && goal.status !== "withdrawn";
}

function timeOf(value: JsonValue): string | null {
  return timeOfEavtMetadata(value, isRecord);
}

function slug(value: string): string {
  return sharedSlug(value, "goal", 56);
}
