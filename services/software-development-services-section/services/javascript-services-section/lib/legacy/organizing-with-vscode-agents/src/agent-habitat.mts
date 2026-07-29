/**
 * The agentic development habitat: the native target above a meet-or-beat VS Code
 * harness. A habitat is the ontology an agent inhabits — context suit, arena,
 * governed tool body, trace memory, proof frontier, and operation-ledger game —
 * with quests, modes, and score axes. Provider-neutral; sourced from the corpus
 * and the live ops surfaces.
 */
import type { HarnessCapabilityId } from "./harness-benchmark.mjs";

export type AgentHabitatFacetId =
  | "context-spacesuit"
  | "agent-arena"
  | "strategy-play"
  | "dispatch-governance"
  | "operation-ledger-game"
  | "trace-holography"
  | "proof-tree-frontier"
  | "command-self-use"
  | "cross-actor-witness"
  | "semantic-tool-senses";

export type AgentHabitatFacet = Readonly<{
  id: AgentHabitatFacetId;
  title: string;
  role: string;
  designConsequence: string;
  sourceEvidence: readonly string[];
  harnessCapabilities: readonly HarnessCapabilityId[];
}>;

export type AgentHabitatQuest = Readonly<{
  id: string;
  title: string;
  trigger: string;
  reward: string;
  evidence: readonly string[];
}>;

export type AgenticCockpitHabitat = Readonly<{
  kind: "organizing.vscode.agent-habitat";
  title: string;
  thesis: string;
  facets: readonly AgentHabitatFacet[];
  quests: readonly AgentHabitatQuest[];
  modes: readonly string[];
  scoreAxes: readonly string[];
}>;

function habitatFacet(input: AgentHabitatFacet): AgentHabitatFacet {
  return Object.freeze(input);
}

function habitatQuest(input: AgentHabitatQuest): AgentHabitatQuest {
  return Object.freeze(input);
}

export const defaultAgentHabitatFacets: readonly AgentHabitatFacet[] = Object.freeze([
  habitatFacet({
    id: "context-spacesuit",
    title: "Context Spacesuit",
    role: "The suit an agent wears before it can perceive a repo: identity, constraints, capabilities, perception, memory, and mission.",
    designConsequence: "The cockpit must show which layers are loaded, which are durable law, which are prompt-local, and which are being spent as context budget.",
    sourceEvidence: Object.freeze([
      "content/_archive/.../loading-context-spacesuit/_archive/context-spacesuits-in-agentic-ai.md",
      ".claude/settings.json SessionStart and UserPromptSubmit hooks",
      "OpenAI Codex IDE extension auto-context and status surfaces",
    ]),
    harnessCapabilities: Object.freeze(["persistent-instructions", "workspace-index-context", "session-memory", "model-routing"]),
  }),
  habitatFacet({
    id: "agent-arena",
    title: "Agent Arena",
    role: "The admitted event space for a run: request, inspect existing capabilities, choose a carrier, and mount a transport projection.",
    designConsequence: "Every agent-facing task should enter through an arena state instead of appearing as an untyped chat blob.",
    sourceEvidence: Object.freeze([
      "sites/ops.561.group/src/agents/arena.mts",
      "sites/ops.561.group/src/agents/harness.mts",
    ]),
    harnessCapabilities: Object.freeze(["workspace-index-context", "agent-handoff", "telemetry-trace"]),
  }),
  habitatFacet({
    id: "strategy-play",
    title: "Strategy Play",
    role: "The ordered play of a run: partial plays, obstructed plays, complete discovery plays, reports, and flow.",
    designConsequence: "The cockpit can render progress as a playable route through current work, not just a transcript scroll.",
    sourceEvidence: Object.freeze([
      "sites/ops.561.group/src/agents/strategy.mts",
      "@emsenn/gaming flow/play/strategy/strategyReport",
    ]),
    harnessCapabilities: Object.freeze(["agent-handoff", "telemetry-trace", "subagent-orchestration"]),
  }),
  habitatFacet({
    id: "dispatch-governance",
    title: "Dispatch Governance",
    role: "Capability, authority, office, operation, and readiness decide whether an agent should act.",
    designConsequence: "Before write-capable moves, the cockpit should expose readiness, contested gaps, next interfaces, and the office authorizing the move.",
    sourceEvidence: Object.freeze([
      "sites/ops.561.group/src/operating/governing/dispatching/readiness.mts",
      "@emsenn/animating governOperation and dispatchReadiness",
    ]),
    harnessCapabilities: Object.freeze(["human-approval-gates", "sandbox-policy", "language-model-tool", "mcp-tooling"]),
  }),
  habitatFacet({
    id: "operation-ledger-game",
    title: "Operation Ledger Game",
    role: "Operations become scored entries with experience, levels, badges, friction, challenges, and flow.",
    designConsequence: "Gamification should reward evidence-bearing, budget-aware, tool-visible work instead of raw action volume.",
    sourceEvidence: Object.freeze([
      "sites/ops.561.group/src/operating/recording/operations/gaming/library/operation-ledger-game.mts",
    ]),
    harnessCapabilities: Object.freeze(["telemetry-trace", "checkpoint-restore", "session-memory"]),
  }),
  habitatFacet({
    id: "trace-holography",
    title: "Trace Holography",
    role: "Agent exec traces project events, readings, findings, work, reports, costs, statuses, and event types.",
    designConsequence: "Trace viewers should fold raw JSONL into comparable projections for Codex, Claude, Cline-class, and generic MCP agents.",
    sourceEvidence: Object.freeze([
      "sites/ops.561.group/src/holography/llm/agent-run-trace.mts",
      "sites/ops.561.group/src/holography/llm/codex-exec-trace.mts",
    ]),
    harnessCapabilities: Object.freeze(["telemetry-trace", "session-memory", "agent-handoff"]),
  }),
  habitatFacet({
    id: "proof-tree-frontier",
    title: "Proof-Tree Frontier",
    role: "Content is navigated by generator/generated descent rather than topical resemblance.",
    designConsequence: "Agent navigation should surface frontier nodes, unresolved homes, and proof obligations as first-class cockpit tasks.",
    sourceEvidence: Object.freeze([
      "content/CLAUDE.md",
      "content/dev/ROADMAP.md",
    ]),
    harnessCapabilities: Object.freeze(["workspace-index-context", "persistent-instructions", "agent-handoff"]),
  }),
  habitatFacet({
    id: "command-self-use",
    title: "Command Self-Use",
    role: "Agents should use the same structured commands and hooks the system provides, not bypass them through raw writes.",
    designConsequence: "The VS Code extension should nudge agents toward package tools, command routes, and checkpoint APIs when they are available.",
    sourceEvidence: Object.freeze([
      "content/_archive/.../agent-uses-own-commands.md",
      ".claude/settings.json PreToolUse and TaskCreated hooks",
    ]),
    harnessCapabilities: Object.freeze(["hook-lifecycle", "language-model-tool", "human-approval-gates"]),
  }),
  habitatFacet({
    id: "cross-actor-witness",
    title: "Cross-Actor Witness",
    role: "Users and agents share substrate state while keeping their witness chains distinct.",
    designConsequence: "The cockpit should distinguish human-authored, agent-authored, delegated, generated, and verification-only changes.",
    sourceEvidence: Object.freeze([
      "content/_archive/.../interactive-application/.../users-alongside-agents.md",
    ]),
    harnessCapabilities: Object.freeze(["diff-review", "agent-handoff", "telemetry-trace"]),
  }),
  habitatFacet({
    id: "semantic-tool-senses",
    title: "Semantic Tool Senses",
    role: "MCP/LSP attachments give agents editor-grade senses: definitions, references, diagnostics, symbols, and safe refactors.",
    designConsequence: "The cockpit should report tool reachability and stale diagnostics before asking an agent to reason from text search alone.",
    sourceEvidence: Object.freeze([
      ".claude/skills/typescript-lsp-mcp/SKILL.md",
      ".mcp.json",
      ".lsp-mcp.json",
      ".vscode/mcp.json",
    ]),
    harnessCapabilities: Object.freeze(["mcp-tooling", "workspace-index-context", "language-model-tool"]),
  }),
]);

