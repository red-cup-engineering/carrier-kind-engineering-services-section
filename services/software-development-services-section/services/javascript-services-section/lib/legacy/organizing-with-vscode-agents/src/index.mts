/**
 * @emsenn/organizing-with-vscode-agents
 *
 * The generic VS Code agent layer. It names the editor-side agent capabilities an
 * extension mounts (chat participants, language-model chat providers, tools, MCP
 * attachments) AND the provider-neutral cockpit/harness machinery that
 * provider-specific packages (Codex, Claude Code, …) specialize: the meet-or-beat
 * harness benchmark, harness adapters, the agentic-development habitat, the
 * cockpit carrier, readiness evaluation, and the VS Code extension manifest.
 */
export * from "./harness-benchmark.mjs";
export * from "./harness-adapter.mjs";
export * from "./agent-habitat.mjs";
export * from "./cockpit.mjs";
export * from "./cockpit-readiness.mjs";
export * from "./extension-manifest.mjs";
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
import type * as vscode from "vscode";

export const VsCodeAgentCapabilitySchema = {
  enum: [
    "chat-participant",
    "language-model-chat-provider",
    "language-model-tool",
    "mcp-server",
    "workspace-context",
  ],
} as const;

export type VsCodeAgentCapability = FromSchema<typeof VsCodeAgentCapabilitySchema>;

