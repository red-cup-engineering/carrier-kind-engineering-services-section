/** Agent context image. */
import type { JsonValue } from "../lib/codecs/json/core.mts";
import { contentAddress } from "../lib/identity/index.mts";
import type { ChargeValueName } from "../lib/values/index.mts";

export type AgentContextLayerName =
  | "boot"
  | "orientation"
  | "monitoring"
  | "work-dispatch"
  | "skill-proposals"
  | "prior-context"
  | "tool-surface"
  | "token-window"
  | "writeback";

export type AgentContextPageState = "resident" | "required" | "evicted";
export type AgentContextPressure = "under" | "near" | "over";

export interface AgentContextPage {
  readonly kind: "metroplat.agent.context-page";
  readonly id: string;
  readonly layer: AgentContextLayerName;
  readonly state: AgentContextPageState;
  readonly priority: number;
  readonly tokenEstimate: number;
  readonly source: string;
  readonly summary: string;
  readonly material?: JsonValue;
  readonly evidence: readonly string[];
}

export interface AgentContextPageFault {
  readonly kind: "metroplat.agent.context-page-fault";
  readonly layer: AgentContextLayerName;
  readonly reason: string;
  readonly requiredBefore: "dispatch" | "tool-call" | "writeback";
  readonly evidence: readonly string[];
}

export interface AgentContextWritebackDuty {
  readonly kind: "metroplat.agent.context-writeback-duty";
  readonly id: string;
  readonly state: "required" | "satisfied";
  readonly target: string;
  readonly evidence: readonly string[];
}

export interface AgentContextWindow {
  readonly kind: "metroplat.agent.context-window";
  readonly capacity: number;
  readonly residentTokens: number;
  readonly requiredTokens: number;
  readonly pressure: AgentContextPressure;
  readonly evidence: readonly string[];
}

export interface AgentContextImageInput {
  readonly date: string;
  readonly actor?: string;
  readonly goal?: string;
  readonly budget?: number;
  readonly orientation?: JsonValue;
  /** Source-code monitor aggregate (`SourceCodeMonitorAggregate`).
   *  When supplied, the context image carries a `"monitoring"` resident page
   *  and `diagnoseAgentContext` surfaces the package-level paraconsistent charge. */
  readonly monitoring?: JsonValue;
  /** Proof-health monitor aggregate (`MonitorAggregate`, domain `"proof-health"`).
   *  When supplied, the context image carries a `"proof-health"` resident page
   *  and `diagnoseAgentContext` surfaces the domain-level paraconsistent charge. */
  readonly proofHealth?: JsonValue;
  readonly workDispatch?: JsonValue;
  readonly skillProposals?: JsonValue;
  readonly priorContext?: JsonValue;
  readonly tokenUsage?: JsonValue;
  readonly toolSurface?: JsonValue;
  readonly failures?: readonly string[];
}

export interface AgentContextImage {
  readonly kind: "metroplat.agent.context-image";
  readonly id: string;
  readonly date: string;
  readonly actor: string;
  readonly goal: string;
  readonly policy: "boot-agent-process-from-recorded-context";
  readonly pages: readonly AgentContextPage[];
  readonly window: AgentContextWindow;
  readonly pageFaults: readonly AgentContextPageFault[];
  readonly writeback: readonly AgentContextWritebackDuty[];
  readonly bootOrder: readonly string[];
  readonly dispatchState: "ready" | "waiting";
  readonly failures?: readonly string[];
  readonly evidence: readonly string[];
}

export interface AgentContextDiagnosis {
  readonly kind: "metroplat.agent.context-diagnosis";
  readonly id: string;
  readonly observation: string;
  readonly condition: "ready" | "missing-evidence" | "contested" | "coordination-obstruction";
  readonly context: ChargeValueName;
  readonly coordination: ChargeValueName;
  readonly coordinationCost: number;
  /** Paraconsistent charge of the codebase Monitor aggregate.
   *  Sourced from `SourceCodeMonitorAggregate.charge` on the `"monitoring"` page.
   *  `"unknown"` when no monitoring data is resident in the context image. */
  readonly monitoringCharge: ChargeValueName;
  /** Paraconsistent charge of the proof-health Monitor aggregate.
   *  Sourced from the `MonitorAggregate.charge` on the `"page:proof-health"` page.
   *  `"unknown"` when no proof-health data is resident in the context image. */
  readonly proofHealthCharge: ChargeValueName;
  readonly missing: readonly AgentContextLayerName[];
  readonly rules: readonly string[];
  readonly evidence: readonly string[];
}

