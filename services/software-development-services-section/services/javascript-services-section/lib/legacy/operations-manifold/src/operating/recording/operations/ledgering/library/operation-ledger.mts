import type { EAVT } from "@emsenn/relating/writing";

import type { AgentRunTraceProjection } from "../../../../../holography/llm/agent-run-trace.mts";
import { resolveWorkspacePackageFocusPath } from "../../../../../package-surface.mts";
import { notNull, optionalText } from "../../../../../records.mts";
import { projectFileTouchMarket, type FileTouchMarket, type FileTouchMarketParams } from "../../../touching/files/marketing/library/file-touch-market.mts";
import { affectsApiIndex } from "../../classifying/library/operation-classification.mts";
import { foldOperationEvents, summarizeOperationLedger, type OperationLedgerEntry, type OperationLedgerSnapshot } from "../../folding/library/operation-ledger-fold.mts";
import { hookEventOperationRecordParams, type HookEventRecordParams } from "../../hooking/recording/library/hook-event-recording.mts";
import { appendOperationEvents, ensureOperationDirs, readOperationLog, writeOperationSnapshot } from "../../recording/library/operation-log.mts";
import { eventIdOf, type OperationEventValue } from "../../recording/library/operation-event.mts";
import { operationRecordDraft, type OperationRecordParams } from "../../recording/library/operation-recording.mts";
import { traceImportEvents } from "../../importing/traces/library/operation-trace-import.mts";

export type OperationTraceImportParams = Readonly<{
  format?: string | undefined;
  jsonl?: string | undefined;
  file?: string | undefined;
  run?: string | undefined;
  focus?: string | undefined;
  limit?: string | number | undefined;
  source?: string | undefined;
}>;

export type { OperationLedgerEntry, OperationLedgerSnapshot } from "../../folding/library/operation-ledger-fold.mts";
export type { HookEventRecordParams } from "../../hooking/recording/library/hook-event-recording.mts";
export type { OperationRecordParams } from "../../recording/library/operation-recording.mts";

export type OperationRecordResult = Readonly<{
  kind: "operations-manifold.read-operations-ledger.record";
  accepted: true;
  event: EAVT;
  eavtJsonl: string;
  entry: OperationLedgerEntry;
  snapshot: OperationLedgerSnapshot;
}>;

export type OperationTraceImportResult = Readonly<{
  kind: "operations-manifold.read-operations-ledger.trace-import";
  accepted: true;
  projection: AgentRunTraceProjection;
  imported: readonly OperationLedgerEntry[];
  skipped: readonly string[];
  eavtJsonl: string;
  snapshot: OperationLedgerSnapshot;
}>;

// Lean transport forms for script/hook stdout: the embedded ledger snapshot is
// summarized. Core functions keep returning the full snapshot.
export function leanOperationRecord(result: OperationRecordResult) {
  return Object.freeze({ ...result, snapshot: summarizeOperationLedger(result.snapshot) });
}

export function leanOperationTraceImport(result: OperationTraceImportResult) {
  return Object.freeze({ ...result, snapshot: summarizeOperationLedger(result.snapshot) });
}

export async function recordOperation(repoRoot: string, params: OperationRecordParams): Promise<OperationRecordResult> {
  const draft = operationRecordDraft(params);
  await ensureOperationDirs(repoRoot);
  const eavtJsonl = await appendOperationEvents(repoRoot, [draft.event]);
  const snapshot = await refreshOperationsLedger(repoRoot);
  await refreshDerivedStateForOperation(repoRoot, draft.value);
  const entry = snapshot.entries.find((item) => item.id === draft.entryId);
  if (entry === undefined) throw new Error(`operation was not projected after recording: ${draft.entryId}`);
  return Object.freeze({ kind: "operations-manifold.read-operations-ledger.record" as const, accepted: true as const, event: draft.event, eavtJsonl, entry, snapshot });
}

export async function operationsLedger(repoRoot: string): Promise<OperationLedgerSnapshot> {
  await ensureOperationDirs(repoRoot);
  return refreshOperationsLedger(repoRoot);
}

export async function fileTouchMarket(repoRoot: string, params: FileTouchMarketParams = {}): Promise<FileTouchMarket> {
  const snapshot = await operationsLedger(repoRoot);
  return projectFileTouchMarket(snapshot.fileTouchMarket, {
    ...params,
    focus: resolveWorkspacePackageFocusPath(repoRoot, params.focus),
  });
}

export async function recordHookEvent(repoRoot: string, params: HookEventRecordParams): Promise<OperationRecordResult> {
  return recordOperation(repoRoot, hookEventOperationRecordParams(params));
}

export async function importOperationsFromTrace(repoRoot: string, params: OperationTraceImportParams): Promise<OperationTraceImportResult> {
  await ensureOperationDirs(repoRoot);
  const { agentRunTraceProjectionFromParams } = await import("../../../../../holography/llm/agent-run-trace.mts");
  const projection = await agentRunTraceProjectionFromParams(repoRoot, {
    format: params.format,
    jsonl: params.jsonl,
    file: params.file,
    run: params.run,
    focus: params.focus,
    limit: optionalText(params.limit) ?? "500",
  });
  const existing = await operationsLedger(repoRoot);
  const existingEvents = new Set(existing.entries.map((entry) => entry.eventId));
  const candidates = traceImportEvents(projection, optionalText(params.source) ?? "operations-manifold.import-operation-trace");
  const importedEvents: EAVT[] = [];
  const skipped: string[] = [];
  for (const event of candidates) {
    const eventId = eventIdOf(event);
    if (eventId !== null && existingEvents.has(eventId)) {
      skipped.push(eventId);
      continue;
    }
    importedEvents.push(event);
  }
  const eavtJsonl = await appendOperationEvents(repoRoot, importedEvents);
  const snapshot = await refreshOperationsLedger(repoRoot);
  const importedEventIds = new Set(importedEvents.map(eventIdOf).filter(notNull));
  return Object.freeze({
    kind: "operations-manifold.read-operations-ledger.trace-import" as const,
    accepted: true as const,
    projection,
    imported: Object.freeze(snapshot.entries.filter((entry) => importedEventIds.has(entry.eventId))),
    skipped: Object.freeze(skipped),
    eavtJsonl,
    snapshot,
  });
}

export async function refreshOperationsLedger(repoRoot: string): Promise<OperationLedgerSnapshot> {
  const events = await readOperationLog(repoRoot);
  const snapshot = foldOperationEvents(events);
  await writeOperationSnapshot(repoRoot, snapshot);
  return snapshot;
}

async function refreshDerivedStateForOperation(repoRoot: string, event: OperationEventValue): Promise<void> {
  if (event.event !== "file-write") return;
  if (!(event.paths ?? []).some(affectsApiIndex)) return;
  const { refreshApiIndex } = await import("../../../../../api-index.mts");
  await refreshApiIndex(repoRoot);
}
