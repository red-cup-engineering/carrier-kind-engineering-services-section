/**
 * @red-cup-engineering/organizing-with-ollama
 *
 * Local-first model work for small machines. Ollama also exposes an
 * OpenAI-compatible endpoint, but this package keeps the native Ollama host and
 * tiny model defaults visible so callers do not accidentally select a large
 * cloud-style model for a laptop.
 */
import { action, carrierFrom, tm, type FromSchema } from "@emsenn/relating";
import {
  canonicalizeAgentCoreCapabilityBundleAction,
  realizeAgentCore,
  specializeCoreCapabilityBundle,
  type AgentCoreCapabilityBundle,
  type AgentCoreRealization,
  type AgentCoreRealizationInput,
  type CoreLibraryId,
} from "@red-cup-engineering/organizing-with-agents/capabilities";
import type { ChatMessage, EndpointSpec, InferenceRequest } from "@red-cup-engineering/organizing-with-llm-agents/algebra";

export const OLLAMA_DEFAULT_HOST = "http://127.0.0.1:11434";
export const OLLAMA_OPENAI_BASE_URL = `${OLLAMA_DEFAULT_HOST}/v1`;
export const OLLAMA_TINY_DEFAULT_MODEL = "qwen3:0.6b";

export const OLLAMA_OPENAI_ENDPOINT: EndpointSpec = Object.freeze({
  id: "ollama",
  dialect: "openai",
  baseUrl: OLLAMA_OPENAI_BASE_URL,
  defaultModel: OLLAMA_TINY_DEFAULT_MODEL,
});

export const OllamaModelPurposeSchema = { enum: ["chat", "code", "embedding", "audio"] } as const;

export type OllamaModelPurpose = FromSchema<typeof OllamaModelPurposeSchema>;

export const OllamaSmallModelSchema = {
  $id: "organizing/agents/ollama/small-model",
  type: "object",
  title: "OllamaSmallModel",
  required: ["model", "parameters", "purposes", "note"],
  properties: {
    model: { type: "string", minLength: 1 },
    parameters: { type: "string", minLength: 1 },
    approximateDiskMb: { type: "number", minimum: 0 },
    purposes: { type: "array", items: OllamaModelPurposeSchema },
    note: { type: "string" },
  },
  additionalProperties: false,
} as const;

export type OllamaSmallModel = Readonly<Omit<FromSchema<typeof OllamaSmallModelSchema>, "purposes"> & {
  readonly purposes: readonly OllamaModelPurpose[];
}>;

export const ollamaSmallModelCarrier = carrierFrom(OllamaSmallModelSchema);