const DEFAULT_ACTOR = "agent:codex";
const DEFAULT_GOAL = "continue governed metroplat development";
const DEFAULT_CONTEXT_BUDGET = 24_000;

function record(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, JsonValue> : undefined;
}

function records(value: JsonValue | undefined): readonly Record<string, JsonValue>[] {
  return Array.isArray(value)
    ? Object.freeze(value.map(record).filter((entry): entry is Record<string, JsonValue> => entry !== undefined))
    : Object.freeze([]);
}

function stringOf(value: JsonValue | undefined, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function approxTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / 4);
}

function page(input: {
  readonly id: string;
  readonly layer: AgentContextLayerName;
  readonly state: AgentContextPageState;
  readonly priority: number;
  readonly source: string;
  readonly summary: string;
  readonly material?: JsonValue;
  readonly evidence: readonly string[];
}): AgentContextPage {
  return Object.freeze({
    kind: "metroplat.agent.context-page" as const,
    id: input.id,
    layer: input.layer,
    state: input.state,
    priority: input.priority,
    tokenEstimate: input.material === undefined ? approxTokens(input.summary) : approxTokens(input.material),
    source: input.source,
    summary: input.summary,
    ...(input.material === undefined ? {} : { material: input.material }),
    evidence: Object.freeze(input.evidence),
  });
}

function fault(
  layer: AgentContextLayerName,
  reason: string,
  requiredBefore: AgentContextPageFault["requiredBefore"],
  evidence: readonly string[],
): AgentContextPageFault {
  return Object.freeze({
    kind: "metroplat.agent.context-page-fault" as const,
    layer,
    reason,
    requiredBefore,
    evidence: Object.freeze(evidence),
  });
}

function writebackDuty(id: string, state: "required" | "satisfied", target: string, evidence: readonly string[]): AgentContextWritebackDuty {
  return Object.freeze({
    kind: "metroplat.agent.context-writeback-duty" as const,
    id,
    state,
    target,
    evidence: Object.freeze(evidence),
  });
}

function pressureOf(residentTokens: number, capacity: number): AgentContextPressure {
  if (residentTokens > capacity) return "over";
  if (residentTokens > capacity * 0.8) return "near";
  return "under";
}

function contextWindow(pages: readonly AgentContextPage[], capacity: number): AgentContextWindow {
  const residentTokens = pages
    .filter((candidate) => candidate.state === "resident")
    .reduce((sum, candidate) => sum + candidate.tokenEstimate, 0);
  const requiredTokens = pages
    .filter((candidate) => candidate.state !== "evicted")
    .reduce((sum, candidate) => sum + candidate.tokenEstimate, 0);
  return Object.freeze({
    kind: "metroplat.agent.context-window" as const,
    capacity,
    residentTokens,
    requiredTokens,
    pressure: pressureOf(residentTokens, capacity),
    evidence: Object.freeze([
      `capacity:${capacity}`,
      `resident-tokens:${residentTokens}`,
      `required-tokens:${requiredTokens}`,
    ]),
  });
}

function monitoringChargeOf(monitoring: JsonValue | undefined): string {
  const m = record(monitoring);
  const charge = m?.["charge"];
  return typeof charge === "string" ? charge : "unknown";
}

function workDispatchQueueCount(workDispatch: JsonValue | undefined): number {
  return records(record(workDispatch)?.["queue"]).length;
}

function toolSurfaceActionCount(toolSurface: JsonValue | undefined): number {
  const surface = record(toolSurface);
  const actions = records(surface?.["actions"]);
  const tools = records(surface?.["tools"]);
  return Math.max(actions.length, tools.length);
}

