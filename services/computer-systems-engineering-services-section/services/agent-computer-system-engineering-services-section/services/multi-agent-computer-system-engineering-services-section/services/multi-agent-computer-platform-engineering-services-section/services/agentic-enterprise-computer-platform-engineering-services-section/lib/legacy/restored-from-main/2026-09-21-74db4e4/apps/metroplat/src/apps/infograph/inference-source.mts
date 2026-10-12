/** Explicit production inference-source selection for the Infograph operation host. */
import type { InferenceSource } from "../../agents/inference/source.mts";
import { inferenceWorkLotSource } from "../../integrations/inference-work-lot/index.mts";
import { openAIChatInferenceSource } from "../../integrations/openai/inference-client.mts";
import { processEnvValue, type ProcessEnvironment } from "@red-cup-engineering/node-process-services-section";

export const METROPLAT_INFERENCE_SOURCE_ENV = "METROPLAT_INFERENCE_SOURCE";
export const METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV = "METROPLAT_INFERENCE_MARKET_AGENT_CARD";

export interface InfographInferenceSourceSelection {
  readonly provider: "openai.chat-completions" | "inference-work-lot.market";
  readonly source: InferenceSource;
}

export interface InfographInferenceSourceOptions {
  readonly env: ProcessEnvironment;
  readonly now?: () => string;
}

function configured(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) throw new TypeError(`${name} is required`);
  return value.trim();
}

/**
 * Keep the existing OpenAI-compatible source as the default. Market routing is
 * an explicit deployment choice and never becomes an implicit fallback path.
 */
export function infographInferenceSource(options: InfographInferenceSourceOptions): InfographInferenceSourceSelection {
  const env = options.env;
  const configuredSelection = processEnvValue(METROPLAT_INFERENCE_SOURCE_ENV, env);
  const selection = configuredSelection === undefined
    ? "openai.chat-completions"
    : configured(configuredSelection, METROPLAT_INFERENCE_SOURCE_ENV);
  if (selection === "openai.chat-completions") {
    return Object.freeze({
      provider: "openai.chat-completions" as const,
      source: openAIChatInferenceSource({ env, ...(options.now === undefined ? {} : { now: options.now }) }),
    });
  }
  if (selection !== "inference-work-lot.market") {
    throw new TypeError(`${METROPLAT_INFERENCE_SOURCE_ENV}: unsupported inference source ${JSON.stringify(selection)}`);
  }
  const agentUrl = configured(processEnvValue(METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV, env), METROPLAT_INFERENCE_MARKET_AGENT_CARD_ENV);
  return Object.freeze({
    provider: "inference-work-lot.market" as const,
    source: inferenceWorkLotSource({
      agentUrl,
      desiredUse: "metroplat-production-assistance",
      purpose: "bounded natural-language inference for MetroPlat operations",
      zeroCashOnly: true,
      agentBounds: Object.freeze({
        maximumRequests: 8,
        maximumToolCalls: 8,
        maximumOutputTokens: 8192,
        maximumDepth: 2,
        maximumTokensPerRequest: 1024,
        maximumToolRounds: 4,
      }),
      ...(options.now === undefined ? {} : { now: options.now }),
    }),
  });
}
