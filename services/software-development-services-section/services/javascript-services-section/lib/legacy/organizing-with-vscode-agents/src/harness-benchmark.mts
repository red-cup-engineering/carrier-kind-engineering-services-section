/**
 * The meet-or-beat VS Code agent harness benchmark.
 *
 * A provider-neutral capability taxonomy for editor-side agent harnesses: what a
 * VS Code coding agent is expected to do, the baseline, the "meet", and the
 * "beat". Provider packages (Codex, Claude Code, …) declare which capability ids
 * they cover and evaluate against this benchmark.
 */
export type HarnessCapabilityKind =
  | "context"
  | "tooling"
  | "control"
  | "memory"
  | "collaboration"
  | "interface"
  | "observability";

export type HarnessCapabilityId =
  | "editor-selection-context"
  | "workspace-index-context"
  | "persistent-instructions"
  | "chat-participant"
  | "language-model-tool"
  | "mcp-tooling"
  | "terminal-execution"
  | "browser-execution"
  | "file-editing"
  | "diff-review"
  | "human-approval-gates"
  | "sandbox-policy"
  | "checkpoint-restore"
  | "session-memory"
  | "agent-handoff"
  | "subagent-orchestration"
  | "local-cloud-continuity"
  | "model-routing"
  | "hook-lifecycle"
  | "telemetry-trace";

export type HarnessCapabilityLevel = "required" | "expected" | "differentiator";

export type HarnessCapability = Readonly<{
  id: HarnessCapabilityId;
  kind: HarnessCapabilityKind;
  level: HarnessCapabilityLevel;
  title: string;
  baseline: string;
  meet: string;
  beat: string;
  sources: readonly string[];
}>;

export type HarnessEvaluation = Readonly<{
  kind: "organizing.vscode.harness-evaluation";
  subject: string;
  status: "below-baseline" | "meets-baseline" | "beats-baseline";
  required: Readonly<{ covered: number; total: number }>;
  expected: Readonly<{ covered: number; total: number }>;
  differentiators: Readonly<{ covered: number; total: number }>;
  missing: readonly HarnessCapabilityId[];
  covered: readonly HarnessCapabilityId[];
}>;

export const harnessBenchmarkSources = Object.freeze({
  vscodeAiExtensibility: "https://code.visualstudio.com/api/extension-guides/ai/ai-extensibility-overview",
  vscodeMcp: "https://code.visualstudio.com/docs/agent-customization/mcp-servers",
  vscodeLanguageModelTools: "https://code.visualstudio.com/api/extension-guides/ai/tools",
  vscodeChatParticipants: "https://code.visualstudio.com/api/extension-guides/ai/chat",
  codexIdeFeatures: "https://developers.openai.com/codex/ide/features",
  codexMcp: "https://developers.openai.com/codex/mcp",
  codexHooks: "https://developers.openai.com/codex/hooks",
  codexSubagents: "https://developers.openai.com/codex/subagents",
  claudeCodeOverview: "https://docs.anthropic.com/en/docs/claude-code/overview",
  claudeCodeMcp: "https://docs.anthropic.com/en/docs/claude-code/mcp",
  claudeCodeHooks: "https://docs.anthropic.com/en/docs/claude-code/hooks",
  claudeCodeSubagents: "https://docs.anthropic.com/en/docs/claude-code/sub-agents",
  clineOverview: "https://docs.cline.bot/cline-overview",
  clineCheckpoints: "https://docs.cline.bot/core-workflows/checkpoints",
});