function tokenWindowEvidence(tokenUsage: JsonValue | undefined): readonly string[] {
  const usage = record(tokenUsage);
  const total = record(usage?.["total"]);
  const attributes = record(usage?.["genAiAttributes"]);
  const modelContextWindow = usage?.["modelContextWindow"];
  const pressure = usage?.["contextWindowPressure"];
  return Object.freeze([
    ...(typeof modelContextWindow === "number" ? [`model-context-window:${modelContextWindow}`] : ["model-context-window:unknown"]),
    ...(typeof total?.["totalTokens"] === "number" ? [`used-tokens:${total["totalTokens"]}`] : ["used-tokens:unknown"]),
    ...(typeof pressure === "number" ? [`context-window-pressure:${pressure}`] : []),
    ...(typeof attributes?.["gen_ai.usage.cache_read.input_tokens"] === "number" ? [`cache-read-tokens:${attributes["gen_ai.usage.cache_read.input_tokens"]}`] : []),
    ...(typeof attributes?.["gen_ai.usage.reasoning.output_tokens"] === "number" ? [`reasoning-output-tokens:${attributes["gen_ai.usage.reasoning.output_tokens"]}`] : []),
  ]);
}

function stringArray(value: JsonValue | undefined): readonly string[] {
  return Array.isArray(value)
    ? Object.freeze(value.filter((entry): entry is string => typeof entry === "string"))
    : Object.freeze([]);
}

function priorContextSources(priorContext: JsonValue | undefined): readonly Record<string, JsonValue>[] {
  return records(record(priorContext)?.["sources"]);
}

function priorContextRecallFacets(priorContext: JsonValue | undefined): readonly string[] {
  return stringArray(record(record(priorContext)?.["recallPolicy"])?.["facets"]);
}

function priorContextCoveredFacets(priorContext: JsonValue | undefined): ReadonlySet<string> {
  return new Set(priorContextSources(priorContext).flatMap((source) => stringArray(source["policyFacets"])));
}

function priorContextMissingFacetPages(priorContext: JsonValue): readonly AgentContextPage[] {
  const covered = priorContextCoveredFacets(priorContext);
  return Object.freeze(priorContextRecallFacets(priorContext)
    .filter((facet) => !covered.has(facet))
    .map((facet, index) => page({
      id: `page:prior-context:facet:${facet}`,
      layer: "prior-context",
      state: "required",
      priority: 96 - Math.min(index, 12),
      source: "recall-policy",
      summary: `recall policy facet ${facet} has no resident memory source`,
      material: Object.freeze({
        kind: "metroplat.agent.context-missing-recall-facet",
        facet,
      }) as JsonValue,
      evidence: Object.freeze(["recall-facet:missing", `facet:${facet}`]),
    })));
}

function priorContextHeader(priorContext: JsonValue): JsonValue {
  const context = record(priorContext);
  if (context === undefined) return priorContext;
  return Object.freeze({
    kind: context["kind"] ?? "metroplat.agent.prior-context-synthesis",
    substrate: context["substrate"] ?? "unknown",
    query: context["query"] ?? "unknown",
    recallPolicy: context["recallPolicy"] ?? Object.freeze({}),
    sources: priorContextSources(priorContext).length,
    claims: stringArray(context["claims"]),
    openQuestions: stringArray(context["openQuestions"]),
    evidence: stringArray(context["evidence"]),
  }) as JsonValue;
}

function priorContextSummary(priorContext: JsonValue | undefined): string {
  const context = record(priorContext);
  if (context === undefined) return "prior context synthesis resident";
  const substrate = typeof context["substrate"] === "string" ? context["substrate"] : "unknown-substrate";
  return `prior context synthesis resident from ${substrate}; sources:${priorContextSources(priorContext).length}`;
}

function priorContextSourcePage(source: Record<string, JsonValue>, index: number): AgentContextPage {
  const path = stringOf(source["path"], `prior-context-source-${index + 1}`);
  const address = stringOf(source["address"], path);
  const role = stringOf(source["role"], "memory-source");
  const matchedTerms = stringArray(source["matchedTerms"]);
  const evidence = stringArray(source["evidence"]);
  return page({
    id: `page:prior-context:${index + 1}`,
    layer: "prior-context",
    state: "resident",
    priority: 97 - Math.min(index, 12),
    source: address,
    summary: `${role}:${path} matched-terms:${matchedTerms.length}`,
    material: source as unknown as JsonValue,
    evidence: Object.freeze([
      "prior-context-source:resident",
      `address:${address}`,
      ...(matchedTerms.length === 0 ? [] : [`matched-terms:${matchedTerms.join(",")}`]),
      ...evidence,
    ]),
  });
}

