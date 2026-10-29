/**
 * The VS Code agent cockpit carrier: a provider-neutral description of the
 * panels, command routes, attachments, and readiness checks an editor-side
 * cockpit exposes. Provider packages (Codex, Claude Code, …) build a specialized
 * cockpit by passing their own subject, upstream package, and surfaces.
 */
import type { AgentHarnessKind } from "./harness-adapter.mjs";

export type CockpitPanelId =
  | "workspace"
  | "agent-session"
  | "mcp-lsp"
  | "impact"
  | "handoff";

export type CockpitAttachmentKind =
  | "vscode-workspace"
  | "agent-session"
  | "mcp-server"
  | "lsp-server"
  | "git-worktree"
  | "package-mesh";

export type CockpitPanel = Readonly<{
  id: CockpitPanelId;
  title: string;
  purpose: string;
  consumes: readonly string[];
  produces: readonly string[];
  href: string;
}>;

export type CockpitCommand = Readonly<{
  name: string;
  route: string;
  packageName: string;
  summary: string;
  readOnly: boolean;
  writesWorkspace: boolean;
}>;

export type CockpitAttachment = Readonly<{
  id: string;
  kind: CockpitAttachmentKind;
  label: string;
  path: string;
  relation: string;
}>;

export type CockpitReadinessCheck = Readonly<{
  id: string;
  label: string;
  required: boolean;
  evidence: string;
}>;

export type VsCodeAgentCockpit = Readonly<{
  kind: "organizing.vscode.cockpit";
  subject: string;
  provider: AgentHarnessKind | string;
  upstreamPackage: string;
  panels: readonly CockpitPanel[];
  commands: readonly CockpitCommand[];
  attachments: readonly CockpitAttachment[];
  readinessChecks: readonly CockpitReadinessCheck[];
}>;

export type VsCodeAgentCockpitInput = Readonly<{
  subject: string;
  provider: AgentHarnessKind | string;
  upstreamPackage: string;
  panels?: readonly CockpitPanel[];
  commands?: readonly CockpitCommand[];
  attachments?: readonly CockpitAttachment[];
  readinessChecks?: readonly CockpitReadinessCheck[];
}>;

/** Provider-neutral cockpit panels: the five lanes every agent cockpit needs. */
export const defaultCockpitPanels: readonly CockpitPanel[] = Object.freeze([
  {
    id: "workspace",
    title: "Workspace",
    purpose: "Read the package mesh, repo roots, open files, and active worktree shape before an agent acts.",
    consumes: Object.freeze(["pnpm-workspace.yaml", "package.json", ".vscode/mcp.json", "open editor context"]),
    produces: Object.freeze(["workspace package map", "repo-root session context"]),
    href: "/workspace",
  },
  {
    id: "agent-session",
    title: "Agent Session",
    purpose: "Project agent session events, findings, usage, and handoff material into one cockpit timeline.",
    consumes: Object.freeze(["agent exec traces", "session capsules", "memory citations"]),
    produces: Object.freeze(["session status", "findings", "handoff capsule"]),
    href: "/session",
  },
  {
    id: "mcp-lsp",
    title: "MCP and LSP",
    purpose: "Show which semantic tool bridges VS Code, Codex, Claude, Lean, and TypeScript can actually reach.",
    consumes: Object.freeze([".mcp.json", ".lsp-mcp.json", ".vscode/mcp.json"]),
    produces: Object.freeze(["tool reachability", "restart or attachment cues"]),
    href: "/mcp-lsp",
  },
  {
    id: "impact",
    title: "Impact",
    purpose: "Relate touched files to packages, suggested checks, public contracts, and likely downstream blast radius.",
    consumes: Object.freeze(["git status", "package graph", "agent change impact"]),
    produces: Object.freeze(["package impact", "verification commands"]),
    href: "/impact",
  },
  {
    id: "handoff",
    title: "Handoff",
    purpose: "Settle what a next agent, next editor window, or future session needs to know without rereading everything.",
    consumes: Object.freeze(["session summary", "findings", "verification results"]),
    produces: Object.freeze(["handoff note", "next-action queue"]),
    href: "/handoff",
  },
]);

/** Provider-neutral attachments: the shared workspace files an agent cockpit binds. */
export const defaultCockpitAttachments: readonly CockpitAttachment[] = Object.freeze([
  {
    id: "root-mcp",
    kind: "mcp-server",
    label: "Workspace MCP servers",
    path: ".mcp.json",
    relation: "makes agent and editor-side tools discoverable from the repo root",
  },
  {
    id: "vscode-mcp",
    kind: "vscode-workspace",
    label: "VS Code MCP attachment",
    path: ".vscode/mcp.json",
    relation: "lets the editor attach the same tool bridge the agent expects",
  },
  {
    id: "lsp-mcp",
    kind: "lsp-server",
    label: "LSP MCP bridge",
    path: ".lsp-mcp.json",
    relation: "connects TypeScript and Lean language services to agent sessions",
  },
  {
    id: "package-mesh",
    kind: "package-mesh",
    label: "Package mesh",
    path: "pnpm-workspace.yaml",
    relation: "bounds package composition and verification routing",
  },
]);

export function vsCodeAgentCockpit(input: VsCodeAgentCockpitInput): VsCodeAgentCockpit {
  return Object.freeze({
    kind: "organizing.vscode.cockpit" as const,
    subject: input.subject,
    provider: input.provider,
    upstreamPackage: input.upstreamPackage,
    panels: Object.freeze([...(input.panels ?? defaultCockpitPanels)]),
    commands: Object.freeze([...(input.commands ?? [])]),
    attachments: Object.freeze([...(input.attachments ?? defaultCockpitAttachments)]),
    readinessChecks: Object.freeze([...(input.readinessChecks ?? [])]),
  });
}