export const OllamaHostSchema = {
  $id: "organizing/agents/ollama/host",
  type: "object",
  title: "OllamaHost",
  required: ["host", "openaiBaseUrl", "defaultModel", "endpoint"],
  properties: {
    host: { type: "string", minLength: 1 },
    openaiBaseUrl: { type: "string", minLength: 1 },
    defaultModel: { type: "string", minLength: 1 },
    endpoint: {
      type: "object",
      required: ["id", "dialect", "baseUrl", "defaultModel"],
      properties: {
        id: { type: "string", minLength: 1 },
        dialect: { const: "openai" },
        baseUrl: { type: "string", minLength: 1 },
        defaultModel: { type: "string", minLength: 1 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export type OllamaHost = Readonly<FromSchema<typeof OllamaHostSchema>>;

export const ollamaHostCarrier = carrierFrom(OllamaHostSchema);

export const recommendedOllamaSmallModels: readonly OllamaSmallModel[] = Object.freeze([
  {
    model: "qwen3:0.6b",
    parameters: "0.6B",
    purposes: Object.freeze(["chat", "code"] as const),
    note: "Smallest Qwen3-class default for constrained local chat and lightweight coding tasks.",
  },
  {
    model: "gemma3:1b",
    parameters: "1B",
    approximateDiskMb: 815,
    purposes: Object.freeze(["chat"] as const),
    note: "Compact Gemma 3 option when multilingual chat matters more than raw coding strength.",
  },
  {
    model: "tinyllama:1.1b",
    parameters: "1.1B",
    approximateDiskMb: 638,
    purposes: Object.freeze(["chat"] as const),
    note: "Very small fallback model for smoke tests and offline demos.",
  },
]);

export function ollamaHost(input: Partial<OllamaHost> = {}): OllamaHost {
  const host = input.host ?? OLLAMA_DEFAULT_HOST;
  const openaiBaseUrl = input.openaiBaseUrl ?? `${host.replace(/\/+$/, "")}/v1`;
  const defaultModel = input.defaultModel ?? OLLAMA_TINY_DEFAULT_MODEL;
  return Object.freeze({
    host,
    openaiBaseUrl,
    defaultModel,
    endpoint: Object.freeze({
      id: input.endpoint?.id ?? "ollama",
      dialect: "openai" as const,
      baseUrl: input.endpoint?.baseUrl ?? openaiBaseUrl,
      defaultModel: input.endpoint?.defaultModel ?? defaultModel,
    }),
  });
}

export type OllamaNativeMessage = Readonly<{
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}>;

export type OllamaNativeChatRequest = Readonly<{
  host: string;
  model: string;
  messages: readonly OllamaNativeMessage[];
  stream: false;
  options?: Readonly<{
    temperature?: number;
    num_predict?: number;
  }>;
}>;

export function toOllamaMessage(message: ChatMessage): OllamaNativeMessage {
  return Object.freeze({
    role: message.role,
    content: message.content,
  });
}

export function toOllamaNativeChatRequest(request: InferenceRequest): OllamaNativeChatRequest {
  const options: { temperature?: number; num_predict?: number } = {};
  if (request.temperature !== undefined) options.temperature = request.temperature;
  if (request.maxTokens !== undefined) options.num_predict = request.maxTokens;

  return Object.freeze({
    host: request.endpoint.baseUrl.replace(/\/v1\/?$/, ""),
    model: request.model,
    messages: Object.freeze(request.messages.map(toOllamaMessage)),
    stream: false,
    ...(Object.keys(options).length === 0 ? {} : { options: Object.freeze(options) }),
  });
}

export const ollamaCoreProviderUses: Readonly<Record<CoreLibraryId, string>> = Object.freeze({
  relating: "Expose the local Ollama daemon as a witnessable local action boundary with endpoint and model carriers.",
  communicating: "Turn local prompts, replies, and tool-observation summaries into message and common-ground carriers.",
  knowing: "Use a small local model for private recall, summarization, lesson extraction, and draft research notes.",
  playing: "Run inexpensive prompt/counter-prompt strategy trials on tiny models before spending cloud budget.",
  animating: "Host a local perceive-act loop for smoke tests and offline agent runs on this laptop.",
  socializing: "Represent multiple local model personas or review passes as observers, while keeping consensus lightweight.",
  computing: "Classify Ollama as low-cost local compute with strict context/output ceilings and possible abstention.",
  gaming: "Exercise small interaction arenas locally, especially role-played evaluator/opponent turns.",
  organizing: "Attach local inference evidence to work records without requiring network or cloud credentials.",
});

export const ollamaCoreCapabilityBundle: AgentCoreCapabilityBundle = specializeCoreCapabilityBundle(
  "ollama",
  "local-llm",
  ollamaCoreProviderUses,
);

export function realizeOllamaAgentCore(
  input: Omit<AgentCoreRealizationInput, "provider">,
): AgentCoreRealization {
  return realizeAgentCore({
    provider: "ollama",
    ...input,
  });
}

export const canonicalizeOllamaHostAction = action({
  verb: "organizing.agents.ollama.canonicalize-host",
  description: "Canonicalize the local Ollama host and OpenAI-compatible endpoint carrier.",
  domain: ollamaHostCarrier,
  codomain: ollamaHostCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeOllamaSmallModelAction = action({
  verb: "organizing.agents.ollama.canonicalize-small-model",
  description: "Canonicalize an Ollama small-model recommendation carrier.",
  domain: ollamaSmallModelCarrier,
  codomain: ollamaSmallModelCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const actions = Object.freeze([
  canonicalizeOllamaHostAction,
  canonicalizeOllamaSmallModelAction,
  canonicalizeAgentCoreCapabilityBundleAction,
]);
