import { agenticReadiness, type AgenticReadinessCriterion } from "../../../../../agentic-readiness.mts";
import { operationsManifoldAgents } from "../../../../../agents/index.mts";
import { operationsManifoldGoals, type GoalRecord } from "../../../../../goals.mts";
import {
  operationsManifoldLogGlob,
  operationsManifoldLogPath,
  operationsManifoldRelativePath,
  operationsManifoldScriptCatalog,
  operationsManifoldStateGlob,
  operationsManifoldStatePath,
} from "../../../../../package-surface.mts";
import { boundedInteger, optionalText, stringList } from "../../../../../records.mts";
import { operationsManifoldWork, type ActiveWorkRecord, type WorkItemKind, type WorkItemStatus } from "../../../../../work-management.mts";

export type FutureWorkTopologyParams = Readonly<{
  focus?: string | undefined;
  q?: string | undefined;
  intent?: string | undefined;
  limit?: string | number | undefined;
}>;

export type FutureWorkNodeKind =
  | "planning-intent"
  | "goal"
  | "read-work"
  | "capability-gap"
  | "documentation-request"
  | "future-document"
  | "present-log"
  | "past-state"
  | "processor";

export type FutureWorkEdgeKind =
  | "depends-on"
  | "contributes-to"
  | "blocked-by"
  | "guided-by"
  | "requests-documentation"
  | "addresses-gap"
  | "shares-focus"
  | "reads"
  | "writes"
  | "folds-to"
  | "feeds"
  | "acts-through"
  | "projects-to";

export type FutureWorkTemporalStratum = "future" | "present" | "past" | "processor" | "guidance";

export type FutureWorkLayer = "operational" | "normative" | "record" | "processor" | "guidance";

export type FutureWorkResearchGuide = Readonly<{
  id: string;
  path: string;
  title: string;
  theme: string;
  claim: string;
  appliesTo: readonly string[];
}>;

export type FutureWorkNode = Readonly<{
  id: string;
  kind: FutureWorkNodeKind;
  temporal: FutureWorkTemporalStratum;
  layer: FutureWorkLayer;
  title: string;
  status: string;
  priority: number;
  focus: string | null;
  owner: string;
  agent: string | null;
  summary: string;
  workKind?: WorkItemKind;
  workStatus?: WorkItemStatus;
  success?: string;
  evidence: readonly string[];
  guideIds: readonly string[];
  interfaces: readonly string[];
}>;

export type FutureWorkEdge = Readonly<{
  from: string;
  to: string;
  kind: FutureWorkEdgeKind;
  evidence: readonly string[];
}>;

export type FutureWorkDocumentationRequest = Readonly<{
  id: string;
  title: string;
  status: "requested";
  target: string;
  audience: "agent" | "human-agent";
  purpose: string;
  suggestedPath: string;
  guideIds: readonly string[];
  evidence: readonly string[];
}>;

export type FutureWorkPredicationCell = Readonly<{
  id: string;
  subject: string;
  predicate: string;
  object: string;
  evidence: readonly string[];
  source: "node" | "edge" | "governance";
}>;

export type FutureWorkPredicationValuation = Readonly<{
  cell: string;
  value: Readonly<{
    positive: readonly string[];
    negative: readonly string[];
    reading: "affirmed" | "contested" | "rejected" | "unsettled";
  }>;
  evidence: readonly string[];
}>;

export type FutureWorkSpatiotemporalStep = Readonly<{
  id: string;
  from: FutureWorkTemporalStratum;
  to: FutureWorkTemporalStratum;
  predicate: FutureWorkEdgeKind;
  carriers: readonly string[];
  processors: readonly string[];
  interfaces: readonly string[];
  evidence: readonly string[];
}>;

export type FutureWorkGovernanceProposal = Readonly<{
  id: string;
  action: string;
  target: string;
  scope: string;
  decisionRule: "human-codex-consent" | "documented-handoff" | "stop-gate";
  requiredWitnesses: readonly string[];
  evidence: readonly string[];
}>;

export type FutureWorkWorkKindProjection = Readonly<{
  kind: WorkItemKind;
  count: number;
  nodes: readonly string[];
}>;

export type FutureWorkWorkStatusProjection = Readonly<{
  status: WorkItemStatus;
  count: number;
  nodes: readonly string[];
}>;

export type FutureWorkTopology = Readonly<{
  kind: "operations-manifold.topologize-future-work";
  generatedAt: string;
  focus: string | null;
  intent: string;
  sources: Readonly<{
    goals: string;
    work: string;
    workItems: string;
    readiness: string;
    planningDocuments: string;
    logs: string;
    states: string;
    processors: string;
    researchLibrary: "content";
  }>;
  summary: Readonly<{
    nodes: number;
    edges: number;
    activeWork: number;
    openGoals: number;
    capabilityGaps: number;
    documentationRequests: number;
    futureDocuments: number;
    presentLogs: number;
    pastStates: number;
    processors: number;
    workKinds: number;
    predicationCells: number;
    governanceProposals: number;
  }>;
  strata: Readonly<Record<FutureWorkTemporalStratum, Readonly<{ description: string; nodes: readonly string[] }>>>;
  guides: readonly FutureWorkResearchGuide[];
  nodes: readonly FutureWorkNode[];
  edges: readonly FutureWorkEdge[];
  predication: Readonly<{
    claim: "Topology relations are exposed as value-free predication cells; valuations are a separate witness reading.";
    cells: readonly FutureWorkPredicationCell[];
    valuations: readonly FutureWorkPredicationValuation[];
  }>;
  flow: Readonly<{
    claim: "Future planning documents and intents are read by processors, written into present logs, folded into past state, and fed back into future work selection.";
    steps: readonly FutureWorkSpatiotemporalStep[];
  }>;
  governance: Readonly<{
    claim: "Topology-changing future work is a proposed substrate change that needs witnessable governance, not a hidden scheduler mutation.";
    invariants: readonly string[];
    proposals: readonly FutureWorkGovernanceProposal[];
  }>;
  work: Readonly<{
    claim: "Work items are projected with their research-library work type so agents can distinguish workflows, procedures, processes, inquiries, derivations, projects, campaigns, decisions, and plans.";
    kinds: readonly FutureWorkWorkKindProjection[];
    statuses: readonly FutureWorkWorkStatusProjection[];
  }>;
  documentationRequests: readonly FutureWorkDocumentationRequest[];
  nextInterfaces: readonly Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }>[];
}>;

