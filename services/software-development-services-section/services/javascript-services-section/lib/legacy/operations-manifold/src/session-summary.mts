/**
 * SessionEnd summary settler — the continuous-learning capability.
 *
 * Prior art (claude-mem's summary-hook, Continuous-Claude's SessionEnd learning
 * extraction) closes each session by distilling a structured summary so the next
 * session inherits the work instead of re-deriving it. The claude-mem shape is
 * {request, investigated, learned, completed, next_steps}.
 *
 * This settler does not LLM-parse the transcript; it folds the session's own
 * durable manifold evidence — operations, read-work, findings, messages, goals —
 * into that shape, then files it as an append-only EAVT finding. The summary is
 * therefore grounded in filed evidence, not chat memory, consistent with the
 * standing constraint "file action evidence before projecting finite state".
 */
import { readFindings, recordFinding, type FindingRecord } from "./operating/remembering/codex/findings.mts";
import { harnessIdentity, harnessTrace, type HarnessIdentity } from "./harness.mts";
import { operationsLedger, type OperationLedgerEntry } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { operationsManifoldGoals } from "./goals.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "./work-management.mts";
import { readMessages, type ChannelMessageRecord } from "./operating/messaging/channels/channel-message.mts";
import { optionalText } from "./records.mts";

export type SessionSummary = Readonly<{
  request: string;
  investigated: readonly string[];
  learned: readonly string[];
  completed: readonly string[];
  next_steps: readonly string[];
}>;

export type SessionSummaryParams = Readonly<{
  session?: string | undefined;
  session_id?: string | undefined;
  harness?: string | undefined;
  trace?: string | undefined;
  transcript?: string | undefined;
  transcript_path?: string | undefined;
}>;

export type SessionSummaryResult = Readonly<{
  kind: "operations-manifold.session.summary";
  settled: boolean;
  reason: string;
  session: string;
  harness: string;
  trace: string;
  summary: SessionSummary;
  finding: FindingRecord | null;
}>;

const SUMMARY_LIMIT = 8;

export async function settleSessionSummary(repoRoot: string, params: SessionSummaryParams = {}): Promise<SessionSummaryResult> {
  const identity = harnessIdentity({ harness: params.harness });
  const session = optionalText(params.session ?? params.session_id);
  const trace = optionalText(params.trace) ?? (session === null ? `${identity.tracePrefix}:unknown-session` : harnessTrace(identity, session));
  const transcript = optionalText(params.transcript ?? params.transcript_path);
  if (session === null) {
    return frozenResult(false, "no session id supplied; nothing to summarize", "unknown-session", identity, trace, emptySummary());
  }

  const [ledger, work, findings, messages, goals] = await Promise.all([
    operationsLedger(repoRoot),
    operationsManifoldWork(repoRoot),
    readFindings(repoRoot),
    readMessages(repoRoot, { limit: 200 }),
    operationsManifoldGoals(repoRoot),
  ]);

  const sessionOps = ledger.entries.filter((entry) => boundOperation(entry, session, trace));
  const sessionWork = work.items.filter((item) => boundWork(item, session, trace));
  const sessionFindings = findings.findings.filter((entry) => entry.session === session);
  const sessionMessages = allMessages(messages)
    .filter((message) => boundMessage(message, session, trace))
    .sort((left, right) => left.at.localeCompare(right.at));

  const summary = Object.freeze({
    request: requestOf(sessionMessages, sessionWork),
    investigated: investigatedOf(sessionOps),
    learned: learnedOf(sessionFindings),
    completed: completedOf(sessionWork),
    next_steps: nextStepsOf(sessionWork, goals.goals),
  });

  const result = await recordFinding(repoRoot, {
    session,
    subject: ["session", session],
    predicate: "operations-manifold.session.summarized",
    charge: "stable",
    note: summary,
    intent: summary.request,
    trace,
    evidence: Object.freeze([
      ...(transcript === null ? [] : [transcript]),
      `operations:${sessionOps.length}`,
      `work:${sessionWork.length}`,
      `findings:${sessionFindings.length}`,
    ]),
    source: `${identity.harness}.session-end`,
  });

  return frozenResult(true, "session summary filed as durable finding", session, identity, trace, summary, result.finding);
}

