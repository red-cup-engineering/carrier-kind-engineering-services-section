/**
 * Service binding for harness hook-event admission.
 *
 * The codec normalizes Codex/Claude-style hook JSON without interpreting the
 * event. This service owns the filesystem append into data/journals.
 */
import path from "node:path";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { admitHookEnvelope, isHookEnvelope } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/hooks/codec";

import { transportCloudEvent } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import { hookEventClaimTerm } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/hooks/claim";
import { } from "@red-cup-engineering/json-services-section";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";

import { agentSessionTokenUsageFeed } from "@red-cup-engineering/computer-inference-engine/cost/token-usage/persistence";
import { agentSessionTokenUsageStatementRows } from "@red-cup-engineering/computer-inference-engine/cost/token-usage/persistence";
import { claudeSessionTokenUsageOfContent } from "@red-cup-engineering/computer-inference-engine/anthropic/token-usage";
import { codexSessionTokenUsageOfContent } from "@red-cup-engineering/feltos/agents/sessions/codex/token-usage";
import { toEavt } from "@red-cup-engineering/eavt-services-section/row";

/** Tool-input keys that name a target file, never carry its content. */
const TARGET_FILE_PATH_KEYS = Object.freeze(["file_path", "notebook_path", "path", "filePath"]);
const HOOK_PAYLOAD_STRING_INLINE_MAX_BYTES = 4 * 1024;
const TOKEN_USAGE_CHECKPOINT_HOOKS = new Set(["Stop", "SessionEnd", "SubagentStop"]);
// A long main session's transcript runs to tens of megabytes, and those are the sessions that cost
// the most: a bound that skipped them would leave the monitor blind to most of the spend.
const DEFAULT_TOKEN_USAGE_TRANSCRIPT_MAX_BYTES = 128 * 1024 * 1024;

function asJsonRecord(value) {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
}

/** The file path(s) a hook's tool call names, read off `tool_input` — never
 *  the file's own content, which this row never carries at all. */
function hookTargetFilePaths(payload) {
  const toolInput = asJsonRecord(asJsonRecord(payload)?.["tool_input"]);
  if (toolInput === undefined) return Object.freeze([]);
  const paths = TARGET_FILE_PATH_KEYS.flatMap((key) => {
    const value = toolInput[key];
    return typeof value === "string" && value.trim() !== "" ? [value] : [];
  });
  return Object.freeze([...new Set(paths)]);
}

function hookSessionIndex(store, at, sessionId) {
    const record = store.readHead(at, "hook-sessions", sessionId);
    if (record === undefined) return undefined;
    const turnId = typeof record["turnId"] === "string" ? record["turnId"] : undefined;
    const statementId = typeof record["statementId"] === "string" ? record["statementId"] : undefined;
    return Object.freeze({
      ...(turnId === undefined ? {} : { turnId }),
      ...(statementId === undefined ? {} : { statementId }),
    });
}

function updateHookSessionIndex(store, at, envelope, statementId) {
  if (envelope.sessionId === undefined || envelope.turnId === undefined || statementId === undefined) return;
  store.writeHead(at, "hook-sessions", envelope.sessionId, Object.freeze({
    sessionId: envelope.sessionId,
    turnId: envelope.turnId,
    statementId,
  }));
}

function hookStatementCauses(store, at, envelope) {
  if (envelope.sessionId === undefined || envelope.turnId === undefined) return Object.freeze([]);
  const previous = hookSessionIndex(store, at, envelope.sessionId);
  if (previous?.statementId === undefined || previous.turnId === envelope.turnId) return Object.freeze([]);
  return Object.freeze([previous.statementId]);
}

function boundedHookPayload(value, path = Object.freeze([])) {
  if (typeof value === "string") {
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes <= HOOK_PAYLOAD_STRING_INLINE_MAX_BYTES) return value;
    return Object.freeze({
      kind: "metroplat.hook.payload-field-reference",
      reason: "over-inline-threshold",
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
    ])));
  }
  return value;
}

