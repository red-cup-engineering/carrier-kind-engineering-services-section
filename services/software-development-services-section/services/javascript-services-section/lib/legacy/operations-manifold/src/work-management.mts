import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import {
  appendEavtLog,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  writeJsonState,
  type EavtLogStatePaths,
} from "./operating/recording/events/stating/library/eavt-log-state.mts";
import { boundedInteger, boundaryListParam, boundaryTextParam, hash, hookPayload, isRecord, isString, jsonValue, maxIso, optionalText, pushUnique, requireText, slug as sharedSlug, stringField, stringList, stringOf, type BoundaryParams } from "./records.mts";
import { harnessIdentity } from "./harness.mts";
import { foldCampaignRollup, type CampaignNode, type LadderKind } from "./operating/planning/campaigning/library/campaign-rollup.mts";

const WORK_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("work");
const WORK_LOG_RELATIVE = WORK_LOG_STATE.log;
const WORK_STATE_RELATIVE = WORK_LOG_STATE.state;

export type ActiveWorkStatus = "active" | "blocked" | "complete";
export type ActiveWorkEventName = "started" | "updated" | "completed";
export type WorkGateMode = "stop" | "record";
export type WorkItemKind =
  | "task"
  | "goal"
  | "milestone"
  | "enterprise"
  | "endeavor"
  | "campaign"
  | "objective"
  | "project"
  | "expedition"
  | "plan"
  | "workflow"
  | "procedure"
  | "process"
  | "inquiry"
  | "derivation"
  | "phase"
  | "sprint"
  | "question"
  | "decision"
  | "friction-note"
  | "triage-note";
export type WorkItemStatus = "open" | "in-progress" | "blocked" | "review" | "done" | "deferred" | "abandoned" | "reopened";

export type WorkStartParams = Readonly<{
  title?: string | undefined;
  q?: string | undefined;
  intent?: string | undefined;
  success?: string | undefined;
  workKind?: string | undefined;
  kind?: string | undefined;
  owner?: string | undefined;
  ownedBy?: string | undefined;
  assignedTo?: string | readonly string[] | undefined;
  priority?: string | undefined;
  deadline?: string | undefined;
  gate?: string | undefined;
  dependsOn?: string | readonly string[] | undefined;
  contributesTo?: string | readonly string[] | undefined;
  blockedBy?: string | undefined;
  focus?: string | undefined;
  agent?: string | undefined;
  session?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  source?: string | undefined;
}>;

export type WorkUpdateParams = Readonly<{
  id?: string | undefined;
  status?: string | undefined;
  note?: string | undefined;
  q?: string | undefined;
  workKind?: string | undefined;
  kind?: string | undefined;
  owner?: string | undefined;
  ownedBy?: string | undefined;
  assignedTo?: string | readonly string[] | undefined;
  priority?: string | undefined;
  deadline?: string | undefined;
  gate?: string | undefined;
  dependsOn?: string | readonly string[] | undefined;
  contributesTo?: string | readonly string[] | undefined;
  blockedBy?: string | undefined;
  session?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  source?: string | undefined;
}>;

export type WorkCompleteParams = Readonly<{
  id?: string | undefined;
  outcome?: string | undefined;
  q?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  source?: string | undefined;
}>;

export type WorkHookEventParams = Readonly<{
  event?: string | undefined;
  hook_event_name?: string | undefined;
  session_id?: string | undefined;
  transcript_path?: string | undefined;
  cwd?: string | undefined;
  payload?: string | undefined;
  stdin?: string | undefined;
  source?: string | undefined;
  harness?: string | undefined;
}>;

export type ActiveWorkRecord = Readonly<{
  kind: "operations-manifold.work.item";
  id: string;
  title: string;
  intent: string;
  success: string;
  status: ActiveWorkStatus;
  workKind: WorkItemKind;
  workStatus: WorkItemStatus;
  owner: string;
  assignedTo: readonly string[];
  priority: string | null;
  deadline: string | null;
  gate: WorkGateMode;
  dependsOn: readonly string[];
  contributesTo: readonly string[];
  blockedBy: string | null;
  focus: string | null;
  agent: string;
  session: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  outcome: string | null;
  eventIds: readonly string[];
  notes: readonly string[];
  evidence: readonly string[];
}>;

export type WorkSnapshot = Readonly<{
  kind: "operations-manifold.work.snapshot";
  generatedAt: string;
  log: string;
  state: string;
  eventCount: number;
  counts: WorkSnapshotCounts;
  latest: string | null;
  active: readonly string[];
  blocking: readonly string[];
  items: readonly ActiveWorkRecord[];
}>;

export type WorkSnapshotCounts = Readonly<Record<ActiveWorkStatus | "open" | "retired", number>>;

// Transport projection of a snapshot: the full items[] (every work item across
// every session, with folded notes/evidence) is the package-bin context dump.
// stdout is a projection, not a core model — emit the navigational summary
// (counts, active, blocking, latest, itemCount) and drop the item inventory.
export type WorkSnapshotSummary = Readonly<{
  kind: "operations-manifold.work.snapshot-summary";
  generatedAt: string;
  log: string;
  state: string;
  eventCount: number;
  counts: WorkSnapshotCounts;
  latest: string | null;
  active: readonly string[];
  blocking: readonly string[];
  itemCount: number;
}>;

export type WorkSnapshotReadParams = Readonly<{
  detail?: string | number | undefined;
  limit?: string | number | undefined;
  offset?: string | number | undefined;
  focus?: string | number | undefined;
  status?: string | number | undefined;
  workStatus?: string | number | undefined;
  gate?: string | number | undefined;
  agent?: string | number | undefined;
  session?: string | number | undefined;
}>;