function boundOperation(entry: OperationLedgerEntry, session: string, trace: string): boolean {
  return entry.trace === trace
    || entry.trace.includes(session)
    || entry.subject.includes(session)
    || entry.evidence.some((value) => value.includes(session));
}

function boundWork(item: ActiveWorkRecord, session: string, trace: string): boolean {
  return item.session === session || item.evidence.some((value) => value.includes(session) || value.includes(trace));
}

function boundMessage(message: ChannelMessageRecord, session: string, trace: string): boolean {
  return message.session === session
    || message.channel.includes(session)
    || (message.trace !== undefined && message.trace.includes(session))
    || message.evidence.some((value) => value.includes(session) || value.includes(trace));
}

function allMessages(messages: Awaited<ReturnType<typeof readMessages>>): readonly ChannelMessageRecord[] {
  const byId = new Map<string, ChannelMessageRecord>();
  for (const message of messages.messages) byId.set(message.messageId, message);
  for (const channel of messages.channels) for (const message of channel.messages) byId.set(message.messageId, message);
  return Object.freeze([...byId.values()]);
}

function requestOf(messages: readonly ChannelMessageRecord[], work: readonly ActiveWorkRecord[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  if (firstUser !== undefined) return clip(firstUser.text, 280);
  const newestWork = [...work].sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
  return newestWork === undefined ? "No bound request was recorded for this session." : clip(newestWork.intent, 280);
}

function investigatedOf(operations: readonly OperationLedgerEntry[]): readonly string[] {
  const paths = unique(operations.flatMap((entry) => entry.paths));
  const tools = unique(operations.map((entry) => entry.tool).filter((tool): tool is string => tool !== null));
  return Object.freeze([
    ...paths.slice(0, SUMMARY_LIMIT).map((path) => `path ${path}`),
    ...tools.slice(0, SUMMARY_LIMIT).map((tool) => `tool ${tool}`),
  ].slice(0, SUMMARY_LIMIT));
}

function learnedOf(findings: readonly FindingRecord[]): readonly string[] {
  return Object.freeze(findings
    .filter((entry) => entry.predicate !== "operations-manifold.session.summarized")
    .slice(0, SUMMARY_LIMIT)
    .map((entry) => `${entry.subjectKey}: ${entry.predicate} (${entry.charge})`));
}

function completedOf(work: readonly ActiveWorkRecord[]): readonly string[] {
  return Object.freeze(work
    .filter((item) => item.status === "complete")
    .slice(0, SUMMARY_LIMIT)
    .map((item) => `${clip(item.title, 120)}${item.outcome === null ? "" : ` — ${clip(item.outcome, 160)}`}`));
}

function nextStepsOf(work: readonly ActiveWorkRecord[], goals: readonly Readonly<{ status: string; title: string }>[]): readonly string[] {
  const openWork = work.filter((item) => item.status !== "complete").map((item) => `read-work: ${clip(item.title, 120)} (${item.workStatus})`);
  const openGoals = goals
    .filter((goal) => goal.status !== "complete" && goal.status !== "withdrawn")
    .slice(0, 3)
    .map((goal) => `goal: ${clip(goal.title, 120)} (${goal.status})`);
  return Object.freeze([...openWork, ...openGoals].slice(0, SUMMARY_LIMIT));
}

function frozenResult(
  settled: boolean,
  reason: string,
  session: string,
  identity: HarnessIdentity,
  trace: string,
  summary: SessionSummary,
  finding: FindingRecord | null = null,
): SessionSummaryResult {
  return Object.freeze({
    kind: "operations-manifold.session.summary" as const,
    settled,
    reason,
    session,
    harness: identity.harness,
    trace,
    summary,
    finding,
  });
}

function emptySummary(): SessionSummary {
  return Object.freeze({ request: "", investigated: Object.freeze([]), learned: Object.freeze([]), completed: Object.freeze([]), next_steps: Object.freeze([]) });
}

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/gu, " ").trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 3))}...`;
}
