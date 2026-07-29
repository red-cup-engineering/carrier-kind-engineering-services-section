/**
 * @emsenn/organizing-with-openai-codex-in-vs-code
 *
 * The Codex specialization of the generic VS Code agent cockpit. The benchmark,
 * adapters, habitat, cockpit carrier, readiness framework, and extension manifest
 * all live in @emsenn/organizing-with-vscode-agents; this package binds them to
 * Codex: codex session re-exports, the codex cockpit defaults, and the codex
 * readiness observers.
 */
import {
  vsCodeAgentCockpit,
  evaluateCockpitReadiness as evaluateGenericCockpitReadiness,
  workspaceVisibleObserver,
  mcpConfiguredObserver,
  readText,
  fileExists,
  type CockpitCommand,
  type CockpitReadinessCheck,
  type CockpitReadinessObservers,
  type CockpitReadinessObservation,
  type CockpitReadinessReport,
  type VsCodeAgentCockpit,
} from "@emsenn/organizing-with-vscode-agents";

// Re-export the generic VS Code agent cockpit surface so existing importers
// (notably sites/dev.bare-cedar-fog.emsenn.net) resolve it through this package.
export {
  currentVsCodeHarnessBenchmark,
  harnessBenchmarkSources,
  evaluateHarness,
  defaultAgentHarnessAdapters,
  agentHarnessAdapter,
  codexHarnessAdapter,
  claudeCodeHarnessAdapter,
  defaultAgenticCockpitHabitat,
  defaultAgentHabitatFacets,
  defaultAgentHabitatQuests,
  vsCodeAgentCockpit,
  defaultCockpitPanels,
  defaultCockpitAttachments,
  vscodeHarnessContributionManifest,
} from "@emsenn/organizing-with-vscode-agents";
export type {
  HarnessCapability,
  HarnessCapabilityId,
  HarnessCapabilityKind,
  HarnessCapabilityLevel,
  HarnessEvaluation,
  AgentHarnessAdapter,
  AgentHarnessKind,
  AgentHarnessTransport,
  AgenticCockpitHabitat,
  AgentHabitatFacet,
  AgentHabitatQuest,
  CockpitPanel,
  CockpitPanelId,
  CockpitCommand,
  CockpitAttachment,
  CockpitAttachmentKind,
  CockpitReadinessCheck,
  CockpitReadinessReport,
  CockpitReadinessEvaluation,
  CockpitReadinessStatus,
  VsCodeAgentCockpit,
  VsCodeHarnessContributionManifest,
  VsCodeCommandContribution,
  VsCodeChatParticipantContribution,
  VsCodeLanguageModelToolContribution,
} from "@emsenn/organizing-with-vscode-agents";

// Codex session computation surface.
export {
  computeImpact,
  findRepoRoot,
  loadWorkspace,
  recall,
  recallStatus,
  suggestCommands,
} from "@emsenn/organizing-with-openai-codex/session";
export type {
  ChangeImpact,
  Finding,
  ImpactPackage,
  Workspace,
  WsPackage,
} from "@emsenn/organizing-with-openai-codex/session";
export * as codex from "@emsenn/organizing-with-openai-codex";

/** The Codex cockpit is a {@link VsCodeAgentCockpit} specialized to Codex. */
export type CodexInVsCodeCockpit = VsCodeAgentCockpit;
export type CodexInVsCodeCockpitInput = Readonly<{
  subject?: string;
  commands?: readonly CockpitCommand[];
  readinessChecks?: readonly CockpitReadinessCheck[];
}>;