export type WorkSnapshotPage = Readonly<{
  kind: "operations-manifold.work.snapshot-page";
  summary: WorkSnapshotSummary;
  focus: string | null;
  status: string | null;
  workStatus: string | null;
  gate: string | null;
  agent: string | null;
  session: string | null;
  offset: number;
  limit: number;
  itemCount: number;
  returned: number;
  items: readonly WorkSnapshotItemSummary[];
}>;

export type WorkSnapshotProjection = WorkSnapshotSummary | WorkSnapshotPage | WorkSnapshot;

export type WorkSnapshotItemSummary = Readonly<{
  kind: "operations-manifold.work.item-summary";
  id: string;
  title: string;
  status: ActiveWorkStatus;
  workKind: WorkItemKind;
  workStatus: WorkItemStatus;
  owner: string;
  assignedTo: readonly string[];
  agent: string;
  priority: string | null;
  gate: WorkGateMode;
  focus: string | null;
  session: string | null;
  blockedBy: string | null;
  dependsOn: readonly string[];
  contributesTo: readonly string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  intent: string;
  success: string;
  outcome: string | null;
  notesCount: number;
  evidenceCount: number;
  latestNote: string | null;
}>;

export function summarizeWorkSnapshot(snapshot: WorkSnapshot): WorkSnapshotSummary {
  const { items, ...rest } = snapshot;
  return Object.freeze({
    ...rest,
    kind: "operations-manifold.work.snapshot-summary" as const,
    itemCount: items.length,
  });
}

export function projectWorkSnapshot(snapshot: WorkSnapshot, params: WorkSnapshotReadParams = {}): WorkSnapshotProjection {
  const detail = optionalText(params.detail) ?? "summary";
  if (detail === "full") return snapshot;
  if (
    detail === "items"
    || detail === "page"
    || params.limit !== undefined
    || params.offset !== undefined
    || params.focus !== undefined
    || params.status !== undefined
    || params.workStatus !== undefined
    || params.gate !== undefined
    || params.agent !== undefined
    || params.session !== undefined
  ) {
    return pageWorkSnapshot(snapshot, params);
  }
  return summarizeWorkSnapshot(snapshot);
}

function pageWorkSnapshot(snapshot: WorkSnapshot, params: WorkSnapshotReadParams): WorkSnapshotPage {
  const focus = optionalText(params.focus);
  const status = optionalText(params.status);
  const workStatus = optionalText(params.workStatus);
  const gate = optionalText(params.gate);
  const agent = optionalText(params.agent);
  const session = optionalText(params.session);
  const offset = boundedInteger(params.offset, { min: 0, fallback: 0 });
  const limit = boundedInteger(params.limit, { min: 1, max: 100, fallback: 25 });
  const filtered = snapshot.items.filter((item) => workItemMatchesFilters(item, { focus, status, workStatus, gate, agent, session }));
  const items = Object.freeze(filtered.slice(offset, offset + limit).map(summarizeWorkItem));
  return Object.freeze({
    kind: "operations-manifold.work.snapshot-page" as const,
    summary: summarizeWorkSnapshot(snapshot),
    focus,
    status,
    workStatus,
    gate,
    agent,
    session,
    offset,
    limit,
    itemCount: filtered.length,
    returned: items.length,
    items,
  });
}

function workItemMatchesFilters(
  item: ActiveWorkRecord,
  filters: Readonly<{ focus: string | null; status: string | null; workStatus: string | null; gate: string | null; agent: string | null; session: string | null }>,
): boolean {
  return (filters.focus === null || workItemMatchesFocus(item, filters.focus))
    && (filters.status === null || item.status === filters.status)
    && (filters.workStatus === null || item.workStatus === filters.workStatus)
    && (filters.gate === null || item.gate === filters.gate)
    && (filters.agent === null || workItemMatchesAgent(item, filters.agent))
    && (filters.session === null || item.session === filters.session);
}

function summarizeWorkItem(item: ActiveWorkRecord): WorkSnapshotItemSummary {
  return Object.freeze({
    kind: "operations-manifold.work.item-summary" as const,
    id: item.id,
    title: item.title,
    status: item.status,
    workKind: item.workKind,
    workStatus: item.workStatus,
    owner: item.owner,
    assignedTo: item.assignedTo,
    agent: item.agent,
    priority: item.priority,
    gate: item.gate,
    focus: item.focus,
    session: item.session,
    blockedBy: item.blockedBy,
    dependsOn: item.dependsOn,
    contributesTo: item.contributesTo,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    intent: truncateForTransport(item.intent),
    success: truncateForTransport(item.success),
    outcome: item.outcome === null ? null : truncateForTransport(item.outcome),
    notesCount: item.notes.length,
    evidenceCount: item.evidence.length,
    latestNote: item.notes.at(-1) === undefined ? null : truncateForTransport(item.notes.at(-1)!),
  });
}

function truncateForTransport(value: string, max = 600): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function workItemMatchesAgent(item: ActiveWorkRecord, agent: string): boolean {
  return item.agent === agent || item.owner === agent || item.assignedTo.includes(agent);
}

function workItemMatchesFocus(item: ActiveWorkRecord, focus: string): boolean {
  const needle = focus.toLowerCase();
  return [
    item.id,
    item.title,
    item.intent,
    item.success,
    item.owner,
    item.focus,
    item.agent,
    item.session,
    item.outcome,
    item.workKind,
    item.workStatus,
    ...item.assignedTo,
    ...item.dependsOn,
    ...item.contributesTo,
    ...item.notes,
    ...item.evidence,
  ].some((value) => value !== null && value.toLowerCase().includes(needle));
}

export type WorkIntakeResult = Readonly<{
  kind: "operations-manifold.work.intake";
  accepted: true;
  event: EAVT;
  eavtJsonl: string;
  item: ActiveWorkRecord;
  snapshot: WorkSnapshot;
}>;

