/** Legacy deployment configuration for the retired MetroPlat HTTP process. */
import { selectInferenceSource } from "@red-cup-engineering/computer-inference-engine/dispatch/source-selection";
import { processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";

export const METROPLAT_INFERENCE_SOURCE_ENV = "METROPLAT_INFERENCE_SOURCE";
export const METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV = "METROPLAT_INFERENCE_MARKET_AGENT_CARD";

export function infographInferenceSource({ env, now, fetch, descriptors }) {
  const selection = processEnvValue(METROPLAT_INFERENCE_SOURCE_ENV, env);
  if (selection !== undefined && selection.trim().length === 0) throw new TypeError(METROPLAT_INFERENCE_SOURCE_ENV + " is required");
  const marketAgentCard = processEnvValue(METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV, env);
  if (selection === "inference-work-lot.market" && (!marketAgentCard || marketAgentCard.trim().length === 0)) {
    throw new TypeError(METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV + " is required");
  }
  return selectInferenceSource({
    selection, env, now, fetch, descriptors,
    market: {
      agentUrl: marketAgentCard,
      desiredUse: "metroplat-production-assistance",
      zeroCashOnly: true,
      agentBounds: Object.freeze({
        maximumRequests: 8,
        maximumToolCalls: 8,
        maximumOutputTokens: 8192,
        maximumDepth: 2,
        maximumTokensPerRequest: 1024,
        maximumToolRounds: 4,
      }),
    },
  });
}
