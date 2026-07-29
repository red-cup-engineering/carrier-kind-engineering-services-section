import { agentPlatform, type AgentPlatformProjection } from "../../../agent-platform.mts";
import { operationsManifoldGoals, type GoalRecord } from "../../../goals.mts";
import { operationsManifoldScriptCatalog } from "../../../package-surface.mts";
import { futureWorkTopology, type FutureWorkResearchGuide } from "../../planning/topologizing/future-work/library/future-work-topology.mts";
import { fileTouchMarket, operationsLedger } from "../../recording/operations/ledgering/library/operation-ledger.mts";
import type { FileTouchMarketAsset } from "../../recording/touching/files/marketing/library/file-touch-market.mts";
import { optionalText } from "../../../records.mts";
import { operationsManifoldWork, type ActiveWorkRecord, type WorkItemKind } from "../../../work-management.mts";

export type EndeavorEnactmentProfileParams = Readonly<{
  focus?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  limit?: string | number | undefined;
}>;

export type EndeavorCarrierKind =
  | "endeavor"
  | "campaign"
  | "mission"
  | "project"
  | "goal"
  | "milestone"
  | "work"
  | "assignment"
  | "capability"
  | "skill"
  | "cost"
  | "agent"
  | "processor"
  | "governance";

export type EndeavorRelationKind =
  | "contains"
  | "depends-on"
  | "contributes-to"
  | "assigned-to"
  | "requires-capability"
  | "requires-skill"
  | "has-cost"
  | "governed-by"
  | "served-by"
  | "offers-interface"
  | "guided-by"
  | "evidenced-by";

export type EndeavorCostBand = "low" | "medium" | "high" | "volatile";
export type EndeavorReadiness = "pass" | "watch" | "block";

export type EndeavorCarrier = Readonly<{
  id: string;
  kind: EndeavorCarrierKind;
  title: string;
  status: string;
  summary: string;
  evidence: readonly string[];
}>;

export type EndeavorRelation = Readonly<{
  from: string;
  to: string;
  kind: EndeavorRelationKind;
  evidence: readonly string[];
}>;

export type EndeavorAssignmentPlan = Readonly<{
  id: string;
  work: string;
  assignee: "codex";
  readiness: EndeavorReadiness;
  costBand: EndeavorCostBand;
  capabilities: readonly string[];
  skills: readonly string[];
  risks: readonly string[];
  nextInterfaces: readonly Readonly<{ bin: string; params: Readonly<Record<string, string>> }>[]; 
  evidence: readonly string[];
}>;

export type EndeavorGovernanceGate = Readonly<{
  id: string;
  readiness: EndeavorReadiness;
  summary: string;
  requiredWitnesses: readonly string[];
  evidence: readonly string[];
}>;

export type EndeavorEnactmentProfile = Readonly<{
  kind: "operations-manifold.derive-endeavor-enactment-profile";
  generatedAt: string;
  domain: Readonly<{
    focus: string;
    intent: string;
  }>;
  sources: Readonly<{
    goals: string;
    work: string;
    operations: string;
    topology: "topologize-future-work";
    fileTouchMarket: "market-file-touch";
    agentPlatform: "read-agent-platform";
    packageBins: "package.json#bin";
    researchLibrary: "content";
  }>;
  summary: Readonly<{
    carriers: number;
    relations: number;
    openGoals: number;
    activeWork: number;
    assignments: number;
    passAssignments: number;
    watchAssignments: number;
    blockAssignments: number;
    capabilities: number;
    skills: number;
    governanceGates: number;
    processors: number;
    researchGuides: number;
  }>;
  carriers: readonly EndeavorCarrier[];
  relations: readonly EndeavorRelation[];
  assignments: readonly EndeavorAssignmentPlan[];
  governance: readonly EndeavorGovernanceGate[];
  researchBasis: readonly Readonly<{ id: string; path: string; claim: string }>[];
  nextInterfaces: readonly Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }>[];
}>;

