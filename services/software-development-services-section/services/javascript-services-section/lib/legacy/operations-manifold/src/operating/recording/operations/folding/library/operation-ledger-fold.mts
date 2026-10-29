import type { EAVT } from "@emsenn/relating/writing";

import { boundedInteger, optionalText, stringOf } from "../../../../../records.mts";
import { foldFileTouchMarket, type FileTouchMarket } from "../../../touching/files/marketing/library/file-touch-market.mts";
import { type OperationEventKind, type OperationLayer, type OperationNucleus } from "../../classifying/library/operation-classification.mts";
import { DEFAULT_CONTEXT_BUDGET_TOKENS, roundMoney, type ContextBudgetBand } from "../../metering/context/library/context-budget.mts";
import { gameFor, operationScore, type OperationLedgerGame } from "../../gaming/library/operation-ledger-game.mts";
import { OPERATIONS_LOG_RELATIVE, OPERATIONS_STATE_RELATIVE } from "../../recording/library/operation-log.mts";
import { operationEventValue, type OperationEventValue } from "../../recording/library/operation-event.mts";

export type OperationLedgerEntry = Readonly<{
  kind: "operations-manifold.operation.entry";
  id: string;
  eventId: string;
  at: string;
  event: OperationEventKind;
  trace: string;
  layer: OperationLayer;
  nucleus: OperationNucleus;
  subject: string;
  predicate: string;
  object: string;
  valueOld: string;
  valueNew: string;
  tool: string | null;
  paths: readonly string[];
  tokens: number;
  estimatedTokens: number;
  inputBytes: number;
  outputBytes: number;
  totalBytes: number;
  budgetLimitTokens: number;
  budgetBand: ContextBudgetBand;
  budgetWarnings: readonly string[];
  costUsd: number;
  durationMs: number | null;
  agent: string | null;
  source: string;
  evidence: readonly string[];
  note: string | null;
  score: number;
}>;

export type OperationCount = Readonly<{
  key: string;
  count: number;
  tokens: number;
  costUsd: number;
}>;

export type OperationLedgerSnapshot = Readonly<{
  kind: "operations-manifold.read-operations-ledger.snapshot";
  generatedAt: string;
  log: string;
  state: string;
  cycle: readonly ["form", "eavt", "sensor", "eavt", "actuator", "eavt", "form"];
  eventCount: number;
  totals: Readonly<{
    entries: number;
    tokens: number;
    estimatedTokens: number;
    inputBytes: number;
    outputBytes: number;
    overBudgetEntries: number;
    hugeEntries: number;
    costUsd: number;
    tools: number;
    fileReads: number;
    fileWrites: number;
    commands: number;
    mcpCalls: number;
    httpCalls: number;
    hookEvents: number;
  }>;
  byPredicate: readonly OperationCount[];
  byTrace: readonly OperationCount[];
  byTool: readonly OperationCount[];
  entries: readonly OperationLedgerEntry[];
  fileTouchMarket: FileTouchMarket;
  game: OperationLedgerGame;
}>;

// Transport projection of the ledger: entries[] (every recorded operation with
// its note/values/paths/evidence) is the package-bin context dump — ~8MB on this
// repo, 16x the work-snapshot dump. stdout is a projection: keep the totals,
// per-predicate/trace/tool aggregates, and game, drop the entry inventory and the
// fileTouchMarket. Core functions still return the full snapshot for in-process
// consumers; only script/hook stdout is leaned.
export type OperationLedgerSnapshotSummary = Omit<OperationLedgerSnapshot, "entries" | "fileTouchMarket" | "kind"> & Readonly<{
  kind: "operations-manifold.read-operations-ledger.snapshot-summary";
  entryCount: number;
}>;

export type OperationLedgerReadParams = Readonly<{
  detail?: string | number | undefined;
  limit?: string | number | undefined;
  offset?: string | number | undefined;
  focus?: string | number | undefined;
}>;

export type OperationLedgerSnapshotPage = Readonly<{
  kind: "operations-manifold.read-operations-ledger.snapshot-page";
  summary: OperationLedgerSnapshotSummary;
  focus: string | null;
  offset: number;
  limit: number;
  entryCount: number;
  returned: number;
  entries: readonly OperationLedgerEntrySummary[];
}>;

export type OperationLedgerSnapshotProjection = OperationLedgerSnapshotSummary | OperationLedgerSnapshotPage | OperationLedgerSnapshot;

export type OperationLedgerEntrySummary = Readonly<{
  kind: "operations-manifold.operation.entry-summary";
  id: string;
  eventId: string;
  at: string;
  event: OperationEventKind;
  trace: string;
  layer: OperationLayer;
  nucleus: OperationNucleus;
  subject: string;
  predicate: string;
  object: string;
  tool: string | null;
  paths: readonly string[];
  tokens: number;
  estimatedTokens: number;
  inputBytes: number;
  outputBytes: number;
  totalBytes: number;
  budgetBand: ContextBudgetBand;
  budgetWarnings: readonly string[];
  costUsd: number;
  durationMs: number | null;
  agent: string | null;
  source: string;
  note: string | null;
  score: number;
  valueOldBytes: number;
  valueNewBytes: number;
  evidenceCount: number;
}>;

