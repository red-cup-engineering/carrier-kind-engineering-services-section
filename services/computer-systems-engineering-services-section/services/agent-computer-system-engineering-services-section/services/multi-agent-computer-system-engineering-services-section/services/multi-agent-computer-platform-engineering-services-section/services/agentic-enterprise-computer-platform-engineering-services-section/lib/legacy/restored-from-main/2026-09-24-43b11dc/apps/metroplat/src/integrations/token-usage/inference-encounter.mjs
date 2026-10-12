/** Token-usage accounting as a reading of admitted inference encounters. */

import { inferenceTranscriptFromEncounterReading } from "../../agents/inference/encounter.mjs";

import { tokenUsageCounts } from "@red-cup-engineering/computer-inference-engine/cost/token-usage/core";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";

/** Read final canonical usage without consulting a provider wire or client callback. */
export function tokenUsageEventFromInferenceEncounter(
  reading,
  options = {},
) {
  const transcript = inferenceTranscriptFromEncounterReading(reading);
  const outcome = transcript.outcome;
  if (outcome?.kind !== "metroplat.inference.result" || outcome.usage === undefined) return undefined;
  return Object.freeze({
    kind: "metroplat.agent-session.token-usage-event",
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
    usageKind: "turn",
    usage: tokenUsageCounts({
      inputTokens: outcome.usage.inputTokens,
      cachedInputTokens: outcome.usage.cachedInputTokens,
      cacheReadInputTokens: outcome.usage.cachedInputTokens,
      outputTokens: outcome.usage.outputTokens,
      reasoningOutputTokens: outcome.usage.reasoningOutputTokens,
      totalTokens: outcome.usage.totalTokens,
    }),
    rawUsage: requireJsonValue(outcome.usage, "inference encounter usage"),
    evidence: reading.frontier,
  });
}