export async function deriveEndeavorEnactmentProfile(
  repoRoot: string,
  params: EndeavorEnactmentProfileParams = {},
): Promise<EndeavorEnactmentProfile> {
  const focus = optionalText(params.focus) ?? "sites/ops.561.group";
  const intent = optionalText(params.intent ?? params.q) ?? "derive Operations Manifold endeavor enactment";
  const scriptCatalog = operationsManifoldScriptCatalog(repoRoot);
  const [goals, work, operations, topology, touchMarket, platform] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    operationsLedger(repoRoot),
    futureWorkTopology(repoRoot, { focus, intent, limit: params.limit }),
    fileTouchMarket(repoRoot, { focus, limit: "200" }),
    agentPlatform(repoRoot, { focus, limit: params.limit }) as Promise<AgentPlatformProjection>,
  ]);
  const openGoals = goals.goals.filter((goal) => goals.open.includes(goal.id));
  const activeWork = work.items.filter((item) => item.status !== "complete");
  const assignments = activeWork.slice(0, limitValue(params.limit, 24)).map((item) => assignmentFor(item, touchMarket.assets, platform));
  const governance = governanceFor(assignments, topology.guides);
  const carriers = dedupeCarriers([
    carrier("endeavor", "endeavor:operations-manifold", "561 Group Operations Manifold", "active", "The active endeavor of making Operations Manifold the shared agentic work substrate.", [goals.state, work.state, operations.state]),
    ...openGoals.map(goalCarrier),
    ...activeWork.map(workCarrier),
    ...assignments.map(assignmentCarrier),
    ...assignments.flatMap((assignment) => [
      ...assignment.capabilities.map((capability) => carrier("capability", capabilityId(capability), capability, "required", "Capability required by an assignment plan.", [assignment.id, assignment.work])),
      ...assignment.skills.map((skill) => carrier("skill", skillId(skill), skill, "required", "Skill required by an assignment plan.", [assignment.id, assignment.work])),
      carrier("cost", costId(assignment.costBand), `${assignment.costBand} cost`, assignment.costBand, "Cost band projected from file-touch market attention and operation evidence.", assignment.evidence),
    ]),
    ...governance.map((gate) => carrier("governance", gate.id, gate.summary, gate.readiness, "Governance gate for endeavor assignment readiness.", gate.evidence)),
    ...milestoneCarriers(assignments),
    carrier("agent", "agent:codex", "Codex developer agent", "serving", "Codex is the current developer agent serving Operations Manifold work in this session.", ["read-session", "derive-codex-harness-profile"]),
    ...scriptCatalog.scripts.slice(0, 16).map((script) => carrier("processor", processorId(script.name), script.name, "available", "Package-bin processor projected through stdio, HTTP, OpenAPI, MCP, and WebUX.", ["package.json#bin", script.name])),
  ]);
  const carrierIds = new Set(carriers.map((item) => item.id));
  const relations = dedupeRelations([
    ...openGoals.map((goal) => relation("endeavor:operations-manifold", goal.id, "contains", goal.evidence)),
    ...activeWork.map((item) => relation("endeavor:operations-manifold", item.id, "contains", item.evidence)),
    ...activeWork.flatMap((item) => item.dependsOn.map((dependency) => relation(item.id, dependency, "depends-on", item.evidence))),
    ...activeWork.flatMap((item) => item.contributesTo.map((target) => relation(item.id, target, "contributes-to", item.evidence))),
    ...assignments.map((assignment) => relation(assignment.work, assignment.id, "assigned-to", assignment.evidence)),
    ...assignments.map((assignment) => relation(assignment.id, "agent:codex", "served-by", assignment.evidence)),
    ...assignments.flatMap((assignment) => assignment.capabilities.map((capability) => relation(assignment.id, capabilityId(capability), "requires-capability", assignment.evidence))),
    ...assignments.flatMap((assignment) => assignment.skills.map((skill) => relation(assignment.id, skillId(skill), "requires-skill", assignment.evidence))),
    ...assignments.map((assignment) => relation(assignment.id, costId(assignment.costBand), "has-cost", assignment.evidence)),
    ...assignments.flatMap((assignment) => governance.map((gate) => relation(assignment.id, gate.id, "governed-by", gate.evidence))),
    ...topology.guides.slice(0, 12).map((guide) => relation("endeavor:operations-manifold", guideId(guide.id), "guided-by", [guide.path])),
    ...scriptCatalog.scripts.slice(0, 16).map((script) => relation("endeavor:operations-manifold", processorId(script.name), "offers-interface", ["package.json#bin", script.name])),
  ]).filter((edge) => carrierIds.has(edge.from) && carrierIds.has(edge.to));
  const researchBasis = topology.guides.slice(0, 12).map((guide) => Object.freeze({ id: guide.id, path: guide.path, claim: guide.claim }));
  return Object.freeze({
    kind: "operations-manifold.derive-endeavor-enactment-profile" as const,
    generatedAt: new Date().toISOString(),
    domain: Object.freeze({ focus, intent }),
    sources: Object.freeze({
      goals: goals.state,
      work: work.state,
      operations: operations.state,
      topology: "topologize-future-work" as const,
      fileTouchMarket: "market-file-touch" as const,
      agentPlatform: "read-agent-platform" as const,
      packageBins: "package.json#bin" as const,
      researchLibrary: "content" as const,
    }),
    summary: Object.freeze({
      carriers: carriers.length,
      relations: relations.length,
      openGoals: openGoals.length,
      activeWork: activeWork.length,
      assignments: assignments.length,
      passAssignments: assignments.filter((item) => item.readiness === "pass").length,
      watchAssignments: assignments.filter((item) => item.readiness === "watch").length,
      blockAssignments: assignments.filter((item) => item.readiness === "block").length,
      capabilities: new Set(assignments.flatMap((item) => item.capabilities)).size,
      skills: new Set(assignments.flatMap((item) => item.skills)).size,
      governanceGates: governance.length,
      processors: scriptCatalog.scripts.length,
      researchGuides: researchBasis.length,
    }),
    carriers,
    relations,
    assignments: Object.freeze(assignments),
    governance: Object.freeze(governance),
    researchBasis: Object.freeze(researchBasis),
    nextInterfaces: Object.freeze([
      iface("derive-endeavor-enactment-profile", "refresh this endeavor enactment profile", { focus, intent }),
      iface("topologize-future-work", "inspect future/present/past work topology used by the profile", { focus, intent }),
      iface("select-work-interface", "select the next executable work interface from the topology", { focus, intent }),
      iface("derive-codex-harness-profile", "inspect Codex session, harness gates, and capabilities", { focus, intent }),
      iface("project-context-suit", "assemble bounded context before taking an assignment", { focus, intent }),
      iface("update-work", "record assignment progress or governance evidence", { session: "codex.current-session", evidence: "assignment:..." }),
    ]),
  });
}

