import type { ChangeImpact } from "@red-cup-engineering/organizing-with-openai-codex/session";
import type { PredicationTerm } from "@emsenn/relating";

import type { CodexBridgeWork, CodexHolographyProjection } from "./holography/llm/codex.mts";
import { codexGovernanceDecisions } from "./operating/governing/dispatching/readiness.mts";
import {
  CODEX_PLATFORM_SESSION,
  codexFindingSummary,
  codexPlatformCapabilities,
  type CodexFindingSummary,
  type CodexPlatformCapability,
} from "./codecs/codex.mts";
import { queryApiIndex, type ApiIndexQueryResult } from "./api-index.mts";
import type { SitePlayReading } from "./site-play.mts";
import { officeName, termKey, workPriority, workPrompt, workStatusName, workTitle } from "./work-carriers.mts";

export type AgentPlatformCapability = CodexPlatformCapability;
export type FindingSummary = CodexFindingSummary;
export type AgentPlatformWork = CodexBridgeWork;

export type AgentPlatformDetail = "summary" | "full";

export type AgentPlatformReading = Readonly<{
  kind: "operations-manifold.read-agent-platform";
  generatedAt: string;
  focus: string | null;
  session: CodexHolographyProjection["session"];
  capabilities: CodexHolographyProjection["capabilities"];
  findings: CodexHolographyProjection["findings"];
  recall: CodexHolographyProjection["recall"];
  impact: ChangeImpact;
  offices: CodexHolographyProjection["offices"];
  provisions: CodexHolographyProjection["provisions"];
  governance: CodexHolographyProjection["governance"];
  project: CodexHolographyProjection["project"];
  work: readonly AgentPlatformWork[];
  reports: CodexHolographyProjection["reports"];
  sitePlay: SitePlayReading;
  next: CodexHolographyProjection["next"];
}>;

export type AgentPlatformProjection = Readonly<{
  kind: "operations-manifold.read-agent-platform.projection";
  generatedAt: string;
  focus: string | null;
  session: AgentPlatformReading["session"];
  capabilities: readonly AgentPlatformCapability[];
  findings: readonly FindingSummary[];
  recall: AgentPlatformReading["recall"];
  impact: Readonly<{
    changedFiles: number;
    packages: number;
    rootChanges: number;
    suggestedCommands: readonly string[];
  }>;
  governance: readonly Readonly<{
    operation: string;
    ready: boolean;
    gap: string;
    delta: string;
  }>[];
  work: readonly Readonly<{
    id: string;
    title: string;
    status: string;
    priority: number;
    office: string;
    prompt: string;
    ready: boolean;
    gap: string;
    workType: string;
  }>[];
  sitePlay: Readonly<{
    steps: number;
    interrupts: number;
    workItems: number;
    settlement: string;
    operations: readonly Readonly<{ endpoint: string; status: string }>[];
  }>;
  next: readonly Readonly<{
    id: string;
    title: string;
    status: string;
    priority: number;
  }>[];
  full: Readonly<{
    script: "read-agent-platform";
    params: Readonly<{ detail: "full"; focus?: string }>;
  }>;
}>;

export type AgentPlatformResult = AgentPlatformReading | AgentPlatformProjection;

export async function agentPlatform(
  repoRoot: string,
  params: Readonly<{ focus?: string | undefined; detail?: AgentPlatformDetail | string | undefined; limit?: string | number | undefined }> = {},
): Promise<AgentPlatformResult> {
  const detail = params.detail === "full" ? "full" : "summary";
  const limit = normalizedLimit(params.limit, 12);
  const generatedAt = new Date().toISOString();
  if (detail !== "full") {
    const api = await queryApiIndex(repoRoot, { focus: params.focus ?? "sites/ops.561.group", limit });
    return agentPlatformSummaryProjection({ generatedAt, focus: params.focus, api, limit });
  }

  const [
    { gitStatus },
    { computeImpact, loadWorkspace },
    { sitePlay },
    { codexHolographyProjection },
  ] = await Promise.all([
    import("@red-cup-engineering/computing/git"),
    import("@red-cup-engineering/organizing-with-openai-codex/session"),
    import("./site-play.mts"),
    import("./holography/llm/codex.mts"),
  ]);
  const impact = computeImpact(await loadWorkspace(repoRoot), await gitStatus(repoRoot));
  const play = await sitePlay(repoRoot, { focus: params.focus ?? "@emsenn/koios.news" });
  const codex = codexHolographyProjection({ generatedAt, focus: params.focus, impact, play });

  const full = Object.freeze({
    kind: "operations-manifold.read-agent-platform" as const,
    generatedAt,
    focus: play.focus,
    session: codex.session,
    capabilities: codex.capabilities,
    findings: codex.findings,
    recall: codex.recall,
    impact,
    offices: codex.offices,
    provisions: codex.provisions,
    governance: codex.governance,
    project: codex.project,
    work: codex.work,
    reports: codex.reports,
    sitePlay: play,
    next: codex.next,
  });
  return detail === "full" ? full : agentPlatformProjection(full, { limit, focus: params.focus });
}

function normalizedLimit(value: string | number | undefined, fallback: number): number {
  const raw = typeof value === "string" ? Number(value) : value;
  return raw === undefined || !Number.isFinite(raw) ? fallback : Math.max(1, Math.min(100, Math.floor(raw)));
}

