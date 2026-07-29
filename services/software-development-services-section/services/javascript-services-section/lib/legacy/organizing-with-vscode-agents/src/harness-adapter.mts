/**
 * Agent harness adapters: how each coding agent maps onto the VS Code harness
 * benchmark. An adapter names a provider, its transports, the capability ids it
 * covers, its config paths and command routes, and a benchmark evaluation.
 *
 * The default adapter set is the cross-provider comparison table (Codex, Claude
 * Code, Cline-class, generic MCP). Provider packages may also export their own
 * single adapter built from these capability sets.
 */
import {
  currentVsCodeHarnessBenchmark,
  evaluateHarness,
  type HarnessCapabilityId,
  type HarnessEvaluation,
} from "./harness-benchmark.mjs";

export type AgentHarnessKind =
  | "codex"
  | "claude"
  | "cline-compatible"
  | "copilot-compatible"
  | "generic-mcp-agent";

export type AgentHarnessTransport =
  | "vscode-extension"
  | "cli"
  | "mcp"
  | "jsonl-trace"
  | "static-web";

export type AgentHarnessAdapter = Readonly<{
  kind: "organizing.vscode.harness-adapter";
  id: string;
  agentKind: AgentHarnessKind;
  displayName: string;
  packageName?: string;
  transports: readonly AgentHarnessTransport[];
  capabilities: readonly HarnessCapabilityId[];
  configPaths: readonly string[];
  commandRoutes: readonly string[];
  notes: readonly string[];
  evaluation: HarnessEvaluation;
}>;

export const codexCapabilitySet: readonly HarnessCapabilityId[] = Object.freeze([
  "editor-selection-context",
  "workspace-index-context",
  "persistent-instructions",
  "chat-participant",
  "language-model-tool",
  "mcp-tooling",
  "terminal-execution",
  "browser-execution",
  "file-editing",
  "diff-review",
  "human-approval-gates",
  "sandbox-policy",
  "checkpoint-restore",
  "session-memory",
  "agent-handoff",
  "subagent-orchestration",
  "local-cloud-continuity",
  "model-routing",
  "hook-lifecycle",
  "telemetry-trace",
]);

export const claudeCapabilitySet: readonly HarnessCapabilityId[] = Object.freeze([
  "editor-selection-context",
  "workspace-index-context",
  "persistent-instructions",
  "mcp-tooling",
  "terminal-execution",
  "file-editing",
  "diff-review",
  "human-approval-gates",
  "sandbox-policy",
  "session-memory",
  "agent-handoff",
  "subagent-orchestration",
  "hook-lifecycle",
  "model-routing",
  "telemetry-trace",
]);

export const clineCompatibleCapabilitySet: readonly HarnessCapabilityId[] = Object.freeze([
  "editor-selection-context",
  "workspace-index-context",
  "persistent-instructions",
  "chat-participant",
  "language-model-tool",
  "mcp-tooling",
  "terminal-execution",
  "browser-execution",
  "file-editing",
  "diff-review",
  "human-approval-gates",
  "sandbox-policy",
  "checkpoint-restore",
  "session-memory",
  "agent-handoff",
  "model-routing",
  "telemetry-trace",
]);

export const genericMcpCapabilitySet: readonly HarnessCapabilityId[] = Object.freeze([
  "workspace-index-context",
  "persistent-instructions",
  "mcp-tooling",
  "terminal-execution",
  "browser-execution",
  "human-approval-gates",
  "sandbox-policy",
  "session-memory",
  "agent-handoff",
  "telemetry-trace",
]);

export function agentHarnessAdapter(input: Omit<AgentHarnessAdapter, "kind" | "evaluation">): AgentHarnessAdapter {
  return Object.freeze({
    kind: "organizing.vscode.harness-adapter" as const,
    ...input,
    evaluation: evaluateHarness(input.id, input.capabilities, currentVsCodeHarnessBenchmark),
  });
}

export const codexHarnessAdapter: AgentHarnessAdapter = agentHarnessAdapter({
  id: "codex",
  agentKind: "codex",
  displayName: "Codex",
  packageName: "@emsenn/organizing-with-openai-codex",
  transports: Object.freeze(["vscode-extension", "cli", "mcp", "jsonl-trace", "static-web"]),
  capabilities: codexCapabilitySet,
  configPaths: Object.freeze(["~/.codex/config.toml", ".codex/config.toml", ".mcp.json", ".vscode/mcp.json", ".lsp-mcp.json"]),
  commandRoutes: Object.freeze(["/api/cockpit.json", "/api/benchmark.json", "/api/adapters.json", "/api/vscode-extension.json"]),
  notes: Object.freeze([
    "Primary adapter. It should meet the current VS Code harness baseline and beat it through shared package carriers, hooks, subagents, and handoff projections.",
    "Use Codex as the oracle for Codex-specific config, approvals, MCP, hooks, and subagent behavior.",
  ]),
});

export const claudeCodeHarnessAdapter: AgentHarnessAdapter = agentHarnessAdapter({
  id: "claude-code-cli",
  agentKind: "claude",
  displayName: "Claude Code CLI",
  packageName: "@emsenn/organizing-with-claude-code-cli",
  transports: Object.freeze(["cli", "mcp", "jsonl-trace", "static-web"]),
  capabilities: claudeCapabilitySet,
  configPaths: Object.freeze([".claude/", ".mcp.json", ".vscode/mcp.json", ".lsp-mcp.json"]),
  commandRoutes: Object.freeze(["/api/adapters.json", "/api/topology.json"]),
  notes: Object.freeze([
    "Secondary adapter. It should share the same cockpit carriers even when the runtime transcript format differs.",
    "Missing VS Code-native chat participant and language-model-tool lanes until an extension bridge is authored.",
  ]),
});

export const clineCompatibleHarnessAdapter: AgentHarnessAdapter = agentHarnessAdapter({
  id: "cline-compatible",
  agentKind: "cline-compatible",
  displayName: "Cline-compatible harness",
  transports: Object.freeze(["vscode-extension", "cli", "mcp", "static-web"]),
  capabilities: clineCompatibleCapabilitySet,
  configPaths: Object.freeze([".cline/", ".cline/mcp.json", ".mcp.json"]),
  commandRoutes: Object.freeze(["/api/benchmark.json", "/api/adapters.json"]),
  notes: Object.freeze([
    "Comparator adapter. It captures the Cline-class bar: file edits, terminal, browser, explicit approvals, MCP, rules or skills, and checkpoints.",
    "The 561 cockpit should beat this by making package impact, proof obligations, and cross-agent handoff first-class.",
  ]),
});

export const genericMcpHarnessAdapter: AgentHarnessAdapter = agentHarnessAdapter({
  id: "generic-mcp-agent",
  agentKind: "generic-mcp-agent",
  displayName: "Generic MCP agent",
  transports: Object.freeze(["mcp", "static-web"]),
  capabilities: genericMcpCapabilitySet,
  configPaths: Object.freeze([".mcp.json", ".vscode/mcp.json"]),
  commandRoutes: Object.freeze(["/api/cockpit.json", "/api/topology.json"]),
  notes: Object.freeze([
    "Minimum adapter for future agents that can only see MCP tools/resources/prompts and static cockpit JSON.",
    "It stays below the full VS Code baseline until editor-specific context and chat/tool contribution surfaces are added.",
  ]),
});

export const defaultAgentHarnessAdapters: readonly AgentHarnessAdapter[] = Object.freeze([
  codexHarnessAdapter,
  claudeCodeHarnessAdapter,
  clineCompatibleHarnessAdapter,
  genericMcpHarnessAdapter,
]);