function assignmentFor(work: ActiveWorkRecord, assets: readonly FileTouchMarketAsset[], platform: AgentPlatformProjection): EndeavorAssignmentPlan {
  const matchedAssets = assetsFor(work, assets);
  const costBand = costBandFor(work, matchedAssets);
  const capabilities = capabilitiesFor(work);
  const skills = skillsFor(work);
  const risks = risksFor(work, matchedAssets, platform);
  const readiness: EndeavorReadiness = work.gate === "stop" || risks.some((risk) => risk.includes("blocked")) ? "block" : risks.length > 0 || costBand === "volatile" ? "watch" : "pass";
  return Object.freeze({
    id: `assignment:codex:${slug(work.id)}`,
    work: work.id,
    assignee: "codex" as const,
    readiness,
    costBand,
    capabilities: Object.freeze(capabilities),
    skills: Object.freeze(skills),
    risks: Object.freeze(risks),
    nextInterfaces: Object.freeze([
      { bin: "project-context-suit", params: Object.freeze({ focus: work.focus ?? "sites/ops.561.group", intent: work.title }) },
      { bin: "update-work", params: Object.freeze({ id: work.id, session: "codex.current-session", evidence: `assignment:codex:${slug(work.id)}` }) },
      { bin: "handoff-agent", params: Object.freeze({ focus: work.focus ?? "sites/ops.561.group", intent: work.title }) },
    ]),
    evidence: Object.freeze([...new Set([work.id, ...work.evidence.slice(0, 8), ...matchedAssets.flatMap((asset) => asset.evidence.slice(0, 2))])].slice(0, 12)),
  });
}

