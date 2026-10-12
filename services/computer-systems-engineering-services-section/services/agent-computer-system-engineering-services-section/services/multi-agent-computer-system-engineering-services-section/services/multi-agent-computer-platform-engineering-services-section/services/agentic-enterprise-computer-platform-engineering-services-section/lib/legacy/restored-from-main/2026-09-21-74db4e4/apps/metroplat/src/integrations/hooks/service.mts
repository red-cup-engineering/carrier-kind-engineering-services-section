/**
 * Service binding for harness hook-event admission.
 *
 * The codec normalizes Codex/Claude-style hook JSON without interpreting the
 * event. This service owns the filesystem append into data/journals.
 */
import path from "node:path";
import { sha256Hex } from "../../lib/identity/index.mts";

import { admitHookEnvelope, isHookEnvelope } from "./codec.mts";
import type { HookAdmissionReport, HookEnvelope } from "./schema.mts";
import { transportCloudEvent, type ArrivalReceipt } from "../../rpc/index.mts";
import { hookEventClaimTerm } from "./claim.mts";
import { toEavt, type EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import { type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { statPathOrNull, readFileUtf8 } from "../../lib/filesystem/index.mts";
import {
  openJournal,
  type FilesystemJournal,
  type RootEventWriteOptions,
  type EventWriteResult,
} from "../../journal/index.mts";
import { appendArrivalAtRoot } from "../filesystem/services/arrival.mts";

import { agentSessionTokenUsageFeed } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/persistence";
import { agentSessionTokenUsageStatementRows } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/persistence";
import { claudeSessionTokenUsageOfContent } from "@red-cup-engineering/anthropic-inference-team/token-usage";
import { codexSessionTokenUsageOfContent } from "../openai/codex/token-usage.mts";

/** Tool-input keys that name a target file, never carry its content. */
const TARGET_FILE_PATH_KEYS = Object.freeze(["file_path", "notebook_path", "path", "filePath"]);
const HOOK_PAYLOAD_STRING_INLINE_MAX_BYTES = 4 * 1024;
const TOKEN_USAGE_CHECKPOINT_HOOKS: ReadonlySet<string> = new Set(["Stop", "SessionEnd", "SubagentStop"]);
const DEFAULT_TOKEN_USAGE_TRANSCRIPT_MAX_BYTES = 2 * 1024 * 1024;

function asJsonRecord(value: JsonValue | undefined): JsonRecord | undefined {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

/** The file path(s) a hook's tool call names, read off `tool_input` — never
 *  the file's own content, which this row never carries at all. */
function hookTargetFilePaths(payload: JsonValue): readonly string[] {
  const toolInput = asJsonRecord(asJsonRecord(payload)?.["tool_input"] as JsonValue | undefined);
  if (toolInput === undefined) return Object.freeze([]);
  const paths = TARGET_FILE_PATH_KEYS.flatMap((key) => {
    const value = toolInput[key];
    return typeof value === "string" && value.trim() !== "" ? [value] : [];
  });
  return Object.freeze([...new Set(paths)]);
}

function hookSessionIndex(store: FilesystemJournal, at: string, sessionId: string): { readonly turnId?: string; readonly statementId?: string } | undefined {
    const record = store.readHead(at, "hook-sessions", sessionId);
    if (record === undefined) return undefined;
    const turnId = typeof record["turnId"] === "string" ? record["turnId"] : undefined;
    const statementId = typeof record["statementId"] === "string" ? record["statementId"] : undefined;
    return Object.freeze({
      ...(turnId === undefined ? {} : { turnId }),
      ...(statementId === undefined ? {} : { statementId }),
    });
}

function updateHookSessionIndex(store: FilesystemJournal, at: string, envelope: HookEnvelope, statementId: string | undefined): void {
  if (envelope.sessionId === undefined || envelope.turnId === undefined || statementId === undefined) return;
  store.writeHead(at, "hook-sessions", envelope.sessionId, Object.freeze({
    sessionId: envelope.sessionId,
    turnId: envelope.turnId,
    statementId,
  }));
}

function hookStatementCauses(store: FilesystemJournal, at: string, envelope: HookEnvelope): readonly string[] {
  if (envelope.sessionId === undefined || envelope.turnId === undefined) return Object.freeze([]);
  const previous = hookSessionIndex(store, at, envelope.sessionId);
  if (previous?.statementId === undefined || previous.turnId === envelope.turnId) return Object.freeze([]);
  return Object.freeze([previous.statementId]);
}

function boundedHookPayload(value: JsonValue, path: readonly string[] = Object.freeze([])): JsonValue {
  if (typeof value === "string") {
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes <= HOOK_PAYLOAD_STRING_INLINE_MAX_BYTES) return value;
    return Object.freeze({
      kind: "metroplat.hook.payload-field-reference" as const,
      reason: "over-inline-threshold" as const,
      sourceBytes: bytes,
      sha256: sha256Hex(value),
      path: path.join("."),
    });
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item, index) => boundedHookPayload(item, [...path, String(index)])));
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      boundedHookPayload(item, [...path, key]),
    ]))) as JsonRecord;
  }
  return value;
}

