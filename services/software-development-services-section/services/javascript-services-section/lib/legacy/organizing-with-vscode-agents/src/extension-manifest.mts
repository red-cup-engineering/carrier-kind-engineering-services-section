/**
 * VS Code extension contribution manifest for an agent cockpit. Projects a
 * {@link VsCodeAgentCockpit} into the `contributes` shape a VS Code extension
 * declares: commands, chat participants, language-model tools, and configuration,
 * alongside the harness benchmark, habitat, and adapter comparison.
 */
import { defaultAgentHarnessAdapters, type AgentHarnessAdapter } from "./harness-adapter.mjs";
import { currentVsCodeHarnessBenchmark, type HarnessCapability } from "./harness-benchmark.mjs";
import { defaultAgenticCockpitHabitat, type AgenticCockpitHabitat } from "./agent-habitat.mjs";
import type { VsCodeAgentCockpit } from "./cockpit.mjs";

export type VsCodeCommandContribution = Readonly<{
  command: string;
  title: string;
  category: string;
}>;

export type VsCodeChatParticipantContribution = Readonly<{
  id: string;
  name: string;
  fullName: string;
  description: string;
  isSticky: boolean;
}>;

export type VsCodeLanguageModelToolContribution = Readonly<{
  name: string;
  displayName: string;
  toolReferenceName: string;
  userDescription: string;
  modelDescription: string;
  canBeReferencedInPrompt: boolean;
  icon: string;
  inputSchema: Readonly<Record<string, unknown>>;
}>;

export type VsCodeHarnessContributionManifest = Readonly<{
  kind: "organizing.vscode.extension-manifest";
  name: string;
  displayName: string;
  activationEvents: readonly string[];
  contributes: Readonly<{
    commands: readonly VsCodeCommandContribution[];
    chatParticipants: readonly VsCodeChatParticipantContribution[];
    languageModelTools: readonly VsCodeLanguageModelToolContribution[];
    configuration: Readonly<Record<string, unknown>>;
  }>;
  benchmark: readonly HarnessCapability[];
  habitat: AgenticCockpitHabitat;
  adapters: readonly AgentHarnessAdapter[];
}>;

function commandId(name: string): string {
  return `devCockpit.${name.replace(/[^a-zA-Z0-9]+(.)/g, (_, next: string) => next.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "")}`;
}

