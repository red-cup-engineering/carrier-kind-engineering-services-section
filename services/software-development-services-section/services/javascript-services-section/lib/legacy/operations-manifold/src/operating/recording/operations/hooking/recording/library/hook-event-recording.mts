import { canonical, type JsonValue } from "@emsenn/relating/writing";

import { hash, hookPayload, isRecord, jsonValue, optionalText, stringField } from "../../../../../../records.mts";
import { harnessIdentity, harnessTrace } from "../../../../../../harness.mts";
import { byteLengthOfJson, estimateTokensFromBytes, hookBudgetMetrics } from "../../../metering/context/library/context-budget.mts";
import type { OperationRecordParams } from "../../../recording/library/operation-recording.mts";

export type HookEventRecordParams = Readonly<{
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

export function hookEventOperationRecordParams(params: HookEventRecordParams): OperationRecordParams {
  const payload = hookPayload(params);
  const identity = harnessIdentity({ harness: params.harness, payload });
  const budgetMetrics = hookBudgetMetrics(payload, optionalText(params.payload ?? params.stdin));
  const hookEventName = stringField(payload, "hook_event_name") ?? optionalText(params.hook_event_name ?? params.event) ?? "HookEvent";
  const sessionId = stringField(payload, "session_id") ?? optionalText(params.session_id) ?? "unknown-session";
  const transcriptPath = stringField(payload, "transcript_path") ?? optionalText(params.transcript_path);
  const cwd = stringField(payload, "cwd") ?? optionalText(params.cwd);
  const paths = Object.freeze([
    ...(transcriptPath === null ? [] : [transcriptPath]),
    ...(cwd === null ? [] : [cwd]),
  ]);
  return Object.freeze({
    kind: "record-hook-event",
    trace: harnessTrace(identity, sessionId),
    subject: `${identity.harness}.session:${sessionId}`,
    predicate: "operations-manifold.operation.received-record-hook-event",
    object: hookEventName,
    tool: `${identity.tracePrefix}.${hookEventName}`,
    paths,
    estimatedTokens: budgetMetrics.estimatedTokens,
    inputBytes: budgetMetrics.inputBytes,
    outputBytes: budgetMetrics.outputBytes,
    budgetLimitTokens: budgetMetrics.budgetLimitTokens,
    agent: identity.agent,
    source: optionalText(params.source) ?? `${identity.harness}.hook`,
    evidence: paths,
    note: canonical(jsonValue({
      hook_event_name: hookEventName,
      session_id: sessionId,
      ...(transcriptPath === null ? {} : { transcript_path: transcriptPath }),
      ...(cwd === null ? {} : { cwd }),
      context_budget: {
        estimated_tokens: budgetMetrics.estimatedTokens,
        input_bytes: budgetMetrics.inputBytes,
        output_bytes: budgetMetrics.outputBytes,
        total_bytes: budgetMetrics.totalBytes,
        budget_limit_tokens: budgetMetrics.budgetLimitTokens,
        band: budgetMetrics.budgetBand,
        warnings: budgetMetrics.budgetWarnings,
      },
      payload: compactHookPayload(payload),
    })),
  });
}

function compactHookPayload(payload: Readonly<Record<string, JsonValue>>): JsonValue {
  const bytes = byteLengthOfJson(payload as unknown as JsonValue);
  return jsonValue({
    kind: "operations-manifold.hook.payload-summary",
    keys: Object.keys(payload).sort(),
    bytes,
    estimatedTokens: estimateTokensFromBytes(bytes),
    sha256Prefix: hash(payload).slice(0, 16),
    scalars: scalarPayloadFields(payload),
    prompts: compactNamedTextFields(payload, ["prompt", "user_prompt", "message", "text"], 480),
    toolInput: compactPayloadField(payload["tool_input"], "tool_input"),
    toolResponse: compactPayloadField(payload["tool_response"], "tool_response", 640),
  });
}

function scalarPayloadFields(payload: Readonly<Record<string, JsonValue>>): JsonValue {
  const names = [
    "hook_event_name",
    "session_id",
    "cwd",
    "transcript_path",
    "tool_name",
    "tool_use_id",
    "model",
    "permission_mode",
    "harness",
    "source",
  ];
  return jsonValue(Object.fromEntries(names.flatMap((name) => {
    const value = payload[name];
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? [[name, value]]
      : [];
  })));
}

function compactNamedTextFields(payload: Readonly<Record<string, JsonValue>>, names: readonly string[], maxChars: number): JsonValue {
  return jsonValue(Object.fromEntries(names.flatMap((name) => {
    const value = payload[name];
    return typeof value === "string" ? [[name, compactText(value, maxChars)]] : [];
  })));
}

function compactPayloadField(value: JsonValue | undefined, field: string, maxChars = 960): JsonValue | null {
  if (value === undefined) return null;
  const bytes = byteLengthOfJson(value);
  const base = {
    kind: "operations-manifold.hook.payload-field-summary",
    field,
    type: Array.isArray(value) ? "array" : value === null ? "null" : typeof value,
    bytes,
    estimatedTokens: estimateTokensFromBytes(bytes),
    sha256Prefix: hash(value).slice(0, 16),
  };
  if (typeof value === "string") {
    return jsonValue({
      ...base,
      text: compactText(value, maxChars),
    });
  }
  if (isRecord(value)) {
    return jsonValue({
      ...base,
      keys: Object.keys(value).sort(),
      scalars: scalarObjectPreview(value),
      textFields: compactNamedTextFields(value, Object.keys(value), Math.min(maxChars, 360)),
    });
  }
  return jsonValue(base);
}

function scalarObjectPreview(value: Readonly<Record<string, JsonValue>>): JsonValue {
  return jsonValue(Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (typeof item === "string") return [[key, compactText(item, 220)]];
    return typeof item === "number" || typeof item === "boolean" || item === null ? [[key, item]] : [];
  }).slice(0, 24)));
}

function compactText(value: string, maxChars: number): JsonValue {
  if (value.length <= maxChars) return value;
  return {
    kind: "operations-manifold.hook.text-summary",
    chars: value.length,
    bytes: Buffer.byteLength(value, "utf8"),
    estimatedTokens: estimateTokensFromBytes(Buffer.byteLength(value, "utf8")),
    sha256Prefix: hash(value).slice(0, 16),
    preview: value.slice(0, Math.max(0, maxChars - 1)),
  };
}