export type WorkGateResult = Readonly<{
  kind: "operations-manifold.work.stop-gate";
  passed: true;
  generatedAt: string;
  message: string;
  snapshot: WorkSnapshot;
}>;

export type WorkHookEventResult = Readonly<{
  kind: "operations-manifold.work.record-hook-event";
  hookEventName: string;
  recorded: boolean;
  reason: string;
  result: WorkIntakeResult | null;
  snapshot: WorkSnapshot;
}>;

// Lean transport forms: same records with the embedded snapshot summarized, for
// script stdout and hook output. Core functions keep returning full snapshots so
// in-process consumers (suit injection, stop gate) are unaffected.
export function leanWorkIntake(result: WorkIntakeResult) {
  return Object.freeze({ ...result, snapshot: summarizeWorkSnapshot(result.snapshot) });
}

export function leanWorkGate(result: WorkGateResult) {
  return Object.freeze({ ...result, snapshot: summarizeWorkSnapshot(result.snapshot) });
}

export function leanWorkHookEvent(result: WorkHookEventResult) {
  return Object.freeze({
    ...result,
    result: result.result === null ? null : leanWorkIntake(result.result),
    snapshot: summarizeWorkSnapshot(result.snapshot),
  });
}

export function startWorkScriptParams(params: BoundaryParams): WorkStartParams {
  return Object.freeze({
    title: boundaryTextParam(params, "title", "q", "__stdin"),
    intent: boundaryTextParam(params, "intent"),
    success: boundaryTextParam(params, "success"),
    workKind: boundaryTextParam(params, "workKind", "kind"),
    ownedBy: boundaryTextParam(params, "ownedBy"),
    owner: boundaryTextParam(params, "owner"),
    assignedTo: boundaryListParam(params, "assignedTo"),
    priority: boundaryTextParam(params, "priority"),
    deadline: boundaryTextParam(params, "deadline"),
    gate: boundaryTextParam(params, "gate"),
    dependsOn: boundaryListParam(params, "dependsOn"),
    contributesTo: boundaryListParam(params, "contributesTo"),
    blockedBy: boundaryTextParam(params, "blockedBy"),
    focus: boundaryTextParam(params, "focus"),
    agent: boundaryTextParam(params, "agent"),
    session: boundaryTextParam(params, "session", "session_id"),
    evidence: boundaryListParam(params, "evidence"),
    source: "operations-manifold.script",
  });
}

export function updateWorkScriptParams(params: BoundaryParams): WorkUpdateParams {
  return Object.freeze({
    id: boundaryTextParam(params, "id"),
    status: boundaryTextParam(params, "status"),
    note: boundaryTextParam(params, "note", "q", "__stdin"),
    workKind: boundaryTextParam(params, "workKind", "kind"),
    ownedBy: boundaryTextParam(params, "ownedBy"),
    owner: boundaryTextParam(params, "owner"),
    assignedTo: boundaryListParam(params, "assignedTo"),
    priority: boundaryTextParam(params, "priority"),
    deadline: boundaryTextParam(params, "deadline"),
    gate: boundaryTextParam(params, "gate"),
    dependsOn: boundaryListParam(params, "dependsOn"),
    contributesTo: boundaryListParam(params, "contributesTo"),
    blockedBy: boundaryTextParam(params, "blockedBy"),
    session: boundaryTextParam(params, "session", "session_id"),
    evidence: boundaryListParam(params, "evidence"),
    source: "operations-manifold.script",
  });
}

type WorkEventValue = Readonly<{
  kind: "operations-manifold.work.event";
  event: ActiveWorkEventName;
  eventId: string;
  at: string;
  title?: string;
  intent?: string;
  success?: string;
  status?: ActiveWorkStatus;
  workKind?: WorkItemKind;
  workStatus?: WorkItemStatus;
  owner?: string;
  assignedTo?: readonly string[];
  priority?: string;
  deadline?: string;
  gate?: WorkGateMode;
  dependsOn?: readonly string[];
  contributesTo?: readonly string[];
  blockedBy?: string;
  focus?: string;
  agent?: string;
  session?: string;
  note?: string;
  outcome?: string;
  evidence?: readonly string[];
  source?: string;
}>;

type MutableWork = {
  kind: "operations-manifold.work.item";
  id: string;
  title: string;
  intent: string;
  success: string;
  status: ActiveWorkStatus;
  workKind: WorkItemKind;
  workStatus: WorkItemStatus;
  owner: string;
  assignedTo: string[];
  priority: string | null;
  deadline: string | null;
  gate: WorkGateMode;
  dependsOn: string[];
  contributesTo: string[];
  blockedBy: string | null;
  focus: string | null;
  agent: string;
  session: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  outcome: string | null;
  eventIds: string[];
  notes: string[];
  evidence: string[];
};

