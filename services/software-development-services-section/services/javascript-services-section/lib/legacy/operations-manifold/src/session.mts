import { createCheckpoints, type CheckpointRecord } from "./checkpoints.mts";
import { contextControl, type ContextAdmissionRecord, type DriftAssessmentRecord } from "./operating/contextualizing/suiting/library/context-control.mts";
import { readMessages, type ChannelMessageRecord, type ChannelSnapshot } from "./operating/messaging/channels/channel-message.mts";
import { operationsLedger, type OperationLedgerEntry } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { readFindings, type FindingRecord } from "./operating/remembering/codex/findings.mts";
import { operationsManifoldLogPath, operationsManifoldStatePath } from "./package-surface.mts";
import { optionalText, stringList } from "./records.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "./work-management.mts";

const MESSAGE_LOG = operationsManifoldLogPath("messages");
const MESSAGE_STATE = operationsManifoldStatePath("messages");
const SESSION_OPERATION_PRESSURE_WINDOW = 128;

export type SessionParams = Readonly<{
  session?: string | undefined;
  session_id?: string | undefined;
  trace?: string | undefined;
  focus?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  paths?: string | readonly string[] | undefined;
}>;

export type SessionReading = Readonly<{
  kind: "operations-manifold.codex.session";
  generatedAt: string;
  domain: Readonly<{
    session: string;
    trace: string;
    focus: string | null;
    intent: string | null;
    paths: readonly string[];
  }>;
  codomain: Readonly<{
    ready: boolean;
    bindings: readonly SessionBinding[];
    pressures: readonly SessionPressure[];
    nextInterfaces: readonly SessionInterface[];
  }>;
  operations: Readonly<{
    log: string;
    state: string;
    total: number;
    matched: number;
    exact: number;
    mode: "session" | "context";
    entries: readonly SessionOperation[];
    totals: Readonly<{
      estimatedTokens: number;
      overBudgetEntries: number;
      recentOverBudgetEntries: number;
      costUsd: number;
    }>;
  }>;
  work: Readonly<{
    log: string;
    state: string;
    matched: number;
    exact: number;
    mode: "session" | "context";
    items: readonly SessionWork[];
  }>;
  messages: Readonly<{
    log: string;
    state: string;
    matched: number;
    exact: number;
    mode: "session" | "context";
    channels: readonly SessionMessageChannel[];
    entries: readonly SessionMessage[];
  }>;
  context: Readonly<{
    log: string;
    state: string;
    admissions: readonly SessionAdmission[];
    assessments: readonly SessionDrift[];
  }>;
  createCheckpoint: Readonly<{
    log: string;
    state: string;
    latest: SessionCheckpoint | null;
    count: number;
  }>;
  findings: Readonly<{
    log: string;
    state: string;
    matched: number;
    exact: number;
    mode: "session" | "context";
    entries: readonly SessionFinding[];
    recall: readonly Readonly<{ subject: readonly string[]; subjectKey: string; charge: FindingRecord["charge"] }>[];
  }>;
  stateless: Readonly<{
    claim: "session state is projected from existing JSON logs and JSON state";
    memoryScope: "one package-bin function run";
    transport: "package-bin-json";
  }>;
}>;

export type SessionBinding = Readonly<{
  name: string;
  ready: boolean;
  evidence: readonly string[];
}>;

export type SessionPressure = Readonly<{
  id: string;
  severity: "info" | "watch" | "block";
  summary: string;
  next: string;
}>;

export type SessionInterface = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
}>;

