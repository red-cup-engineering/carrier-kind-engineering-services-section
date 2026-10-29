import { operationsManifoldGoals, type GoalRecord } from "./goals.mts";
import { optionalText, hash, stringList } from "./records.mts";
import { projectContextSuit, type ContextSuit } from "./operating/contextualizing/suiting/library/context-control.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "./work-management.mts";

export type CodexPlanParams = Readonly<{
  session?: string | undefined;
  session_id?: string | undefined;
  trace?: string | undefined;
  focus?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  steps?: string | readonly CodexPlanStepInput[] | undefined;
  plan?: string | readonly CodexPlanStepInput[] | undefined;
  paths?: string | readonly string[] | undefined;
  budget?: string | number | undefined;
  __stdin?: string | undefined;
}>;

export type CodexPlanStepInput = Readonly<{
  step?: string | undefined;
  title?: string | undefined;
  text?: string | undefined;
  status?: string | undefined;
}>;

export type CodexPlanStepStatus = "pending" | "in_progress" | "completed" | "blocked";

export type CodexPlanReading = Readonly<{
  kind: "operations-manifold.codex.plan";
  generatedAt: string;
  domain: Readonly<{
    session: string | null;
    trace: string | null;
    focus: string;
    intent: string;
    paths: readonly string[];
    steps: readonly CodexPlanStep[];
  }>;
  codomain: Readonly<{
    ready: boolean;
    status: "empty" | "blocked" | "active" | "complete" | "pending";
    bindings: readonly CodexPlanBinding[];
    pressures: readonly CodexPlanPressure[];
    nextInterfaces: readonly CodexPlanInterface[];
  }>;
  context: CodexPlanContext;
  goals: Readonly<{
    open: number;
    matched: readonly CodexPlanGoal[];
  }>;
  work: Readonly<{
    active: number;
    matched: readonly CodexPlanWork[];
  }>;
  stateless: Readonly<{
    claim: "Codex plan state is projected from a JSON plan domain and existing 561 Group Operations Manifold logs/state";
    memoryScope: "one package-bin function run";
    transport: "package-bin-json";
  }>;
}>;

export type CodexPlanStep = Readonly<{
  id: string;
  index: number;
  step: string;
  status: CodexPlanStepStatus;
  terms: readonly string[];
  matchedGoals: readonly string[];
  matchedWork: readonly string[];
  matchedContext: readonly string[];
}>;

export type CodexPlanBinding = Readonly<{
  name: string;
  ready: boolean;
  evidence: readonly string[];
}>;

export type CodexPlanPressure = Readonly<{
  id: string;
  severity: "info" | "watch" | "block";
  summary: string;
  next: string;
}>;

export type CodexPlanInterface = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
}>;

export type CodexPlanContext = Readonly<{
  suit: Readonly<{
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
    workload: readonly Readonly<{ id: string; title: string; status: string; focus: string | null; evidence: readonly string[] }>[];
    interfaces: readonly Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }>[];
    provenance: readonly string[];
  }>;
}>;

export type CodexPlanGoal = Readonly<{
  id: string;
  title: string;
  status: GoalRecord["status"];
  priority: number;
  focus: string | null;
  evidence: readonly string[];
}>;

export type CodexPlanWork = Readonly<{
  id: string;
  title: string;
  status: ActiveWorkRecord["status"];
  workKind: ActiveWorkRecord["workKind"];
  focus: string | null;
  session: string | null;
  evidence: readonly string[];
}>;