function agentPlatformSummaryProjection(input: {
  readonly generatedAt: string;
  readonly focus: string | undefined;
  readonly api: ApiIndexQueryResult;
  readonly limit: number;
}): AgentPlatformProjection {
  const capabilities = codexPlatformCapabilities();
  const findings = Object.freeze([
    codexFindingSummary(["operations-manifold", "read-agent-platform"], "has-capability-map", capabilities.every((item) => item.status !== "gap") ? "potential" : "stable", `${capabilities.length} benchmark capabilities mapped`),
    codexFindingSummary(["operations-manifold", "api-index"], "has-persisted-codebase-index", input.api.index.stale ? "stable" : "active", input.api.index.stale ? "api index is stale or absent" : `${input.api.index.symbols} indexed symbol(s)`),
    codexFindingSummary(["operations-manifold", "execution-impact"], "has-change-impact", "potential", "impact is not computed in summary mode; request detail=full"),
    codexFindingSummary(["operations-manifold", "read-site-play"], "has-read-site-play", "potential", "read-site-play is not computed in summary mode; request detail=full"),
  ]);
  const session = Object.freeze({
    kind: "operations-manifold.codex.platform.session" as const,
    id: CODEX_PLATFORM_SESSION,
    agent: "operations-manifold",
    at: input.generatedAt,
    metadata: Object.freeze({
      benchmark: "agentic platform runtimes",
      focus: input.focus ?? "sites/ops.561.group",
    }),
  });
  const work = Object.freeze(input.api.functions.slice(0, input.limit).map((item) => Object.freeze({
      id: `${item.package}:${item.name}`,
      title: item.name,
      status: "active",
      priority: 70,
      office: "operations-manifold.engineering",
      prompt: item.signature,
      ready: true,
      gap: "none",
      workType: "process",
    })));

  return Object.freeze({
    kind: "operations-manifold.read-agent-platform.projection" as const,
    generatedAt: input.generatedAt,
    focus: input.api.filters.package ?? input.focus ?? null,
    session,
    capabilities,
    findings,
    recall: Object.freeze(Object.fromEntries(findings.map((item) => [item.subject.join("/"), item.value]))),
    impact: Object.freeze({
      changedFiles: 0,
      packages: 0,
      rootChanges: 0,
      suggestedCommands: Object.freeze([]),
    }),
    governance: Object.freeze(codexGovernanceDecisions().slice(0, input.limit).map((entry) => Object.freeze({
      operation: operationName(entry.operation),
      ready: entry.eligible,
      gap: entry.readiness.gap,
      delta: entry.readiness.delta,
    }))),
    work,
    sitePlay: Object.freeze({
      steps: 0,
      interrupts: 0,
      workItems: 0,
      settlement: "potential",
      operations: Object.freeze([]),
    }),
    next: Object.freeze(work.map((item) => Object.freeze({
      id: item.id,
      title: item.title,
      status: item.status,
      priority: item.priority,
    }))),
    full: Object.freeze({
      script: "read-agent-platform" as const,
      params: Object.freeze({
        detail: "full" as const,
        ...(input.focus === undefined ? {} : { focus: input.focus }),
      }),
    }),
  });
}

export function agentPlatformProjection(
  reading: AgentPlatformReading,
  options: Readonly<{ limit?: number | undefined; focus?: string | undefined }> = {},
): AgentPlatformProjection {
  const limit = normalizedLimit(options.limit, 12);
  return Object.freeze({
    kind: "operations-manifold.read-agent-platform.projection" as const,
    generatedAt: reading.generatedAt,
    focus: reading.focus,
    session: reading.session,
    capabilities: reading.capabilities,
    findings: reading.findings,
    recall: reading.recall,
    impact: Object.freeze({
      changedFiles: reading.impact.changedFiles.length,
      packages: reading.impact.packageImpacts.length,
      rootChanges: reading.impact.rootChanges.length,
      suggestedCommands: Object.freeze(reading.impact.suggestedCommands.slice(0, limit)),
    }),
    governance: Object.freeze(reading.governance.slice(0, limit).map((entry) => Object.freeze({
      operation: operationName(entry.operation),
      ready: entry.eligible,
      gap: entry.readiness.gap,
      delta: entry.readiness.delta,
    }))),
    work: Object.freeze(reading.work.slice(0, limit).map((entry) => Object.freeze({
      id: termKey(entry.item.term),
      title: workTitle(entry.item),
      status: workStatusName(entry.item),
      priority: workPriority(entry.item),
      office: officeName(entry.item.office, "operations-manifold.engineering"),
      prompt: workPrompt(entry.item),
      ready: entry.readiness.ready,
      gap: entry.readiness.gap,
      workType: entry.workType,
    }))),
    sitePlay: Object.freeze({
      steps: reading.sitePlay.steps.length,
      interrupts: reading.sitePlay.interrupts.length,
      workItems: reading.sitePlay.workItems.length,
      settlement: reading.sitePlay.settlement.value,
      operations: Object.freeze(reading.sitePlay.createCheckpoint.operations.slice(0, limit).map((operation) => Object.freeze({
        endpoint: operation.endpoint,
        status: operation.status,
      }))),
    }),
    next: Object.freeze(reading.next.slice(0, limit).map((item) => Object.freeze({
      id: termKey(item.term),
      title: workTitle(item),
      status: workStatusName(item),
      priority: workPriority(item),
    }))),
    full: Object.freeze({
      script: "read-agent-platform" as const,
      params: Object.freeze({
        detail: "full" as const,
        ...(options.focus === undefined ? {} : { focus: options.focus }),
      }),
    }),
  });
}

function operationName(value: PredicationTerm): string {
  const raw = value.mark.value;
  return Array.isArray(raw) && raw[0] === "operation" && typeof raw[1] === "string" ? raw[1] : termKey(value);
}