function capabilitiesFor(work: ActiveWorkRecord): readonly string[] {
  const text = searchable([work.title, work.intent, work.success, work.workKind, ...work.evidence]);
  const out = new Set<string>(["read-work", "record-evidence"]);
  if (includesAny(text, ["webux", "web", "form", "graph"])) out.add("project-webux");
  if (includesAny(text, ["cost", "capability", "skill", "assignment", "dispatch", "govern"])) out.add("govern-dispatch");
  if (includesAny(text, ["heartbeat", "codex", "agent", "harness"])) out.add("operate-agent-harness");
  if (includesAny(text, ["profile", "derive", "topology", "carrier", "grammar"])) out.add("derive-profile");
  if (includesAny(text, ["research", "library", "guide", "theory"])) out.add("curate-research");
  return [...out].sort();
}

function skillsFor(work: ActiveWorkRecord): readonly string[] {
  const text = searchable([work.title, work.intent, work.success, work.workKind, ...work.evidence]);
  const out = new Set<string>(["typescript", "json-stdio", "operations-manifold"]);
  if (includesAny(text, ["graph", "topology", "carrier", "relation"])) out.add("categorical-modeling");
  if (includesAny(text, ["cost", "market", "ledger"])) out.add("ledger-and-market-analysis");
  if (includesAny(text, ["govern", "authority", "human", "dispatch"])) out.add("governance-analysis");
  if (includesAny(text, ["webux", "form"])) out.add("web-interface-projection");
  if (includesAny(text, ["research", "theory", "library"])) out.add("research-synthesis");
  return [...out].sort();
}

function risksFor(work: ActiveWorkRecord, assets: readonly FileTouchMarketAsset[], platform: AgentPlatformProjection): readonly string[] {
  const out: string[] = [];
  if (work.gate === "stop") out.push("blocked-by-stop-gate");
  if (work.blockedBy !== null) out.push(`blocked-by:${work.blockedBy}`);
  if (assets.some((asset) => asset.regime === "volatile")) out.push("volatile-files");
  if (platform.governance.some((item) => !item.ready)) out.push("governance-gap");
  if (work.dependsOn.length > 0) out.push("has-unsettled-dependencies");
  return Object.freeze([...new Set(out)]);
}

function costBandFor(work: ActiveWorkRecord, assets: readonly FileTouchMarketAsset[]): EndeavorCostBand {
  if (assets.some((asset) => asset.regime === "volatile")) return "volatile";
  const attention = assets.reduce((sum, asset) => sum + asset.attention, 0);
  const evidenceCost = work.evidence.length + work.dependsOn.length * 3 + work.contributesTo.length;
  const total = attention + evidenceCost;
  if (total >= 80) return "high";
  if (total >= 24) return "medium";
  return "low";
}

function assetsFor(work: ActiveWorkRecord, assets: readonly FileTouchMarketAsset[]): readonly FileTouchMarketAsset[] {
  const evidence = work.evidence.map((item) => item.split("#", 1)[0] ?? item);
  return Object.freeze(assets.filter((asset) => evidence.some((value) => value.includes(asset.path) || asset.path.includes(value))).slice(0, 8));
}

function governanceFor(assignments: readonly EndeavorAssignmentPlan[], guides: readonly FutureWorkResearchGuide[]): readonly EndeavorGovernanceGate[] {
  return Object.freeze([
    gate("governance:capability-fit", assignments.every((assignment) => assignment.capabilities.length > 0) ? "pass" : "watch", "Every assignment should declare required capabilities.", ["derive-endeavor-enactment-profile", "read-agent-platform"]),
    gate("governance:cost-visibility", assignments.every((assignment) => assignment.costBand !== "volatile") ? "pass" : "watch", "Assignment costs should be visible before dispatch.", ["market-file-touch", "read-operations-ledger"]),
    gate("governance:human-control", guides.some((guide) => guide.id.includes("governance") || guide.claim.toLowerCase().includes("human")) ? "pass" : "watch", "Consequential dispatch should cite governance and human-control research.", guides.map((guide) => guide.path).slice(0, 6)),
    gate("governance:codex-service", assignments.some((assignment) => assignment.assignee === "codex") ? "pass" : "block", "Codex should be an explicit serving agent for developer assignments.", ["read-session", "derive-codex-harness-profile"]),
  ]);
}