export const VsCodeAgentExtensionSchema = {
  $id: "organizing/agents/vscode/extension",
  type: "object",
  title: "VsCodeAgentExtension",
  required: ["id", "displayName", "capabilities", "activationEvents", "extensionDependencies"],
  properties: {
    id: { type: "string", minLength: 1 },
    displayName: { type: "string", minLength: 1 },
    capabilities: { type: "array", items: VsCodeAgentCapabilitySchema },
    activationEvents: { type: "array", items: { type: "string", minLength: 1 } },
    extensionDependencies: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export type VsCodeAgentExtension = Readonly<Omit<
  FromSchema<typeof VsCodeAgentExtensionSchema>,
  "capabilities" | "activationEvents" | "extensionDependencies"
> & {
  readonly capabilities: readonly VsCodeAgentCapability[];
  readonly activationEvents: readonly string[];
  readonly extensionDependencies: readonly string[];
}>;

export const vsCodeAgentExtensionCarrier = carrierFrom(VsCodeAgentExtensionSchema);

export const VsCodeLanguageModelProviderSchema = {
  $id: "organizing/agents/vscode/language-model-provider",
  type: "object",
  title: "VsCodeLanguageModelProvider",
  required: ["vendor", "displayName", "models"],
  properties: {
    vendor: { type: "string", minLength: 1 },
    displayName: { type: "string", minLength: 1 },
    models: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name", "family", "version", "maxInputTokens", "maxOutputTokens"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          family: { type: "string", minLength: 1 },
          version: { type: "string", minLength: 1 },
          maxInputTokens: { type: "number", minimum: 1 },
          maxOutputTokens: { type: "number", minimum: 1 },
          toolCalling: { type: "boolean" },
          imageInput: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export type VsCodeLanguageModelDescriptor = Readonly<
  Omit<FromSchema<typeof VsCodeLanguageModelProviderSchema>["models"][number], "toolCalling" | "imageInput"> & {
    readonly toolCalling?: boolean;
    readonly imageInput?: boolean;
  }
>;

export type VsCodeLanguageModelProvider = Readonly<Omit<
  FromSchema<typeof VsCodeLanguageModelProviderSchema>,
  "models"
> & {
  readonly models: readonly VsCodeLanguageModelDescriptor[];
}>;

export const vsCodeLanguageModelProviderCarrier = carrierFrom(VsCodeLanguageModelProviderSchema);

export const defaultVsCodeAgentExtension: VsCodeAgentExtension = Object.freeze({
  id: "561-group.vscode-agents",
  displayName: "561 Group VS Code Agents",
  capabilities: Object.freeze([
    "chat-participant",
    "language-model-chat-provider",
    "language-model-tool",
    "mcp-server",
    "workspace-context",
  ] as const),
  activationEvents: Object.freeze([
    "onChatParticipant:561",
    "onLanguageModelTool:561.readWorkspace",
  ]),
  extensionDependencies: Object.freeze([
    "github.copilot",
    "github.copilot-chat",
  ]),
});

export const defaultVsCodeLanguageModelProvider: VsCodeLanguageModelProvider = Object.freeze({
  vendor: "561-group",
  displayName: "561 Group Local Models",
  models: Object.freeze([
    Object.freeze({
      id: "ollama-qwen3-0.6b",
      name: "Ollama qwen3:0.6b",
      family: "qwen3",
      version: "0.6b",
      maxInputTokens: 4096,
      maxOutputTokens: 512,
      toolCalling: false,
      imageInput: false,
    }),
    Object.freeze({
      id: "foundry-local-qwen2.5-0.5b",
      name: "Foundry Local qwen2.5-0.5b",
      family: "qwen2.5",
      version: "0.5b",
      maxInputTokens: 4096,
      maxOutputTokens: 512,
      toolCalling: false,
      imageInput: false,
    }),
  ]),
});

export type VsCodeLanguageModelChatInformation = vscode.LanguageModelChatInformation;

export function toVsCodeLanguageModelChatInformation(
  provider: VsCodeLanguageModelProvider,
): readonly VsCodeLanguageModelChatInformation[] {
  return Object.freeze(provider.models.map((model) => {
    const capabilities = {
      ...(model.toolCalling === undefined ? {} : { toolCalling: model.toolCalling }),
      ...(model.imageInput === undefined ? {} : { imageInput: model.imageInput }),
    };

    return Object.freeze({
      id: model.id,
      name: model.name,
      family: model.family,
      version: model.version,
      maxInputTokens: model.maxInputTokens,
      maxOutputTokens: model.maxOutputTokens,
      capabilities: Object.freeze(capabilities),
    });
  }));
}

export function languageModelProviderContribution(provider: VsCodeLanguageModelProvider): Readonly<{
  languageModelChatProviders: readonly Readonly<{ vendor: string; displayName: string }>[];
}> {
  return Object.freeze({
    languageModelChatProviders: Object.freeze([
      Object.freeze({
        vendor: provider.vendor,
        displayName: provider.displayName,
      }),
    ]),
  });
}

export const vsCodeAgentCoreProviderUses: Readonly<Record<CoreLibraryId, string>> = Object.freeze({
  relating: "Expose VS Code commands, tools, and chat requests as typed, witnessable action boundaries.",
  communicating: "Project chat participant turns, diagnostics, editor selections, and tool results as messages.",
  knowing: "Bind workspace recall, symbol search, documents, and review notes to memory and research carriers.",
  playing: "Render editor-side strategies, alternatives, reviews, and user confirmations as interaction designs.",
  animating: "Read the extension-host agent as a perceive-act loop over workspace, terminal, MCP, and editor state.",
  socializing: "Coordinate human, Codex, Copilot, MCP tools, and language servers as observers in one field.",
  computing: "Classify runnable commands, tool availability, and model-provider limits as capability decisions.",
  gaming: "Represent tool-choice, review, and approval flows as playable arenas with settlement traces.",
  organizing: "Attach chat work to tasks, offices, work records, readiness gates, and handoff/adjudication state.",
});

export const vsCodeAgentCoreCapabilityBundle: AgentCoreCapabilityBundle = specializeCoreCapabilityBundle(
  "vscode-agents",
  "editor-agent-extension",
  vsCodeAgentCoreProviderUses,
);

export function realizeVsCodeAgentCore(
  input: Omit<AgentCoreRealizationInput, "provider">,
): AgentCoreRealization {
  return realizeAgentCore({
    provider: "vscode-agents",
    ...input,
  });
}

export const canonicalizeVsCodeAgentExtensionAction = action({
  verb: "organizing.agents.vscode.canonicalize-extension",
  description: "Canonicalize a VS Code agent extension capability carrier.",
  domain: vsCodeAgentExtensionCarrier,
  codomain: vsCodeAgentExtensionCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeVsCodeLanguageModelProviderAction = action({
  verb: "organizing.agents.vscode.canonicalize-language-model-provider",
  description: "Canonicalize a VS Code language-model chat provider carrier.",
  domain: vsCodeLanguageModelProviderCarrier,
  codomain: vsCodeLanguageModelProviderCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const actions = Object.freeze([
  canonicalizeVsCodeAgentExtensionAction,
  canonicalizeVsCodeLanguageModelProviderAction,
  canonicalizeAgentCoreCapabilityBundleAction,
]);