export async function startWork(repoRoot: string, params: WorkStartParams): Promise<WorkIntakeResult> {
  const now = new Date().toISOString();
  const title = requireText(params.title ?? params.q, "read-work title");
  const intent = requireText(params.intent, "read-work intent");
  const success = requireText(params.success, "read-work success criteria");
  const status: ActiveWorkStatus = "active";
  const workKind = workItemKind(params.workKind ?? params.kind);
  const workStatus = workStatusFor(status);
  const owner = slug(optionalText(params.ownedBy ?? params.owner) ?? "operations-manifold");
  const assignedTo = stringList(params.assignedTo).map(slug);
  const priority = optionalText(params.priority);
  const deadline = optionalText(params.deadline);
  const gate = workGateMode(params.gate);
  const dependsOn = stringList(params.dependsOn);
  const contributesTo = stringList(params.contributesTo);
  const blockedBy = optionalText(params.blockedBy);
  const focus = optionalText(params.focus);
  const agent = optionalText(params.agent) ?? "codex";
  const session = optionalText(params.session);
  const evidence = stringList(params.evidence);
  const source = optionalText(params.source) ?? "operations-manifold.read-work";
  const eventId = `read-work-event:${hash({ now, title, intent, success, focus, agent, session }).slice(0, 24)}`;
  const id = `work:${slug(title)}:${hash({ title, intent, now }).slice(0, 12)}`;
  const value: WorkEventValue = Object.freeze({
    kind: "operations-manifold.work.event" as const,
    event: "started" as const,
    eventId,
    at: now,
    title,
    intent,
    success,
    status,
    workKind,
    workStatus,
    owner,
    assignedTo,
    ...(priority === null ? {} : { priority }),
    ...(deadline === null ? {} : { deadline }),
    gate,
    dependsOn,
    contributesTo,
    ...(blockedBy === null ? {} : { blockedBy }),
    ...(focus === null ? {} : { focus }),
    agent,
    ...(session === null ? {} : { session }),
    evidence,
    source,
  });
  return appendWorkEvent(repoRoot, id, "operations-manifold.work.started", value);
}

export async function updateWork(repoRoot: string, params: WorkUpdateParams): Promise<WorkIntakeResult> {
  const snapshot = await operationsManifoldWork(repoRoot);
  const id = workIdFrom(params.id, snapshot);
  const now = new Date().toISOString();
  const note = optionalText(params.note ?? params.q);
  const status = activeWorkStatus(params.status);
  const workKind = optionalWorkItemKind(params.workKind ?? params.kind);
  const workStatus = workItemStatus(params.status);
  const owner = optionalText(params.ownedBy ?? params.owner);
  const assignedTo = stringList(params.assignedTo);
  const priority = optionalText(params.priority);
  const deadline = optionalText(params.deadline);
  const gate = optionalWorkGateMode(params.gate);
  const dependsOn = stringList(params.dependsOn);
  const contributesTo = stringList(params.contributesTo);
  const blockedBy = optionalText(params.blockedBy);
  const session = optionalText(params.session);
  const evidence = stringList(params.evidence);
  if (
    note === null
    && status === null
    && workKind === null
    && workStatus === null
    && owner === null
    && assignedTo.length === 0
    && priority === null
    && deadline === null
    && gate === null
    && dependsOn.length === 0
    && contributesTo.length === 0
    && blockedBy === null
    && session === null
    && evidence.length === 0
  ) throw new TypeError("read-work update requires note, status, metadata, or evidence");
  const value: WorkEventValue = Object.freeze({
    kind: "operations-manifold.work.event" as const,
    event: "updated" as const,
    eventId: `read-work-event:${hash({ id, now, note, status, evidence }).slice(0, 24)}`,
    at: now,
    ...(status === null ? {} : { status }),
    ...(workKind === null ? {} : { workKind }),
    ...(workStatus === null ? {} : { workStatus }),
    ...(owner === null ? {} : { owner: slug(owner) }),
    ...(assignedTo.length === 0 ? {} : { assignedTo: Object.freeze(assignedTo.map(slug)) }),
    ...(priority === null ? {} : { priority }),
    ...(deadline === null ? {} : { deadline }),
    ...(gate === null ? {} : { gate }),
    ...(dependsOn.length === 0 ? {} : { dependsOn }),
    ...(contributesTo.length === 0 ? {} : { contributesTo }),
    ...(blockedBy === null ? {} : { blockedBy }),
    ...(session === null ? {} : { session }),
    ...(note === null ? {} : { note }),
    evidence,
    source: optionalText(params.source) ?? "operations-manifold.read-work",
  });
  return appendWorkEvent(repoRoot, id, "operations-manifold.work.updated", value);
}

export async function completeWork(repoRoot: string, params: WorkCompleteParams): Promise<WorkIntakeResult> {
  const snapshot = await operationsManifoldWork(repoRoot);
  const id = workIdFrom(params.id, snapshot);
  const now = new Date().toISOString();
  const outcome = requireText(params.outcome ?? params.q, "read-work completion outcome");
  const evidence = stringList(params.evidence);
  const value: WorkEventValue = Object.freeze({
    kind: "operations-manifold.work.event" as const,
    event: "completed" as const,
    eventId: `read-work-event:${hash({ id, now, outcome, evidence }).slice(0, 24)}`,
    at: now,
    status: "complete" as const,
    outcome,
    evidence,
    source: optionalText(params.source) ?? "operations-manifold.read-work",
  });
  return appendWorkEvent(repoRoot, id, "operations-manifold.work.completed", value);
}