export async function codexPlan(repoRoot: string, params: CodexPlanParams = {}): Promise<CodexPlanReading> {
  const generatedAt = new Date().toISOString();
  const session = optionalText(params.session ?? params.session_id);
  const trace = optionalText(params.trace) ?? (session === null ? null : `codex.hook:${session}`);
  const focus = optionalText(params.focus) ?? "sites/ops.561.group";
  const intent = optionalText(params.intent ?? params.q) ?? "Project Codex plan against 561 Group Operations Manifold read-work and context.";
  const paths = stringList(params.paths);
  const rawSteps = planSteps(params);
  const [goals, work, suit] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    projectContextSuit(repoRoot, { intent, focus, budget: params.budget }),
  ]);
  const goalMatches = matchingGoals(goals.goals, goals.open, intent, focus, rawSteps);
  const workMatches = matchingWork(work.items, session, intent, focus, paths, rawSteps);
  const contextUris = [...new Set([...suit.perception, ...suit.memory].map((item) => item.uri))];
  const steps = rawSteps.map((step, index) => bindStep(step, index, goalMatches, workMatches, contextUris));
  const bindings = planBindings({ steps, goalMatches, workMatches, suit });
  const pressures = planPressures({ steps, goalMatches, workMatches, suit });
  return Object.freeze({
    kind: "operations-manifold.codex.plan" as const,
    generatedAt,
    domain: Object.freeze({ session, trace, focus, intent, paths, steps }),
    codomain: Object.freeze({
      ready: pressures.every((pressure) => pressure.severity !== "block"),
      status: planStatus(steps),
      bindings,
      pressures,
      nextInterfaces: planInterfaces({ session, trace, focus, intent, paths, steps, pressures }),
    }),
    context: Object.freeze({ suit: compactSuit(suit) }),
    goals: Object.freeze({ open: goals.open.length, matched: Object.freeze(goalMatches.map(compactGoal)) }),
    work: Object.freeze({
      active: work.items.filter((item) => item.status === "active").length,
      matched: Object.freeze(workMatches.map(compactWork)),
    }),
    stateless: Object.freeze({
      claim: "Codex plan state is projected from a JSON plan domain and existing 561 Group Operations Manifold logs/state" as const,
      memoryScope: "one package-bin function run" as const,
      transport: "package-bin-json" as const,
    }),
  });
}

function planSteps(params: CodexPlanParams): readonly Readonly<{ step: string; status: CodexPlanStepStatus }>[] {
  const source = params.steps ?? params.plan ?? params.__stdin;
  const parsed = parseSteps(source);
  if (parsed.length > 0) return Object.freeze(parsed);
  const single = optionalText(typeof params.plan === "string" ? params.plan : undefined);
  if (single !== null && !looksJson(single)) return Object.freeze([Object.freeze({ step: single, status: "pending" as const })]);
  return Object.freeze([]);
}

function parseSteps(source: CodexPlanParams["steps"] | CodexPlanParams["plan"] | string | undefined): readonly Readonly<{ step: string; status: CodexPlanStepStatus }>[] {
  if (source === undefined) return Object.freeze([]);
  if (Array.isArray(source)) return Object.freeze(source.map(stepFromRecord).filter(notNull));
  if (typeof source !== "string") return Object.freeze([]);
  const text = optionalText(source);
  if (text === null) return Object.freeze([]);
  const parsed = parseJsonMaybe(text);
  if (Array.isArray(parsed)) return Object.freeze(parsed.map(stepFromUnknown).filter(notNull));
  if (isRecord(parsed)) {
    const candidates = parsed["steps"] ?? parsed["plan"];
    if (Array.isArray(candidates)) return Object.freeze(candidates.map(stepFromUnknown).filter(notNull));
    const direct = stepFromUnknown(parsed);
    return direct === null ? Object.freeze([]) : Object.freeze([direct]);
  }
  return Object.freeze(text.split(/\r?\n/u).map((line) => stepFromLine(line)).filter(notNull));
}

function stepFromUnknown(value: unknown): Readonly<{ step: string; status: CodexPlanStepStatus }> | null {
  if (typeof value === "string") return stepFromLine(value);
  if (isRecord(value)) return stepFromRecord(value);
  return null;
}

