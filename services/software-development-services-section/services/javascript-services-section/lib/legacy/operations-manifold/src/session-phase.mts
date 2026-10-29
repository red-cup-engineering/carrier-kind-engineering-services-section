import { agenticReadiness } from "./agentic-readiness.mts";
import { createCheckpoints, type CheckpointRecord } from "./checkpoints.mts";
import { contextControl, projectContextSuit, type ContextSuit, type DriftAssessmentRecord } from "./operating/contextualizing/suiting/library/context-control.mts";
import { operationsManifoldGoals, type GoalRecord } from "./goals.mts";
import { operationsLedger, type OperationLedgerEntry } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { optionalText, stringList } from "./records.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "./work-management.mts";

export type SessionPhaseName = "start" | "progress" | "handoff" | "finish";
export type SessionPhaseDetail = "compact" | "full";

export type SessionPhaseParams = Readonly<{
  phase?: string | undefined;
  detail?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  focus?: string | undefined;
  session?: string | undefined;
  session_id?: string | undefined;
  trace?: string | undefined;
  paths?: string | readonly string[] | undefined;
  budget?: string | number | undefined;
}>;

export type SessionPhaseReading = Readonly<{
  kind: "operations-manifold.codex.phase";
  generatedAt: string;
  phase: SessionPhaseName;
  domain: Readonly<{
    intent: string;
    focus: string;
    session: string | null;
    trace: string | null;
    paths: readonly string[];
    budget: number | null;
    detail: SessionPhaseDetail;
  }>;
  codomain: Readonly<{
    ready: boolean;
    score: number;
    bindings: readonly SessionPhaseBinding[];
    pressures: readonly SessionPhasePressure[];
    nextInterfaces: readonly SessionPhaseInterface[];
  }>;
  context: Readonly<{
    suit: SessionPhaseContextSuit | ContextSuit;
    latestDrift: SessionPhaseDriftAssessment | DriftAssessmentRecord | null;
  }>;
  goals: Readonly<{
    open: number;
    selected: readonly SessionPhaseGoal[];
  }>;
  work: Readonly<{
    active: number;
    selected: readonly SessionPhaseWork[];
  }>;
  operations: Readonly<{
    log: string;
    state: string;
    total: number;
    traceEntries: readonly SessionPhaseOperation[];
    recent: readonly SessionPhaseOperation[];
    budgetBand: "ok" | "watch" | "over" | "huge";
  }>;
  createCheckpoint: Readonly<{
    latest: SessionPhaseCheckpoint | null;
    count: number;
  }>;
  stateless: Readonly<{
    claim: "Codex phase state is projected from JSON logs and JSON state";
    memoryScope: "one package-bin function run";
    transport: "package-bin-json";
  }>;
}>;

export type SessionPhaseBinding = Readonly<{
  name: string;
  ready: boolean;
  evidence: readonly string[];
}>;

export type SessionPhasePressure = Readonly<{
  id: string;
  severity: "info" | "watch" | "block";
  summary: string;
  next: string;
}>;

export type SessionPhaseInterface = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
}>;

export type SessionPhaseGoal = Readonly<{
  id: string;
  title: string;
  status: GoalRecord["status"];
  priority: number;
  focus: string | null;
  evidence: readonly string[];
}>;

export type SessionPhaseWork = Readonly<{
  id: string;
  title: string;
  intent: string;
  status: ActiveWorkRecord["status"];
  workKind: ActiveWorkRecord["workKind"];
  priority: string | null;
  focus: string | null;
  session: string | null;
  evidence: readonly string[];
}>;

export type SessionPhaseOperation = Readonly<{
  id: string;
  eventId: string;
  at: string;
  event: OperationLedgerEntry["event"];
  trace: string;
  tool: string | null;
  paths: readonly string[];
  estimatedTokens: number;
  budgetBand: OperationLedgerEntry["budgetBand"];
  evidence: readonly string[];
}>;

export type SessionPhaseCheckpoint = Readonly<{
  id: string;
  label: string;
  at: string;
  counts: CheckpointRecord["counts"];
  files: readonly Readonly<{ path: string; exists: boolean; bytes: number }>[];
}>;