function commandTitle(name: string): string {
  return name.split("-").map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

export function vscodeHarnessContributionManifest(
  cockpit: VsCodeAgentCockpit,
): VsCodeHarnessContributionManifest {
  const commands = cockpit.commands.map((command) => Object.freeze({
    command: commandId(command.name),
    title: commandTitle(command.name),
    category: "561 Dev Cockpit",
  }));
  return Object.freeze({
    kind: "organizing.vscode.extension-manifest" as const,
    name: "dev-bare-cedar-fog-emsenn-net-cockpit",
    displayName: "dev.bare-cedar-fog.emsenn.net Cockpit",
    activationEvents: Object.freeze([
      "onChatParticipant:dev-cockpit",
      "onLanguageModelTool:dev_cockpit_readWorkspace",
      "onLanguageModelTool:dev_cockpit_readReadiness",
      "onLanguageModelTool:dev_cockpit_readEndeavorEnactment",
      "onLanguageModelTool:dev_cockpit_readOpinions",
      "onLanguageModelTool:dev_cockpit_readFacultyActions",
      "onLanguageModelTool:dev_cockpit_readAnimatingActions",
      "onLanguageModelTool:dev_cockpit_readCommunicatingActions",
      "onLanguageModelTool:dev_cockpit_readSocializingActions",
      "onLanguageModelTool:dev_cockpit_readPlayingActions",
      "onLanguageModelTool:dev_cockpit_computeImpact",
      "onCommand:devCockpit.readReadiness",
      "onCommand:devCockpit.readEndeavorEnactment",
      "onCommand:devCockpit.readOpinions",
      "onCommand:devCockpit.readFacultyActions",
      "onCommand:devCockpit.readAnimatingActions",
      "onCommand:devCockpit.readCommunicatingActions",
      "onCommand:devCockpit.readSocializingActions",
      "onCommand:devCockpit.readPlayingActions",
      "onCommand:devCockpit.readCockpit",
    ]),
    contributes: Object.freeze({
      commands: Object.freeze(commands),
      chatParticipants: Object.freeze([
        {
          id: "dev-bare-cedar-fog-emsenn-net-cockpit.dev-cockpit",
          name: "dev-cockpit",
          fullName: "561 Development Cockpit",
          description: "Coordinate Codex, Claude, MCP tools, package impact, checkpoints, and handoffs for this workspace.",
          isSticky: true,
        },
      ]),
      languageModelTools: Object.freeze([
        {
          name: "dev_cockpit_readWorkspace",
          displayName: "Read Workspace",
          toolReferenceName: "devWorkspace",
          userDescription: "Read package mesh, open workspace context, and cockpit attachments.",
          modelDescription: "Use this before planning or editing in the 561 Group workspace. Returns package graph, cockpit attachments, and context boundaries. Do not use for arbitrary file search.",
          canBeReferencedInPrompt: true,
          icon: "$(repo)",
          inputSchema: Object.freeze({
            type: "object",
            properties: Object.freeze({
              includeOpenEditors: Object.freeze({ type: "boolean", description: "Include open editor and selection context when available." }),
            }),
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readReadiness",
          displayName: "Read Readiness",
          toolReferenceName: "devReadiness",
          userDescription: "Evaluate cockpit readiness against workspace files and tool configuration.",
          modelDescription: "Use this before write-capable work. Returns pass/fail readiness checks with observed and missing workspace evidence.",
          canBeReferencedInPrompt: true,
          icon: "$(pass)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readEndeavorEnactment",
          displayName: "Read Endeavor Enactment",
          toolReferenceName: "devEndeavor",
          userDescription: "Read the current endeavor, milestone, goal, task, assignment, governance, and next-interface profile.",
          modelDescription: "Use this to orient agent work around the animating work-tracking carrier. Returns active goals, work, swarms, federation links, assignments, readiness, costs, governance gates, and suggested next package-bin interfaces.",
          canBeReferencedInPrompt: true,
          icon: "$(tasklist)",
          inputSchema: Object.freeze({
            type: "object",
            properties: Object.freeze({
              focus: Object.freeze({ type: "string", description: "Optional workspace focus for the profile." }),
              intent: Object.freeze({ type: "string", description: "Optional intent or task query for the profile." }),
              limit: Object.freeze({ type: "number", description: "Maximum active work assignments to project." }),
            }),
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readOpinions",
          displayName: "Read Opinions",
          toolReferenceName: "devOpinions",
          userDescription: "Read the Operations Manifold opinion fiber.",
          modelDescription: "Use this before planning or refactoring when the user gives preferences, constraints, vibes, or architectural guidance. Returns held operator opinions with scopes, kinds, stances, severity, source, and timestamps.",
          canBeReferencedInPrompt: true,
          icon: "$(quote)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readFacultyActions",
          displayName: "Read Faculty Actions",
          toolReferenceName: "devFacultyActions",
          userDescription: "Read the lightweight index of faculty action discovery surfaces.",
          modelDescription: "Use this before fetching full action discovery JSON. Returns package-level counts and verb summaries for animating, communicating, socializing, and playing.",
          canBeReferencedInPrompt: true,
          icon: "$(list-tree)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readAnimatingActions",
          displayName: "Read Animating Actions",
          toolReferenceName: "devAnimatingActions",
          userDescription: "Read @emsenn/animating action discovery for agent-operable verbs, resources, prompts, and utterances.",
          modelDescription: "Use this when choosing an animating carrier or action. Returns the induced relating discovery surface, including project-work-tracking and its schemas.",
          canBeReferencedInPrompt: true,
          icon: "$(symbol-method)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readCommunicatingActions",
          displayName: "Read Communicating Actions",
          toolReferenceName: "devCommunicatingActions",
          userDescription: "Read @emsenn/communicating action discovery for speech, listening, memes, codecs, and message carriers.",
          modelDescription: "Use this when work needs communication carriers, utterance or meme operations, language/message codecs, or speech/listening surfaces.",
          canBeReferencedInPrompt: true,
          icon: "$(comment-discussion)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readSocializingActions",
          displayName: "Read Socializing Actions",
          toolReferenceName: "devSocializingActions",
          userDescription: "Read @emsenn/socializing action discovery for federation, social fields, consensus, and inter-observer verbs.",
          modelDescription: "Use this when work needs multiple swarms, observers, production/development federation, consensus, or social-field operations.",
          canBeReferencedInPrompt: true,
          icon: "$(organization)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readPlayingActions",
          displayName: "Read Playing Actions",
          toolReferenceName: "devPlayingActions",
          userDescription: "Read @emsenn/playing action discovery for designs, interaction, cut, topology, and play carriers.",
          modelDescription: "Use this when work needs game/play carriers, designs, interaction, duality, topology, strategy, or cut-style operations.",
          canBeReferencedInPrompt: true,
          icon: "$(debug-alt)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_computeImpact",
          displayName: "Compute Impact",
          toolReferenceName: "devImpact",
          userDescription: "Relate changed files to package impact and verification commands.",
          modelDescription: "Use after inspecting or changing files. Returns impacted packages, suggested checks, and public contract risk. Requires workspace-local paths.",
          canBeReferencedInPrompt: true,
          icon: "$(graph)",
          inputSchema: Object.freeze({
            type: "object",
            properties: Object.freeze({
              paths: Object.freeze({
                type: "array",
                items: Object.freeze({ type: "string" }),
                description: "Workspace-local paths whose impact should be computed.",
              }),
            }),
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_checkpoint",
          displayName: "Checkpoint",
          toolReferenceName: "devCheckpoint",
          userDescription: "Record or compare a task checkpoint.",
          modelDescription: "Use before and after material edits or command batches. Keeps file restoration separate from task or conversation restoration.",
          canBeReferencedInPrompt: true,
          icon: "$(bookmark)",
          inputSchema: Object.freeze({
            type: "object",
            properties: Object.freeze({
              mode: Object.freeze({ type: "string", enum: Object.freeze(["capture", "compare", "restore-files", "restore-task", "restore-all"]) }),
              checkpointId: Object.freeze({ type: "string" }),
            }),
            required: Object.freeze(["mode"]),
            additionalProperties: false,
          }),
        },
        {
          name: "dev_cockpit_readHabitat",
          displayName: "Read Agent Habitat",
          toolReferenceName: "devHabitat",
          userDescription: "Read arena, context suit, governance, trace, and operation-game cockpit facets.",
          modelDescription: "Use when a task needs the 561 agentic development ontology, gamified operation surface, proof frontier, or cross-agent witness discipline.",
          canBeReferencedInPrompt: true,
          icon: "$(sparkle)",
          inputSchema: Object.freeze({
            type: "object",
            additionalProperties: false,
          }),
        },
      ]),
      configuration: Object.freeze({
        title: "561 Development Cockpit",
        properties: Object.freeze({
          "devCockpit.agent": Object.freeze({
            type: "string",
            enum: Object.freeze(defaultAgentHarnessAdapters.map((adapter) => adapter.id)),
            default: "codex",
            description: "Default agent adapter for cockpit requests.",
          }),
          "devCockpit.checkpoints.enabled": Object.freeze({
            type: "boolean",
            default: true,
            description: "Capture cockpit checkpoints around material edits and command batches.",
          }),
          "devCockpit.policy.requirePackageImpact": Object.freeze({
            type: "boolean",
            default: true,
            description: "Require package impact before write-capable tool execution.",
          }),
        }),
      }),
    }),
    benchmark: currentVsCodeHarnessBenchmark,
    habitat: defaultAgenticCockpitHabitat,
    adapters: defaultAgentHarnessAdapters,
  });
}