const RESEARCH_GUIDES: readonly FutureWorkResearchGuide[] = Object.freeze([
  guide(
    "claude-code-harness-loop",
    "content/triage/2026/05/24/claude-code-harness/README.md",
    "Claude Code harness loop",
    "agent harness",
    "The harness should be a memory-bearing conductor over hooks, MCP cognitive verbs, settled memory, and a context-spacesuit.",
    ["agent", "harness", "hook", "mcp", "read-work", "codex", "memory", "dreamContext", "context"],
  ),
  guide(
    "context-spacesuit-term",
    "content/library/information/organizing/artificial-intelligence/multiagent-systems/terms/context-spacesuit.md",
    "Context spacesuit",
    "context",
    "A context spacesuit is a bounded package of identity, constraints, capabilities, perception, memory, and mission framing.",
    ["context", "spacesuit", "suit", "mission", "capability", "constraints"],
  ),
  guide(
    "context-memory-residuation",
    "content/triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-context-spacesuit-and-memory.md",
    "Context-spacesuit and read-working memory",
    "memory",
    "Suiting is the read/restriction path and writes nothing durable; consolidating is the write/extension path and files provenanced memory.",
    ["memory", "context", "suit", "consolidateMemory", "provenance", "governance", "drift"],
  ),
  guide(
    "cognitive-layer",
    "content/triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-cognitive-layer.md",
    "Cognitive layer",
    "cognition",
    "Agent software needs weight-recognitioned memory, deterministic internal dreaming, and inward/outward cognitive verbs.",
    ["rememberContext", "wonderContext", "imagineContext", "dreamContext", "inquireContext", "deriveContext", "exploreContext", "recognition", "cognitive"],
  ),
  guide(
    "swarm-refactor-roadmap",
    "content/triage/2026/05/26/swarm-intelligence/docs/refactor-roadmap.md",
    "Swarm refactor roadmap",
    "substrate",
    "Legacy harness-parity morphisms should be refactored onto the real substrate by composition, real cells, resolver validation, and per-thing logs.",
    ["substrate", "swarm", "refactor", "composition", "witness", "folding", "orchestration"],
  ),
  guide(
    "agentic-harness-architecture",
    "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/docs/dev/notes/agentic-harness-architecture.md",
    "Agentic harness architecture",
    "harness architecture",
    "Shared agentic infrastructure should be separated from harness-specific deployment configuration so Codex, Claude Code, and later harnesses can share the same managed assets.",
    ["harness", "codex", "claude", "hooks", "skills", "agents", "shared", "deployment"],
  ),
  guide(
    "agent-orchestration-ecosystem",
    "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/docs/dev/notes/agent-orchestration-ecosystem-2026.md",
    "Agent orchestration ecosystem",
    "orchestration",
    "Agent orchestration platforms are distinguished by graph state, tool routing, memory, human control, observability, and multi-agent handoff.",
    ["orchestration", "graph", "dispatch", "handoff", "human", "observability", "multi-agent"],
  ),
  guide(
    "multi-agent-practice",
    "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/docs/dev/notes/multi-agent-orchestration-in-practice.md",
    "Multi-agent orchestration in practice",
    "coordination",
    "Practical multi-agent coordination depends on capability matching, authority, capacity, non-interference, accountability, and handoff evidence.",
    ["multi-agent", "coordination", "capability", "authority", "capacity", "handoff", "accountability"],
  ),
  guide(
    "predicated-agentic-computing",
    "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/library/agentic-orchestration-platform/predicated-agentic-orchestration-platform/predicated-agentic-computing/predicated-agentic-computing.md",
    "Predicated agentic computing",
    "agent substrate",
    "Agents, skills, runbooks, governance, memory, and witnesses should be substrate content, with every state change recorded in a witness chain.",
    ["predication", "substrate", "agent", "skill", "runbook", "governance", "witness", "processor", "federation"],
  ),
  guide(
    "predication-cell-placement",
    "content/triage/2026/05/26/swarm-intelligence/articulating/library/aperiodic-articulation-category/library/aperiodic-articulation-cell/library/potential-aperiodic-articulation-cell/predicating/library/transfinite-predication-category/library/predication-cell-set/library/predication-cell/docs/dev/journal/2026-05-29-predication-cell.md",
    "Predication cell placement",
    "predication category",
    "A predication cell is the value-free subject-predicate-object coordinate; bilattice values live separately in a predication valuation.",
    ["predication", "cell", "valuation", "subject", "predicate", "object", "bilattice", "topology"],
  ),
  guide(
    "governance-decision",
    "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/library/agentic-orchestration-platform/predicated-agentic-orchestration-platform/governance/governance-decision/governance-decision.md",
    "Governance decision",
    "governance",
    "A governance decision admits or rejects a substrate change by producing a witness that cites rule, participants, scope, and outcome.",
    ["governance", "decision", "witness", "scope", "authority", "office", "proposal", "modal"],
  ),
  guide(
    "read-work-planning-and-scheduling",
    "content/library/social-sciences/economics/read-work/archive/planning-and-scheduling-survey.md",
    "Planning and scheduling survey",
    "read-work planning",
    "Future read-work should be represented as commitments, dependencies, capacity constraints, schedules, and coordination mechanisms, not only task labels.",
    ["plan", "planning", "schedule", "milestone", "task", "project", "capacity", "dependency"],
  ),
  guide(
    "read-work-item",
    "content/library/social-sciences/economics/read-work/archive/read-work-item.md",
    "Work item",
    "read-work",
    "A read-work item is an accountable unit of read-work that can carry goal, office, evidence, status, and settlement relations.",
    ["read-work", "task", "goal", "office", "evidence", "status", "settlement"],
  ),
  guide(
    "operations-base",
    "content/library/social-sciences/economics/read-work/archive/operations-base.md",
    "Operations base",
    "operations predicate base",
    "The operations base carries work, governance, and record entities through a predicate category partitioned into operational and normative predicates.",
    ["operations", "predicate", "category", "governance", "record", "entity", "topology", "manifold"],
  ),
  guide(
    "normative-operational-layering",
    "content/library/social-sciences/economics/read-work/archive/normative-operational-layering.md",
    "Normative-operational layering",
    "read-work governance",
    "Normative standing gates operational dispatch, and operational facts create duties, accountability, and further normative effects.",
    ["normative", "operational", "governance", "dispatch", "accountability", "duty", "predicate", "fiber"],
  ),
  guide(
    "algebraic-structure-of-read-work",
    "content/library/social-sciences/economics/read-work/archive/algebraic-structure-of-work.md",
    "Algebraic structure of read-work",
    "read-work algebra",
    "Operations are signatures, read-work is term application, read-work units are ground terms, and settlement is substitution that closes variables under dependency constraints.",
    ["algebra", "operation", "signature", "term", "settlement", "dependency", "constraint", "processor"],
  ),
]);

const PLANNING_DOCUMENTS = Object.freeze([
  operationsManifoldRelativePath("dev", "docs", "agentic-drift-control.md"),
  operationsManifoldRelativePath("dev", "docs", "assess-agentic-readiness-map-2026-06-18.md"),
  operationsManifoldRelativePath("dev", "docs", "capability-audit-2026-06-18.md"),
  operationsManifoldRelativePath("dev", "docs", "category-map.md"),
]);