export type SessionPhaseContextSuit = Readonly<{
  id: string;
  admissionId: string | null;
  intent: string;
  focus: string | null;
  budget: number;
  tokenEstimate: number;
  constraints: readonly string[];
  capabilities: readonly string[];
  perception: readonly Readonly<{ uri: string; tier: string; weight: number }>[];
  memory: readonly Readonly<{ uri: string; tier: string; weight: number }>[];
  provenance: readonly string[];
}>;

export type SessionPhaseDriftAssessment = Readonly<{
  id: string;
  at: string;
  intent: string;
  action: string;
  focus: string | null;
  tool: string | null;
  score: number;
  drift: boolean;
  metrics: readonly Readonly<{ name: string; value: string; score: number }>[];
  evidence: readonly string[];
}>;

export async function readSessionPhase(repoRoot: string, params: SessionPhaseParams = {}): Promise<SessionPhaseReading> {
  const generatedAt = new Date().toISOString();
  const phase = phaseName(params.phase);
  const detail = detailLevel(params.detail);
  const intent = optionalText(params.intent ?? params.q) ?? defaultIntent(phase);
  const focus = optionalText(params.focus) ?? "sites/ops.561.group";
  const session = optionalText(params.session ?? params.session_id);
  const trace = optionalText(params.trace) ?? (session === null ? null : `codex.hook:${session}`);
  const paths = stringList(params.paths);
  const budget = budgetFor(params.budget);

  const [goals, work, context, operations, createCheckpointState, readiness] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    contextControl(repoRoot),
    operationsLedger(repoRoot),
    createCheckpoints(repoRoot),
    Promise.resolve(agenticReadiness(repoRoot)),
  ]);
  const suit = await projectContextSuit(repoRoot, { intent, focus, budget: budget ?? undefined });
  const selectedGoals = matchingGoals(goals.goals, goals.open, intent, focus);
  const selectedWork = matchingWork(work.items, intent, focus);
  const traceEntries = trace === null ? [] : operations.entries.filter((entry) => entry.trace === trace || entry.trace.includes(trace));
  const latestDrift = context.assessments[0] ?? null;
  const bindings = phaseBindings({
    selectedGoals,
    selectedWork,
    suit,
    trace,
    traceEntries,
    latestCheckpoint: createCheckpointState.createCheckpoints[0] ?? null,
    readinessScore: readiness.summary.score,
  });
  const pressures = phasePressures({
    phase,
    selectedGoals,
    selectedWork,
    suit,
    operations,
    trace,
    traceEntries,
    latestDrift,
    latestCheckpoint: createCheckpointState.createCheckpoints[0] ?? null,
  });
  const score = phaseScore(bindings, pressures);
  return Object.freeze({
    kind: "operations-manifold.codex.phase" as const,
    generatedAt,
    phase,
    domain: Object.freeze({ intent, focus, session, trace, paths, budget, detail }),
    codomain: Object.freeze({
      ready: score >= 70 && pressures.every((pressure) => pressure.severity !== "block"),
      score,
      bindings,
      pressures,
      nextInterfaces: phaseInterfaces({ phase, intent, focus, session, trace, paths, pressures }),
    }),
    context: Object.freeze({
      suit: detail === "full" ? suit : compactSuit(suit),
      latestDrift: detail === "full" ? latestDrift : compactDrift(latestDrift),
    }),
    goals: Object.freeze({ open: goals.open.length, selected: Object.freeze(selectedGoals.map(compactGoal)) }),
    work: Object.freeze({ active: work.items.filter((item) => item.status === "active").length, selected: Object.freeze(selectedWork.map(compactWork)) }),
    operations: Object.freeze({
      log: operations.log,
      state: operations.state,
      total: operations.entries.length,
      traceEntries: Object.freeze(traceEntries.slice(0, 6).map(compactOperation)),
      recent: Object.freeze(operations.entries.slice(0, 3).map(compactOperation)),
      budgetBand: operations.totals.hugeEntries > 0 ? "huge" : operations.totals.overBudgetEntries > 0 ? "over" : operations.totals.estimatedTokens > 0 ? "watch" : "ok",
    }),
    createCheckpoint: Object.freeze({ latest: compactCheckpoint(createCheckpointState.createCheckpoints[0] ?? null), count: createCheckpointState.createCheckpoints.length }),
    stateless: Object.freeze({
      claim: "Codex phase state is projected from JSON logs and JSON state" as const,
      memoryScope: "one package-bin function run" as const,
      transport: "package-bin-json" as const,
    }),
  });
}