export type HookEventAdmissionResult = ArrivalReceipt | HookAdmissionReport;

function hookEntity(envelope: HookEnvelope): JsonRecord {
  return Object.freeze({
    protocol: "agent-hook",
    harness: envelope.harness,
    hookEventName: envelope.hookEventName,
    ...(envelope.sessionId === undefined ? {} : { session: envelope.sessionId }),
    ...(envelope.turnId === undefined ? {} : { turn: envelope.turnId }),
    ...(envelope.toolName === undefined ? {} : { tool: envelope.toolName }),
  });
}

function hookAttribute(envelope: HookEnvelope): JsonRecord {
  return Object.freeze({
    event: "admit-hook-event",
    hookEventName: envelope.hookEventName,
    ...(envelope.toolName === undefined ? {} : { toolName: envelope.toolName }),
  });
}

function hookValue(envelope: HookEnvelope): JsonRecord {
  const targetFilePaths = hookTargetFilePaths(envelope.payload as JsonValue);
  return Object.freeze({
    kind: "metroplat.hook.admission",
    hookEventName: envelope.hookEventName,
    ...(envelope.sessionId === undefined ? {} : { sessionId: envelope.sessionId }),
    ...(envelope.toolName === undefined ? {} : { toolName: envelope.toolName }),
    ...(targetFilePaths.length === 0 ? {} : { targetFilePaths }),
    ...(envelope.transcriptPath === undefined ? {} : { transcriptPath: envelope.transcriptPath }),
    ...(envelope.cwd === undefined ? {} : { cwd: envelope.cwd }),
    payload: boundedHookPayload(envelope.payload as JsonValue),
  });
}

export function hookEventStatementRows(envelope: HookEnvelope, at: JsonValue): readonly EAVT[] {
  return Object.freeze([
    toEavt({
      e: hookEntity(envelope),
      a: hookAttribute(envelope),
      v: hookValue(envelope),
      t: at,
    }),
  ]);
}

export interface HookEventAppendOptions extends RootEventWriteOptions {
  readonly at?: string;
  /** When true, checkpoint hook events with a transcript path also record
   * detailed provider token usage into the `agent-session-token-usage` feed. */
  readonly admitTokenUsage?: boolean;
  /** Maximum transcript bytes the hook path may read for token usage. */
  readonly tokenUsageTranscriptMaxBytes?: number;
}

function hookTranscriptProvider(envelope: HookEnvelope): "anthropic" | "openai" | undefined {
  const transcriptPath = envelope.transcriptPath;
  if (envelope.harness === "claude-code" || transcriptPath?.includes("/.claude/") === true) return "anthropic";
  if (envelope.harness === "codex" || transcriptPath?.includes("/.codex/") === true) return "openai";
  return undefined;
}