function hookEntity(envelope) {
  return Object.freeze({
    protocol: "agent-hook",
    harness: envelope.harness,
    hookEventName: envelope.hookEventName,
    ...(envelope.sessionId === undefined ? {} : { session: envelope.sessionId }),
    ...(envelope.turnId === undefined ? {} : { turn: envelope.turnId }),
    ...(envelope.toolName === undefined ? {} : { tool: envelope.toolName }),
  });
}

function hookAttribute(envelope) {
  return Object.freeze({
    event: "admit-hook-event",
    hookEventName: envelope.hookEventName,
    ...(envelope.toolName === undefined ? {} : { toolName: envelope.toolName }),
  });
}

function hookValue(envelope) {
  const targetFilePaths = hookTargetFilePaths(envelope.payload);
  return Object.freeze({
    kind: "metroplat.hook.admission",
    hookEventName: envelope.hookEventName,
    ...(envelope.sessionId === undefined ? {} : { sessionId: envelope.sessionId }),
    ...(envelope.toolName === undefined ? {} : { toolName: envelope.toolName }),
    ...(targetFilePaths.length === 0 ? {} : { targetFilePaths }),
    ...(envelope.transcriptPath === undefined ? {} : { transcriptPath: envelope.transcriptPath }),
    ...(envelope.cwd === undefined ? {} : { cwd: envelope.cwd }),
    payload: boundedHookPayload(envelope.payload),
  });
}

export function hookEventStatementRows(envelope, at) {
  return Object.freeze([
    toEavt({
      e: hookEntity(envelope),
      a: hookAttribute(envelope),
      v: hookValue(envelope),
      t: at,
    }),
  ]);
}

function hookTranscriptProvider(envelope) {
  const transcriptPath = envelope.transcriptPath;
  if (envelope.harness === "claude-code" || transcriptPath?.includes("/.claude/") === true) return "anthropic";
  if (envelope.harness === "codex" || transcriptPath?.includes("/.codex/") === true) return "openai";
  return undefined;
}

function shouldAdmitTokenUsage(envelope) {
  return envelope.transcriptPath !== undefined
    && TOKEN_USAGE_CHECKPOINT_HOOKS.has(envelope.hookEventName)
    && hookTranscriptProvider(envelope) !== undefined;
}

const TOKEN_USAGE_CHECKPOINTS = "token-usage-checkpoints";
const DAY_MS = 24 * 60 * 60 * 1000;

/** The last row of a transcript its checkpoints admitted, today or (across midnight) yesterday. */
function admittedTranscriptRow(store, at, transcriptPath) {
  const yesterday = new Date(Date.parse(at) - DAY_MS).toISOString();
  for (const day of [at, yesterday]) {
    const head = store.readHead(day, TOKEN_USAGE_CHECKPOINTS, transcriptPath);
    if (Number.isFinite(head?.row)) return head.row;
  }
  return -Infinity;
}

function tokenUsageTranscriptMaxBytes(options) {
  const value = options.tokenUsageTranscriptMaxBytes;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : DEFAULT_TOKEN_USAGE_TRANSCRIPT_MAX_BYTES;
}