export function summarizeOperationLedger(snapshot: OperationLedgerSnapshot): OperationLedgerSnapshotSummary {
  const { entries, fileTouchMarket, ...rest } = snapshot;
  void fileTouchMarket;
  return Object.freeze({
    ...rest,
    kind: "operations-manifold.read-operations-ledger.snapshot-summary" as const,
    entryCount: entries.length,
  });
}

export function projectOperationLedgerSnapshot(
  snapshot: OperationLedgerSnapshot,
  params: OperationLedgerReadParams = {},
): OperationLedgerSnapshotProjection {
  const detail = optionalText(params.detail) ?? "summary";
  if (detail === "full") return snapshot;
  if (detail === "entries" || detail === "page" || params.limit !== undefined || params.offset !== undefined || params.focus !== undefined) {
    return pageOperationLedgerSnapshot(snapshot, params);
  }
  return summarizeOperationLedger(snapshot);
}

function pageOperationLedgerSnapshot(snapshot: OperationLedgerSnapshot, params: OperationLedgerReadParams): OperationLedgerSnapshotPage {
  const focus = optionalText(params.focus);
  const offset = boundedInteger(params.offset, { min: 0, fallback: 0 });
  const limit = boundedInteger(params.limit, { min: 1, max: 100, fallback: 25 });
  const filtered = focus === null ? snapshot.entries : snapshot.entries.filter((entry) => operationEntryMatchesFocus(entry, focus));
  const entries = Object.freeze(filtered.slice(offset, offset + limit).map(summarizeOperationEntry));
  return Object.freeze({
    kind: "operations-manifold.read-operations-ledger.snapshot-page" as const,
    summary: summarizeOperationLedger(snapshot),
    focus,
    offset,
    limit,
    entryCount: filtered.length,
    returned: entries.length,
    entries,
  });
}

function summarizeOperationEntry(entry: OperationLedgerEntry): OperationLedgerEntrySummary {
  return Object.freeze({
    kind: "operations-manifold.operation.entry-summary" as const,
    id: entry.id,
    eventId: entry.eventId,
    at: entry.at,
    event: entry.event,
    trace: entry.trace,
    layer: entry.layer,
    nucleus: entry.nucleus,
    subject: truncateForTransport(entry.subject),
    predicate: entry.predicate,
    object: truncateForTransport(entry.object),
    tool: entry.tool,
    paths: Object.freeze(entry.paths.slice(0, 12)),
    tokens: entry.tokens,
    estimatedTokens: entry.estimatedTokens,
    inputBytes: entry.inputBytes,
    outputBytes: entry.outputBytes,
    totalBytes: entry.totalBytes,
    budgetBand: entry.budgetBand,
    budgetWarnings: entry.budgetWarnings,
    costUsd: entry.costUsd,
    durationMs: entry.durationMs,
    agent: entry.agent,
    source: entry.source,
    note: entry.note === null ? null : truncateForTransport(entry.note),
    score: entry.score,
    valueOldBytes: entry.valueOld.length,
    valueNewBytes: entry.valueNew.length,
    evidenceCount: entry.evidence.length,
  });
}

function truncateForTransport(value: string, max = 600): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function operationEntryMatchesFocus(entry: OperationLedgerEntry, focus: string): boolean {
  const needle = focus.toLowerCase();
  return [
    entry.id,
    entry.eventId,
    entry.at,
    entry.event,
    entry.trace,
    entry.layer,
    entry.nucleus,
    entry.subject,
    entry.predicate,
    entry.object,
    entry.valueOld,
    entry.valueNew,
    entry.tool,
    entry.agent,
    entry.source,
    entry.note,
    ...entry.paths,
    ...entry.budgetWarnings,
    ...entry.evidence,
  ].some((value) => value !== null && value.toLowerCase().includes(needle));
}

