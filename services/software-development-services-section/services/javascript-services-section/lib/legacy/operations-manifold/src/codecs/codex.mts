import type { ChargeValueName } from "@emsenn/relating";
import type { JsonValue } from "@emsenn/relating/writing";

export type CodexCapabilityStatus = "mounted" | "partial" | "gap";

export type CodexPlatformCapability = Readonly<{
  capability: string;
  codexReference: string;
  operationsManifoldCarrier: string;
  status: CodexCapabilityStatus;
  evidence: readonly string[];
}>;

export type CodexFindingSummary = Readonly<{
  subject: readonly string[];
  predicate: string;
  value: ChargeValueName;
  note?: JsonValue;
}>;

export const CODEX_PLATFORM_SESSION = "operations-manifold.read-agent-platform.current";

export const CODEX_AGENT_CAPABILITIES = Object.freeze([
  "read-workspace.inspect",
  "codebase.search",
  "code.edit",
  "command.run",
  "test.run",
  "mcp.tool-use",
  "web.research",
  "work.plan",
  "memory.recall",
  "trace.fold",
  "governance.dispatch",
  "site.administer",
] as const);

export const CODEX_RECALL_SUBJECTS = Object.freeze([
  Object.freeze(["operations-manifold", "read-agent-platform"] as const),
  Object.freeze(["operations-manifold", "execution-impact"] as const),
  Object.freeze(["operations-manifold", "koios-orchestration"] as const),
  Object.freeze(["operations-manifold", "read-work-state"] as const),
] as const);

export function codexPlatformCapabilities(): readonly CodexPlatformCapability[] {
  return Object.freeze([
    capability("read-workspace-understanding", "Coding-agent runtimes read repos, files, package context, and dependency graphs.", "@emsenn/organizing-with-openai-codex/session loadWorkspace over @emsenn/organizing-with-jsnode", "mounted", ["read-workspace graph", "package manifests", "dependency graph"]),
    capability("change-impact", "Coding-agent runtimes inspect change state and select verification work.", "@emsenn/computing/git + @emsenn/organizing-with-openai-codex/session computeImpact", "mounted", ["git status", "package impacts", "suggested commands"]),
    capability("durable-session-memory", "Agent runtimes carry task context, sessions, and resumable state.", "@emsenn/organizing-with-openai-codex/session finding/recall over Operations Manifold codex-findings JSONL/state", "mounted", ["record-finding", "read-session findings", "codex-findings recall"]),
    capability("read-work-planning", "Agent runtimes maintain goals, tasks, status, and continuation.", "@emsenn/organizing WorkProject/WorkItem/Assignment/Report", "mounted", ["project", "read-work", "assignment", "report"]),
    capability("strategy-enactment", "Agent runtimes iterate procedures over target state.", "@emsenn/gaming strategy/play/flow + 561 Group Operations Manifold enact-strategy", "mounted", ["enact-strategy", "strategyExtensionsAfter", "derive-context-relevance hook context task", "agent arena", "strategy report"]),
    capability("tool-use-governance", "Agent runtimes route tool calls through permissions, guardrails, approvals, or sandbox constraints.", "@emsenn/animating governOperation/admitTool/dispatchReadiness through assess-dispatch-readiness", "mounted", ["assess-dispatch-readiness", "operation mode", "capability-authority dispatch"]),
    capability("execution-tracing", "Agent runtimes expose run events, tool results, and traceable evidence.", "561 Group Operations Manifold read-agent-run-trace HTTP/MCP surfaces + @emsenn/organizing-with-openai-codex/session/events codec", "mounted", ["read-agent-run-trace", "codex-exec-jsonl codec", "folded trace readings", "session findings", "read-work items", "read-work reports"]),
    capability("site-orchestration", "Agent runtimes operate across projects, services, and externally administered surfaces.", "561 Group Operations Manifold site administration + site operations + site play", "mounted", ["sites", "read-site-operations", "read-site-play"]),
  ]);
}

export function codexFindingSummary(
  subject: readonly string[],
  predicate: string,
  value: ChargeValueName,
  note: string,
): CodexFindingSummary {
  return Object.freeze({ subject: Object.freeze([...subject]), predicate, value, note });
}

function capability(
  name: string,
  codexReference: string,
  operationsManifoldCarrier: string,
  status: CodexCapabilityStatus,
  evidence: readonly string[],
): CodexPlatformCapability {
  return Object.freeze({ capability: name, codexReference, operationsManifoldCarrier, status, evidence: Object.freeze([...evidence]) });
}