export const defaultAgentHabitatQuests: readonly AgentHabitatQuest[] = Object.freeze([
  habitatQuest({
    id: "suit-up",
    title: "Suit Up",
    trigger: "Before planning or editing, read workspace, MCP/LSP reachability, durable instructions, and active file context.",
    reward: "context-steward badge and fewer blind-search loops",
    evidence: Object.freeze(["context-spacesuit", "semantic-tool-senses"]),
  }),
  habitatQuest({
    id: "enter-arena",
    title: "Enter Arena",
    trigger: "Convert a user request into request -> inspect -> choose-carrier -> mount-projection.",
    reward: "arena-admitted badge and a typed run state",
    evidence: Object.freeze(["agent-arena", "strategy-play"]),
  }),
  habitatQuest({
    id: "earn-the-write",
    title: "Earn The Write",
    trigger: "Before material edits, show dispatch readiness, package impact, approval policy, and checkpoint plan.",
    reward: "governed-edit badge and a cleaner review trail",
    evidence: Object.freeze(["dispatch-governance", "command-self-use", "cross-actor-witness"]),
  }),
  habitatQuest({
    id: "fold-the-trace",
    title: "Fold The Trace",
    trigger: "After a run, project events, costs, findings, verification, and handoff into comparable JSON.",
    reward: "trace-hologram badge and resumable future work",
    evidence: Object.freeze(["trace-holography", "operation-ledger-game"]),
  }),
  habitatQuest({
    id: "push-the-frontier",
    title: "Push The Frontier",
    trigger: "Turn an unsettled content or code frontier into a derived node, package carrier, or explicit obstruction.",
    reward: "frontier-cartographer badge and a better universe for the next agent",
    evidence: Object.freeze(["proof-tree-frontier", "strategy-play"]),
  }),
]);

export const defaultAgenticCockpitHabitat: AgenticCockpitHabitat = Object.freeze({
  kind: "organizing.vscode.agent-habitat" as const,
  title: "561 Agentic Development Habitat",
  thesis: "A meet-or-beat VS Code harness is only the floor. The native target is an agent habitat: context suit, arena, governed tool body, trace memory, proof frontier, and operation-ledger game.",
  facets: defaultAgentHabitatFacets,
  quests: defaultAgentHabitatQuests,
  modes: Object.freeze(["paidia", "ludus", "agon", "mimicry", "governed-discovery", "frontier-derivation"]),
  scoreAxes: Object.freeze(["evidence", "package-impact", "budget", "checkpoint", "handoff", "semantic-tool-use", "proof-descent"]),
});