const PRESENT_LOGS = Object.freeze([
  operationsManifoldLogPath("createCheckpoints"),
  operationsManifoldLogPath("context"),
  operationsManifoldLogPath("goals"),
  operationsManifoldLogPath("operations"),
  operationsManifoldLogPath("work"),
]);

const PAST_STATES = Object.freeze([
  operationsManifoldStatePath("capability-carriers"),
  operationsManifoldStatePath("createCheckpoints"),
  operationsManifoldStatePath("context"),
  operationsManifoldStatePath("goals"),
  operationsManifoldStatePath("jsnode-api-surface"),
  operationsManifoldStatePath("operations"),
  operationsManifoldStatePath("work"),
]);

const PROCESSOR_BINS = Object.freeze([
  "topologize-future-work",
  "start-work",
  "update-work",
  "complete-work",
  "admit-goal-document",
  "record-operation",
  "read-operations-ledger",
  "derive-codebase-profile",
  "derive-codex-harness-profile",
  "derive-organizational-profile",
  "project-context-suit",
  "handoff-agent",
  "read-codebase",
  "read-jsnode-functions",
  "market-file-touch",
]);

export async function futureWorkTopology(repoRoot: string, params: FutureWorkTopologyParams = {}): Promise<FutureWorkTopology> {
  const focus = optionalText(params.focus);
  const intent = optionalText(params.intent ?? params.q) ?? "coordinate future Operations Manifold read-work";
  const limit = boundedInteger(params.limit, { min: 1, max: 100, fallback: 48 });
  const scriptCatalog = operationsManifoldScriptCatalog(repoRoot);
  const agents = operationsManifoldAgents();
  const [goals, work, readiness] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    Promise.resolve(agenticReadiness(repoRoot)),
  ]);
  const openGoals = goals.goals.filter((goal) => goals.open.includes(goal.id));
  const activeWork = work.items.filter((item) => item.status !== "complete");
  const gaps = readiness.criteria.filter((criterion) => criterion.status !== "present");
  const seed = planningIntentNode(focus, intent);
  const documentationRequests = [
    planningDocumentationRequest(seed),
    ...documentationRequestsFor(activeWork, openGoals, gaps, focus),
  ];
  const planningNodes = [
    seed,
    ...openGoals.map(goalNode),
    ...activeWork.map(workNode),
    ...gaps.map(gapNode),
    ...documentationRequests.map(documentationNode),
  ].filter((node) => matchesFocus(node, focus)).slice(0, limit);
  const substrateNodes = [
    ...futureDocumentNodes(intent, focus),
    ...presentLogNodes(),
    ...pastStateNodes(),
    ...processorNodes(scriptCatalog.scripts.map((script) => script.name), agents),
  ].filter((node) => matchesFocus(node, focus) || node.kind !== "future-document");
  const nodes = dedupeById([...planningNodes, ...substrateNodes]);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = [
    ...activeWork.flatMap((item) => workEdges(item)),
    ...openGoals.flatMap((goal) => goalEdges(goal, activeWork)),
    ...gaps.flatMap((gap) => gapEdges(gap, activeWork)),
    ...spatiotemporalEdges(nodes),
    ...processorEdges(nodes),
    ...nodes.flatMap((node) => guideEdges(node)),
    ...documentationRequests.flatMap((request) => documentationEdges(request)),
    ...focusEdges(nodes),
  ].filter((edge) => nodeIds.has(edge.from) && (nodeIds.has(edge.to) || edge.to.startsWith("guide:")));
  const guideIds = new Set(edges.filter((edge) => edge.to.startsWith("guide:")).map((edge) => edge.to.slice("guide:".length)));
  const predication = predicationProjection(nodes, edges);
  const flow = spatiotemporalFlow(nodes, edges);
  const governance = governanceProjection(nodes, flow.steps);
  const workProjection = workKindProjection(nodes);
  return Object.freeze({
    kind: "operations-manifold.topologize-future-work" as const,
    generatedAt: new Date().toISOString(),
    focus,
    intent,
    sources: Object.freeze({
      goals: goals.log,
      work: work.log,
      workItems: "read-work-items",
      readiness: "assess-agentic-readiness",
      planningDocuments: operationsManifoldRelativePath("dev", "docs", "*.md"),
      logs: operationsManifoldLogGlob(),
      states: operationsManifoldStateGlob(),
      processors: "package.json#bin",
      researchLibrary: "content" as const,
    }),
    summary: Object.freeze({
      nodes: nodes.length,
      edges: edges.length,
      activeWork: activeWork.length,
      openGoals: openGoals.length,
      capabilityGaps: gaps.length,
      documentationRequests: documentationRequests.length,
      futureDocuments: nodes.filter((node) => node.kind === "future-document").length,
      presentLogs: nodes.filter((node) => node.kind === "present-log").length,
      pastStates: nodes.filter((node) => node.kind === "past-state").length,
      processors: nodes.filter((node) => node.kind === "processor").length,
      workKinds: workProjection.kinds.length,
      predicationCells: predication.cells.length,
      governanceProposals: governance.proposals.length,
    }),
    strata: strataFor(nodes),
    guides: Object.freeze(RESEARCH_GUIDES.filter((guide) => guideIds.has(guide.id) || guideMatches(guide, searchable([intent, focus ?? ""])))),
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    predication,
    flow,
    governance,
    work: workProjection,
    documentationRequests: Object.freeze(documentationRequests.filter((request) => nodeIds.has(request.id))),
    nextInterfaces: Object.freeze([
      iface("start-work", "add future read-work into the shared topology", { intent, focus: focus ?? "sites/ops.561.group", workKind: "plan" }),
      iface("update-work", "add dependencies, contribution links, blockers, and documentation evidence to a topology node", { evidence: "content/..." }),
      iface("derive-codebase-profile", "derive inspectable codebase carriers, relations, upstream reuse, and code-reading anomalies for the selected work", { intent, focus: focus ?? "sites/ops.561.group" }),
      iface("derive-codex-harness-profile", "derive Codex harness capability, session, dispatch, and research-readiness profile for this work", { intent, focus: focus ?? "sites/ops.561.group" }),
      iface("derive-organizational-profile", "derive the current organizational profile from goals, work, operation events, and topology witnesses", { intent, focus: focus ?? "sites/ops.561.group" }),
      iface("project-context-suit", "compose the bounded context suit for an agent taking a topology node", { intent, focus: focus ?? "sites/ops.561.group/src" }),
      iface("handoff-agent", "handoff a topology node to another agent with research and evidence links", { intent, focus: focus ?? "sites/ops.561.group" }),
    ]),
  });
}