export async function recordHookWorkEvent(repoRoot: string, params: WorkHookEventParams): Promise<WorkHookEventResult> {
  const payload = hookPayload(params);
  const identity = harnessIdentity({ harness: params.harness, payload });
  const hookEventName = stringField(payload, "hook_event_name") ?? optionalText(params.hook_event_name ?? params.event) ?? "HookEvent";
  const session = stringField(payload, "session_id") ?? optionalText(params.session_id);
  const transcriptPath = stringField(payload, "transcript_path") ?? optionalText(params.transcript_path);
  const cwd = stringField(payload, "cwd") ?? optionalText(params.cwd);
  const evidence = Object.freeze([
    ...(transcriptPath === null ? [] : [transcriptPath]),
    ...(cwd === null ? [] : [cwd]),
  ]);
  const source = optionalText(params.source) ?? `${identity.harness}.hook`;

  if (hookEventName === "UserPromptSubmit") {
    const prompt = promptText(payload) ?? "User prompt submitted";
    const snapshot = await operationsManifoldWork(repoRoot);
    const active = newestActive(snapshot, session);
    if (active !== null) {
      const result = await updateWork(repoRoot, {
        id: active.id,
        note: `UserPromptSubmit: ${prompt.slice(0, 1000)}`,
        ...(session === null ? {} : { session }),
        evidence,
        source,
      });
      return hookResult(hookEventName, true, "updated active read-work from user prompt", result);
    }
    // Pull, don't push: when the prompt/cwd matches an open campaign task, the
    // session's own task joins that campaign (contributesTo) instead of orphaning
    // — the fix for the pile of unattached per-prompt items. Non-matching turns
    // attach to nothing, so ordinary work is never misfiled under the refactor.
    const attach = campaignAttachTarget(snapshot, `${prompt} ${cwd ?? ""}`, session);
    const result = await startWork(repoRoot, {
      title: titleForPrompt(prompt),
      intent: prompt,
      success: "Respond to the user prompt and complete this 561 Group Operations Manifold read-work item with the outcome and evidence before stopping.",
      focus: cwd ?? `${identity.harness}.session`,
      agent: identity.agent,
      ...(session === null ? {} : { session }),
      ...(attach === null ? {} : { contributesTo: [attach] }),
      evidence,
      source,
    });
    return hookResult(hookEventName, true, attach === null ? "started active read-work from user prompt" : `started active read-work attached to campaign task ${attach}`, result);
  }

  const snapshot = await operationsManifoldWork(repoRoot);
  const active = newestActive(snapshot, session);
  if (active === null) {
    return Object.freeze({
      kind: "operations-manifold.work.record-hook-event" as const,
      hookEventName,
      recorded: false,
      reason: "no active read-work item to update for non-prompt hook event",
      result: null,
      snapshot,
    });
  }
  const result = await updateWork(repoRoot, {
    id: active.id,
    note: `${hookEventName} hook observed`,
    ...(session === null ? {} : { session }),
    evidence,
    source,
  });
  return hookResult(hookEventName, true, "updated active read-work from lifecycle hook", result);
}

export async function operationsManifoldWork(repoRoot: string): Promise<WorkSnapshot> {
  await ensureWorkDirs(repoRoot);
  return refreshWorkSnapshot(repoRoot);
}

function hookResult(hookEventName: string, recorded: boolean, reason: string, result: WorkIntakeResult): WorkHookEventResult {
  return Object.freeze({
    kind: "operations-manifold.work.record-hook-event" as const,
    hookEventName,
    recorded,
    reason,
    result,
    snapshot: result.snapshot,
  });
}

export type WorkStopGateParams = Readonly<{ session?: string | undefined }>;

/**
 * The stop gate. A session hook passes its `session` so the gate blocks only on
 * read-work that session owns — a Claude or Codex session is responsible for its
 * own thread, never the whole manifold's open backlog. With no session (the
 * standing CLI/bin surface) the gate is global, blocking on any open stop-gated
 * work, which is the operator-wide check `set-work-stop-gate` relies on.
 */
export async function workStopGate(repoRoot: string, params: WorkStopGateParams = {}): Promise<WorkGateResult> {
  const snapshot = await operationsManifoldWork(repoRoot);
  const session = optionalText(params.session);
  const blocking = snapshot.items.filter((item) =>
    isOpenWork(item)
    && item.gate === "stop"
    && (session === null || item.session === session));
  if (blocking.length > 0) {
    const scope = session === null ? "active read-work" : `read-work for session ${session}`;
    const lines = [
      ...blocking.slice(0, 10).map((item) => `${item.id}: ${item.title} (success: ${item.success})`),
      ...(blocking.length > 10 ? [`... ${blocking.length - 10} more blocker(s); inspect with read-work detail=items status=active gate=stop${session === null ? "" : ` session=${session}`} limit=25`] : []),
    ];
    // Campaign hygiene nudge: an open thread should either settle, or join the
    // campaign so the endeavor's progress reflects it. Pull the tree on demand.
    const reading = foldCampaignRollup(snapshot, session === null ? {} : { session });
    const unattached = blocking.filter((item) => item.contributesTo.length === 0);
    const hygiene = reading.campaigns.length === 0 ? [] : [
      unattached.length > 0
        ? `Or attach it to the campaign so progress reflects it: update-work id=${unattached[0]!.id} contributesTo=${reading.current?.plan?.id ?? reading.campaigns[0]!.id}`
        : `Run read-campaign to see where this sits in the campaign before stopping.`,
    ];
    throw new Error([
      `561 Group Operations Manifold stop gate blocked: ${scope} is not complete.`,
      ...lines,
      "Complete the current read-work through the 561 Group Operations Manifold complete-work MCP or HTTP script surface, then retry the stop gate.",
      `Inspect blockers with: read-work detail=items status=active gate=stop${session === null ? "" : ` session=${session}`} limit=25`,
      ...hygiene,
    ].join("\n"));
  }
  return Object.freeze({
    kind: "operations-manifold.work.stop-gate" as const,
    passed: true as const,
    generatedAt: snapshot.generatedAt,
    message: session === null
      ? "No active 561 Group Operations Manifold read-work items block stopping."
      : `No 561 Group Operations Manifold read-work for session ${session} blocks stopping.`,
    snapshot,
  });
}

async function appendWorkEvent(repoRoot: string, id: string, attribute: string, value: WorkEventValue): Promise<WorkIntakeResult> {
  const event: EAVT = Object.freeze([
    id,
    attribute,
    value as unknown as JsonValue,
    Object.freeze({ at: value.at, eventId: value.eventId }) as JsonValue,
  ]);
  await ensureWorkDirs(repoRoot);
  const eavtJsonl = await appendEavtLog(repoRoot, WORK_LOG_STATE, [event]);
  const snapshot = await refreshWorkSnapshot(repoRoot);
  const item = snapshot.items.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`read-work item was not projected after event: ${id}`);
  return Object.freeze({ kind: "operations-manifold.work.intake" as const, accepted: true as const, event, eavtJsonl, item, snapshot });
}