function stepFromRecord(record: Readonly<Record<string, unknown>>): Readonly<{ step: string; status: CodexPlanStepStatus }> | null {
  const step = optionalText(textField(record, "step") ?? textField(record, "title") ?? textField(record, "text"));
  if (step === null) return null;
  return Object.freeze({ step, status: stepStatus(textField(record, "status")) });
}

function stepFromLine(line: string): Readonly<{ step: string; status: CodexPlanStepStatus }> | null {
  const text = line.trim();
  if (text === "") return null;
  const match = /^(pending|in_progress|in-progress|active|doing|completed|complete|done|blocked|block)\s*[:|-]\s*(.+)$/iu.exec(text);
  if (match === null) return Object.freeze({ step: text.replace(/^[-*]\s*/u, ""), status: "pending" as const });
  return Object.freeze({ step: match[2]!.trim(), status: stepStatus(match[1]) });
}

function stepStatus(value: unknown): CodexPlanStepStatus {
  const status = optionalText(typeof value === "string" || typeof value === "number" ? value : undefined)?.toLowerCase().replace(/-/gu, "_");
  if (status === "in_progress" || status === "active" || status === "doing") return "in_progress";
  if (status === "completed" || status === "complete" || status === "done") return "completed";
  if (status === "blocked" || status === "block") return "blocked";
  return "pending";
}

function bindStep(
  step: Readonly<{ step: string; status: CodexPlanStepStatus }>,
  index: number,
  goals: readonly GoalRecord[],
  work: readonly ActiveWorkRecord[],
  contextUris: readonly string[],
): CodexPlanStep {
  const stepTerms = terms(step.step);
  return Object.freeze({
    id: `plan-codex-step:${index + 1}:${hash({ index, step }).slice(0, 12)}`,
    index,
    step: clip(step.step, 220),
    status: step.status,
    terms: Object.freeze(stepTerms.slice(0, 8)),
    matchedGoals: Object.freeze(goals.filter((goal) => overlaps(stepTerms, searchable([goal.title, goal.text, goal.focus]))).map((goal) => goal.id).slice(0, 4)),
    matchedWork: Object.freeze(work.filter((item) => overlaps(stepTerms, searchable([item.title, item.intent, item.focus]))).map((item) => item.id).slice(0, 4)),
    matchedContext: Object.freeze(contextUris.filter((uri) => overlaps(stepTerms, searchable([uri]))).slice(0, 4)),
  });
}

function matchingGoals(
  goals: readonly GoalRecord[],
  open: readonly string[],
  intent: string,
  focus: string,
  steps: readonly Readonly<{ step: string; status: CodexPlanStepStatus }>[],
): readonly GoalRecord[] {
  const needles = terms([intent, focus, ...steps.map((step) => step.step)].join(" "));
  return Object.freeze(goals
    .filter((goal) => open.includes(goal.id))
    .filter((goal) => goal.focus === focus || overlaps(needles, searchable([goal.title, goal.text, goal.focus])))
    .slice(0, 6));
}

function matchingWork(
  items: readonly ActiveWorkRecord[],
  session: string | null,
  intent: string,
  focus: string,
  paths: readonly string[],
  steps: readonly Readonly<{ step: string; status: CodexPlanStepStatus }>[],
): readonly ActiveWorkRecord[] {
  const needles = terms([intent, focus, ...paths, ...steps.map((step) => step.step)].join(" "));
  return Object.freeze(items
    .filter((item) =>
      (session !== null && item.session === session)
      || item.focus === focus
      || paths.some((path) => item.evidence.includes(path))
      || overlaps(needles, searchable([item.title, item.intent, item.focus, ...item.evidence])),
    )
    .slice(0, 8));
}