function pagesOf(input: AgentContextImageInput): readonly AgentContextPage[] {
  const pages: AgentContextPage[] = [
    page({
      id: "page:boot-goal",
      layer: "boot",
      state: "resident",
      priority: 100,
      source: "operator-prompt",
      summary: input.goal ?? DEFAULT_GOAL,
      evidence: Object.freeze(["boot:goal"]),
    }),
  ];

  pages.push(page({
    id: "page:orientation",
    layer: "orientation",
    state: input.orientation === undefined ? "required" : "resident",
    priority: 95,
    source: "agent-orientation",
    summary: input.orientation === undefined ? "root and package orientation must be paged before dispatch" : "orientation settlement resident",
    ...(input.orientation === undefined ? {} : { material: input.orientation }),
    evidence: Object.freeze([input.orientation === undefined ? "orientation:page-fault" : "orientation:resident"]),
  }));

  pages.push(page({
    id: "page:monitoring",
    layer: "monitoring",
    state: input.monitoring === undefined ? "evicted" : "resident",
    priority: 88,
    source: "source-code-monitor-aggregate",
    summary: input.monitoring === undefined
      ? "codebase monitor aggregate not supplied"
      : `codebase monitor aggregate resident; charge:${monitoringChargeOf(input.monitoring)}`,
    ...(input.monitoring === undefined ? {} : { material: input.monitoring }),
    evidence: Object.freeze([
      input.monitoring === undefined ? "monitoring:not-observed" : `monitoring-charge:${monitoringChargeOf(input.monitoring)}`,
    ]),
  }));

  pages.push(page({
    id: "page:proof-health",
    layer: "monitoring",
    state: input.proofHealth === undefined ? "evicted" : "resident",
    priority: 87,
    source: "proof-health-monitor-aggregate",
    summary: input.proofHealth === undefined
      ? "proof-health monitor aggregate not supplied"
      : `proof-health monitor aggregate resident; charge:${monitoringChargeOf(input.proofHealth)}`,
    ...(input.proofHealth === undefined ? {} : { material: input.proofHealth }),
    evidence: Object.freeze([
      input.proofHealth === undefined ? "proof-health:not-observed" : `proof-health-charge:${monitoringChargeOf(input.proofHealth)}`,
    ]),
  }));

  pages.push(page({
    id: "page:work-dispatch",
    layer: "work-dispatch",
    state: input.workDispatch === undefined ? "required" : "resident",
    priority: 90,
    source: "agent-work-dispatch",
    summary: input.workDispatch === undefined ? "settled work dispatch missing" : `dispatch queue:${workDispatchQueueCount(input.workDispatch)}`,
    ...(input.workDispatch === undefined ? {} : { material: input.workDispatch }),
    evidence: Object.freeze([input.workDispatch === undefined ? "work-dispatch:page-fault" : `dispatch-queue:${workDispatchQueueCount(input.workDispatch)}`]),
  }));

  pages.push(page({
    id: "page:skill-proposals",
    layer: "skill-proposals",
    state: input.skillProposals === undefined ? "evicted" : "resident",
    priority: 85,
    source: "skill-proposals",
    summary: input.skillProposals === undefined ? "no skill-proposal observation supplied" : "skill-proposal observation resident",
    ...(input.skillProposals === undefined ? {} : { material: input.skillProposals }),
    evidence: Object.freeze([input.skillProposals === undefined ? "skill-proposals:not-observed" : "skill-proposals:resident"]),
  }));

  pages.push(page({
    id: "page:prior-context",
    layer: "prior-context",
    state: input.priorContext === undefined ? "required" : "resident",
    priority: 98,
    source: "prior-context-substrate",
    summary: input.priorContext === undefined
      ? "prior attempts/corpus synthesis not resident"
      : priorContextSummary(input.priorContext),
    ...(input.priorContext === undefined ? {} : { material: priorContextHeader(input.priorContext) }),
    evidence: Object.freeze([input.priorContext === undefined ? "prior-context:page-fault" : "prior-context:resident"]),
  }));
  if (input.priorContext !== undefined) {
    pages.push(...priorContextSources(input.priorContext).map(priorContextSourcePage));
    pages.push(...priorContextMissingFacetPages(input.priorContext));
  }

  pages.push(page({
    id: "page:tool-surface",
    layer: "tool-surface",
    state: input.toolSurface === undefined ? "required" : "resident",
    priority: 83,
    source: "metroplat-action-surface",
    summary: input.toolSurface === undefined ? "MetroPlat action/tool surface missing" : `MetroPlat actions:${toolSurfaceActionCount(input.toolSurface)}`,
    ...(input.toolSurface === undefined ? {} : { material: input.toolSurface }),
    evidence: Object.freeze([input.toolSurface === undefined ? "tool-surface:page-fault" : `tool-surface-actions:${toolSurfaceActionCount(input.toolSurface)}`]),
  }));

  pages.push(page({
    id: "page:token-window",
    layer: "token-window",
    state: input.tokenUsage === undefined ? "required" : "resident",
    priority: 75,
    source: "agent-session-token-usage",
    summary: input.tokenUsage === undefined ? "token window/accounting unavailable" : "token window/accounting resident",
    ...(input.tokenUsage === undefined ? {} : { material: input.tokenUsage }),
    evidence: tokenWindowEvidence(input.tokenUsage),
  }));

  pages.push(page({
    id: "page:writeback-duties",
    layer: "writeback",
    state: "resident",
    priority: 70,
    source: "agent-context-image",
    summary: "effect report, context delta, token usage, and learning candidates must be written back",
    evidence: Object.freeze(["writeback:effect-report", "writeback:context-delta", "writeback:learning-candidate"]),
  }));

  return Object.freeze(pages);
}