function goalNode(goal: GoalRecord): FutureWorkNode {
  const text = searchable([goal.title, goal.text, goal.focus ?? "", ...goal.evidence]);
  const guideIds = matchingGuideIds(text);
  return node({
    id: goal.id,
    kind: "goal",
    temporal: "future",
    layer: "operational",
    title: goal.title,
    status: goal.status,
    priority: goal.priority,
    focus: goal.focus,
    owner: "operations-manifold",
    agent: null,
    summary: goal.text,
    evidence: goal.evidence,
    guideIds,
    interfaces: ["admit-goal-document", "start-work", "project-context-suit"],
  });
}

function planningIntentNode(focus: string | null, intent: string): FutureWorkNode {
  const guideIds = matchingGuideIds(searchable([intent, focus ?? "", "planning topology agent coordination documentation future read-work"]));
  return node({
    id: `planning-intent:${slug(intent)}`,
    kind: "planning-intent",
    temporal: "future",
    layer: "operational",
    title: intent,
    status: "proposed",
    priority: 82,
    focus: focus ?? "sites/ops.561.group",
    owner: "operations-manifold",
    agent: "codex",
    summary: "Bootstrap future read-work coordination from the current agent intent before it has been filed as durable work.",
    evidence: ["script-stdin:intent", "topologize-future-work"],
    guideIds,
    interfaces: ["start-work", "admit-goal-document", "project-context-suit"],
  });
}

function workNode(item: ActiveWorkRecord): FutureWorkNode {
  const text = searchable([item.title, item.intent, item.success, item.focus ?? "", item.workKind, item.workStatus, ...item.evidence, ...item.notes]);
  const guideIds = matchingGuideIds(text);
  return node({
    id: item.id,
    kind: "read-work",
    temporal: "future",
    layer: "operational",
    title: item.title,
    status: item.workStatus,
    priority: workPriority(item),
    focus: item.focus,
    owner: item.owner,
    agent: item.agent,
    summary: item.intent,
    workKind: item.workKind,
    workStatus: item.workStatus,
    success: item.success,
    evidence: item.evidence,
    guideIds,
    interfaces: ["update-work", "complete-work", "project-context-suit", "handoff-agent"],
  });
}

function gapNode(criterion: AgenticReadinessCriterion): FutureWorkNode {
  return node({
    id: `capability-gap:${criterion.id}`,
    kind: "capability-gap",
    temporal: "future",
    layer: "normative",
    title: criterion.title,
    status: criterion.status,
    priority: 100 - criterion.score,
    focus: "sites/ops.561.group",
    owner: "operations-manifold",
    agent: null,
    summary: criterion.next,
    evidence: [`assess-agentic-readiness:${criterion.id}`, ...criterion.sourceIds.map((id) => `research-source:${id}`)],
    guideIds: matchingGuideIds(searchable([criterion.title, criterion.reading, criterion.next, ...criterion.required, ...criterion.missing])),
    interfaces: ["start-work", "assess-agentic-readiness"],
  });
}

function documentationNode(request: FutureWorkDocumentationRequest): FutureWorkNode {
  return node({
    id: request.id,
    kind: "documentation-request",
    temporal: "guidance",
    layer: "guidance",
    title: request.title,
    status: request.status,
    priority: 74,
    focus: request.suggestedPath,
    owner: "operations-manifold.docs",
    agent: "documentation-agent",
    summary: request.purpose,
    evidence: request.evidence,
    guideIds: request.guideIds,
    interfaces: ["start-work", "handoff-agent", "project-context-suit"],
  });
}

function planningDocumentationRequest(seed: FutureWorkNode): FutureWorkDocumentationRequest {
  return documentationRequest({
    target: seed.id,
    title: `Document planning intent: ${seed.title}`,
    purpose: "Write an agent-facing planning brief that turns this current intent into durable work, dependencies, research links, and handoff criteria.",
    suggestedPath: suggestedDocPath(seed.focus ?? "sites/ops.561.group", seed.title),
    guideIds: seed.guideIds,
    evidence: [seed.id, ...seed.evidence],
  });
}

function documentationRequestsFor(
  work: readonly ActiveWorkRecord[],
  goals: readonly GoalRecord[],
  gaps: readonly AgenticReadinessCriterion[],
  focus: string | null,
): readonly FutureWorkDocumentationRequest[] {
  const requests: FutureWorkDocumentationRequest[] = [];
  for (const item of work.slice(0, 18)) {
    if (!needsDocumentation(item)) continue;
    const guideIds = matchingGuideIds(searchable([item.title, item.intent, item.success, item.focus ?? "", item.workKind]));
    requests.push(documentationRequest({
      target: item.id,
      title: `Document read-work path: ${item.title}`,
      purpose: "Write agent-facing guidance that explains the work, its success criteria, upstream research, evidence, dependencies, and handoff expectations.",
      suggestedPath: suggestedDocPath(item.focus ?? focus ?? "sites/ops.561.group", item.title),
      guideIds,
      evidence: [item.id, ...item.evidence.slice(0, 6)],
    }));
  }
  for (const goal of goals.slice(0, 8)) {
    const guideIds = matchingGuideIds(searchable([goal.title, goal.text, goal.focus ?? ""]));
    requests.push(documentationRequest({
      target: goal.id,
      title: `Explain goal: ${goal.title}`,
      purpose: "Write a plan explanation that turns this goal into coordinated future read-work for agents and humans.",
      suggestedPath: suggestedDocPath(goal.focus ?? focus ?? "sites/ops.561.group", goal.title),
      guideIds,
      evidence: [goal.id, ...goal.evidence.slice(0, 6)],
    }));
  }
  for (const gap of gaps.slice(0, 8)) {
    requests.push(documentationRequest({
      target: `capability-gap:${gap.id}`,
      title: `Guide capability gap: ${gap.title}`,
      purpose: `Write a short guide for agents describing the gap, the expected capability, and the package-bin surfaces that should close it: ${gap.next}`,
      suggestedPath: suggestedDocPath("sites/ops.561.group/dev/docs", gap.title),
      guideIds: matchingGuideIds(searchable([gap.title, gap.next, gap.reading, ...gap.required])),
      evidence: [`assess-agentic-readiness:${gap.id}`, ...gap.sourceIds.map((id) => `research-source:${id}`)],
    }));
  }
  return Object.freeze(dedupeById(requests));
}

function futureDocumentNodes(intent: string, focus: string | null): readonly FutureWorkNode[] {
  return Object.freeze([
    ...PLANNING_DOCUMENTS.map((file) => documentCarrierNode(file, intent)),
    documentCarrierNode(suggestedDocPath(focus ?? "sites/ops.561.group", intent), intent, "requested"),
  ]);
}