async function refreshWorkSnapshot(repoRoot: string): Promise<WorkSnapshot> {
  const events = await readWorkLog(repoRoot);
  const snapshot = foldWorkEvents(events);
  await writeWorkSnapshot(repoRoot, snapshot);
  return snapshot;
}

function foldWorkEvents(events: readonly EAVT[]): WorkSnapshot {
  const items = new Map<string, MutableWork>();
  for (const event of events) {
    const id = stringOf(event[0]);
    const attr = stringOf(event[1]);
    const value = workEventValue(event[2]);
    if (id === null || attr === null || value === null) continue;
    const at = value.at;

    if (attr === "operations-manifold.work.started" && value.title !== undefined && value.intent !== undefined && value.success !== undefined) {
      const item: MutableWork = {
        kind: "operations-manifold.work.item",
        id,
        title: value.title,
        intent: value.intent,
        success: value.success,
        status: value.status ?? "active",
        workKind: value.workKind ?? "task",
        workStatus: value.workStatus ?? workStatusFor(value.status ?? "active"),
        owner: value.owner ?? "operations-manifold",
        assignedTo: [...(value.assignedTo ?? [])],
        priority: value.priority ?? null,
        deadline: value.deadline ?? null,
        gate: value.gate ?? "stop",
        dependsOn: [...(value.dependsOn ?? [])],
        contributesTo: [...(value.contributesTo ?? [])],
        blockedBy: value.blockedBy ?? null,
        focus: value.focus ?? null,
        agent: value.agent ?? "codex",
        session: value.session ?? null,
        createdAt: at,
        updatedAt: at,
        completedAt: null,
        outcome: null,
        eventIds: [],
        notes: [],
        evidence: [],
      };
      pushUnique(item.eventIds, value.eventId);
      pushEvidence(item, value);
      items.set(id, item);
      continue;
    }

    const existing = items.get(id);
    if (existing === undefined) continue;
    existing.updatedAt = maxIso(existing.updatedAt, at);
    if (value.status !== undefined) {
      existing.status = value.status;
      existing.workStatus = workStatusFor(value.status);
    }
    if (value.workKind !== undefined) existing.workKind = value.workKind;
    if (value.workStatus !== undefined) existing.workStatus = value.workStatus;
    if (value.owner !== undefined) existing.owner = value.owner;
    if (value.assignedTo !== undefined) existing.assignedTo = [...value.assignedTo];
    if (value.priority !== undefined) existing.priority = value.priority;
    if (value.deadline !== undefined) existing.deadline = value.deadline;
    if (value.gate !== undefined) existing.gate = value.gate;
    if (value.dependsOn !== undefined) existing.dependsOn = [...value.dependsOn];
    if (value.contributesTo !== undefined) existing.contributesTo = [...value.contributesTo];
    if (value.blockedBy !== undefined) existing.blockedBy = value.blockedBy;
    if (value.session !== undefined) existing.session = value.session;
    if (value.note !== undefined) existing.notes.push(value.note);
    if (value.outcome !== undefined) {
      existing.outcome = value.outcome;
      existing.status = "complete";
      existing.workStatus = "done";
      existing.completedAt = at;
    }
    pushUnique(existing.eventIds, value.eventId);
    pushEvidence(existing, value);
  }

  const projected = [...items.values()]
    .map(projectWork)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title));
  const counts = countsFor(projected);
  return Object.freeze({
    kind: "operations-manifold.work.snapshot" as const,
    generatedAt: new Date().toISOString(),
    log: WORK_LOG_RELATIVE,
    state: WORK_STATE_RELATIVE,
    eventCount: events.length,
    counts,
    latest: projected[0]?.id ?? null,
    active: Object.freeze(projected.filter(isOpenWork).map((item) => item.id)),
    blocking: Object.freeze(projected.filter((item) => isOpenWork(item) && item.gate === "stop").map((item) => item.id)),
    items: Object.freeze(projected),
  });
}

function projectWork(item: MutableWork): ActiveWorkRecord {
  return Object.freeze({
    kind: "operations-manifold.work.item" as const,
    id: item.id,
    title: item.title,
    intent: item.intent,
    success: item.success,
    status: item.status,
    workKind: item.workKind,
    workStatus: item.workStatus,
    owner: item.owner,
    assignedTo: Object.freeze([...item.assignedTo]),
    priority: item.priority,
    deadline: item.deadline,
    gate: item.gate,
    dependsOn: Object.freeze([...item.dependsOn]),
    contributesTo: Object.freeze([...item.contributesTo]),
    blockedBy: item.blockedBy,
    focus: item.focus,
    agent: item.agent,
    session: item.session,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    outcome: item.outcome,
    eventIds: Object.freeze([...item.eventIds]),
    notes: Object.freeze([...item.notes]),
    evidence: Object.freeze([...item.evidence]),
  });
}

function countsFor(items: readonly ActiveWorkRecord[]): WorkSnapshotCounts {
  const counts: Record<ActiveWorkStatus | "open" | "retired", number> = {
    active: 0,
    blocked: 0,
    complete: 0,
    open: 0,
    retired: 0,
  };
  for (const item of items) {
    if (isRetiredWork(item)) {
      counts.retired += 1;
      continue;
    }
    if (isDoneWork(item)) {
      counts.complete += 1;
      continue;
    }
    counts[item.status] += 1;
    if (isOpenWork(item)) counts.open += 1;
  }
  return Object.freeze(counts);
}

function isOpenWork(item: ActiveWorkRecord): boolean {
  return !isSettledWork(item);
}

function isSettledWork(item: ActiveWorkRecord): boolean {
  return isDoneWork(item) || isRetiredWork(item);
}