function faultsOf(pages: readonly AgentContextPage[]): readonly AgentContextPageFault[] {
  return Object.freeze(pages.flatMap((candidate) => {
    if (candidate.state !== "required") return [];
    if (candidate.layer === "orientation") return [fault(candidate.layer, "orientation page is not resident", "dispatch", candidate.evidence)];
    if (candidate.layer === "work-dispatch") return [fault(candidate.layer, "settled work dispatch is not resident", "dispatch", candidate.evidence)];
    if (candidate.layer === "prior-context" && candidate.evidence.includes("recall-facet:missing")) {
      return [fault(candidate.layer, candidate.summary, "tool-call", candidate.evidence)];
    }
    if (candidate.layer === "prior-context") return [fault(candidate.layer, "prior context synthesis is not resident", "tool-call", candidate.evidence)];
    if (candidate.layer === "token-window") return [fault(candidate.layer, "token window accounting is not resident", "tool-call", candidate.evidence)];
    if (candidate.layer === "tool-surface") return [fault(candidate.layer, `${candidate.source} is not resident`, "tool-call", candidate.evidence)];
    return [];
  }));
}

function writebackOf(input: AgentContextImageInput): readonly AgentContextWritebackDuty[] {
  return Object.freeze([
    writebackDuty("writeback:effect-report", "required", "data/journals/work-ledger", Object.freeze(["effects must be recorded before publication"])),
    writebackDuty("writeback:context-delta", "required", "agent-session/continuation", Object.freeze(["newly learned context must be carried forward"])),
    writebackDuty(
      "writeback:token-usage",
      input.tokenUsage === undefined ? "required" : "satisfied",
      "agent-session/token-usage",
      Object.freeze([input.tokenUsage === undefined ? "token-usage:missing" : "token-usage:resident"]),
    ),
    writebackDuty("writeback:learning-candidate", "required", "skill-or-memory-review", Object.freeze(["learning is reviewable, not self-installed"])),
  ]);
}

