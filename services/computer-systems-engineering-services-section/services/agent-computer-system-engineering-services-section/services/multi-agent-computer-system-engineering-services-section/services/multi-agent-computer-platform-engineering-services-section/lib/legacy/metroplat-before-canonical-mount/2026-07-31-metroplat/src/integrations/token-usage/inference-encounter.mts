/** Token-usage accounting as a reading of admitted inference encounters. */
import type { EncounterReading } from "../../encounter/index.mts";
import { inferenceTranscriptFromEncounterReading } from "../../../../../../src/agents/inference/index.mts";
import { tokenUsageCounts, type JsonValue as TokenJsonValue, type TokenUsageEvent, type TokenUsageProvider } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import { requireJsonValue } from "../../lib/codecs/json/core.mts";

export interface InferenceEncounterUsageOptions {
  readonly provider?: TokenUsageProvider;
  readonly surface?: string;
  readonly source?: string;
  readonly agentId?: string;
}

/** Read final canonical usage without consulting a provider wire or client callback. */
export function tokenUsageEventFromInferenceEncounter(
  reading: EncounterReading,
  options: InferenceEncounterUsageOptions = {},
): TokenUsageEvent | undefined {
  const transcript = inferenceTranscriptFromEncounterReading(reading);
  const outcome = transcript.outcome;
  if (outcome?.kind !== "metroplat.inference.result" || outcome.usage === undefined) return undefined;
  return Object.freeze({
    kind: "metroplat.agent-session.token-usage-event" as const,
    provider: options.provider ?? "inference",
    resourceKind: "llm-token",
    unit: "token",
    ...(options.agentId === undefined ? {} : { agentId: options.agentId }),
    surface: options.surface ?? "encounter",
    sessionId: reading.run,
    source: options.source ?? `encounter:${reading.run}`,
    row: 0,
    at: outcome.observedAt,
    model: outcome.model,
    requestId: outcome.call,
    usageKind: "turn" as const,
    usage: tokenUsageCounts({
      inputTokens: outcome.usage.inputTokens,
      cachedInputTokens: outcome.usage.cachedInputTokens,
      cacheReadInputTokens: outcome.usage.cachedInputTokens,
      outputTokens: outcome.usage.outputTokens,
      reasoningOutputTokens: outcome.usage.reasoningOutputTokens,
      totalTokens: outcome.usage.totalTokens,
    }),
    rawUsage: requireJsonValue(outcome.usage, "inference encounter usage") as unknown as TokenJsonValue,
    evidence: reading.frontier,
  });
}