export const currentVsCodeHarnessBenchmark: readonly HarnessCapability[] = Object.freeze([
  {
    id: "editor-selection-context",
    kind: "context",
    level: "required",
    title: "Editor selection and file context",
    baseline: "Selected ranges and whole files can be attached to an agent thread.",
    meet: "Expose selected range, active file, open tabs, and referenced files as structured context.",
    beat: "Keep context typed by provenance and package impact so agents know why a file is present.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.vscodeAiExtensibility]),
  },
  {
    id: "workspace-index-context",
    kind: "context",
    level: "required",
    title: "Workspace index context",
    baseline: "The agent can reason over workspace files and package structure.",
    meet: "Project package mesh, repo roots, open files, and changed files into the session.",
    beat: "Relate each file to package checks and public contracts before tool execution.",
    sources: Object.freeze([harnessBenchmarkSources.vscodeAiExtensibility]),
  },
  {
    id: "persistent-instructions",
    kind: "memory",
    level: "expected",
    title: "Persistent instructions",
    baseline: "Rules, skills, or repo instructions persist across conversations.",
    meet: "Surface AGENTS.md, CLAUDE.md, skills, and agent-specific rules as explicit cockpit attachments.",
    beat: "Distinguish durable repo law from one-turn prompt context and site projections.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.claudeCodeOverview, harnessBenchmarkSources.clineOverview]),
  },
  {
    id: "chat-participant",
    kind: "interface",
    level: "required",
    title: "Chat participant",
    baseline: "VS Code can expose a domain assistant through an @-mentioned chat participant.",
    meet: "Define a cockpit participant that owns the full request flow for agentic development.",
    beat: "Route participant requests through the same carrier used by the static cockpit and adapters.",
    sources: Object.freeze([harnessBenchmarkSources.vscodeChatParticipants, harnessBenchmarkSources.vscodeAiExtensibility]),
  },
  {
    id: "language-model-tool",
    kind: "tooling",
    level: "required",
    title: "Language model tools",
    baseline: "VS Code agent mode can invoke extension-contributed tools.",
    meet: "Publish package, impact, checkpoint, handoff, and topology tools with schemas and confirmations.",
    beat: "Make those tools mirrors of the repo package carriers rather than editor-only commands.",
    sources: Object.freeze([harnessBenchmarkSources.vscodeLanguageModelTools, harnessBenchmarkSources.vscodeAiExtensibility]),
  },
  {
    id: "mcp-tooling",
    kind: "tooling",
    level: "required",
    title: "MCP tooling",
    baseline: "MCP servers can provide tools, resources, prompts, and app-like interactive surfaces.",
    meet: "Read shared `.mcp.json`, `.lsp-mcp.json`, `.vscode/mcp.json`, and agent config MCP attachments.",
    beat: "Normalize VS Code, Codex, Claude, and other clients into one cockpit reachability report.",
    sources: Object.freeze([harnessBenchmarkSources.vscodeMcp, harnessBenchmarkSources.codexMcp, harnessBenchmarkSources.claudeCodeMcp]),
  },
  {
    id: "terminal-execution",
    kind: "tooling",
    level: "required",
    title: "Terminal execution",
    baseline: "Current coding agents run commands under user control.",
    meet: "Model command execution as an approval-gated harness capability.",
    beat: "Attach each command to package impact, shell provenance, output digest, and suggested follow-up checks.",
    sources: Object.freeze([harnessBenchmarkSources.clineOverview, harnessBenchmarkSources.codexIdeFeatures]),
  },
  {
    id: "browser-execution",
    kind: "tooling",
    level: "expected",
    title: "Browser execution",
    baseline: "Modern harnesses can use browser tooling for web tasks and verification.",
    meet: "Declare browser tools through MCP or agent-specific adapters.",
    beat: "Treat screenshots, DOM facts, console logs, and network state as typed cockpit evidence.",
    sources: Object.freeze([harnessBenchmarkSources.vscodeMcp, harnessBenchmarkSources.clineOverview]),
  },
  {
    id: "file-editing",
    kind: "tooling",
    level: "required",
    title: "File editing",
    baseline: "Agents can propose and apply workspace file edits.",
    meet: "Represent edits as harness actions with workspace trust and package impact.",
    beat: "Tie edits to checkpoints and verification obligations at the package boundary.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.clineOverview]),
  },
  {
    id: "diff-review",
    kind: "control",
    level: "expected",
    title: "Diff review",
    baseline: "Users can inspect changed files and review agent edits.",
    meet: "Expose changed files and review routes from the cockpit.",
    beat: "Separate user-authored, agent-authored, generated, and verification-only changes.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.clineCheckpoints]),
  },
  {
    id: "human-approval-gates",
    kind: "control",
    level: "required",
    title: "Human approval gates",
    baseline: "Tool calls and risky actions can require explicit approval.",
    meet: "Classify each harness action by read/write/network/destructive risk.",
    beat: "Carry approval policy across VS Code, Codex CLI, Claude Code CLI, MCP tools, and spawned agents.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.claudeCodeOverview, harnessBenchmarkSources.clineOverview]),
  },
  {
    id: "sandbox-policy",
    kind: "control",
    level: "required",
    title: "Sandbox policy",
    baseline: "Agents distinguish workspace-local work from network or outside-workspace access.",
    meet: "Project sandbox and trust policy into cockpit readiness.",
    beat: "Detect mismatches between editor, CLI, subagent, and MCP policy before work starts.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.codexSubagents]),
  },
  {
    id: "checkpoint-restore",
    kind: "control",
    level: "expected",
    title: "Checkpoint restore",
    baseline: "Cline-class harnesses checkpoint after edits and commands.",
    meet: "Define checkpoint capture, compare, restore-files, restore-task, and restore-all as harness concepts.",
    beat: "Support cross-agent checkpoints that preserve conversation and separate file restoration from task restoration.",
    sources: Object.freeze([harnessBenchmarkSources.clineCheckpoints]),
  },
  {
    id: "session-memory",
    kind: "memory",
    level: "expected",
    title: "Session memory",
    baseline: "Harnesses preserve useful context across turns and sessions.",
    meet: "Expose recall, findings, and session capsules from the agent session substrate.",
    beat: "Make memory evidence-addressed and citeable across agents and static site projections.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.claudeCodeOverview]),
  },
  {
    id: "agent-handoff",
    kind: "collaboration",
    level: "expected",
    title: "Agent handoff",
    baseline: "Long-running tasks need clear transfer between sessions or surfaces.",
    meet: "Emit handoff capsules for the next agent, next editor window, or cloud task.",
    beat: "Keep handoff packages machine-readable so Codex, Claude, and generic agents share the same boundary.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures]),
  },
  {
    id: "subagent-orchestration",
    kind: "collaboration",
    level: "differentiator",
    title: "Subagent orchestration",
    baseline: "Coding agents can run parallel specialized subagents in supported surfaces.",
    meet: "Declare agent roles, spawn policy, depth, and merge reports in the cockpit.",
    beat: "Normalize Codex subagents, Claude subagents, and future team agents through one adapter grammar.",
    sources: Object.freeze([harnessBenchmarkSources.codexSubagents, harnessBenchmarkSources.claudeCodeSubagents]),
  },
  {
    id: "local-cloud-continuity",
    kind: "collaboration",
    level: "differentiator",
    title: "Local/cloud continuity",
    baseline: "Coding agents can move some work between local IDE and cloud tasks.",
    meet: "Expose local, cloud, and follow-up state as cockpit routes.",
    beat: "Keep local changes, cloud task context, and package verification joined by one handoff carrier.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures]),
  },
  {
    id: "model-routing",
    kind: "control",
    level: "expected",
    title: "Model routing",
    baseline: "Users can switch models or providers.",
    meet: "Represent model/provider/reasoning choices per adapter.",
    beat: "Route by task class, budget, tool policy, and verification criticality instead of simple provider selection.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.vscodeAiExtensibility]),
  },
  {
    id: "hook-lifecycle",
    kind: "control",
    level: "differentiator",
    title: "Hook lifecycle",
    baseline: "Codex and Claude Code support lifecycle hooks around prompts, tools, compaction, subagents, and stops.",
    meet: "Project hook availability, trust, and event coverage into the cockpit.",
    beat: "Use hooks as cross-agent policy witnesses rather than hidden automation.",
    sources: Object.freeze([harnessBenchmarkSources.codexHooks, harnessBenchmarkSources.claudeCodeHooks]),
  },
  {
    id: "telemetry-trace",
    kind: "observability",
    level: "expected",
    title: "Telemetry and trace",
    baseline: "Harnesses expose enough transcript and tool history for review.",
    meet: "Project JSON traces, tool calls, costs, findings, and command results.",
    beat: "Make traces comparable across Codex, Claude, Cline-like, and MCP-mediated agents.",
    sources: Object.freeze([harnessBenchmarkSources.codexIdeFeatures, harnessBenchmarkSources.clineOverview]),
  },
]);