export function agentContextImage(input: AgentContextImageInput): AgentContextImage {
  const pages = pagesOf(input);
  const capacity = input.budget ?? DEFAULT_CONTEXT_BUDGET;
  const window = contextWindow(pages, capacity);
  const pageFaults = faultsOf(pages);
  const failures = input.failures?.filter((entry) => entry.length > 0) ?? [];
  const identity = Object.freeze({
    kind: "metroplat.agent.context-image" as const,
    date: input.date,
    actor: input.actor ?? DEFAULT_ACTOR,
    goal: input.goal ?? DEFAULT_GOAL,
    policy: "boot-agent-process-from-recorded-context" as const,
    pages,
    window,
    pageFaults,
    writeback: writebackOf(input),
    bootOrder: Object.freeze([...pages]
      .filter((candidate) => candidate.state !== "evicted")
      .sort((left, right) => right.priority - left.priority)
      .map((candidate) => candidate.id)),
    dispatchState: pageFaults.some((entry) => entry.requiredBefore === "dispatch") ? "waiting" : "ready",
    ...(failures.length === 0 ? {} : { failures: Object.freeze(failures) }),
    evidence: Object.freeze([
      `pages:${pages.length}`,
      `resident:${pages.filter((candidate) => candidate.state === "resident").length}`,
      `faults:${pageFaults.length}`,
      `pressure:${window.pressure}`,
      "policy:boot-agent-process-from-recorded-context",
    ]),
  });
  return Object.freeze({ ...identity, id: contentAddress(identity as unknown as JsonValue) });
}

/** Read one observed page's material by stable page identity. Downstream
 * analysis and planning consume this projection instead of rereading the host. */
export function agentContextPageMaterial(observation: AgentContextImage, pageId: string): JsonValue | undefined {
  return observation.pages.find((candidate) => candidate.id === pageId)?.material;
}

/** Analyze one observed context without choosing an action. Missing context
 * and coordination remain independent evidence axes. */
export function diagnoseAgentContext(observation: AgentContextImage): AgentContextDiagnosis {
  const dispatch = record(observation.pages.find((candidate) => candidate.id === "page:work-dispatch")?.material);
  const monitoringPage = observation.pages.find((candidate) => candidate.id === "page:monitoring");
  const proofHealthPage = observation.pages.find((candidate) => candidate.id === "page:proof-health");
  const coordinationRead = dispatch?.["coordination"];
  const coordinationCostRead = dispatch?.["coordinationCost"];
  const coordinationCost = typeof coordinationCostRead === "number" && Number.isFinite(coordinationCostRead)
    ? Math.max(0, Math.trunc(coordinationCostRead))
    : 0;
  const coordination: ChargeValueName = coordinationRead === "clear" ? "held" : "contested";
  const context: ChargeValueName = observation.pageFaults.length === 0 ? "held" : "unknown";
  // Monitoring charge: sourced from the SourceCodeMonitorAggregate on the monitoring page.
  // "unknown" when no monitoring data is resident — the Monitor (M) phase has not yet run.
  const monitoringCharge: ChargeValueName = monitoringPage?.state === "resident"
    ? (monitoringChargeOf(monitoringPage.material) as ChargeValueName)
    : "unknown";
  // Proof-health charge: sourced from the proof-health MonitorAggregate page.
  const proofHealthCharge: ChargeValueName = proofHealthPage?.state === "resident"
    ? (monitoringChargeOf(proofHealthPage.material) as ChargeValueName)
    : "unknown";
  const condition = coordinationCost > 0
    ? "coordination-obstruction" as const
    : coordinationRead === "contested"
      ? "contested" as const
      : observation.pageFaults.length > 0 ? "missing-evidence" as const : "ready" as const;
  const missing = Object.freeze([...new Set(observation.pageFaults.map((faultRead) => faultRead.layer))]);
  const identity = Object.freeze({
    kind: "metroplat.agent.context-diagnosis" as const,
    observation: observation.id,
    condition,
    context,
    coordination,
    coordinationCost,
    monitoringCharge,
    proofHealthCharge,
    missing,
    rules: Object.freeze([
      "context-held-iff-no-page-faults",
      "coordination-contested-iff-dispatch-not-clear",
      "coordination-obstruction-iff-cost-positive",
      "monitoring-charge-sourced-from-source-code-monitor-aggregate",
      "proof-health-charge-sourced-from-proof-health-monitor-aggregate",
    ]),
    evidence: Object.freeze([
      `observation:${observation.id}`,
      `context:${context}`,
      `coordination:${coordination}`,
      `coordination-cost:${coordinationCost}`,
      `monitoring-charge:${monitoringCharge}`,
      `proof-health-charge:${proofHealthCharge}`,
      `missing:${missing.join(",")}`,
    ]),
  });
  return Object.freeze({ ...identity, id: contentAddress(identity as unknown as JsonValue) });
}