export function foldOperationEvents(events: readonly EAVT[]): OperationLedgerSnapshot {
  const entries: OperationLedgerEntry[] = [];
  for (const event of events) {
    const entity = stringOf(event[0]);
    const attr = stringOf(event[1]);
    const value = operationEventValue(event[2]);
    if (entity === null || attr !== "operations-manifold.operation.recorded" || value === null) continue;
    const entry = operationEntry(entity, value);
    entries.push(entry);
  }
  const ordered = entries.sort((left, right) => right.at.localeCompare(left.at));
  const totals = totalsFor(ordered);
  const fileTouch = foldFileTouchMarket(ordered);
  return Object.freeze({
    kind: "operations-manifold.read-operations-ledger.snapshot" as const,
    generatedAt: new Date().toISOString(),
    log: OPERATIONS_LOG_RELATIVE,
    state: OPERATIONS_STATE_RELATIVE,
    cycle: Object.freeze(["form", "eavt", "sensor", "eavt", "actuator", "eavt", "form"] as const),
    eventCount: events.length,
    totals,
    byPredicate: grouped(ordered, (entry) => entry.predicate),
    byTrace: grouped(ordered, (entry) => entry.trace),
    byTool: grouped(ordered.filter((entry) => entry.tool !== null), (entry) => entry.tool ?? ""),
    entries: Object.freeze(ordered),
    fileTouchMarket: fileTouch,
    game: gameFor(ordered, totals),
  });
}

function operationEntry(id: string, value: OperationEventValue): OperationLedgerEntry {
  const score = operationScore(value);
  return Object.freeze({
    kind: "operations-manifold.operation.entry" as const,
    id,
    eventId: value.eventId,
    at: value.at,
    event: value.event,
    trace: value.trace,
    layer: value.layer,
    nucleus: value.nucleus,
    subject: value.subject,
    predicate: value.predicate,
    object: value.object,
    valueOld: value.valueOld,
    valueNew: value.valueNew,
    tool: value.tool ?? null,
    paths: Object.freeze([...(value.paths ?? [])]),
    tokens: value.tokens ?? 0,
    estimatedTokens: value.estimatedTokens ?? 0,
    inputBytes: value.inputBytes ?? 0,
    outputBytes: value.outputBytes ?? 0,
    totalBytes: (value.inputBytes ?? 0) + (value.outputBytes ?? 0),
    budgetLimitTokens: value.budgetLimitTokens ?? DEFAULT_CONTEXT_BUDGET_TOKENS,
    budgetBand: value.budgetBand ?? "ok",
    budgetWarnings: Object.freeze([...(value.budgetWarnings ?? [])]),
    costUsd: value.costUsd ?? 0,
    durationMs: value.durationMs ?? null,
    agent: value.agent ?? null,
    source: value.source,
    evidence: Object.freeze([`${OPERATIONS_LOG_RELATIVE}#${value.eventId}`, ...(value.evidence ?? [])]),
    note: value.note ?? null,
    score,
  });
}

/**
 * Project the play-read for an arbitrary slice of ledger entries through the
 * same `gameFor` morphism the whole-ledger fold uses. A session game is this
 * applied to the operations bound to one harness session, so the session's
 * mode/flow/level read on the same scale as the world's.
 */
export function gameForEntries(entries: readonly OperationLedgerEntry[]): OperationLedgerGame {
  return gameFor(entries, totalsFor(entries));
}

function totalsFor(entries: readonly OperationLedgerEntry[]): OperationLedgerSnapshot["totals"] {
  return Object.freeze({
    entries: entries.length,
    tokens: entries.reduce((sum, entry) => sum + entry.tokens, 0),
    estimatedTokens: entries.reduce((sum, entry) => sum + entry.estimatedTokens, 0),
    inputBytes: entries.reduce((sum, entry) => sum + entry.inputBytes, 0),
    outputBytes: entries.reduce((sum, entry) => sum + entry.outputBytes, 0),
    overBudgetEntries: entries.filter((entry) => entry.budgetBand === "over" || entry.budgetBand === "huge").length,
    hugeEntries: entries.filter((entry) => entry.budgetBand === "huge").length,
    costUsd: roundMoney(entries.reduce((sum, entry) => sum + entry.costUsd, 0)),
    tools: entries.filter((entry) => entry.event === "tool-use").length,
    fileReads: entries.filter((entry) => entry.event === "file-read").length,
    fileWrites: entries.filter((entry) => entry.event === "file-write").length,
    commands: entries.filter((entry) => entry.event === "command").length,
    mcpCalls: entries.filter((entry) => entry.event === "mcp-call").length,
    httpCalls: entries.filter((entry) => entry.event === "http-call").length,
    hookEvents: entries.filter((entry) => entry.event === "record-hook-event").length,
  });
}

function grouped(entries: readonly OperationLedgerEntry[], keyFor: (entry: OperationLedgerEntry) => string): readonly OperationCount[] {
  const groups = new Map<string, { count: number; tokens: number; costUsd: number }>();
  for (const entry of entries) {
    const key = keyFor(entry);
    const existing = groups.get(key) ?? { count: 0, tokens: 0, costUsd: 0 };
    existing.count += 1;
    existing.tokens += entry.tokens;
    existing.costUsd += entry.costUsd;
    groups.set(key, existing);
  }
  return Object.freeze([...groups.entries()]
    .map(([key, value]) => Object.freeze({ key, count: value.count, tokens: value.tokens, costUsd: roundMoney(value.costUsd) }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, 24));
}