function isDoneWork(item: ActiveWorkRecord): boolean {
  return item.status === "complete" || item.workStatus === "done";
}

function isRetiredWork(item: ActiveWorkRecord): boolean {
  return item.workStatus === "abandoned" || item.workStatus === "deferred";
}

async function readWorkLog(repoRoot: string): Promise<readonly EAVT[]> {
  return readEavtLog(repoRoot, WORK_LOG_STATE);
}

async function writeWorkSnapshot(repoRoot: string, snapshot: WorkSnapshot): Promise<void> {
  return writeJsonState(repoRoot, WORK_LOG_STATE, snapshot);
}

async function ensureWorkDirs(repoRoot: string): Promise<void> {
  return ensureEavtLogStateDirs(repoRoot, WORK_LOG_STATE);
}

function workIdFrom(input: string | undefined, snapshot: WorkSnapshot): string {
  const explicit = optionalText(input);
  if (explicit !== null) return explicit;
  const active = snapshot.items.find((item) => isOpenWork(item) && item.gate === "stop")
    ?? snapshot.items.find(isOpenWork);
  if (active !== undefined) return active.id;
  throw new Error("no active 561 Group Operations Manifold read-work item; start one with start-work");
}

/**
 * The active stop-gated work item a session hook should fold into. One harness
 * session owns one active work thread: a session's first UserPromptSubmit finds
 * no match here and starts its own item; later prompts in that same session fold
 * into it. A session is never allowed to adopt another session's item, so the
 * hook must provide a session id to fold into active work. Items are
 * newest-updated first, so `find` returns the most recent thread for this
 * session.
 */
function newestActive(snapshot: WorkSnapshot, session: string | null): ActiveWorkRecord | null {
  if (session === null) return null;
  const active = snapshot.items.filter((item) => isOpenWork(item) && item.gate === "stop");
  return active.find((item) => item.session === session) ?? null;
}

function workEventValue(value: JsonValue): WorkEventValue | null {
  if (!isRecord(value) || value["kind"] !== "operations-manifold.work.event") return null;
  const event = value["event"];
  const eventId = value["eventId"];
  const at = value["at"];
  if (event === undefined || !isWorkEventName(event) || typeof eventId !== "string" || typeof at !== "string") return null;
  const status = activeWorkStatus(typeof value["status"] === "string" ? value["status"] : undefined);
  return Object.freeze({
    kind: "operations-manifold.work.event" as const,
    event,
    eventId,
    at,
    ...(typeof value["title"] === "string" ? { title: value["title"] } : {}),
    ...(typeof value["intent"] === "string" ? { intent: value["intent"] } : {}),
    ...(typeof value["success"] === "string" ? { success: value["success"] } : {}),
    ...(status === null ? {} : { status }),
    ...(typeof value["workKind"] === "string" ? { workKind: workItemKind(value["workKind"]) } : {}),
    ...(typeof value["workStatus"] === "string" ? { workStatus: workItemStatus(value["workStatus"]) ?? workStatusFor(status ?? "active") } : {}),
    ...(typeof value["owner"] === "string" ? { owner: value["owner"] } : {}),
    ...(Array.isArray(value["assignedTo"]) ? { assignedTo: Object.freeze(value["assignedTo"].filter(isString)) } : {}),
    ...(typeof value["priority"] === "string" ? { priority: value["priority"] } : {}),
    ...(typeof value["deadline"] === "string" ? { deadline: value["deadline"] } : {}),
    ...(typeof value["gate"] === "string" ? { gate: workGateMode(value["gate"]) } : {}),
    ...(Array.isArray(value["dependsOn"]) ? { dependsOn: Object.freeze(value["dependsOn"].filter(isString)) } : {}),
    ...(Array.isArray(value["contributesTo"]) ? { contributesTo: Object.freeze(value["contributesTo"].filter(isString)) } : {}),
    ...(typeof value["blockedBy"] === "string" ? { blockedBy: value["blockedBy"] } : {}),
    ...(typeof value["focus"] === "string" ? { focus: value["focus"] } : {}),
    ...(typeof value["agent"] === "string" ? { agent: value["agent"] } : {}),
    ...(typeof value["session"] === "string" ? { session: value["session"] } : {}),
    ...(typeof value["note"] === "string" ? { note: value["note"] } : {}),
    ...(typeof value["outcome"] === "string" ? { outcome: value["outcome"] } : {}),
    ...(Array.isArray(value["evidence"]) ? { evidence: Object.freeze(value["evidence"].filter(isString)) } : {}),
    ...(typeof value["source"] === "string" ? { source: value["source"] } : {}),
  });
}

/**
 * The open campaign task a session's auto-started work should contribute to, or
 * null when the prompt does not match campaign work. A new session task joins the
 * campaign only when the prompt/cwd shares distinctive tokens with an open
 * campaign-descendant task (e.g. a package path or the words "refactor"/
 * "migrate"); otherwise it returns null and the task stays unattached, so a
 * non-refactor turn is never misfiled under the refactor campaign.
 *
 * The attach point is the matched leaf's nearest PLAN ancestor — the finite,
 * dependency-ordered commitment the task belongs under — so a session task nests
 * under the plan that owns the work, not beside the leaf it matched. When no plan
 * sits above the leaf the fallback walks the ladder outward to the project, then
 * the campaign.
 */
