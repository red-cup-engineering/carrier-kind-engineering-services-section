import { type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { parseLines } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/services/jsonl-services-section/src/index.mjs";
import type { TokenUsageCounts, TokenUsageEvent, TokenUsageSummary } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import {
  jsonUsage,
  tokenUsageCounts,
  tokenUsageSummary,
} from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import { codexSessionIdFromEvent } from "./codec.mts";

function objectRecord(value: JsonValue | undefined): Readonly<Record<string, JsonValue>> | undefined {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, JsonValue>>
    : undefined;
}

function numberField(record: Readonly<Record<string, JsonValue>> | undefined, key: string): number {
  const value = record?.[key];
  return typeof value === "number" ? value : 0;
}

function usageCounts(record: Readonly<Record<string, JsonValue>> | undefined): TokenUsageCounts {
  return tokenUsageCounts({
    inputTokens: numberField(record, "input_tokens"),
    cachedInputTokens: numberField(record, "cached_input_tokens"),
    outputTokens: numberField(record, "output_tokens"),
    reasoningOutputTokens: numberField(record, "reasoning_output_tokens"),
    totalTokens: numberField(record, "total_tokens"),
  });
}

function sameUsage(left: TokenUsageCounts | undefined, right: TokenUsageCounts): boolean {
  return left !== undefined
    && left.inputTokens === right.inputTokens
    && left.cachedInputTokens === right.cachedInputTokens
    && left.outputTokens === right.outputTokens
    && left.reasoningOutputTokens === right.reasoningOutputTokens
    && left.totalTokens === right.totalTokens;
}

function stringField(record: Readonly<Record<string, JsonValue>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function codexSessionTokenUsageOfContent(
  content: string,
  options: { readonly source?: string; readonly sessionId?: string } = {},
): TokenUsageSummary {
  const rows = Object.freeze(parseLines(content));
  const sessionId = options.sessionId ?? rows.map(codexSessionIdFromEvent).find((value): value is string => value !== undefined);
  const source = options.source ?? "codex-session";
  const events: TokenUsageEvent[] = [];
  let lastCumulative: TokenUsageCounts | undefined;
  let modelContextWindow: number | undefined;
  rows.forEach((row, index) => {
    const event = objectRecord(row);
    if (event === undefined) return;
    const payload = objectRecord(event["payload"]);
    if (payload?.["type"] !== "token_count") return;
    const at = stringField(event, "timestamp");
    const info = objectRecord(payload["info"]);
    const rateLimits = jsonUsage(payload["rate_limits"], "Codex token-count rate limits");
    if (info === undefined) {
      events.push(Object.freeze({
        kind: "metroplat.agent-session.token-usage-event" as const,
        provider: "openai" as const,
        surface: "codex",
        ...(sessionId === undefined ? {} : { sessionId }),
        source,
        row: index,
        ...(at === undefined ? {} : { at }),
        usageKind: "rate-limit" as const,
        usage: tokenUsageCounts({}),
        ...(rateLimits === undefined ? {} : { rateLimits }),
        evidence: Object.freeze([`row:${index}`, "payload.type:token_count", "info:null"]),
      }));
      return;
    }
    const total = usageCounts(objectRecord(info["total_token_usage"]));
    const last = usageCounts(objectRecord(info["last_token_usage"]));
    const contextWindow = info["model_context_window"];
    if (typeof contextWindow === "number") modelContextWindow = Math.trunc(contextWindow);
    const rawUsage = jsonUsage(info, "Codex token-count info");
    events.push(Object.freeze({
      kind: "metroplat.agent-session.token-usage-event" as const,
      provider: "openai" as const,
      surface: "codex",
      ...(sessionId === undefined ? {} : { sessionId }),
      source,
      row: index,
      ...(at === undefined ? {} : { at }),
      usageKind: "cumulative" as const,
      usage: total,
      ...(rawUsage === undefined ? {} : { rawUsage }),
      ...(rateLimits === undefined ? {} : { rateLimits }),
      evidence: Object.freeze([`row:${index}`, "payload.type:token_count", "usage:total_token_usage"]),
    }));
    events.push(Object.freeze({
      kind: "metroplat.agent-session.token-usage-event" as const,
      provider: "openai" as const,
      surface: "codex",
      ...(sessionId === undefined ? {} : { sessionId }),
      source,
      row: index,
      ...(at === undefined ? {} : { at }),
      usageKind: sameUsage(lastCumulative, total) ? "duplicate" as const : "turn" as const,
      usage: last,
      ...(rawUsage === undefined ? {} : { rawUsage }),
      ...(rateLimits === undefined ? {} : { rateLimits }),
      evidence: Object.freeze([`row:${index}`, "payload.type:token_count", "usage:last_token_usage"]),
    }));
    lastCumulative = total;
  });
  const cumulative = [...events].reverse().find((event) => event.usageKind === "cumulative")?.usage;
  return tokenUsageSummary({
    provider: "openai",
    surface: "codex",
    ...(sessionId === undefined ? {} : { sessionId }),
    source,
    rows: rows.length,
    ...(cumulative === undefined ? {} : { cumulative }),
    ...(modelContextWindow === undefined ? {} : { modelContextWindow }),
    rawEvents: Object.freeze(events),
    evidence: Object.freeze(["source:codex-jsonl-token-count"]),
  });
}