export const defaultCockpitCommands: readonly CockpitCommand[] = Object.freeze([
  {
    name: "read-workspace",
    route: "/api/workspace",
    packageName: "@emsenn/organizing-with-openai-codex",
    summary: "Load the workspace package mesh through the Codex session substrate.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-readiness",
    route: "/api/readiness",
    packageName: "@emsenn/organizing-with-openai-codex-in-vs-code",
    summary: "Evaluate cockpit readiness checks against the current workspace files.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-endeavor-enactment",
    route: "/api/endeavor-enactment",
    packageName: "@emsenn/dev.bare-cedar-fog.emsenn.net",
    summary: "Read the dev.bare-cedar-fog.emsenn.net work-tracking projection of endeavors, swarms, goals, assignments, governance, and next interfaces.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-opinions",
    route: "/api/opinions",
    packageName: "@emsenn/dev.bare-cedar-fog.emsenn.net",
    summary: "Read the dev.bare-cedar-fog.emsenn.net opinion fiber of operator guidance, constraints, desires, feedback, and intuitions.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-animating-actions",
    route: "/api/animating-actions",
    packageName: "@emsenn/animating",
    summary: "Read the induced @emsenn/animating action discovery surface for agent-operable verbs, resources, prompts, and utterances.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-faculty-actions",
    route: "/api/faculty-actions",
    packageName: "@emsenn/dev.bare-cedar-fog.emsenn.net",
    summary: "Read the lightweight index of faculty action discovery surfaces before fetching full package schemas and utterances.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-communicating-actions",
    route: "/api/communicating-actions",
    packageName: "@emsenn/communicating",
    summary: "Read the induced @emsenn/communicating action discovery surface for speech, listening, memes, codecs, and message carriers.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-socializing-actions",
    route: "/api/socializing-actions",
    packageName: "@emsenn/socializing",
    summary: "Read the induced @emsenn/socializing action discovery surface for federation, social fields, consensus, and inter-observer verbs.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-playing-actions",
    route: "/api/playing-actions",
    packageName: "@emsenn/playing",
    summary: "Read the induced @emsenn/playing action discovery surface for designs, interaction, cut, topology, and play carriers.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "read-cockpit",
    route: "/api/cockpit",
    packageName: "@emsenn/organizing-with-openai-codex-in-vs-code",
    summary: "Read the VS Code cockpit composition as a stable JSON carrier.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "compute-impact",
    route: "/api/impact",
    packageName: "@emsenn/organizing-with-openai-codex",
    summary: "Compute package and command impact for the current worktree.",
    readOnly: true,
    writesWorkspace: false,
  },
  {
    name: "prepare-handoff",
    route: "/handoff",
    packageName: "@emsenn/organizing-with-openai-codex",
    summary: "Project session findings and verification into a next-session handoff.",
    readOnly: true,
    writesWorkspace: false,
  },
]);

export const defaultCockpitReadinessChecks: readonly CockpitReadinessCheck[] = Object.freeze([
  {
    id: "workspace-visible",
    label: "Workspace package graph is visible",
    required: true,
    evidence: "pnpm-workspace.yaml includes this package and the dev site.",
  },
  {
    id: "codex-upstream-built",
    label: "Codex upstream package builds",
    required: true,
    evidence: "@emsenn/organizing-with-openai-codex exports session, impact, and harness surfaces.",
  },
  {
    id: "mcp-configured",
    label: "MCP and LSP bridge files are present",
    required: true,
    evidence: ".mcp.json, .lsp-mcp.json, and .vscode/mcp.json are cockpit attachments.",
  },
  {
    id: "site-composes-cockpit",
    label: "dev.bare-cedar-fog.emsenn.net projects the same cockpit carrier",
    required: true,
    evidence: "/api/cockpit and the HTML page share the same CodexInVsCodeCockpit value.",
  },
]);

export function codexInVsCodeCockpit(input: CodexInVsCodeCockpitInput = {}): CodexInVsCodeCockpit {
  return vsCodeAgentCockpit({
    subject: input.subject ?? "dev.bare-cedar-fog.emsenn.net/codex-in-vs-code",
    provider: "codex",
    upstreamPackage: "@emsenn/organizing-with-openai-codex",
    commands: input.commands ?? defaultCockpitCommands,
    readinessChecks: input.readinessChecks ?? defaultCockpitReadinessChecks,
  });
}

export const defaultCodexInVsCodeCockpit = codexInVsCodeCockpit();

function observeCodexUpstream(root: string): CockpitReadinessObservation {
  const packageJson = readText(root, "lib/organizing-with-openai-codex/package.json");
  const observed: string[] = [];
  const missing: string[] = [];
  if (packageJson === null) {
    missing.push("lib/organizing-with-openai-codex/package.json");
  } else {
    observed.push("lib/organizing-with-openai-codex/package.json");
    for (const exportedSurface of ["./session", "./harness", "./inference"]) {
      if (packageJson.includes(`"${exportedSurface}"`)) observed.push(`export: ${exportedSurface}`);
      else missing.push(`export: ${exportedSurface}`);
    }
  }
  for (const sourcePath of [
    "lib/organizing-with-openai-codex/src/session/index.mts",
    "lib/organizing-with-openai-codex/src/harness.mts",
    "lib/organizing-with-openai-codex/src/inference.mts",
  ]) {
    if (fileExists(root, sourcePath)) observed.push(sourcePath);
    else missing.push(sourcePath);
  }
  return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
}