function gate(id: string, readiness: EndeavorReadiness, summary: string, evidence: readonly string[]): EndeavorGovernanceGate {
  return Object.freeze({ id, readiness, summary, requiredWitnesses: Object.freeze(evidence.slice(0, 6)), evidence: Object.freeze(evidence.slice(0, 8)) });
}

function milestoneCarriers(assignments: readonly EndeavorAssignmentPlan[]): readonly EndeavorCarrier[] {
  return Object.freeze([
    carrier("milestone", "milestone:endeavor-profile-mounted", "Endeavor profile mounted", assignments.length > 0 ? "in-progress" : "proposed", "Operations Manifold derives a formal endeavor enactment profile from durable state.", assignments.flatMap((assignment) => assignment.evidence).slice(0, 8)),
    carrier("milestone", "milestone:codex-heartbeat-assignment", "Codex heartbeat assignment live", assignments.some((assignment) => assignment.work.includes("heartbeat")) ? "in-progress" : "proposed", "Codex developer work is assigned through heartbeat-facing manifold carriers.", assignments.filter((assignment) => assignment.work.includes("heartbeat")).flatMap((assignment) => assignment.evidence).slice(0, 8)),
  ]);
}

function goalCarrier(goal: GoalRecord): EndeavorCarrier {
  return carrier("goal", goal.id, goal.title, goal.status, goal.text, goal.evidence);
}

function workCarrier(work: ActiveWorkRecord): EndeavorCarrier {
  return carrier(workKindCarrier(work.workKind), work.id, work.title, work.workStatus, work.intent, work.evidence);
}

function assignmentCarrier(assignment: EndeavorAssignmentPlan): EndeavorCarrier {
  return carrier("assignment", assignment.id, `Assign ${assignment.work} to Codex`, assignment.readiness, `Cost ${assignment.costBand}; capabilities ${assignment.capabilities.join(", ")}; skills ${assignment.skills.join(", ")}.`, assignment.evidence);
}

function workKindCarrier(kind: WorkItemKind): EndeavorCarrierKind {
  if (kind === "campaign") return "campaign";
  if (kind === "project") return "project";
  if (kind === "milestone") return "milestone";
  return "work";
}

function carrier(kind: EndeavorCarrierKind, id: string, title: string, status: string, summary: string, evidence: readonly string[]): EndeavorCarrier {
  return Object.freeze({
    id,
    kind,
    title,
    status,
    summary: clip(summary, 260),
    evidence: Object.freeze([...new Set(evidence)].slice(0, 10)),
  });
}

function relation(from: string, to: string, kind: EndeavorRelationKind, evidence: readonly string[]): EndeavorRelation {
  return Object.freeze({ from, to, kind, evidence: Object.freeze([...new Set(evidence)].slice(0, 8)) });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }> {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function capabilityId(value: string): string {
  return `capability:${slug(value)}`;
}

function skillId(value: string): string {
  return `skill:${slug(value)}`;
}

function costId(value: string): string {
  return `cost:${slug(value)}`;
}

function processorId(value: string): string {
  return `processor:${slug(value)}`;
}

function guideId(value: string): string {
  return `guide:${slug(value)}`;
}

function dedupeCarriers(carriers: readonly EndeavorCarrier[]): readonly EndeavorCarrier[] {
  return Object.freeze([...new Map(carriers.map((item) => [item.id, item])).values()]);
}

function dedupeRelations(relations: readonly EndeavorRelation[]): readonly EndeavorRelation[] {
  return Object.freeze([...new Map(relations.map((item) => [`${item.from}\u0000${item.kind}\u0000${item.to}`, item])).values()]);
}

function searchable(values: readonly string[]): string {
  return values.join(" ").toLowerCase();
}

function includesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function limitValue(value: string | number | undefined, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.floor(parsed))) : fallback;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 72) || "value";
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}