function phaseName(value: string | undefined): SessionPhaseName {
  const text = optionalText(value)?.toLowerCase();
  if (text === "finish" || text === "handoff" || text === "progress") return text;
  return "start";
}

function detailLevel(value: string | undefined): SessionPhaseDetail {
  return optionalText(value)?.toLowerCase() === "full" ? "full" : "compact";
}

function defaultIntent(phase: SessionPhaseName): string {
  if (phase === "finish") return "Summarize verified 561 Group Operations Manifold read-work and record handoff evidence.";
  if (phase === "handoff") return "Prepare 561 Group Operations Manifold context, work, and createCheckpoint evidence for another agent.";
  if (phase === "progress") return "Continue the current 561 Group Operations Manifold implementation phase with filed context and operation evidence.";
  return "Start a Codex CLI read-work phase with 561 Group Operations Manifold goal, context, operation, and createCheckpoint bindings.";
}

function budgetFor(value: string | number | undefined): number | null {
  const text = optionalText(value);
  if (text === null) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.max(400, Math.min(16_000, Math.round(parsed))) : null;
}

function matchingGoals(goals: readonly GoalRecord[], open: readonly string[], intent: string, focus: string): readonly GoalRecord[] {
  const openIds = new Set(open);
  return Object.freeze(goals
    .filter((goal) => openIds.has(goal.id))
    .map((goal) => Object.freeze({ goal, score: matchScore([goal.id, goal.title, goal.text, goal.focus ?? ""], intent, focus) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.goal.priority - left.goal.priority)
    .map((entry) => entry.goal)
    .slice(0, 3));
}

function matchingWork(work: readonly ActiveWorkRecord[], intent: string, focus: string): readonly ActiveWorkRecord[] {
  return Object.freeze(work
    .map((item) => Object.freeze({ item, score: matchScore([item.id, item.title, item.intent, item.focus ?? ""], intent, focus) }))
    .filter((entry) => entry.score > 0 || entry.item.status === "active")
    .sort((left, right) => right.score - left.score || priorityValue(right.item.priority) - priorityValue(left.item.priority))
    .map((entry) => entry.item)
    .slice(0, 3));
}

function phaseBindings(input: Readonly<{
  selectedGoals: readonly GoalRecord[];
  selectedWork: readonly ActiveWorkRecord[];
  suit: ContextSuit;
  trace: string | null;
  traceEntries: readonly OperationLedgerEntry[];
  latestCheckpoint: CheckpointRecord | null;
  readinessScore: number;
}>): readonly SessionPhaseBinding[] {
  return Object.freeze([
    binding("goal", input.selectedGoals.length > 0, input.selectedGoals.flatMap((goal) => goal.evidence)),
    binding("read-work", input.selectedWork.length > 0, input.selectedWork.flatMap((item) => item.evidence)),
    binding("context", input.suit.provenance.length > 0, input.suit.provenance),
    binding("trace", input.trace === null || input.traceEntries.length > 0, input.traceEntries.flatMap((entry) => entry.evidence)),
    binding("createCheckpoint", input.latestCheckpoint !== null, input.latestCheckpoint === null ? [] : [`${input.latestCheckpoint.id}`, ...input.latestCheckpoint.files.map((file) => file.path)]),
    binding("readiness", input.readinessScore >= 80, [`assess-agentic-readiness:${input.readinessScore}`]),
  ]);
}

function binding(name: string, ready: boolean, evidence: readonly string[]): SessionPhaseBinding {
  return Object.freeze({ name, ready, evidence: Object.freeze([...new Set(evidence)].slice(0, 6)) });
}

function phasePressures(input: Readonly<{
  phase: SessionPhaseName;
  selectedGoals: readonly GoalRecord[];
  selectedWork: readonly ActiveWorkRecord[];
  suit: ContextSuit;
  operations: Awaited<ReturnType<typeof operationsLedger>>;
  trace: string | null;
  traceEntries: readonly OperationLedgerEntry[];
  latestDrift: DriftAssessmentRecord | null;
  latestCheckpoint: CheckpointRecord | null;
}>): readonly SessionPhasePressure[] {
  const pressures: SessionPhasePressure[] = [];
  if (input.selectedGoals.length === 0) pressures.push(pressure("goal-unbound", "watch", "No open filed goal visibly binds this Codex phase.", "Run admit-goal-document or choose a phase intent/focus that matches an open goal."));
  if (input.suit.tokenEstimate > input.suit.budget) pressures.push(pressure("context-over-budget", "watch", `Projected context suit estimates ${input.suit.tokenEstimate} tokens against budget ${input.suit.budget}.`, "Run project-context-suit with a tighter focus or budget before loading broad context."));
  if (input.trace !== null && input.traceEntries.length === 0) pressures.push(pressure("trace-unbooked", "watch", `Trace ${input.trace} has no operation entries yet.`, "Run record-operation or ingest a Codex trace so CLI actions become durable evidence."));
  if (input.operations.totals.overBudgetEntries > 0) pressures.push(pressure("operation-context-budget", "watch", `${input.operations.totals.overBudgetEntries} operation(s) exceed context budget.`, "Inspect read-operations-ledger and replace raw payloads with compact projections."));
  if (input.latestDrift?.drift === true) pressures.push(pressure("latest-drift", "block", `Latest drift assessment ${input.latestDrift.id} is drifting with score ${input.latestDrift.score}.`, "Run assess-drift after corrective context, scope, or authority evidence is filed."));
  if ((input.phase === "handoff" || input.phase === "finish") && input.latestCheckpoint === null) pressures.push(pressure("createCheckpoint-missing", "block", "Handoff or finish phase has no createCheckpoint record.", "Run createCheckpoint before summarizing or transferring the phase."));
  if (input.phase === "progress" && input.selectedWork.length === 0) pressures.push(pressure("read-work-unbound", "watch", "No active read-work item visibly binds this progress phase.", "Run start-work or update-work to bind the current phase to read-work evidence."));
  return Object.freeze(pressures);
}

function pressure(id: string, severity: SessionPhasePressure["severity"], summary: string, next: string): SessionPhasePressure {
  return Object.freeze({ id, severity, summary, next });
}

function phaseScore(bindings: readonly SessionPhaseBinding[], pressures: readonly SessionPhasePressure[]): number {
  const bindingScore = Math.round((bindings.filter((item) => item.ready).length / Math.max(1, bindings.length)) * 100);
  const penalty = pressures.reduce((sum, item) => sum + (item.severity === "block" ? 35 : item.severity === "watch" ? 12 : 0), 0);
  return Math.max(0, Math.min(100, bindingScore - penalty));
}

function phaseInterfaces(input: Readonly<{
  phase: SessionPhaseName;
  intent: string;
  focus: string;
  session: string | null;
  trace: string | null;
  paths: readonly string[];
  pressures: readonly SessionPhasePressure[];
}>): readonly SessionPhaseInterface[] {
  const params = baseParams(input.intent, input.focus);
  const needed = new Set(input.pressures.map((pressure) => pressure.id));
  const interfaces: SessionPhaseInterface[] = [
    iface("project-context-suit", "project bounded context for the current Codex phase", params),
    iface("read-work-items", "read goal-deriveContextd and active read-work candidates", { focus: input.focus }),
    iface("read-operations-ledger", "read durable operation evidence", {}),
  ];
  if (needed.has("goal-unbound")) interfaces.push(iface("admit-goal-document", "file the phase intent as an explicit goal", params));
  if (needed.has("read-work-unbound")) interfaces.push(iface("start-work", "bind this Codex phase to an active read-work item", { ...params, session: input.session ?? "codex" }));
  if (needed.has("trace-unbooked")) interfaces.push(iface("record-operation", "book the next Codex CLI action into the operation ledger", operationParams(input)));
  if (input.phase === "handoff" || input.phase === "finish" || needed.has("createCheckpoint-missing")) interfaces.push(iface("createCheckpoint", "record JSON state witnesses for replayCheckpoint or handoff", { label: `codex-${input.phase}`, reason: input.intent, source: "operations-manifold.read-session-phase" }));
  if (input.phase === "handoff") interfaces.push(iface("handoff-agent", "prepare a federated handoff envelope for another agent", params));
  if (input.phase === "finish") interfaces.push(iface("replayCheckpoint", "compare current JSON state to the latest createCheckpoint", { label: `codex-${input.phase}` }));
  return Object.freeze(interfaces);
}

function baseParams(intent: string, focus: string): Readonly<Record<string, string>> {
  return Object.freeze({ intent, focus });
}

function operationParams(input: Readonly<{ intent: string; focus: string; trace: string | null; paths: readonly string[] }>): Readonly<Record<string, string>> {
  return Object.freeze({
    kind: "note",
    subject: `codex.phase:${input.focus}`,
    predicate: "operations-manifold.codex.phase-progressed",
    object: input.intent,
    trace: input.trace ?? "codex.phase",
    agent: "codex",
    evidence: input.paths.join(","),
  });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): SessionPhaseInterface {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function compactGoal(goal: GoalRecord): SessionPhaseGoal {
  return Object.freeze({
    id: goal.id,
    title: clip(goal.title, 180),
    status: goal.status,
    priority: goal.priority,
    focus: goal.focus,
    evidence: Object.freeze(goal.evidence.slice(0, 4)),
  });
}

function compactWork(item: ActiveWorkRecord): SessionPhaseWork {
  return Object.freeze({
    id: item.id,
    title: clip(item.title, 180),
    intent: clip(item.intent, 220),
    status: item.status,
    workKind: item.workKind,
    priority: item.priority,
    focus: item.focus,
    session: item.session,
    evidence: Object.freeze(item.evidence.slice(0, 4)),
  });
}

function compactOperation(entry: OperationLedgerEntry): SessionPhaseOperation {
  return Object.freeze({
    id: entry.id,
    eventId: entry.eventId,
    at: entry.at,
    event: entry.event,
    trace: entry.trace,
    tool: entry.tool,
    paths: Object.freeze(entry.paths.slice(0, 8)),
    estimatedTokens: entry.estimatedTokens,
    budgetBand: entry.budgetBand,
    evidence: Object.freeze(entry.evidence.slice(0, 4)),
  });
}

function compactCheckpoint(record: CheckpointRecord | null): SessionPhaseCheckpoint | null {
  if (record === null) return null;
  return Object.freeze({
    id: record.id,
    label: record.label,
    at: record.at,
    counts: record.counts,
    files: Object.freeze(record.files.slice(0, 8).map((file) => Object.freeze({ path: file.path, exists: file.exists, bytes: file.bytes }))),
  });
}

function compactSuit(suit: ContextSuit): SessionPhaseContextSuit {
  return Object.freeze({
    id: suit.id,
    admissionId: suit.admissionId,
    intent: clip(suit.intent, 260),
    focus: suit.focus,
    budget: suit.budget,
    tokenEstimate: suit.tokenEstimate,
    constraints: Object.freeze(suit.constraints.slice(0, 4).map((item) => clip(item, 160))),
    capabilities: Object.freeze(suit.capabilities.slice(0, 8)),
    perception: Object.freeze(suit.perception.slice(0, 4).map(compactContextCandidate)),
    memory: Object.freeze(suit.memory.slice(0, 3).map(compactContextCandidate)),
    provenance: Object.freeze(suit.provenance.slice(0, 6)),
  });
}

function compactContextCandidate(candidate: ContextSuit["perception"][number]): SessionPhaseContextSuit["perception"][number] {
  return Object.freeze({
    uri: clip(candidate.uri, 180),
    tier: candidate.tier,
    weight: candidate.weight,
  });
}

function compactDrift(assessment: DriftAssessmentRecord | null): SessionPhaseDriftAssessment | null {
  if (assessment === null) return null;
  return Object.freeze({
    id: assessment.id,
    at: assessment.at,
    intent: clip(assessment.intent, 220),
    action: clip(assessment.action, 220),
    focus: assessment.focus,
    tool: assessment.tool,
    score: assessment.score,
    drift: assessment.drift,
    metrics: Object.freeze(assessment.metrics.map((metric) => Object.freeze({
      name: metric.name,
      value: metric.value,
      score: metric.score,
    }))),
    evidence: Object.freeze(assessment.evidence.slice(0, 8)),
  });
}

function matchScore(values: readonly string[], intent: string, focus: string): number {
  const haystack = values.join(" ").toLowerCase();
  const focusHit = focus !== "" && haystack.includes(focus.toLowerCase()) ? 30 : 0;
  const terms = new Set(intent.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term.length > 3));
  let termScore = 0;
  for (const term of terms) if (haystack.includes(term)) termScore += 10;
  return focusHit + termScore;
}

function priorityValue(value: string | null): number {
  if (value === null) return 50;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 50;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}
