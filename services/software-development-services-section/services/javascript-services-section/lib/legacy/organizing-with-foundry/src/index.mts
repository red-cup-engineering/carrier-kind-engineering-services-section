/**
 * @emsenn/organizing-with-foundry
 *
 * Microsoft Foundry has two useful surfaces for this repo: Azure-hosted
 * Foundry projects and Foundry Local. This package names both while keeping the
 * local path biased toward tiny models that can plausibly run on a small laptop.
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
} from "@emsenn/organizing-with-agents/capabilities";
import type { EndpointSpec } from "@emsenn/organizing-with-llm-agents/algebra";

export const FOUNDRY_PROJECT_ENDPOINT_ENV = "FOUNDRY_PROJECT_ENDPOINT";
export const FOUNDRY_CLOUD_DEFAULT_MODEL = "gpt-5-mini";
export const FOUNDRY_LOCAL_DEFAULT_MODEL = "qwen2.5-0.5b";

export const FoundrySurfaceSchema = { enum: ["foundry-cloud", "foundry-local"] } as const;

export type FoundrySurface = FromSchema<typeof FoundrySurfaceSchema>;

export const FoundryProjectSchema = {
  $id: "organizing/agents/foundry/project",
  type: "object",
  title: "FoundryProject",
  required: ["endpointEnv", "defaultModel", "sdkPackage", "credentialPackage"],
  properties: {
    endpointEnv: { type: "string", minLength: 1 },
    defaultModel: { type: "string", minLength: 1 },
    sdkPackage: { const: "@azure/ai-projects" },
    credentialPackage: { const: "@azure/identity" },
  },
  additionalProperties: false,
} as const;

export type FoundryProject = Readonly<FromSchema<typeof FoundryProjectSchema>>;

export const foundryProjectCarrier = carrierFrom(FoundryProjectSchema);

export const FoundryLocalConfigSchema = {
  $id: "organizing/agents/foundry/local-config",
  type: "object",
  title: "FoundryLocalConfig",
  required: ["appName", "defaultModel", "sdkPackage"],
  properties: {
    appName: { type: "string", minLength: 1 },
    logLevel: { enum: ["trace", "debug", "info", "warn", "error", "off"] },
    modelCacheDir: { type: "string", minLength: 1 },
    webUrl: { type: "string", minLength: 1 },
    defaultModel: { type: "string", minLength: 1 },
    sdkPackage: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export type FoundryLocalConfig = Readonly<FromSchema<typeof FoundryLocalConfigSchema>>;

export const foundryLocalConfigCarrier = carrierFrom(FoundryLocalConfigSchema);

export const FoundrySmallModelSchema = {
  $id: "organizing/agents/foundry/small-model",
  type: "object",
  title: "FoundrySmallModel",
  required: ["alias", "surface", "parameters", "task", "note"],
  properties: {
    alias: { type: "string", minLength: 1 },
    surface: FoundrySurfaceSchema,
    parameters: { type: "string", minLength: 1 },
    task: { type: "string", minLength: 1 },
    note: { type: "string" },
  },
  additionalProperties: false,
} as const;

export type FoundrySmallModel = Readonly<FromSchema<typeof FoundrySmallModelSchema>>;

export const foundrySmallModelCarrier = carrierFrom(FoundrySmallModelSchema);

export const defaultFoundryProject: FoundryProject = Object.freeze({
  endpointEnv: FOUNDRY_PROJECT_ENDPOINT_ENV,
  defaultModel: FOUNDRY_CLOUD_DEFAULT_MODEL,
  sdkPackage: "@azure/ai-projects",
  credentialPackage: "@azure/identity",
});

export const recommendedFoundrySmallModels: readonly FoundrySmallModel[] = Object.freeze([
  {
    alias: "qwen2.5-0.5b",
    surface: "foundry-local",
    parameters: "0.5B",
    task: "chat-completion",
    note: "Smallest Foundry Local chat default for first-run laptop checks.",
  },
  {
    alias: "phi-3.5-mini",
    surface: "foundry-local",
    parameters: "3.8B",
    task: "chat-completion",
    note: "Still small, but more useful when the machine can tolerate a few GB of model.",
  },
  {
    alias: FOUNDRY_CLOUD_DEFAULT_MODEL,
    surface: "foundry-cloud",
    parameters: "cloud",
    task: "responses",
    note: "Cloud fallback for Foundry projects when local inference is too slow or unavailable.",
  },
]);

export function foundryLocalSdkPackageForPlatform(platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? "foundry-local-sdk-winml" : "foundry-local-sdk";
}

export function foundryLocalConfig(input: Partial<FoundryLocalConfig> = {}): FoundryLocalConfig {
  return Object.freeze({
    appName: input.appName ?? "561-group-foundry-local",
    logLevel: input.logLevel ?? "info",
    defaultModel: input.defaultModel ?? FOUNDRY_LOCAL_DEFAULT_MODEL,
    sdkPackage: input.sdkPackage ?? foundryLocalSdkPackageForPlatform(),
    ...(input.modelCacheDir === undefined ? {} : { modelCacheDir: input.modelCacheDir }),
    ...(input.webUrl === undefined ? {} : { webUrl: input.webUrl }),
  });
}

export function foundryLocalOpenAiEndpoint(config: FoundryLocalConfig): EndpointSpec | null {
  if (config.webUrl === undefined) return null;
  return Object.freeze({
    id: "foundry-local",
    dialect: "openai",
    baseUrl: `${config.webUrl.replace(/\/+$/, "")}/v1`,
    defaultModel: config.defaultModel,
  });
}

export const foundryCoreProviderUses: Readonly<Record<CoreLibraryId, string>> = Object.freeze({
  relating: "Expose Foundry cloud and Foundry Local calls as witnessable endpoint, deployment, and invocation carriers.",
  communicating: "Use Foundry chat completions and hosted-agent messages as speech, listening, and channel evidence.",
  knowing: "Bind Foundry evaluation, trace, and dataset outputs to memory, research, and lesson carriers.",
  playing: "Use Foundry eval suites and prompt optimization as strategy interaction and adversarial design surfaces.",
  animating: "Realize hosted or local agents as managed perceive-act-goal loops with deployment state.",
  socializing: "Project multi-agent Foundry workflows, evaluators, and reviewers as observers in a social field.",
  computing: "Classify cloud versus local Foundry execution, quota, cost, and abstention as capability decisions.",
  gaming: "Use Foundry eval games and agent-vs-evaluator loops as arenas that can be settled.",
  organizing: "Connect deployments, eval results, and traces to work records, offices, governance, and adjudication.",
});

export const foundryCoreCapabilityBundle: AgentCoreCapabilityBundle = specializeCoreCapabilityBundle(
  "foundry",
  "cloud-and-local-agent-runtime",
  foundryCoreProviderUses,
);

export function realizeFoundryAgentCore(
  input: Omit<AgentCoreRealizationInput, "provider">,
): AgentCoreRealization {
  return realizeAgentCore({
    provider: "foundry",
    ...input,
  });
}

export const canonicalizeFoundryProjectAction = action({
  verb: "organizing.agents.foundry.canonicalize-project",
  description: "Canonicalize a Microsoft Foundry project SDK configuration carrier.",
  domain: foundryProjectCarrier,
  codomain: foundryProjectCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeFoundryLocalConfigAction = action({
  verb: "organizing.agents.foundry.canonicalize-local-config",
  description: "Canonicalize a Foundry Local SDK configuration carrier.",
  domain: foundryLocalConfigCarrier,
  codomain: foundryLocalConfigCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeFoundrySmallModelAction = action({
  verb: "organizing.agents.foundry.canonicalize-small-model",
  description: "Canonicalize a Microsoft Foundry small-model recommendation carrier.",
  domain: foundrySmallModelCarrier,
  codomain: foundrySmallModelCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const actions = Object.freeze([
  canonicalizeFoundryProjectAction,
  canonicalizeFoundryLocalConfigAction,
  canonicalizeFoundrySmallModelAction,
  canonicalizeAgentCoreCapabilityBundleAction,
]);