function observeSiteComposesCockpit(root: string): CockpitReadinessObservation {
  const observed: string[] = [];
  const missing: string[] = [];
  const siteIndex = readText(root, "sites/dev.bare-cedar-fog.emsenn.net/src/index.mts");
  const sitePackage = readText(root, "sites/dev.bare-cedar-fog.emsenn.net/package.json");
  if (siteIndex?.includes("defaultCodexInVsCodeCockpit") === true) {
    observed.push("sites/dev.bare-cedar-fog.emsenn.net/src/index.mts imports defaultCodexInVsCodeCockpit");
  } else {
    missing.push("sites/dev.bare-cedar-fog.emsenn.net/src/index.mts imports defaultCodexInVsCodeCockpit");
  }
  if (siteIndex?.includes("/api/cockpit.json") === true) {
    observed.push("sites/dev.bare-cedar-fog.emsenn.net/src/index.mts writes /api/cockpit.json");
  } else {
    missing.push("sites/dev.bare-cedar-fog.emsenn.net/src/index.mts writes /api/cockpit.json");
  }
  if (sitePackage?.includes('"@emsenn/organizing-with-openai-codex-in-vs-code"') === true) {
    observed.push("sites/dev.bare-cedar-fog.emsenn.net/package.json depends on cockpit carrier");
  } else {
    missing.push("sites/dev.bare-cedar-fog.emsenn.net/package.json depends on cockpit carrier");
  }
  return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
}

export const codexCockpitReadinessObservers: CockpitReadinessObservers = Object.freeze({
  "workspace-visible": workspaceVisibleObserver([
    "sites/dev.bare-cedar-fog.emsenn.net",
    "lib/organizing-with-openai-codex-in-vs-code",
    "lib/organizing-with-openai-codex",
  ]),
  "codex-upstream-built": observeCodexUpstream,
  "mcp-configured": observeDevMcpConfigured,
  "site-composes-cockpit": observeSiteComposesCockpit,
});

/** Evaluate the Codex cockpit's readiness using the Codex observers. */
export function evaluateCockpitReadiness(
  options: Readonly<{ root: string; cockpit: CodexInVsCodeCockpit }>,
): CockpitReadinessReport {
  return evaluateGenericCockpitReadiness({
    root: options.root,
    cockpit: options.cockpit,
    observers: codexCockpitReadinessObservers,
  });
}

function observeDevMcpConfigured(root: string): CockpitReadinessObservation {
  const base = mcpConfiguredObserver()(root);
  const observed = [...base.observed];
  const missing = [...base.missing];
  const text = readText(root, ".mcp.json");
  if (text === null) {
    missing.push(".mcp.json");
    return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    const servers = isJsonRecord(parsed) && isJsonRecord(parsed["mcpServers"]) ? parsed["mcpServers"] : null;
    const dev = servers !== null && isJsonRecord(servers["dev-bare-cedar-fog-emsenn-net"]) ? servers["dev-bare-cedar-fog-emsenn-net"] : null;
    const devUrl = dev === null ? null : dev["url"];
    if (devUrl === "http://127.0.0.1:18801/mcp") {
      observed.push("dev-bare-cedar-fog-emsenn-net MCP: http://127.0.0.1:18801/mcp");
    } else {
      missing.push("dev-bare-cedar-fog-emsenn-net MCP: http://127.0.0.1:18801/mcp");
    }
    if (servers !== null && "operations-manifold" in servers) {
      missing.push("no operations-manifold MCP server in agent workspace config");
    } else {
      observed.push("no operations-manifold MCP server in agent workspace config");
    }
  } catch {
    missing.push("parse .mcp.json for dev-bare-cedar-fog-emsenn-net server");
  }
  return Object.freeze({ observed: Object.freeze(observed), missing: Object.freeze(missing) });
}

function isJsonRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
