/** OpenAI-compatible transport binding for an admitted free-cloud route. */
import type {
  FreeCloudAdmissionOutcome,
  FreeCloudRoute,
} from "../../agents/inference/free-cloud-routing.mts";
import type { InferenceCall } from "../../agents/inference/model.mts";
import type { InferenceSourceOptions } from "../../agents/inference/source.mts";
import { requireJsonValue, type JsonRecord } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  processEnvironment,
  processEnvValue,
  type ProcessEnvironment,
} from "@red-cup-engineering/node-process-services-section";
import { openAIChatInferenceSource } from "./inference-client.mts";
import { OPENAI_API_KEY_ENV, OPENAI_BASE_URL_ENV } from "./service.mts";

const CANONICAL_WIRE_FIELDS = new Set([
  "model",
  "messages",
  "tools",
  "response_format",
  "max_tokens",
  "max_completion_tokens",
  "temperature",
  "top_p",
  "stop",
  "user",
  "stream",
  "stream_options",
]);

export interface OpenAICompatibleFreeCloudRouteOptions {
  readonly id: string;
  readonly model: string;
  readonly baseUrl: string;
  /** Name only. The credential value remains in this adapter's closure. */
  readonly apiKeyEnvironmentVariable: string;
  readonly environment?: ProcessEnvironment;
  readonly fetch?: typeof fetch;
  readonly now?: () => string;
  readonly timeoutMs?: number;
  /** Policy-owned vendor fields, such as a provider-side zero-price ceiling. */
  /** Mandatory provider-native billing guard applied only at wire encoding. */
  readonly requestExtensions: JsonRecord;
  readonly admit: (
    call: InferenceCall,
    options?: InferenceSourceOptions,
  ) => FreeCloudAdmissionOutcome | Promise<FreeCloudAdmissionOutcome>;
}

function policyExtensions(input: JsonRecord): JsonRecord {
  const extensions = input;
  requireJsonValue(extensions, "OpenAI-compatible free-cloud request extensions");
  if (Object.keys(extensions).length === 0) {
    throw new TypeError("OpenAI-compatible free-cloud route requires a provider-native billing guard");
  }
  for (const key of Object.keys(extensions)) {
    if (CANONICAL_WIRE_FIELDS.has(key)) {
      throw new TypeError(`free-cloud request policy cannot override canonical OpenAI field ${key}`);
    }
  }
  return Object.freeze({ ...extensions });
}

/**
 * Bind one provider profile to the generic OpenAI-compatible source without
 * exposing its secret or weakening the policy-owned request overlay.
 */
export function openAICompatibleFreeCloudRoute(options: OpenAICompatibleFreeCloudRouteOptions): FreeCloudRoute {
  if (options.id.trim().length === 0) throw new TypeError("OpenAI-compatible free-cloud route id must be non-empty");
  if (options.model.trim().length === 0) throw new TypeError("OpenAI-compatible free-cloud model must be non-empty");
  if (options.baseUrl.trim().length === 0) throw new TypeError("OpenAI-compatible free-cloud base URL must be non-empty");
  if (options.apiKeyEnvironmentVariable.trim().length === 0) throw new TypeError("OpenAI-compatible API key environment variable must be non-empty");
  const environment = options.environment ?? processEnvironment();
  const adapterEnvironment: ProcessEnvironment = Object.freeze({
    [OPENAI_BASE_URL_ENV]: options.baseUrl,
    [OPENAI_API_KEY_ENV]: processEnvValue(options.apiKeyEnvironmentVariable, environment),
  });
  const extensions = policyExtensions(options.requestExtensions);
  const source = openAIChatInferenceSource({
    env: adapterEnvironment,
    requestExtensions: extensions,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  return Object.freeze({
    id: options.id,
    model: options.model,
    admit: options.admit,
    source: (call: InferenceCall, callOptions?: InferenceSourceOptions) => source(call, callOptions),
  });
}