function planBindings(input: Readonly<{
  steps: readonly CodexPlanStep[];
  goalMatches: readonly GoalRecord[];
  workMatches: readonly ActiveWorkRecord[];
  suit: ContextSuit;
}>): readonly CodexPlanBinding[] {
  return Object.freeze([
    binding("plan", input.steps.length > 0, input.steps.map((step) => step.id)),
    binding("goals", input.goalMatches.length > 0, input.goalMatches.flatMap((goal) => goal.evidence)),
    binding("read-work", input.workMatches.length > 0, input.workMatches.flatMap((item) => item.evidence)),
    binding("context", input.suit.provenance.length > 0 || input.suit.perception.length > 0 || input.suit.memory.length > 0, [...input.suit.provenance, ...input.suit.perception.map((item) => item.uri), ...input.suit.memory.map((item) => item.uri)]),
  ]);
}

function planPressures(input: Readonly<{
  steps: readonly CodexPlanStep[];
  goalMatches: readonly GoalRecord[];
  workMatches: readonly ActiveWorkRecord[];
  suit: ContextSuit;
}>): readonly CodexPlanPressure[] {
  const pressures: CodexPlanPressure[] = [];
  if (input.steps.length === 0) pressures.push(pressure("plan-empty", "watch", "No Codex plan steps were supplied.", "Pass a JSON steps array or newline plan to plan-codex."));
  if (input.steps.some((step) => step.status === "blocked")) pressures.push(pressure("plan-blocked", "block", "One or more Codex plan steps are blocked.", "Use update-work or assess-drift to record the blocking condition and required evidence."));
  if (input.steps.length > 0 && !input.steps.some((step) => step.status === "in_progress")) pressures.push(pressure("plan-no-active-step", "watch", "No Codex plan step is marked in_progress.", "Mark the current phase step in_progress before dispatch or execution."));
  if (input.workMatches.length === 0) pressures.push(pressure("plan-read-work-unbound", "watch", "The Codex plan has no matching 561 Group Operations Manifold read-work item.", "Run start-work or update-work with this plan/session evidence."));
  if (input.goalMatches.length === 0) pressures.push(pressure("plan-goal-unbound", "watch", "The Codex plan has no matching open 561 Group Operations Manifold goal.", "Run admit-goal-document if this plan belongs to a new objective."));
  if (input.suit.tokenEstimate > input.suit.budget) pressures.push(pressure("context-over-budget", "watch", "The projected context suit exceeds its token budget.", "Admit a narrower context suit or lower detail before continuing."));
  return Object.freeze(pressures);
}

function planInterfaces(input: Readonly<{
  session: string | null;
  trace: string | null;
  focus: string;
  intent: string;
  paths: readonly string[];
  steps: readonly CodexPlanStep[];
  pressures: readonly CodexPlanPressure[];
}>): readonly CodexPlanInterface[] {
  const needed = new Set(input.pressures.map((pressure) => pressure.id));
  const base = Object.freeze({
    focus: input.focus,
    intent: input.intent,
    ...(input.session === null ? {} : { session: input.session }),
    ...(input.trace === null ? {} : { trace: input.trace }),
  });
  const interfaces: CodexPlanInterface[] = [
    iface("read-session", "read session replayCheckpoint before executing the plan", base),
    iface("read-session-phase", "project phase readiness for the active plan step", { ...base, phase: activePhase(input.steps) }),
    iface("project-context-suit", "read the bounded context suit for this plan", { focus: input.focus, intent: input.intent }),
  ];
  if (needed.has("plan-read-work-unbound")) interfaces.push(iface("start-work", "bind this Codex plan to durable 561 Group Operations Manifold read-work", {
    title: input.intent,
    intent: input.intent,
    success: "Codex plan steps are executed, verified, and settled back into 561 Group Operations Manifold evidence.",
    workKind: "plan",
    focus: input.focus,
    agent: "codex",
    ...(input.session === null ? {} : { session: input.session }),
    evidence: input.paths.join(","),
  }));
  if (needed.has("plan-goal-unbound")) interfaces.push(iface("admit-goal-document", "admit the plan objective as an 561 Group Operations Manifold goal", {
    title: input.intent,
    text: input.intent,
    focus: input.focus,
    priority: "70",
  }));
  if (needed.has("plan-blocked")) interfaces.push(iface("assess-drift", "assess the blocked plan against current context", {
    focus: input.focus,
    intent: input.intent,
    action: input.steps.filter((step) => step.status === "blocked").map((step) => step.step).join("; "),
    tool: "codex",
    paths: input.paths.join(","),
  }));
  return Object.freeze(interfaces);
}

