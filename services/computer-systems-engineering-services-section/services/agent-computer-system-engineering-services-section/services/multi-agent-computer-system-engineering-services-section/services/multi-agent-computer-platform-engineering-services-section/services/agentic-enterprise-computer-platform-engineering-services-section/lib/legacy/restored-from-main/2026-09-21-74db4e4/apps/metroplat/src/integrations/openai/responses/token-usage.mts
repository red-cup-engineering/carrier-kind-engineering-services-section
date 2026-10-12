import { requireJsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { TokenUsageEvent, TokenUsageSummary } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import { tokenUsageCounts, tokenUsageSummary } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import type { OpenAIResponseUsage, OpenAIResponseWire, OpenAIResponseWireRequest } from "./schema.mts";

function usageDetailNumber(details: OpenAIResponseUsage["input_tokens_details"] | OpenAIResponseUsage["output_tokens_details"], key: string): number {
  if (details === undefined || details === null || typeof details !== "object" || Array.isArray(details)) return 0;
  const value = (details as Readonly<Record<string, unknown>>)[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function responseRequestSessionId(request: OpenAIResponseWireRequest | undefined): string | undefined {
  const metadata = request === undefined ? undefined : (request as unknown as Readonly<Record<string, unknown>>)["metadata"];
  if (metadata === undefined || metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const worker = (metadata as Readonly<Record<string, unknown>>)["worker"] ?? (metadata as Readonly<Record<string, unknown>>)["session"];
  return typeof worker === "string" && worker.trim().length > 0 ? worker.trim() : undefined;
}

export function openaiResponseTokenUsage(
  response: OpenAIResponseWire,
  options: {
    readonly request?: OpenAIResponseWireRequest;
    readonly source?: string;
    readonly sessionId?: string;
  } = {},
): TokenUsageSummary {
  const usage = response.usage;
  const source = options.source ?? `openai-responses:${response.id}`;
  const sessionId = options.sessionId ?? responseRequestSessionId(options.request);
  const at = new Date(response.created_at * 1000).toISOString();
  const rawEvents: TokenUsageEvent[] = usage === undefined
    ? []
    : [Object.freeze({
      kind: "metroplat.agent-session.token-usage-event" as const,
      provider: "openai" as const,
      surface: "responses",
      ...(sessionId === undefined ? {} : { sessionId }),
      source,
      row: 0,
      at,
      model: response.model,
      requestId: response.id,
      usageKind: "turn" as const,
      usage: tokenUsageCounts({
        inputTokens: usage.input_tokens,
        cachedInputTokens: usageDetailNumber(usage.input_tokens_details, "cached_tokens"),
        outputTokens: usage.output_tokens,
        reasoningOutputTokens: usageDetailNumber(usage.output_tokens_details, "reasoning_tokens"),
        totalTokens: usage.total_tokens,
      }),
      rawUsage: requireJsonValue(JSON.parse(JSON.stringify(usage)), "OpenAI Responses usage"),
      evidence: Object.freeze([
        "surface:openai-responses",
        "response.usage",
        "input_tokens_details.cached_tokens",
        "output_tokens_details.reasoning_tokens",
      ]),
    })];
  return tokenUsageSummary({
    provider: "openai",
    surface: "responses",
    ...(sessionId === undefined ? {} : { sessionId }),
    source,
    rows: 1,
    rawEvents: Object.freeze(rawEvents),
    evidence: Object.freeze(["source:openai-responses-usage"]),
  });
}