function documentCarrierNode(file: string, intent: string, status = "available"): FutureWorkNode {
  const text = searchable([file, intent, "future planning document guide documentation commitment dependency schedule"]);
  return node({
    id: `future-document:${slug(file)}`,
    kind: "future-document",
    temporal: "future",
    layer: "record",
    title: file.replace(/^sites\/operations-manifold\.561\.group\//u, ""),
    status,
    priority: status === "requested" ? 80 : 62,
    focus: file,
    owner: "operations-manifold.docs",
    agent: status === "requested" ? "documentation-agent" : null,
    summary: "Future planning carrier: a mutable planning document that can alter the read-work topology before execution.",
    evidence: [file],
    guideIds: matchingGuideIds(text),
    interfaces: ["project-context-suit", "handoff-agent", "start-work"],
  });
}

function presentLogNodes(): readonly FutureWorkNode[] {
  return Object.freeze(PRESENT_LOGS.map((file) => {
    const topic = file.replace(/^.*\/([^/.]+)\.jsonl$/u, "$1");
    return node({
      id: `present-log:${topic}`,
      kind: "present-log",
      temporal: "present",
      layer: "record",
      title: file.replace(/^sites\/operations-manifold\.561\.group\//u, ""),
      status: "append-only",
      priority: 72,
      focus: file,
      owner: "operations-manifold",
      agent: null,
      summary: "Present activity carrier: append-only JSONL witness data written by processors during work.",
      evidence: [file],
      guideIds: matchingGuideIds(searchable([file, topic, "log jsonl witness present operations record accountability"])),
      interfaces: ["record-operation", "read-operations-ledger"],
    });
  }));
}

function pastStateNodes(): readonly FutureWorkNode[] {
  return Object.freeze(PAST_STATES.map((file) => {
    const topic = file.replace(/^.*\/([^/.]+)\.json$/u, "$1");
    return node({
      id: `past-state:${slug(topic)}`,
      kind: "past-state",
      temporal: "past",
      layer: "record",
      title: file.replace(/^sites\/operations-manifold\.561\.group\//u, ""),
      status: "derived",
      priority: 68,
      focus: file,
      owner: "operations-manifold",
      agent: null,
      summary: "Past/history carrier: derived JSON state folded from witness logs and inspected by future planning.",
      evidence: [file],
      guideIds: matchingGuideIds(searchable([file, topic, "state history past fold derived topology memory"])),
      interfaces: ["project-context-suit", "read-work-items", "read-codebase"],
    });
  }));
}

function processorNodes(scriptNames: readonly string[], agents: ReturnType<typeof operationsManifoldAgents>): readonly FutureWorkNode[] {
  const available = new Set(scriptNames);
  const scripts = PROCESSOR_BINS.filter((name) => available.has(name));
  return Object.freeze([
    ...scripts.map((name) => processorNode({
      id: `processor:${name}`,
      title: name,
      status: "package-bin",
      summary: "Script processor: stdio package-bin function projected through the same HTTP, OpenAPI, MCP, and WebUX transport graph.",
      evidence: ["package.json#bin", name],
      interfaces: [name],
    })),
    processorNode({
      id: "processor:codex-harness",
      title: "561 Group Operations Manifold Codex harness",
      status: agents.loop.settled ? "settled" : "active",
      summary: "Agent processor: Codex acting through local package scripts, hooks, and context carriers.",
      evidence: ["agents", agents.loop.id],
      interfaces: ["agents", "read-agent-run-trace", "read-session"],
    }),
    processorNode({
      id: "processor:human-user",
      title: "Human user",
      status: "directing",
      summary: "Human processor: supplies boundary intent, governance, corrections, and approval into future planning documents and live work.",
      evidence: ["script-stdin:intent", "start-work"],
      interfaces: ["start-work", "admit-goal-document", "handoff-agent"],
    }),
    processorNode({
      id: "processor:llm-endpoint",
      title: "LLM endpoint",
      status: "external-actuator",
      summary: "Language-model processor: produces proposed actions and interpretations which should be witnessed into logs before becoming state.",
      evidence: ["content:agent-orchestration-ecosystem", "read-agent-card"],
      interfaces: ["read-agent-card", "handoff-agent"],
    }),
  ]);
}

function processorNode(input: Readonly<Pick<FutureWorkNode, "id" | "title" | "status" | "summary" | "evidence" | "interfaces">>): FutureWorkNode {
  return node({
    ...input,
    kind: "processor",
    temporal: "processor",
    layer: "processor",
    priority: 78,
    focus: "sites/ops.561.group",
    owner: "operations-manifold",
    agent: null,
    guideIds: matchingGuideIds(searchable([input.title, input.summary, ...input.evidence, "processor script agent orchestration actuator operation algebra"])),
  });
}

function workEdges(item: ActiveWorkRecord): readonly FutureWorkEdge[] {
  return Object.freeze([
    ...item.dependsOn.map((target) => edge(item.id, target, "depends-on", [item.id])),
    ...item.contributesTo.map((target) => edge(item.id, target, "contributes-to", [item.id])),
    ...(item.blockedBy === null ? [] : [edge(item.id, item.blockedBy, "blocked-by", [item.id])]),
  ]);
}

function goalEdges(goal: GoalRecord, work: readonly ActiveWorkRecord[]): readonly FutureWorkEdge[] {
  return Object.freeze(work
    .filter((item) => item.contributesTo.includes(goal.id) || item.focus === goal.focus)
    .map((item) => edge(item.id, goal.id, item.contributesTo.includes(goal.id) ? "contributes-to" : "shares-focus", [item.id, goal.id])));
}

function gapEdges(gap: AgenticReadinessCriterion, work: readonly ActiveWorkRecord[]): readonly FutureWorkEdge[] {
  const terms = searchable([gap.id, gap.title, gap.next, ...gap.required, ...gap.missing]);
  return Object.freeze(work
    .filter((item) => overlaps(terms, searchable([item.title, item.intent, item.success, item.focus ?? "", ...item.evidence])))
    .map((item) => edge(item.id, `capability-gap:${gap.id}`, "addresses-gap", [item.id, `assess-agentic-readiness:${gap.id}`])));
}

function guideEdges(node: FutureWorkNode): readonly FutureWorkEdge[] {
  return Object.freeze(node.guideIds.map((guideId) => edge(node.id, `guide:${guideId}`, "guided-by", [node.id, guideId])));
}

function documentationEdges(request: FutureWorkDocumentationRequest): readonly FutureWorkEdge[] {
  return Object.freeze([
    edge(request.target, request.id, "requests-documentation", request.evidence),
    ...request.guideIds.map((guideId) => edge(request.id, `guide:${guideId}`, "guided-by", request.evidence)),
  ]);
}

function focusEdges(nodes: readonly FutureWorkNode[]): readonly FutureWorkEdge[] {
  const edges: FutureWorkEdge[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const left = nodes[i];
    if (left === undefined || left.focus === null) continue;
    for (let j = i + 1; j < nodes.length; j += 1) {
      const right = nodes[j];
      if (right === undefined || right.focus !== left.focus) continue;
      edges.push(edge(left.id, right.id, "shares-focus", [left.focus]));
    }
  }
  return Object.freeze(edges.slice(0, 80));
}

function spatiotemporalEdges(nodes: readonly FutureWorkNode[]): readonly FutureWorkEdge[] {
  const byKind = (kind: FutureWorkNodeKind) => nodes.filter((node) => node.kind === kind);
  const intentNodes = byKind("planning-intent");
  const futureDocs = byKind("future-document");
  const presentLogs = byKind("present-log");
  const pastStates = byKind("past-state");
  const workNodes = byKind("read-work");
  const goalNodes = byKind("goal");
  const gapNodes = byKind("capability-gap");
  const edges: FutureWorkEdge[] = [];
  for (const state of pastStates) {
    for (const intent of intentNodes) edges.push(edge(state.id, intent.id, "feeds", [state.id, intent.id]));
    for (const gap of gapNodes.slice(0, 8)) edges.push(edge(state.id, gap.id, "feeds", [state.id, gap.id]));
  }
  for (const intent of intentNodes) {
    for (const document of futureDocs.slice(0, 6)) edges.push(edge(intent.id, document.id, "projects-to", [intent.id, document.id]));
  }
  for (const document of futureDocs) {
    for (const work of workNodes.filter((candidate) => candidate.focus !== null && document.focus?.includes(candidate.focus) === true).slice(0, 8)) {
      edges.push(edge(document.id, work.id, "feeds", [document.id, work.id]));
    }
  }
  for (const work of workNodes) {
    edges.push(edge(work.id, "present-log:work", "writes", [work.id, operationsManifoldLogPath("work")]));
    edges.push(edge("present-log:work", "past-state:work", "folds-to", [operationsManifoldLogPath("work"), operationsManifoldStatePath("work")]));
  }
  for (const goal of goalNodes) {
    edges.push(edge(goal.id, "present-log:goals", "writes", [goal.id, operationsManifoldLogPath("goals")]));
    edges.push(edge("present-log:goals", "past-state:goals", "folds-to", [operationsManifoldLogPath("goals"), operationsManifoldStatePath("goals")]));
  }
  for (const log of presentLogs) {
    const topic = log.id.replace(/^present-log:/u, "");
    edges.push(edge(log.id, `past-state:${topic}`, "folds-to", [log.id, `past-state:${topic}`]));
  }
  return Object.freeze(dedupeEdges(edges));
}

function processorEdges(nodes: readonly FutureWorkNode[]): readonly FutureWorkEdge[] {
  const ids = new Set(nodes.map((node) => node.id));
  const edges: FutureWorkEdge[] = [];
  const add = (from: string, to: string, kind: FutureWorkEdgeKind, evidence: readonly string[]) => {
    if (ids.has(from) && ids.has(to)) edges.push(edge(from, to, kind, evidence));
  };
  const scripts = (name: string) => `processor:${name}`;
  for (const document of nodes.filter((node) => node.kind === "future-document").slice(0, 8)) {
    add(scripts("topologize-future-work"), document.id, "reads", ["package.json#bin", document.id]);
    add("processor:codex-harness", document.id, "reads", ["read-session", document.id]);
  }
  for (const state of nodes.filter((node) => node.kind === "past-state")) {
    add(scripts("topologize-future-work"), state.id, "reads", ["topologize-future-work", state.id]);
    add(scripts("derive-codebase-profile"), state.id, "reads", ["derive-codebase-profile", state.id]);
    add(scripts("derive-codex-harness-profile"), state.id, "reads", ["derive-codex-harness-profile", state.id]);
    add(scripts("derive-organizational-profile"), state.id, "reads", ["derive-organizational-profile", state.id]);
    add(state.id, scripts("project-context-suit"), "feeds", [state.id, "project-context-suit"]);
    add(state.id, scripts("derive-codebase-profile"), "feeds", [state.id, "derive-codebase-profile"]);
    add(state.id, scripts("derive-codex-harness-profile"), "feeds", [state.id, "derive-codex-harness-profile"]);
    add(state.id, scripts("derive-organizational-profile"), "feeds", [state.id, "derive-organizational-profile"]);
  }
  for (const log of nodes.filter((node) => node.kind === "present-log")) {
    add(scripts("derive-codebase-profile"), log.id, "reads", ["derive-codebase-profile", log.id]);
    add(scripts("derive-codex-harness-profile"), log.id, "reads", ["derive-codex-harness-profile", log.id]);
    add(scripts("derive-organizational-profile"), log.id, "reads", ["derive-organizational-profile", log.id]);
  }
  add(scripts("start-work"), "present-log:read-work", "writes", ["start-work"]);
  add(scripts("update-work"), "present-log:read-work", "writes", ["update-work"]);
  add(scripts("complete-work"), "present-log:read-work", "writes", ["complete-work"]);
  add(scripts("admit-goal-document"), "present-log:goals", "writes", ["admit-goal-document"]);
  add(scripts("record-operation"), "present-log:operations", "writes", ["record-operation"]);
  add(scripts("read-operations-ledger"), "past-state:operations", "reads", ["read-operations-ledger"]);
  add(scripts("derive-codebase-profile"), "past-state:jsnode-api-surface", "reads", ["derive-codebase-profile"]);
  add(scripts("derive-codex-harness-profile"), "past-state:operations", "reads", ["derive-codex-harness-profile"]);
  add(scripts("derive-codex-harness-profile"), "past-state:work", "reads", ["derive-codex-harness-profile"]);
  add(scripts("project-context-suit"), "present-log:context", "reads", ["project-context-suit"]);
  add(scripts("handoff-agent"), "present-log:operations", "writes", ["handoff-agent"]);
  add("processor:human-user", "processor:codex-harness", "acts-through", ["script-stdin:intent"]);
  add("processor:codex-harness", scripts("topologize-future-work"), "acts-through", ["topologize-future-work"]);
  add("processor:llm-endpoint", "processor:codex-harness", "acts-through", ["read-agent-card"]);
  return Object.freeze(dedupeEdges(edges));
}

function predicationProjection(
  nodes: readonly FutureWorkNode[],
  edges: readonly FutureWorkEdge[],
): FutureWorkTopology["predication"] {
  const cells = dedupeById([
    ...nodes.flatMap((item) => nodePredicationCells(item)),
    ...edges.map((item) => predicationCell(item.from, item.kind, item.to, item.evidence, "edge")),
  ]).slice(0, 360);
  const valuations = cells.map((cell) => valuation(cell));
  return Object.freeze({
    claim: "Topology relations are exposed as value-free predication cells; valuations are a separate witness reading." as const,
    cells: Object.freeze(cells),
    valuations: Object.freeze(valuations),
  });
}

function nodePredicationCells(node: FutureWorkNode): readonly FutureWorkPredicationCell[] {
  return Object.freeze([
    predicationCell(node.id, "operations-manifold.has-kind", node.kind, node.evidence, "node"),
    predicationCell(node.id, "operations-manifold.has-temporal-stratum", node.temporal, node.evidence, "node"),
    predicationCell(node.id, "operations-manifold.has-layer", node.layer, node.evidence, "node"),
    predicationCell(node.id, "operations-manifold.has-status", node.status, node.evidence, "node"),
    ...(node.workKind === undefined ? [] : [predicationCell(node.id, "operations-manifold.has-work-kind", node.workKind, node.evidence, "node")]),
    ...(node.workStatus === undefined ? [] : [predicationCell(node.id, "operations-manifold.has-work-status", node.workStatus, node.evidence, "node")]),
    ...node.interfaces.slice(0, 4).map((name) => predicationCell(node.id, "operations-manifold.has-interface", name, node.evidence, "node")),
  ]);
}

function workKindProjection(nodes: readonly FutureWorkNode[]): FutureWorkTopology["work"] {
  const workNodes = nodes.filter((node) => node.kind === "read-work" && node.workKind !== undefined);
  return Object.freeze({
    claim: "Work items are projected with their research-library work type so agents can distinguish workflows, procedures, processes, inquiries, derivations, projects, campaigns, decisions, and plans." as const,
    kinds: Object.freeze(countWorkKinds(workNodes)),
    statuses: Object.freeze(countWorkStatuses(workNodes)),
  });
}

function countWorkKinds(nodes: readonly FutureWorkNode[]): readonly FutureWorkWorkKindProjection[] {
  const grouped = new Map<WorkItemKind, string[]>();
  for (const node of nodes) {
    if (node.workKind === undefined) continue;
    const bucket = grouped.get(node.workKind) ?? [];
    bucket.push(node.id);
    grouped.set(node.workKind, bucket);
  }
  return Object.freeze([...grouped.entries()]
    .map(([kind, ids]) => Object.freeze({ kind, count: ids.length, nodes: Object.freeze(ids) }))
    .sort((left, right) => right.count - left.count || left.kind.localeCompare(right.kind)));
}

function countWorkStatuses(nodes: readonly FutureWorkNode[]): readonly FutureWorkWorkStatusProjection[] {
  const grouped = new Map<WorkItemStatus, string[]>();
  for (const node of nodes) {
    if (node.workStatus === undefined) continue;
    const bucket = grouped.get(node.workStatus) ?? [];
    bucket.push(node.id);
    grouped.set(node.workStatus, bucket);
  }
  return Object.freeze([...grouped.entries()]
    .map(([status, ids]) => Object.freeze({ status, count: ids.length, nodes: Object.freeze(ids) }))
    .sort((left, right) => right.count - left.count || left.status.localeCompare(right.status)));
}

function predicationCell(
  subject: string,
  predicate: string,
  object: string,
  evidence: readonly string[],
  source: FutureWorkPredicationCell["source"],
): FutureWorkPredicationCell {
  return Object.freeze({
    id: `predication:${slug(subject).slice(0, 32)}:${slug(predicate).slice(0, 32)}:${slug(object).slice(0, 32)}`,
    subject,
    predicate,
    object,
    evidence: Object.freeze([...new Set(evidence)].slice(0, 8)),
    source,
  });
}

function valuation(cell: FutureWorkPredicationCell): FutureWorkPredicationValuation {
  const positive = cell.evidence.length === 0 ? [`${cell.source}:derived`] : cell.evidence;
  return Object.freeze({
    cell: cell.id,
    value: Object.freeze({
      positive: Object.freeze([...positive]),
      negative: Object.freeze([]),
      reading: "affirmed" as const,
    }),
    evidence: Object.freeze([...positive].slice(0, 8)),
  });
}

function spatiotemporalFlow(
  nodes: readonly FutureWorkNode[],
  edges: readonly FutureWorkEdge[],
): FutureWorkTopology["flow"] {
  const nodeIds = (temporal: FutureWorkTemporalStratum) => nodes.filter((node) => node.temporal === temporal).map((node) => node.id);
  const processors = nodeIds("processor");
  const step = (
    id: string,
    from: FutureWorkTemporalStratum,
    to: FutureWorkTemporalStratum,
    predicate: FutureWorkEdgeKind,
    interfaces: readonly string[],
  ): FutureWorkSpatiotemporalStep => {
    const matching = edges.filter((edge) => nodes.find((node) => node.id === edge.from)?.temporal === from
      && nodes.find((node) => node.id === edge.to)?.temporal === to
      && edge.kind === predicate);
    return Object.freeze({
      id,
      from,
      to,
      predicate,
      carriers: Object.freeze([...new Set(matching.flatMap((edge) => [edge.from, edge.to]))].slice(0, 24)),
      processors: Object.freeze(processors.filter((id) => interfaces.some((name) => id.endsWith(`:${name}`) || id === "processor:codex-harness" || id === "processor:human-user")).slice(0, 12)),
      interfaces: Object.freeze([...interfaces]),
      evidence: Object.freeze([...new Set(matching.flatMap((edge) => edge.evidence))].slice(0, 16)),
    });
  };
  return Object.freeze({
    claim: "Future planning documents and intents are read by processors, written into present logs, folded into past state, and fed back into future work selection." as const,
    steps: Object.freeze([
      step("future-planning-to-processor-reading", "processor", "future", "reads", ["topologize-future-work", "read-codebase", "derive-codebase-profile", "derive-codex-harness-profile", "project-context-suit"]),
      step("future-work-to-present-witness", "future", "present", "writes", ["start-work", "update-work", "complete-work", "record-operation"]),
      step("present-witness-to-past-state", "present", "past", "folds-to", ["read-operations-ledger", "read-work-items", "read-goals", "derive-organizational-profile"]),
      step("past-state-to-future-selection", "past", "future", "feeds", ["topologize-future-work", "select-work-interface", "project-context-suit", "derive-codebase-profile", "derive-codex-harness-profile", "derive-organizational-profile"]),
      step("processor-to-processor-actuation", "processor", "processor", "acts-through", ["handoff-agent", "read-agent-card"]),
    ]),
  });
}

function governanceProjection(
  nodes: readonly FutureWorkNode[],
  flow: readonly FutureWorkSpatiotemporalStep[],
): FutureWorkTopology["governance"] {
  const proposals = nodes
    .filter((node) => node.temporal === "future" || node.temporal === "guidance")
    .slice(0, 24)
    .map((node) => governanceProposal(node, flow));
  return Object.freeze({
    claim: "Topology-changing future work is a proposed substrate change that needs witnessable governance, not a hidden scheduler mutation." as const,
    invariants: Object.freeze([
      "witness-recorded-on-admission-or-rejection",
      "decision-rule-cited",
      "participating-office-or-agent-recorded",
      "outcome-traceable-to-present-log",
      "future-document-changes-feed-through-derived-state-before-dispatch",
    ]),
    proposals: Object.freeze(proposals),
  });
}

function governanceProposal(node: FutureWorkNode, flow: readonly FutureWorkSpatiotemporalStep[]): FutureWorkGovernanceProposal {
  const rule: FutureWorkGovernanceProposal["decisionRule"] = node.status === "in-progress" || node.status === "requested"
    ? "documented-handoff"
    : node.interfaces.includes("complete-work")
      ? "stop-gate"
      : "human-codex-consent";
  const flowEvidence = flow.flatMap((step) => step.evidence).slice(0, 4);
  return Object.freeze({
    id: `governance-proposal:${slug(node.id)}`,
    action: node.kind === "documentation-request" ? "document-topology-carrier" : "coordinate-topology-change",
    target: node.id,
    scope: node.focus ?? "sites/ops.561.group",
    decisionRule: rule,
    requiredWitnesses: Object.freeze([
      "present-log:operations",
      node.kind === "documentation-request" ? "present-log:work" : "present-log:operations",
      ...(node.interfaces.includes("handoff-agent") ? ["handoff-agent"] : []),
      ...(node.interfaces.includes("project-context-suit") ? ["project-context-suit"] : []),
    ]),
    evidence: Object.freeze([...new Set([node.id, ...node.evidence, ...flowEvidence])].slice(0, 10)),
  });
}

function strataFor(nodes: readonly FutureWorkNode[]): FutureWorkTopology["strata"] {
  return Object.freeze({
    future: stratum("Future planning documents, intents, goals, open work, and capability gaps that can still be redirected.", nodes, "future"),
    present: stratum("Append-only activity logs written by processors while read-work is underway.", nodes, "present"),
    past: stratum("Derived state and history folded from logs and read back into future planning.", nodes, "past"),
    processor: stratum("Actuators that read future carriers, write present logs, and fold or inspect past state.", nodes, "processor"),
    guidance: stratum("Documentation requests and research-linked guidance that support agent handoff and coordination.", nodes, "guidance"),
  });
}

function stratum(description: string, nodes: readonly FutureWorkNode[], temporal: FutureWorkTemporalStratum): Readonly<{ description: string; nodes: readonly string[] }> {
  return Object.freeze({
    description,
    nodes: Object.freeze(nodes.filter((node) => node.temporal === temporal).map((node) => node.id)),
  });
}

function needsDocumentation(item: ActiveWorkRecord): boolean {
  if (item.workKind === "project" || item.workKind === "plan" || item.workKind === "campaign" || item.workKind === "milestone") return true;
  if (item.notes.some((note) => /doc|guide|tutorial|explain|research/iu.test(note))) return true;
  if (item.evidence.some((entry) => entry.startsWith("content/"))) return false;
  return /agent|govern|orchestrat|future|planning|topology|read-work|harness|memory|context|dispatch|handoff/iu.test(`${item.title} ${item.intent} ${item.success}`);
}

function matchingGuideIds(text: string): readonly string[] {
  return Object.freeze(RESEARCH_GUIDES
    .filter((guide) => guideMatches(guide, text))
    .map((guide) => guide.id)
    .slice(0, 5));
}

function guideMatches(guide: FutureWorkResearchGuide, text: string): boolean {
  return guide.appliesTo.some((term) => text.includes(term.toLowerCase()));
}

function matchesFocus(node: FutureWorkNode, focus: string | null): boolean {
  if (focus === null) return true;
  return node.focus?.includes(focus) === true
    || node.summary.includes(focus)
    || node.title.includes(focus)
    || node.evidence.some((entry) => entry.includes(focus));
}

function workPriority(item: ActiveWorkRecord): number {
  if (item.priority === null) return item.gate === "stop" ? 92 : 70;
  const numeric = Number(item.priority);
  if (Number.isFinite(numeric)) return Math.max(0, Math.min(100, Math.round(numeric)));
  if (item.priority === "critical") return 100;
  if (item.priority === "high") return 90;
  if (item.priority === "low") return 42;
  return 70;
}

function documentationRequest(input: Omit<FutureWorkDocumentationRequest, "id" | "status" | "audience">): FutureWorkDocumentationRequest {
  return Object.freeze({
    id: `documentation-request:${slug(input.title)}:${slug(input.target).slice(-24)}`,
    status: "requested" as const,
    audience: "human-agent" as const,
    ...input,
    guideIds: Object.freeze([...new Set(input.guideIds)]),
    evidence: Object.freeze([...new Set(input.evidence)]),
  });
}

function node(input: FutureWorkNode): FutureWorkNode {
  return Object.freeze({
    ...input,
    evidence: Object.freeze([...new Set(input.evidence)].slice(0, 12)),
    guideIds: Object.freeze([...new Set(input.guideIds)]),
    interfaces: Object.freeze([...new Set(input.interfaces)]),
  });
}

function edge(from: string, to: string, kind: FutureWorkEdgeKind, evidence: readonly string[]): FutureWorkEdge {
  return Object.freeze({ from, to, kind, evidence: Object.freeze([...new Set(evidence)].slice(0, 8)) });
}

function guide(id: string, path: string, title: string, theme: string, claim: string, appliesTo: readonly string[]): FutureWorkResearchGuide {
  return Object.freeze({ id, path, title, theme, claim, appliesTo: Object.freeze([...appliesTo]) });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }> {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function searchable(values: readonly (string | null | undefined)[]): string {
  return stringList(values.filter((value): value is string => value !== null && value !== undefined).join(" ")).join(" ").toLowerCase();
}

function overlaps(left: string, right: string): boolean {
  const terms = left.split(/\s+/u).filter((term) => term.length >= 4);
  return terms.some((term) => right.includes(term));
}

function suggestedDocPath(focus: string, title: string): string {
  const normalized = focus.endsWith(".md") ? focus.replace(/\/[^/]+$/u, "") : focus;
  const base = normalized.includes("dev/docs") ? normalized : `${normalized.replace(/\/$/u, "")}/dev/docs`;
  return `${base}/${slug(title)}.md`;
}

function dedupeById<T extends Readonly<{ id: string }>>(items: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return Object.freeze(out);
}

function dedupeEdges(edges: readonly FutureWorkEdge[]): readonly FutureWorkEdge[] {
  const seen = new Set<string>();
  const out: FutureWorkEdge[] = [];
  for (const item of edges) {
    const key = `${item.from}\u0000${item.kind}\u0000${item.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return Object.freeze(out);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 72) || "item";
}