export type SessionOperation = Readonly<{
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

export type SessionWork = Readonly<{
  id: string;
  title: string;
  status: ActiveWorkRecord["status"];
  workKind: ActiveWorkRecord["workKind"];
  focus: string | null;
  session: string | null;
  evidence: readonly string[];
}>;

export type SessionMessageChannel = Readonly<{
  id: string;
  updatedAt: string;
  messageCount: number;
  replyCount: number;
  endpointReplyCount: number;
  errorCount: number;
  estimatedTokens: number;
}>;

export type SessionMessage = Readonly<{
  id: string;
  eventId: string;
  at: string;
  channel: string;
  role: ChannelMessageRecord["role"];
  speaker: string;
  status: ChannelMessageRecord["status"];
  endpointCondition: ChannelMessageRecord["endpointCondition"] | null;
  endpointCharge: ChannelMessageRecord["endpointCharge"] | null;
  apiKeyPresent: boolean | null;
  trace: string | null;
  session: string | null;
  evidence: readonly string[];
  preview: string;
}>;

export type SessionAdmission = Readonly<{
  id: string;
  at: string;
  intent: string;
  focus: string | null;
  evidence: readonly string[];
}>;

export type SessionDrift = Readonly<{
  id: string;
  at: string;
  action: string;
  focus: string | null;
  score: number;
  drift: boolean;
  evidence: readonly string[];
}>;

export type SessionCheckpoint = Readonly<{
  id: string;
  label: string;
  at: string;
  counts: CheckpointRecord["counts"];
  files: readonly Readonly<{ path: string; exists: boolean; bytes: number }>[];
}>;

export type SessionFinding = Readonly<{
  id: string;
  eventId: string;
  at: string;
  session: string;
  subject: readonly string[];
  subjectKey: string;
  predicate: string;
  charge: FindingRecord["charge"];
  focus: string | null;
  intent: string | null;
  trace: string | null;
  evidence: readonly string[];
  note: FindingRecord["note"];
}>;

export async function readSession(repoRoot: string, params: SessionParams = {}): Promise<SessionReading> {
  const generatedAt = new Date().toISOString();
  const session = optionalText(params.session ?? params.session_id) ?? "unknown-session";
  const trace = optionalText(params.trace) ?? `codex.hook:${session}`;
  const focus = optionalText(params.focus);
  const intent = optionalText(params.intent ?? params.q);
  const paths = stringList(params.paths);
  const [operations, work, context, createCheckpointState, messages, findings] = await Promise.all([
    operationsLedger(repoRoot),
    operationsManifoldWork(repoRoot),
    contextControl(repoRoot),
    createCheckpoints(repoRoot),
    readMessages(repoRoot, { limit: 200 }),
    readFindings(repoRoot),
  ]);
  const exactOperationEntries = operations.entries.filter((entry) => matchesSession(entry, session, trace));
  const operationEntries = exactOperationEntries.length > 0 ? exactOperationEntries : operations.entries.filter((entry) => matchesOperationContext(entry, focus, paths));
  const exactWorkItems = work.items.filter((item) => matchesWork(item, session, trace));
  const workItems = exactWorkItems.length > 0 ? exactWorkItems : work.items.filter((item) => matchesWorkContext(item, focus, paths));
  const exactMessageChannels = messages.channels.filter((channel) => matchesMessageChannel(channel, session, trace));
  const exactMessageEntries = uniqueMessages([
    ...messages.messages.filter((message) => matchesMessage(message, session, trace)),
    ...exactMessageChannels.flatMap((channel) => channel.messages).filter((message) => matchesMessage(message, session, trace)),
  ]);
  const contextMessageChannels = exactMessageChannels.length > 0 ? [] : messages.channels.filter((channel) => matchesMessageContextChannel(channel, focus, intent, paths));
  const messageChannels = exactMessageChannels.length > 0 ? exactMessageChannels : contextMessageChannels;
  const messageEntries = exactMessageEntries.length > 0
    ? exactMessageEntries
    : messageChannels.flatMap((channel) => channel.messages).filter((message) => matchesMessageContext(message, focus, intent, paths));
  const admissions = context.admissions.filter((item) => matchesContextAdmission(item, focus, intent, paths));
  const assessments = context.assessments.filter((item) => matchesDrift(item, focus, intent, paths));
  const exactFindingEntries = findings.findings.filter((entry) => matchesFinding(entry, session, trace));
  const findingEntries = exactFindingEntries.length > 0 ? exactFindingEntries : findings.findings.filter((entry) => matchesFindingContext(entry, focus, intent, paths));
  const latestCheckpoint = createCheckpointState.createCheckpoints[0] ?? null;
  const bindings = sessionBindings({ operationEntries: exactOperationEntries, workItems: exactWorkItems, messageEntries: exactMessageEntries, findingEntries: exactFindingEntries, admissions, assessments, latestCheckpoint });
  const pressures = sessionPressures({ session, trace, operationEntries: exactOperationEntries, workItems: exactWorkItems, messageEntries: exactMessageEntries, findingEntries: exactFindingEntries, assessments, operations });
  const recentOperationEntries = operationEntries.slice(0, SESSION_OPERATION_PRESSURE_WINDOW);
  return Object.freeze({
    kind: "operations-manifold.codex.session" as const,
    generatedAt,
    domain: Object.freeze({ session, trace, focus, intent, paths }),
    codomain: Object.freeze({
      ready: pressures.every((pressure) => pressure.severity !== "block"),
      bindings,
      pressures,
      nextInterfaces: sessionInterfaces({ session, trace, focus, intent, paths, pressures }),
    }),
    operations: Object.freeze({
      log: operations.log,
      state: operations.state,
      total: operations.entries.length,
      matched: operationEntries.length,
      exact: exactOperationEntries.length,
      mode: exactOperationEntries.length > 0 ? "session" : "context",
      entries: Object.freeze(operationEntries.slice(0, 8).map(compactOperation)),
      totals: Object.freeze({
        estimatedTokens: operationEntries.reduce((sum, entry) => sum + entry.estimatedTokens, 0),
        overBudgetEntries: operationEntries.filter((entry) => entry.budgetBand === "over" || entry.budgetBand === "huge").length,
        recentOverBudgetEntries: recentOperationEntries.filter(isOverBudgetOperation).length,
        costUsd: roundMoney(operationEntries.reduce((sum, entry) => sum + entry.costUsd, 0)),
      }),
    }),
    work: Object.freeze({
      log: work.log,
      state: work.state,
      matched: workItems.length,
      exact: exactWorkItems.length,
      mode: exactWorkItems.length > 0 ? "session" : "context",
      items: Object.freeze(workItems.slice(0, 5).map(compactWork)),
    }),
    messages: Object.freeze({
      log: MESSAGE_LOG,
      state: MESSAGE_STATE,
      matched: messageEntries.length,
      exact: exactMessageEntries.length,
      mode: exactMessageEntries.length > 0 ? "session" : "context",
      channels: Object.freeze(messageChannels.slice(0, 8).map(compactMessageChannel)),
      entries: Object.freeze(messageEntries.slice(-12).map(compactMessage)),
    }),
    context: Object.freeze({
      log: context.log,
      state: context.state,
      admissions: Object.freeze(admissions.slice(0, 4).map(compactAdmission)),
      assessments: Object.freeze(assessments.slice(0, 6).map(compactDrift)),
    }),
    createCheckpoint: Object.freeze({
      log: createCheckpointState.log,
      state: createCheckpointState.state,
      latest: compactCheckpoint(latestCheckpoint),
      count: createCheckpointState.createCheckpoints.length,
    }),
    findings: Object.freeze({
      log: findings.log,
      state: findings.state,
      matched: findingEntries.length,
      exact: exactFindingEntries.length,
      mode: exactFindingEntries.length > 0 ? "session" : "context",
      entries: Object.freeze(findingEntries.slice(0, 12).map(compactFinding)),
      recall: Object.freeze(findings.recall
        .filter((entry) => entry.session === session && findingEntries.some((findingEntry) => findingEntry.subjectKey === entry.subjectKey))
        .map((entry) => Object.freeze({ subject: entry.subject, subjectKey: entry.subjectKey, charge: entry.charge }))),
    }),
    stateless: Object.freeze({
      claim: "session state is projected from existing JSON logs and JSON state" as const,
      memoryScope: "one package-bin function run" as const,
      transport: "package-bin-json" as const,
    }),
  });
}

function sessionBindings(input: Readonly<{
  operationEntries: readonly OperationLedgerEntry[];
  workItems: readonly ActiveWorkRecord[];
  messageEntries: readonly ChannelMessageRecord[];
  findingEntries: readonly FindingRecord[];
  admissions: readonly ContextAdmissionRecord[];
  assessments: readonly DriftAssessmentRecord[];
  latestCheckpoint: CheckpointRecord | null;
}>): readonly SessionBinding[] {
  return Object.freeze([
    binding("operations", input.operationEntries.length > 0, input.operationEntries.flatMap((entry) => entry.evidence)),
    binding("read-work", input.workItems.length > 0, input.workItems.flatMap((item) => item.evidence)),
    binding("messages", input.messageEntries.length > 0, input.messageEntries.flatMap((message) => [message.messageId, message.eventId, ...message.evidence])),
    binding("findings", input.findingEntries.length > 0, input.findingEntries.flatMap((entry) => [entry.id, entry.eventId, ...entry.evidence])),
    binding("context", input.admissions.length > 0 || input.assessments.length > 0, [...input.admissions.flatMap((item) => item.evidence), ...input.assessments.flatMap((item) => item.evidence)]),
    binding("createCheckpoint", input.latestCheckpoint !== null, input.latestCheckpoint === null ? [] : [input.latestCheckpoint.id, ...input.latestCheckpoint.files.map((file) => file.path)]),
  ]);
}

function sessionPressures(input: Readonly<{
  session: string;
  trace: string;
  operationEntries: readonly OperationLedgerEntry[];
  workItems: readonly ActiveWorkRecord[];
  messageEntries: readonly ChannelMessageRecord[];
  findingEntries: readonly FindingRecord[];
  assessments: readonly DriftAssessmentRecord[];
  operations: Awaited<ReturnType<typeof operationsLedger>>;
}>): readonly SessionPressure[] {
  const pressures: SessionPressure[] = [];
  if (input.session === "unknown-session") pressures.push(pressure("session-unknown", "watch", "No session id was supplied.", "Pass session or session_id so 561 Group Operations Manifold can join hooks, work, and traces."));
  if (input.operationEntries.length === 0) pressures.push(pressure("operations-unbound", "watch", `Trace ${input.trace} has no matched operation entries.`, "Run record-operation or import-operation-trace with the current session trace."));
  if (input.workItems.length === 0) pressures.push(pressure("read-work-unbound", "watch", "No read-work item is bound to this session.", "Run start-work or update-work with session evidence."));
  if (input.messageEntries.length === 0) pressures.push(pressure("messages-unbound", "watch", "No message channel is bound to this session.", "Run record-message or ensure ingest-hook receives UserPromptSubmit for this session."));
  if (input.findingEntries.length === 0) pressures.push(pressure("findings-unbound", "watch", "No durable findings are bound to this session.", "Run record-finding so recall is projected from Operations Manifold state instead of chat-only memory."));
  if (input.assessments.some((item) => item.drift)) pressures.push(pressure("session-drift", "block", "One or more matched drift assessments report drift.", "Run assess-drift after adding corrective context, scope, or authority evidence."));
  const recentOperations = input.operationEntries.slice(0, SESSION_OPERATION_PRESSURE_WINDOW);
  const recentOverBudget = recentOperations.filter(isOverBudgetOperation);
  const historicalOverBudget = input.operationEntries.filter(isOverBudgetOperation);
  if (recentOverBudget.length > 0) {
    pressures.push(pressure(
      "session-budget",
      "watch",
      `${recentOverBudget.length}/${recentOperations.length} recent matched operation(s) exceed context budget.`,
      "Inspect recent read-operations-ledger entries and replace raw payloads with compact projections.",
    ));
  } else if (historicalOverBudget.length > 0) {
    pressures.push(pressure(
      "session-budget-history",
      "info",
      `${historicalOverBudget.length} historical matched operation(s) exceed context budget; recent ${recentOperations.length} are clear.`,
      "Keep using compact projections for new hook and operation records; historical entries remain as debt evidence.",
    ));
  }
  if (input.operations.totals.overBudgetEntries > 0) pressures.push(pressure("global-budget", "info", `${input.operations.totals.overBudgetEntries} global operation(s) exceed context budget.`, "Prefer compact 561 Group Operations Manifold projections before loading broad operation state."));
  return Object.freeze(pressures);
}

function isOverBudgetOperation(entry: OperationLedgerEntry): boolean {
  return entry.budgetBand === "over" || entry.budgetBand === "huge";
}

function sessionInterfaces(input: Readonly<{
  session: string;
  trace: string;
  focus: string | null;
  intent: string | null;
  paths: readonly string[];
  pressures: readonly SessionPressure[];
}>): readonly SessionInterface[] {
  const needed = new Set(input.pressures.map((pressure) => pressure.id));
  const base = Object.freeze({
    session: input.session,
    trace: input.trace,
    ...(input.focus === null ? {} : { focus: input.focus }),
    ...(input.intent === null ? {} : { intent: input.intent }),
  });
  const interfaces: SessionInterface[] = [
    iface("read-session-phase", "read the current phase bindings for this session", base),
    iface("read-operations-ledger", "inspect durable operation evidence", {}),
    iface("read-messages", "inspect human, agent, tool, and endpoint messages bound to this session", { channel: `codex:${input.session}`, limit: "24" }),
  ];
  if (needed.has("operations-unbound")) interfaces.push(iface("record-operation", "book the next Codex action against this session trace", {
    kind: "note",
    subject: `codex.session:${input.session}`,
    predicate: "operations-manifold.codex.session-observed",
    object: input.intent ?? "session observed by 561 Group Operations Manifold",
    trace: input.trace,
    agent: "codex",
    evidence: input.paths.join(","),
  }));
  if (needed.has("read-work-unbound")) interfaces.push(iface("start-work", "bind this session to active read-work", {
    title: input.intent ?? `session ${input.session}`,
    intent: input.intent ?? "Project session read-work through 561 Group Operations Manifold.",
    focus: input.focus ?? "sites/ops.561.group",
    session: input.session,
    agent: "codex",
    evidence: input.paths.join(","),
  }));
  if (needed.has("messages-unbound")) interfaces.push(iface("record-message", "bind the next Codex/human message to this session channel", {
    channel: `codex:${input.session}`,
    role: "agent",
    speaker: "agent:codex",
    session: input.session,
    trace: input.trace,
    text: input.intent ?? `session ${input.session} message witness`,
    evidence: input.paths.join(","),
  }));
  if (needed.has("findings-unbound")) interfaces.push(iface("record-finding", "persist a session finding into durable Operations Manifold memory", {
    session: input.session,
    subject: "operations-manifold/codex-session",
    predicate: "has-durable-finding",
    charge: "potential",
    note: input.intent ?? `session ${input.session} finding witness`,
    trace: input.trace,
    evidence: input.paths.join(","),
  }));
  interfaces.push(iface("derive-message-learning", "derive reviewable learning candidates from bound message channels", { channel: `codex:${input.session}`, limit: "12" }));
  interfaces.push(iface("createCheckpoint", "record JSON state witnesses for this session", {
    label: `read-session-${input.session}`,
    reason: input.intent ?? "session createCheckpoint",
    source: "operations-manifold.read-session",
  }));
  return Object.freeze(interfaces);
}

function binding(name: string, ready: boolean, evidence: readonly string[]): SessionBinding {
  return Object.freeze({ name, ready, evidence: Object.freeze([...new Set(evidence)].slice(0, 6)) });
}

function pressure(id: string, severity: SessionPressure["severity"], summary: string, next: string): SessionPressure {
  return Object.freeze({ id, severity, summary, next });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): SessionInterface {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function matchesSession(entry: OperationLedgerEntry, session: string, trace: string): boolean {
  return entry.trace === trace
    || entry.trace.includes(session)
    || entry.subject.includes(session)
    || entry.evidence.some((value) => value.includes(session));
}

function matchesOperationContext(entry: OperationLedgerEntry, focus: string | null, paths: readonly string[]): boolean {
  return (focus !== null && (entry.subject.includes(focus) || entry.paths.some((path) => path.includes(focus))))
    || paths.some((path) => path !== "" && entry.paths.includes(path));
}

function matchesWork(item: ActiveWorkRecord, session: string, trace: string): boolean {
  return item.session === session
    || item.evidence.some((value) => value.includes(session) || value.includes(trace));
}

function matchesWorkContext(item: ActiveWorkRecord, focus: string | null, paths: readonly string[]): boolean {
  return (focus !== null && item.focus === focus)
    || paths.some((path) => item.evidence.includes(path));
}

function matchesMessageChannel(channel: ChannelSnapshot, session: string, trace: string): boolean {
  return channel.id === session
    || channel.id === `codex:${session}`
    || channel.id.includes(session)
    || channel.messages.some((message) => matchesMessage(message, session, trace));
}

function matchesMessage(message: ChannelMessageRecord, session: string, trace: string): boolean {
  return message.session === session
    || message.channel === session
    || message.channel === `codex:${session}`
    || message.channel.includes(session)
    || (message.trace !== undefined && (message.trace === trace || message.trace.includes(session) || message.trace.includes(trace)))
    || message.evidence.some((value) => value.includes(session) || value.includes(trace));
}

function matchesMessageContextChannel(channel: ChannelSnapshot, focus: string | null, intent: string | null, paths: readonly string[]): boolean {
  return (focus !== null && channel.id.includes(focus))
    || channel.messages.some((message) => matchesMessageContext(message, focus, intent, paths));
}

function matchesMessageContext(message: ChannelMessageRecord, focus: string | null, intent: string | null, paths: readonly string[]): boolean {
  return (focus !== null && (message.channel.includes(focus) || message.evidence.some((value) => value.includes(focus))))
    || (intent !== null && includesAny(searchable([message.text, message.speaker, message.channel]), terms(intent)))
    || paths.some((item) => item !== "" && message.evidence.includes(item));
}

function matchesFinding(entry: FindingRecord, session: string, trace: string): boolean {
  return entry.session === session
    || entry.trace === trace
    || (entry.trace !== null && (entry.trace.includes(session) || entry.trace.includes(trace)))
    || entry.evidence.some((value) => value.includes(session) || value.includes(trace));
}

function matchesFindingContext(entry: FindingRecord, focus: string | null, intent: string | null, paths: readonly string[]): boolean {
  return (focus !== null && (entry.focus === focus || entry.evidence.some((value) => value.includes(focus))))
    || (intent !== null && includesAny(searchable([entry.predicate, entry.subjectKey, String(entry.note ?? "")]), terms(intent)))
    || paths.some((item) => item !== "" && entry.evidence.includes(item));
}

function uniqueMessages(messages: readonly ChannelMessageRecord[]): readonly ChannelMessageRecord[] {
  const byId = new Map<string, ChannelMessageRecord>();
  for (const message of messages) byId.set(message.messageId, message);
  return Object.freeze([...byId.values()].sort((left, right) => left.at.localeCompare(right.at)));
}

function matchesContextAdmission(item: ContextAdmissionRecord, focus: string | null, intent: string | null, paths: readonly string[]): boolean {
  return (focus !== null && item.focus === focus)
    || (intent !== null && includesAny(searchable([item.intent]), terms(intent)))
    || paths.some((path) => item.evidence.includes(path));
}

function matchesDrift(item: DriftAssessmentRecord, focus: string | null, intent: string | null, paths: readonly string[]): boolean {
  return (focus !== null && item.focus === focus)
    || (intent !== null && includesAny(searchable([item.intent, item.action]), terms(intent)))
    || paths.some((path) => item.paths.includes(path) || item.evidence.includes(path));
}

function compactOperation(entry: OperationLedgerEntry): SessionOperation {
  return Object.freeze({
    id: entry.id,
    eventId: entry.eventId,
    at: entry.at,
    event: entry.event,
    trace: entry.trace,
    tool: entry.tool,
    paths: Object.freeze(entry.paths.slice(0, 4)),
    estimatedTokens: entry.estimatedTokens,
    budgetBand: entry.budgetBand,
    evidence: Object.freeze(entry.evidence.slice(0, 4)),
  });
}

function compactWork(item: ActiveWorkRecord): SessionWork {
  return Object.freeze({
    id: item.id,
    title: clip(item.title, 180),
    status: item.status,
    workKind: item.workKind,
    focus: item.focus,
    session: item.session,
    evidence: Object.freeze(item.evidence.slice(0, 4)),
  });
}

function compactMessageChannel(channel: ChannelSnapshot): SessionMessageChannel {
  return Object.freeze({
    id: channel.id,
    updatedAt: channel.updatedAt,
    messageCount: channel.messageCount,
    replyCount: channel.replyCount,
    endpointReplyCount: channel.endpointReplyCount,
    errorCount: channel.errorCount,
    estimatedTokens: channel.estimatedTokens,
  });
}

function compactMessage(message: ChannelMessageRecord): SessionMessage {
  return Object.freeze({
    id: message.messageId,
    eventId: message.eventId,
    at: message.at,
    channel: message.channel,
    role: message.role,
    speaker: message.speaker,
    status: message.status,
    endpointCondition: message.endpointCondition ?? null,
    endpointCharge: message.endpointCharge ?? null,
    apiKeyPresent: message.apiKeyPresent ?? null,
    trace: message.trace ?? null,
    session: message.session ?? null,
    evidence: Object.freeze(message.evidence.slice(0, 4)),
    preview: clip(message.text, 220),
  });
}

function compactFinding(entry: FindingRecord): SessionFinding {
  return Object.freeze({
    id: entry.id,
    eventId: entry.eventId,
    at: entry.at,
    session: entry.session,
    subject: entry.subject,
    subjectKey: entry.subjectKey,
    predicate: entry.predicate,
    charge: entry.charge,
    focus: entry.focus,
    intent: entry.intent,
    trace: entry.trace,
    evidence: Object.freeze(entry.evidence.slice(0, 4)),
    note: entry.note,
  });
}

function compactAdmission(item: ContextAdmissionRecord): SessionAdmission {
  return Object.freeze({
    id: item.id,
    at: item.at,
    intent: clip(item.intent, 220),
    focus: item.focus,
    evidence: Object.freeze(item.evidence.slice(0, 4)),
  });
}

function compactDrift(item: DriftAssessmentRecord): SessionDrift {
  return Object.freeze({
    id: item.id,
    at: item.at,
    action: clip(item.action, 220),
    focus: item.focus,
    score: item.score,
    drift: item.drift,
    evidence: Object.freeze(item.evidence.slice(0, 4)),
  });
}

function compactCheckpoint(record: CheckpointRecord | null): SessionCheckpoint | null {
  if (record === null) return null;
  return Object.freeze({
    id: record.id,
    label: record.label,
    at: record.at,
    counts: record.counts,
    files: Object.freeze(record.files.slice(0, 8).map((file) => Object.freeze({ path: file.path, exists: file.exists, bytes: file.bytes }))),
  });
}

function terms(value: string): readonly string[] {
  return Object.freeze(value.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term.length > 3));
}

function searchable(values: readonly string[]): string {
  return values.join(" ").toLowerCase();
}

function includesAny(haystack: string, needles: readonly string[]): boolean {
  for (const needle of needles) {
    if (haystack.includes(needle)) return true;
  }
  return false;
}

function roundMoney(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}