function capabilitiesAt(level: HarnessCapabilityLevel, benchmark: readonly HarnessCapability[]): readonly HarnessCapability[] {
  return benchmark.filter((capability) => capability.level === level);
}

function countCovered(capabilities: readonly HarnessCapability[], covered: ReadonlySet<HarnessCapabilityId>): { covered: number; total: number } {
  return Object.freeze({
    covered: capabilities.filter((capability) => covered.has(capability.id)).length,
    total: capabilities.length,
  });
}

export function evaluateHarness(
  subject: string,
  capabilityIds: readonly HarnessCapabilityId[],
  benchmark: readonly HarnessCapability[] = currentVsCodeHarnessBenchmark,
): HarnessEvaluation {
  const coveredSet = new Set(capabilityIds);
  const requiredCapabilities = capabilitiesAt("required", benchmark);
  const expectedCapabilities = capabilitiesAt("expected", benchmark);
  const differentiatorCapabilities = capabilitiesAt("differentiator", benchmark);
  const missing = benchmark
    .filter((capability) => capability.level !== "differentiator" && !coveredSet.has(capability.id))
    .map((capability) => capability.id);
  const required = countCovered(requiredCapabilities, coveredSet);
  const expected = countCovered(expectedCapabilities, coveredSet);
  const differentiators = countCovered(differentiatorCapabilities, coveredSet);
  const status = required.covered < required.total
    ? "below-baseline"
    : expected.covered < expected.total
      ? "meets-baseline"
      : differentiators.covered > 0
        ? "beats-baseline"
        : "meets-baseline";
  return Object.freeze({
    kind: "organizing.vscode.harness-evaluation" as const,
    subject,
    status,
    required,
    expected,
    differentiators,
    missing: Object.freeze(missing),
    covered: Object.freeze([...coveredSet]),
  });
}
