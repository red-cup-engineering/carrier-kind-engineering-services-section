import { parseLines, type JsonValue } from "../../lib/codecs/json/core.mts";
import { parseSseStream } from "../http/codec/sse/index.mts";
import {
  jsonUsage,
  tokenUsageCounts,
  tokenUsageSummary,
  type TokenUsageCounts,
  type TokenUsageEvent,
  type TokenUsageSummary,
} from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";

function objectRecord(value: unknown): Readonly<Record<string, JsonValue>> | undefined {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, JsonValue>>
    : undefined;
}

function numberField(record: Readonly<Record<string, JsonValue>> | undefined, key: string): number {
  const value = record?.[key];
  return typeof value === "number" ? value : 0;
}

function stringField(record: Readonly<Record<string, JsonValue>> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function usageCounts(usage: Readonly<Record<string, JsonValue>>): TokenUsageCounts {
  const inputTokens = numberField(usage, "input_tokens");
  const cacheCreationInputTokens = numberField(usage, "cache_creation_input_tokens");
  const cacheReadInputTokens = numberField(usage, "cache_read_input_tokens");
  const outputTokens = numberField(usage, "output_tokens");
  return tokenUsageCounts({
    inputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    outputTokens,
    totalTokens: inputTokens + cacheCreationInputTokens + cacheReadInputTokens + outputTokens,
  });
}

function usageHasTokens(usage: Readonly<Record<string, JsonValue>> | undefined): usage is Readonly<Record<string, JsonValue>> {
  return usage !== undefined
    && (
      numberField(usage, "input_tokens") > 0
      || numberField(usage, "cache_creation_input_tokens") > 0
      || numberField(usage, "cache_read_input_tokens") > 0
      || numberField(usage, "output_tokens") > 0
    );
}

function messageSessionId(message: Readonly<Record<string, JsonValue>> | undefined): string | undefined {
  const metadata = objectRecord(message?.["metadata"]);
  return stringField(metadata, "session") ?? stringField(metadata, "session_id") ?? stringField(metadata, "worker");
}

function usageEvent(input: {
  readonly source: string;
  readonly surface: string;
  readonly row: number;
  readonly usage: Readonly<Record<string, JsonValue>>;
  readonly usageKind: TokenUsageEvent["usageKind"];
  readonly sessionId?: string;
  readonly at?: string;
  readonly model?: string;
  readonly requestId?: string;
  readonly evidence: readonly string[];
}): TokenUsageEvent {
  const rawUsage = jsonUsage(input.usage, "Anthropic usage");
  return Object.freeze({
    kind: "metroplat.agent-session.token-usage-event" as const,
    provider: "anthropic" as const,
    surface: input.surface,
    ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
    source: input.source,
    row: input.row,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.model === undefined ? {} : { model: input.model }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    usageKind: input.usageKind,
    usage: usageCounts(input.usage),
    ...(rawUsage === undefined ? {} : { rawUsage }),
    evidence: input.evidence,
  });
}

export function anthropicMessageTokenUsage(
  messageInput: JsonValue,
  options: { readonly source?: string; readonly sessionId?: string; readonly requestId?: string; readonly at?: string } = {},
): TokenUsageSummary {
  const message = objectRecord(messageInput);
  const usage = objectRecord(message?.["usage"]);
  const requestId = options.requestId ?? stringField(message, "id");
  const source = options.source ?? `anthropic-messages:${requestId ?? "response"}`;
  const sessionId = options.sessionId ?? messageSessionId(message);
  const model = stringField(message, "model");
  const rawEvents = usageHasTokens(usage)
    ? [usageEvent({
      source,
      surface: "messages",
      row: 0,
      usage,
      usageKind: "turn",
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(options.at === undefined ? {} : { at: options.at }),
      ...(model === undefined ? {} : { model }),
      ...(requestId === undefined ? {} : { requestId }),
      evidence: Object.freeze([
        "surface:anthropic-messages",
        "message.usage",
        "cache_creation_input_tokens",
        "cache_read_input_tokens",
      ]),
    })]
    : [];
  return tokenUsageSummary({
    provider: "anthropic",
    surface: "messages",
    ...(sessionId === undefined ? {} : { sessionId }),
    source,
    rows: 1,
    rawEvents: Object.freeze(rawEvents),
    evidence: Object.freeze(["source:anthropic-messages-usage"]),
  });
}

function mergedStreamingUsage(events: readonly TokenUsageEvent[]): Readonly<Record<string, JsonValue>> | undefined {
  const usage = new Map<string, JsonValue>();
  for (const event of events) {
    const raw = objectRecord(event.rawUsage);
    if (raw === undefined) continue;
    for (const key of ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"] as const) {
      const value = raw[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) usage.set(key, Math.trunc(value));
    }
    const serverToolUse = raw["server_tool_use"];
    if (serverToolUse !== undefined) usage.set("server_tool_use", serverToolUse);
  }
  return usage.size === 0 ? undefined : Object.freeze(Object.fromEntries(usage));
}

export function anthropicMessageStreamTokenUsageOfContent(
  content: string,
  options: { readonly source?: string; readonly sessionId?: string; readonly requestId?: string; readonly at?: string } = {},
): TokenUsageSummary {
  const frames = parseSseStream(content);
  const source = options.source ?? "anthropic-messages-stream";
  let model: string | undefined;
  let requestId = options.requestId;
  let sessionId = options.sessionId;
  const cumulativeEvents: TokenUsageEvent[] = [];
  frames.forEach((frame, index) => {
    if (frame.data.trim().length === 0) return;
    const record = objectRecord(JSON.parse(frame.data) as JsonValue);
    if (record === undefined) return;
    const message = objectRecord(record["message"]);
    if (message !== undefined) {
      model = model ?? stringField(message, "model");
      requestId = requestId ?? stringField(message, "id");
      sessionId = sessionId ?? messageSessionId(message);
    }
    const usage = objectRecord(message?.["usage"]) ?? objectRecord(record["usage"]);
    if (!usageHasTokens(usage)) return;
    cumulativeEvents.push(usageEvent({
      source,
      surface: "messages-stream",
      row: index,
      usage,
      usageKind: "cumulative",
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(options.at === undefined ? {} : { at: options.at }),
      ...(model === undefined ? {} : { model }),
      ...(requestId === undefined ? {} : { requestId }),
      evidence: Object.freeze([
        `sse-event:${frame.event ?? "message"}`,
        record["type"] === "message_delta" ? "message_delta.usage:cumulative" : "message_start.message.usage",
      ]),
    }));
  });
  const finalUsage = mergedStreamingUsage(cumulativeEvents);
  const finalEvent = usageHasTokens(finalUsage)
    ? usageEvent({
      source,
      surface: "messages-stream",
      row: frames.length,
      usage: finalUsage,
      usageKind: "turn",
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(options.at === undefined ? {} : { at: options.at }),
      ...(model === undefined ? {} : { model }),
      ...(requestId === undefined ? {} : { requestId }),
      evidence: Object.freeze([
        `sse-frames:${frames.length}`,
        `usage-frames:${cumulativeEvents.length}`,
        "fold:anthropic-message-stream-cumulative-usage",
      ]),
    })
    : undefined;
  return tokenUsageSummary({
    provider: "anthropic",
    surface: "messages-stream",
    ...(sessionId === undefined ? {} : { sessionId }),
    source,
    rows: frames.length,
    rawEvents: Object.freeze([
      ...cumulativeEvents,
      ...(finalEvent === undefined ? [] : [finalEvent]),
    ]),
    evidence: Object.freeze(["source:anthropic-messages-stream-usage"]),
  });
}

function usageIdentity(row: Readonly<Record<string, JsonValue>>, message: Readonly<Record<string, JsonValue>>, usage: Readonly<Record<string, JsonValue>>): string {
  const requestId = stringField(row, "requestId");
  const messageId = stringField(message, "id");
  if (requestId !== undefined) return `request:${requestId}`;
  if (messageId !== undefined) return `message:${messageId}`;
  return JSON.stringify({
    model: stringField(message, "model"),
    timestamp: stringField(row, "timestamp"),
    input: numberField(usage, "input_tokens"),
    cacheCreation: numberField(usage, "cache_creation_input_tokens"),
    cacheRead: numberField(usage, "cache_read_input_tokens"),
    output: numberField(usage, "output_tokens"),
  });
}

export function claudeSessionTokenUsageOfContent(
  content: string,
  options: { readonly source?: string; readonly sessionId?: string } = {},
): TokenUsageSummary {
  const rows = Object.freeze(parseLines(content));
  const source = options.source ?? "claude-session";
  const sessionId = options.sessionId ?? rows
    .map((row) => stringField(objectRecord(row), "sessionId"))
    .find((value): value is string => value !== undefined);
  const seen = new Set<string>();
  const events: TokenUsageEvent[] = [];
  rows.forEach((row, index) => {
    const record = objectRecord(row);
    const message = objectRecord(record?.["message"]);
    const usage = objectRecord(message?.["usage"]);
    if (record === undefined || message === undefined || usage === undefined) return;
    const id = usageIdentity(record, message, usage);
    const duplicate = seen.has(id);
    seen.add(id);
    const rawUsage = jsonUsage(usage, "Claude Code assistant usage");
    const at = stringField(record, "timestamp");
    const model = stringField(message, "model");
    const requestId = stringField(record, "requestId");
    events.push(Object.freeze({
      ...usageEvent({
        source,
        surface: "claude-code",
        row: index,
        usage,
        usageKind: duplicate ? "duplicate" as const : "turn" as const,
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(at === undefined ? {} : { at }),
        ...(model === undefined ? {} : { model }),
        ...(requestId === undefined ? {} : { requestId }),
        evidence: Object.freeze([
          `row:${index}`,
          "message.usage",
          duplicate ? "duplicate-request" : "distinct-request",
        ]),
      }),
      ...(rawUsage === undefined ? {} : { rawUsage }),
    }));
  });
  return tokenUsageSummary({
    provider: "anthropic",
    surface: "claude-code",
    ...(sessionId === undefined ? {} : { sessionId }),
    source,
    rows: rows.length,
    rawEvents: Object.freeze(events),
    evidence: Object.freeze(["source:claude-code-message-usage"]),
  });
}