function planStatus(steps: readonly CodexPlanStep[]): CodexPlanReading["codomain"]["status"] {
  if (steps.length === 0) return "empty";
  if (steps.some((step) => step.status === "blocked")) return "blocked";
  if (steps.every((step) => step.status === "completed")) return "complete";
  if (steps.some((step) => step.status === "in_progress")) return "active";
  return "pending";
}

function activePhase(steps: readonly CodexPlanStep[]): string {
  const active = steps.find((step) => step.status === "in_progress");
  if (active !== undefined) return active.index === 0 ? "start" : "progress";
  if (steps.length > 0 && steps.every((step) => step.status === "completed")) return "finish";
  return "progress";
}

function binding(name: string, ready: boolean, evidence: readonly string[]): CodexPlanBinding {
  return Object.freeze({ name, ready, evidence: Object.freeze([...new Set(evidence)].slice(0, 6)) });
}

function pressure(id: string, severity: CodexPlanPressure["severity"], summary: string, next: string): CodexPlanPressure {
  return Object.freeze({ id, severity, summary, next });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): CodexPlanInterface {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function compactSuit(suit: ContextSuit): CodexPlanContext["suit"] {
  return Object.freeze({
    id: suit.id,
    admissionId: suit.admissionId,
    intent: suit.intent,
    focus: suit.focus,
    budget: suit.budget,
    tokenEstimate: suit.tokenEstimate,
    constraints: Object.freeze(suit.constraints.slice(0, 5)),
    capabilities: Object.freeze(suit.capabilities.slice(0, 8)),
    perception: Object.freeze(suit.perception.slice(0, 5).map(compactContextCandidate)),
    memory: Object.freeze(suit.memory.slice(0, 5).map(compactContextCandidate)),
    workload: Object.freeze(suit.workload.slice(0, 5).map((item) => Object.freeze({
      id: item.id,
      title: clip(item.title, 120),
      status: item.status,
      focus: item.focus,
      evidence: Object.freeze(item.evidence.slice(0, 4)),
    }))),
    interfaces: Object.freeze(suit.interfaces.slice(0, 8)),
    provenance: Object.freeze(suit.provenance.slice(0, 6)),
  });
}

function compactContextCandidate(item: ContextSuit["perception"][number]): Readonly<{ uri: string; tier: string; weight: number }> {
  return Object.freeze({ uri: item.uri, tier: item.tier, weight: item.weight });
}

function compactGoal(goal: GoalRecord): CodexPlanGoal {
  return Object.freeze({
    id: goal.id,
    title: clip(goal.title, 160),
    status: goal.status,
    priority: goal.priority,
    focus: goal.focus,
    evidence: Object.freeze(goal.evidence.slice(0, 4)),
  });
}

function compactWork(item: ActiveWorkRecord): CodexPlanWork {
  return Object.freeze({
    id: item.id,
    title: clip(item.title, 160),
    status: item.status,
    workKind: item.workKind,
    focus: item.focus,
    session: item.session,
    evidence: Object.freeze(item.evidence.slice(0, 4)),
  });
}

function textField(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : undefined;
}

function parseJsonMaybe(text: string): unknown {
  if (!looksJson(text)) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function looksJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function notNull<T>(value: T | null): value is T {
  return value !== null;
}

function searchable(values: readonly (string | null | undefined)[]): string {
  return values.filter((value): value is string => value !== null && value !== undefined).join(" ").toLowerCase();
}

function terms(value: string): readonly string[] {
  return Object.freeze([...new Set(value.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term.length > 3))]);
}

function overlaps(needles: readonly string[], haystack: string): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}