function campaignAttachTarget(snapshot: WorkSnapshot, text: string, session: string | null): string | null {
  const reading = foldCampaignRollup(snapshot, session === null ? {} : { session });
  if (reading.campaigns.length === 0) return null;
  // Each open planning leaf paired with its nearest PLAN ancestor (falling back to
  // the project, then the campaign) — the attach point, so a same-tier session task
  // nests under the plan that owns the work rather than dangling beside the leaf it
  // matched.
  const leaves: { leaf: CampaignNode; attach: string }[] = [];
  const walk = (node: CampaignNode, ancestors: readonly CampaignNode[]): void => {
    const chain = [...ancestors, node];
    if (node.children.length === 0) {
      if (node.gate === "record" && !node.blocked && node.workStatus !== "done" && node.workStatus !== "abandoned" && node.workStatus !== "deferred") {
        leaves.push({ leaf: node, attach: nearestLadderAncestor(chain) });
      }
      return;
    }
    for (const child of node.children) walk(child, chain);
  };
  for (const campaign of reading.campaigns) walk(campaign, []);
  if (leaves.length === 0) return null;
  const tokens = tokenSet(text);
  let best: { attach: string; score: number } | null = null;
  for (const { leaf, attach } of leaves) {
    const item = snapshot.items.find((candidate) => candidate.id === leaf.id);
    const candidateText = `${leaf.title} ${item?.focus ?? ""} ${item?.intent ?? ""}`;
    let score = 0;
    for (const tok of tokenSet(candidateText)) if (tokens.has(tok)) score += 1;
    if (best === null || score > best.score) best = { attach, score };
  }
  if (best !== null && best.score > 0) return best.attach;
  // A generic refactor mention with no specific task hit still joins the front's plan.
  if (/\b(refactor|migrat|relating-experimental|deprecated relating)\b/iu.test(text)) {
    return reading.current?.plan?.id ?? null;
  }
  return null;
}

/**
 * The id of the matched leaf's nearest PLAN ancestor on the containment ladder,
 * falling back outward to the nearest project, then the nearest campaign, then the
 * leaf itself. `chain` is the root..leaf path (the leaf is its own last entry), so a
 * task nests under the finite plan that owns it rather than beside a sibling leaf.
 */
function nearestLadderAncestor(chain: readonly CampaignNode[]): string {
  const nearestOfKind = (kind: LadderKind): CampaignNode | undefined => {
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      if (chain[index]!.kind === kind) return chain[index];
    }
    return undefined;
  };
  const plan = nearestOfKind("plan");
  const project = nearestOfKind("project");
  const campaign = nearestOfKind("campaign");
  return (plan ?? project ?? campaign ?? chain[chain.length - 1]!).id;
}

/** Distinctive lowercase tokens (length > 3) for keyword matching. */
function tokenSet(text: string): ReadonlySet<string> {
  const out = new Set<string>();
  for (const tok of text.toLowerCase().match(/[a-z0-9][a-z0-9.\-/]{3,}/gu) ?? []) out.add(tok);
  return out;
}

function promptText(payload: Readonly<Record<string, JsonValue>>): string | null {
  for (const key of ["prompt", "user_prompt", "message", "text"]) {
    const direct = stringField(payload, key);
    if (direct !== null) return direct;
  }
  const event = recordField(payload, "event") ?? recordField(payload, "payload");
  if (event !== null) {
    for (const key of ["prompt", "user_prompt", "message", "text"]) {
      const nested = stringField(event, key);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function titleForPrompt(prompt: string): string {
  const firstLine = prompt.split(/\r?\n/u).find((line) => line.trim() !== "") ?? prompt;
  const words = firstLine.trim().replace(/\s+/gu, " ").split(" ").slice(0, 12).join(" ");
  return words === "" ? "User prompt read-work" : words.slice(0, 120);
}

function recordField(record: Readonly<Record<string, JsonValue>>, key: string): Readonly<Record<string, JsonValue>> | null {
  const value = record[key];
  return value !== undefined && isRecord(value) ? value : null;
}

function activeWorkStatus(value: string | undefined): ActiveWorkStatus | null {
  if (value === "active" || value === "blocked" || value === "complete") return value;
  return null;
}

function workGateMode(value: string | undefined): WorkGateMode {
  return optionalWorkGateMode(value) ?? "stop";
}

function optionalWorkGateMode(value: string | undefined): WorkGateMode | null {
  if (value === "stop" || value === "record") return value;
  return null;
}

function workItemKind(value: string | undefined): WorkItemKind {
  return optionalWorkItemKind(value) ?? "task";
}

function optionalWorkItemKind(value: string | undefined): WorkItemKind | null {
  if (
    value === "task"
    || value === "goal"
    || value === "milestone"
    || value === "enterprise"
    || value === "endeavor"
    || value === "campaign"
    || value === "objective"
    || value === "project"
    || value === "expedition"
    || value === "plan"
    || value === "workflow"
    || value === "procedure"
    || value === "process"
    || value === "inquiry"
    || value === "derivation"
    || value === "phase"
    || value === "sprint"
    || value === "question"
    || value === "decision"
    || value === "friction-note"
    || value === "triage-note"
  ) return value;
  return null;
}

function workItemStatus(value: string | undefined): WorkItemStatus | null {
  if (
    value === "open"
    || value === "in-progress"
    || value === "blocked"
    || value === "review"
    || value === "done"
    || value === "deferred"
    || value === "abandoned"
    || value === "reopened"
  ) return value;
  return null;
}

function workStatusFor(status: ActiveWorkStatus): WorkItemStatus {
  if (status === "complete") return "done";
  if (status === "blocked") return "blocked";
  return "in-progress";
}

function isWorkEventName(value: JsonValue): value is ActiveWorkEventName {
  return value === "started" || value === "updated" || value === "completed";
}

function pushEvidence(item: MutableWork, value: WorkEventValue): void {
  pushUnique(item.evidence, `${WORK_LOG_RELATIVE}#${value.eventId}`);
  for (const evidence of value.evidence ?? []) pushUnique(item.evidence, evidence);
}

function slug(value: string): string {
  return sharedSlug(value, "read-work", 56);
}