function appendHookTranscriptTokenUsageAtRoot(
  root,
  envelope,
  at,
  options,
) {
  const provider = hookTranscriptProvider(envelope);
  if (provider === undefined || envelope.transcriptPath === undefined) return;
  // A subagent's requests are in its own transcript, which only its SubagentStop names.
  const agentTranscript = envelope.hookEventName === "SubagentStop" ? asJsonRecord(envelope.payload)?.agent_transcript_path : undefined;
  const transcriptPath = path.resolve(typeof agentTranscript === "string" && agentTranscript !== "" ? agentTranscript : envelope.transcriptPath);
  const stat = options.statPathOrNull(transcriptPath);
  if (stat === null || !stat.isFile()) return;
  if (stat.size > tokenUsageTranscriptMaxBytes(options)) return;

  const content = options.readFileUtf8(transcriptPath);
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
  // Every checkpoint of a session reads its whole transcript, but admits only the requests made
  // since the last one: re-admitting the transcript each turn would grow the feed with the square
  // of a session's length. The summary row stays whole, so the latest one is the session's total.
  const store = openJournal(root);
  const through = admittedTranscriptRow(store, at, transcriptPath);
  const fresh = summary.rawEvents.filter((event) => !(event.row <= through));
  if (fresh.length === 0) return;
  store.appendRows(agentSessionTokenUsageFeed.name, agentSessionTokenUsageStatementRows({ ...summary, rawEventCount: summary.rawEvents.length, rawEvents: fresh }, at), {
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
  store.writeHead(at, TOKEN_USAGE_CHECKPOINTS, transcriptPath, Object.freeze({ session: sessionId, row: Math.max(through, ...fresh.map((event) => event.row).filter(Number.isFinite)) }));
}

/** Append one normalized hook envelope under `$root/data/journals/**`. `options.at` (ISO
 *  date-time) is the instant the caller has already read at the kernel edge; when
 *  `options.admitTokenUsage` is true, `options.statPathOrNull`/`options.readFileUtf8` (the same
 *  filesystem effects `defaultFilesystemBinding` bundles onto a binding) are also required, to
 *  read the hook's own transcript file. */
export function appendHookEventAtRoot(
  root,
  input,
  options = {},
) {
  const admission = admitHookEnvelope(input, { harness: options.harness });
  if (!isHookEnvelope(admission)) return admission;
  const at = options.at;
  const store = openJournal(root);
  const event = transportCloudEvent("agent-hook", Object.freeze({
    kind: "metroplat.hook.arrival-material",
    envelope: admission,
  }), at, Object.freeze({
    kind: "metroplat.generated-endpoint-readout-reference",
    transport: "agent-hook",
    path: options.harness !== undefined ? "rpc:harness-hook-event-admit" : admission.harness === "claude-code" ? ".claude/settings.local.json#hooks" : ".codex/hooks",
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
  updateHookSessionIndex(store, at, admission, (receipt.admission)?.statements?.[0]?.id);
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

const hookEventAdmissionInput = schemaFrom({
  $id: "agent-harness/harness-hook-event-admit/input",
  title: "HarnessHookEventAdmission",
  type: "object",
  required: ["harness", "payload"],
  properties: {
    harness: { type: "string", minLength: 1 },
    payload: { type: "object" },
  },
  additionalProperties: false,
});

/**
 * One node operation for one harness utterance. The host owns recognition of its
 * harness character and participation effects; this service owns the sole hook
 * envelope/arrival admission path. Recognition happens before any journal write.
 */
export function harnessHookEventAdmissionOperation({ binding, recognize, participate }) {
  if (typeof recognize !== "function" || typeof participate !== "function") {
    throw new TypeError("harness hook admission requires host recognition and participation");
  }
  return operation({
    verb: "harness-hook-event-admit",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Admit one event from the authenticated caller's harness session into this node.",
    description: "A named harness acts as its durable character. An authenticated account with a recognized office can participate with harness=mcp and its actual client session id; this does not attest an inference model. SessionStart admits participation and returns office and skill context; SessionEnd withdraws participation.",
    domain: hookEventAdmissionInput,
    effects: { class: "journal-write", replay: "idempotency-key", coordination: "coordination-free", deterministic: true, totality: "schema-bounded" },
    run: (input, _args, context) => {
      const subject = context?.invocation?.subject ?? "anonymous";
      const participant = recognize({ harness: input.harness, payload: input.payload, subject });
      const at = binding.now();
      const session = typeof input.payload.session_id === "string" ? input.payload.session_id : undefined;
      // A session's checkpoints (Stop, SubagentStop, SessionEnd) also admit its token usage from its
      // transcript whenever the node's binding can read one: the harness's own events are the monitor.
      const transcripts = typeof binding.statPathOrNull === "function" && typeof binding.readFileUtf8 === "function";
      appendHookEventAtRoot(binding.dataRoot, input.payload, {
        at,
        harness: input.harness,
        rootName: "@red-cup-engineering/metroplat",
        ...(transcripts && input.harness !== "mcp" ? { admitTokenUsage: true, statPathOrNull: binding.statPathOrNull, readFileUtf8: binding.readFileUtf8 } : {}),
        caller: Object.freeze({
          transport: "agent-hook-operation",
          actor: subject,
          ...(session === undefined ? {} : { session }),
        }),
      });
      return participate({ harness: input.harness, payload: input.payload, subject, participant, at }) ?? Object.freeze({});
    },
  });
}