function shouldAdmitTokenUsage(envelope: HookEnvelope): boolean {
  return envelope.transcriptPath !== undefined
    && TOKEN_USAGE_CHECKPOINT_HOOKS.has(envelope.hookEventName)
    && hookTranscriptProvider(envelope) !== undefined;
}

function tokenUsageTranscriptMaxBytes(options: HookEventAppendOptions): number {
  const value = options.tokenUsageTranscriptMaxBytes;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : DEFAULT_TOKEN_USAGE_TRANSCRIPT_MAX_BYTES;
}

function appendHookTranscriptTokenUsageAtRoot(
  root: string,
  envelope: HookEnvelope,
  at: string,
  options: HookEventAppendOptions,
): void {
  const provider = hookTranscriptProvider(envelope);
  if (provider === undefined || envelope.transcriptPath === undefined) return;
  const transcriptPath = path.resolve(envelope.transcriptPath);
  const stat = statPathOrNull(transcriptPath);
  if (stat === null || !stat.isFile()) return;
  if (stat.size > tokenUsageTranscriptMaxBytes(options)) return;

  const content = readFileUtf8(transcriptPath);
  const summary = provider === "anthropic"
    ? claudeSessionTokenUsageOfContent(content, {
      source: transcriptPath,
      ...(envelope.sessionId === undefined ? {} : { sessionId: envelope.sessionId }),
    })
    : codexSessionTokenUsageOfContent(content, {
      source: transcriptPath,
      ...(envelope.sessionId === undefined ? {} : { sessionId: envelope.sessionId }),
    });
  if (summary.rawEvents.length === 0) return;
  const sessionId = summary.sessionId ?? envelope.sessionId ?? `${provider}-session`;
  openJournal(root).appendRows(agentSessionTokenUsageFeed.name, agentSessionTokenUsageStatementRows(summary, at), {
    at,
    rootName: options.rootName ?? "@red-cup-engineering/metroplat",
    subject: agentSessionTokenUsageFeed.name,
    caller: Object.freeze({
      transport: "agent-hook",
      harness: envelope.harness,
      hookEventName: envelope.hookEventName,
      session: sessionId,
      transcriptPath,
      measurement: "token-usage",
    }),
  });
}

/** Append one normalized hook envelope under `$root/data/journals/**`. */
export function appendHookEventAtRoot(
  root: string,
  input: unknown,
  options: HookEventAppendOptions = {},
): HookEventAdmissionResult {
  const admission = admitHookEnvelope(input);
  if (!isHookEnvelope(admission)) return admission;
  const at = options.at ?? new Date().toISOString();
  const store = openJournal(root);
  const event = transportCloudEvent("agent-hook", Object.freeze({
    kind: "metroplat.hook.arrival-material" as const,
    envelope: admission as unknown as JsonValue,
  }), at, Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference" as const,
    transport: "agent-hook" as const,
    path: ".codex/hooks",
    verb: admission.hookEventName,
  }));
  const receipt = appendArrivalAtRoot(root, event, {
    ...options,
    at,
    rootName: options.rootName ?? "@red-cup-engineering/metroplat",
    subject: options.subject ?? "arrival",
    eventClaim: hookEventClaimTerm(admission),
    eventCauses: hookStatementCauses(store, at, admission),
  });
  updateHookSessionIndex(store, at, admission, (receipt.admission as EventWriteResult | undefined)?.statements?.[0]?.id);
  if (options.admitTokenUsage === true && shouldAdmitTokenUsage(admission)) {
    try {
      appendHookTranscriptTokenUsageAtRoot(root, admission, at, options);
    } catch {
      // Hook admission is the primary live path and must not fail just because
      // a concurrently-written transcript cannot be read at this checkpoint.
    }
  }
  return receipt;
}

// No service verb lives here: a hook payload is a claim the harness utters, so
// admission is the filesystem `write` — its envelope recognition routes through
// `admitHookEnvelope`/`appendHookEventAtRoot` above.
