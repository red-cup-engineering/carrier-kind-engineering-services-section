import { operationsManifoldScriptCatalog } from "./package-surface.mts";
export type AgenticReadinessStatus = "present" | "partial" | "missing";

export type AgenticReadinessSource = Readonly<{
  id: string;
  path: string;
  claim: string;
}>;

export type AgenticReadinessCriterion = Readonly<{
  id: string;
  title: string;
  status: AgenticReadinessStatus;
  score: number;
  required: readonly string[];
  found: readonly string[];
  missing: readonly string[];
  sourceIds: readonly string[];
  reading: string;
  next: string;
}>;

export type AgenticReadinessReport = Readonly<{
  kind: "operations-manifold.assess-agentic-readiness";
  generatedAt: string;
  package: string;
  scriptCount: number;
  summary: Readonly<{
    score: number;
    present: number;
    partial: number;
    missing: number;
  }>;
  sources: readonly AgenticReadinessSource[];
  criteria: readonly AgenticReadinessCriterion[];
  nextWork: readonly string[];
}>;

type CriterionDefinition = Readonly<{
  id: string;
  title: string;
  required: readonly string[];
  sourceIds: readonly string[];
  reading: (found: readonly string[], missing: readonly string[]) => string;
  next: string;
}>;

const SOURCES: readonly AgenticReadinessSource[] = Object.freeze([
  Object.freeze({
    id: "harness-readme",
    path: "content/triage/2026/05/24/claude-code-harness/README.md",
    claim: "A coding-agent harness needs live hooks, context spacesuits, cognitive MCP verbs, internal dreaming, weight-recognitioned memory, and transcript capture while delegating substrate capability to the swarm.",
  }),
  Object.freeze({
    id: "swarm-adapter",
    path: "sites/research.561.group/dev/docs/planning/sessions/claude-code-harness-swarm-adapter.md",
    claim: "A harness should be a thin carrier adapter: decode IO, capture experience rows, project memory into carrier-native context, expose tools, and avoid owning substrate math.",
  }),
  Object.freeze({
    id: "cognitive-layer",
    path: "sites/research.561.group/dev/docs/planning/sessions/claude-code-harness-cognitive-layer.md",
    claim: "The next cognitive layer is cognitive-verb tools, network-free internal dreaming, and weight-recognitioned memory where sense outranks learning.",
  }),
  Object.freeze({
    id: "context-spacesuit",
    path: "content/library/information/organizing/artificial-intelligence/multiagent-systems/terms/context-spacesuit.md",
    claim: "A context spacesuit is the bounded package of identity, constraints, capabilities, perception, memory, and mission framing loaded around an agent before it acts.",
  }),
  Object.freeze({
    id: "orchestration-ecosystem",
    path: "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/docs/dev/notes/agent-orchestration-ecosystem-2026.md",
    claim: "The library/engine boundary, MCP, and formal region/capability guarantees are the local contribution beyond general agent frameread-works.",
  }),
  Object.freeze({
    id: "langgraph",
    path: "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/docs/dev/notes/langgraph.md",
    claim: "Stateful agent platforms are expected to provide durable createCheckpoints, replayCheckpoint/time-travel, and human-in-the-loop review.",
  }),
  Object.freeze({
    id: "multi-agent-practice",
    path: "content/triage/2026/06/06/theories/agency/library/agent/actuating/library/actuator/embodying/library/body/integrating/library/drone/swarming/library/swarm/membering/situating/coordinating/orchestrating/docs/dev/notes/multi-agent-orchestration-in-practice.md",
    claim: "Practical orchestration requires capability matching, authority, capacity, non-interference, handoffs, and accountability tracing.",
  }),
  Object.freeze({
    id: "knowledge-vault",
    path: "sites/research.561.group/dev/docs/notes/2026-06-16-knowledge-vault-features.md",
    claim: "Scripts, HTTP, MCP, OpenAPI, and human web views should be projections of the same underlying relational carriers rather than separate ontologies.",
  }),
]);

const CRITERIA: readonly CriterionDefinition[] = Object.freeze([
  Object.freeze({
    id: "single-operation-graph",
    title: "One package-script graph projects WebUX, OpenAPI, and MCP",
    required: Object.freeze([
      "assess-agentic-readiness",
      "read-agent-platform",
      "read-codebase",
      "read-heartbeat",
      "graph-workspace",
    ]),
    sourceIds: Object.freeze(["knowledge-vault", "orchestration-ecosystem"]),
    reading: (found: readonly string[]) => `561 Group Operations Manifold exposes ${found.length} of the core graph-inspection operations through package bins.`,
    next: "Keep every new 561 Group Operations Manifold capability in package.json#bin so JSNode ICK package-bin WebUX projects it to WebUX/OpenAPI/MCP automatically.",
  }),
  Object.freeze({
    id: "carrier-adapter-boundary",
    title: "Harness remains a carrier adapter, not a second substrate",
    required: Object.freeze([
      "read-agents",
      "read-agent-run-trace",
      "trace-codex-exec",
      "import-operation-trace",
    ]),
    sourceIds: Object.freeze(["swarm-adapter", "harness-readme"]),
    reading: (found: readonly string[]) => `Trace and harness carrier operations present: ${found.join(", ") || "none"}.`,
    next: "Move remaining substrate-shaped helpers upstream and keep 561 Group Operations Manifold focused on adapter, evidence, and projection work.",
  }),
  Object.freeze({
    id: "context-spacesuit",
    title: "Context spacesuit projection",
    required: Object.freeze([
      "admit-context",
      "control-context",
      "project-context-suit",
      "assess-drift",
    ]),
    sourceIds: Object.freeze(["context-spacesuit", "cognitive-layer"]),
    reading: (found: readonly string[]) => `Context admission, suit projection, and drift controls found: ${found.join(", ") || "none"}.`,
    next: "Make context suits cheaper and more inspectable by deriving them from compact evidence readings before loading broad context.",
  }),
  Object.freeze({
    id: "hook-capture-ledger",
    title: "Hook capture and durable witness ledger",
    required: Object.freeze([
      "record-hook-event",
      "record-hook-document",
      "record-operation",
      "read-operations-ledger",
      "read-work-items",
      "plan-codex",
      "read-session",
    ]),
    sourceIds: Object.freeze(["harness-readme", "multi-agent-practice"]),
    reading: (found: readonly string[]) => `Hook and ledger operations present: ${found.join(", ") || "none"}.`,
    next: "Keep session replayCheckpoint compact and route broad inspection through detail-specific ledger tools.",
  }),
  Object.freeze({
    id: "weight-recognitioned-memory",
    title: "Recognition-weighted memory",
    required: Object.freeze([
      "read-recognition",
      "weight-recognition",
      "read-codebase",
      "project-context-suit",
      "control-context",
    ]),
    sourceIds: Object.freeze(["cognitive-layer", "harness-readme"]),
    reading: (found: readonly string[], missing: readonly string[]) => missing.length === 0
      ? "Recognition weighting has an explicit package-script surface."
      : `Recognition weighting is partial: ${found.join(", ") || "no adjacent operations"} exist, but ${missing.join(", ")} are missing.`,
    next: "Expose recognition weighting as its own operation so conflicts can be read as sense-vs-learning decisions instead of hidden context heuristics.",
  }),
  Object.freeze({
    id: "cognitive-verbs",
    title: "Cognitive verb tool surface",
    required: Object.freeze([
      "remember-context",
      "wonder-context",
      "imagine-context",
      "dream-context",
      "inquire-context",
      "derive-context",
      "explore-context",
    ]),
    sourceIds: Object.freeze(["cognitive-layer", "harness-readme"]),
    reading: (found: readonly string[]) => found.length === 0
      ? "561 Group Operations Manifold has agent and check-capability surfaces, but no named cognitive verbs yet."
      : `Cognitive verbs present: ${found.join(", ")}.`,
    next: "Add thin cognitive-verb package scripts that route to existing upstream recall, derivation, exploration, and settlement carriers.",
  }),
  Object.freeze({
    id: "deterministic-dreaming",
    title: "Netread-work-free deterministic consolidation",
    required: Object.freeze([
      "dream-context",
      "consolidate-memory",
    ]),
    sourceIds: Object.freeze(["cognitive-layer", "harness-readme"]),
    reading: (found: readonly string[]) => found.length === 0
      ? "No explicit network-free dreamContext/consolidateMemory package operation exists."
      : `Consolidation operations present: ${found.join(", ")}.`,
    next: "Promote replayCheckpointable consolidation over EAVT ledgers into an explicit package script before adding any network-backed dreaming.",
  }),
  Object.freeze({
    id: "dispatch-orchestration",
    title: "Dispatch, read-work assignment, and accountability",
    required: Object.freeze([
      "read-orchestration",
      "plan-codex",
      "start-work",
      "update-work",
      "complete-work",
      "check-capability",
    ]),
    sourceIds: Object.freeze(["multi-agent-practice", "orchestration-ecosystem"]),
    reading: (found: readonly string[]) => `Work and dispatch operations present: ${found.join(", ") || "none"}.`,
    next: "Add dispatch readiness that checks capability, authority, capacity, non-interference, and handoff evidence before assignment.",
  }),
  Object.freeze({
    id: "createCheckpoint-replayCheckpoint-hitl",
    title: "Checkpoint, replayCheckpoint, and human-in-the-loop gates",
    required: Object.freeze([
      "create-checkpoint",
      "replay-checkpoint",
      "import-operation-trace",
      "read-operations-ledger",
      "read-session",
      "set-work-stop-gate",
      "update-work",
    ]),
    sourceIds: Object.freeze(["langgraph", "multi-agent-practice"]),
    reading: (found: readonly string[]) => `Replay and gate-adjacent operations present: ${found.join(", ") || "none"}.`,
    next: "Add createCheckpoint snapshots and replayCheckpoint/time-travel projections over ledgers, then bind stop gates to explicit human review records.",
  }),
  Object.freeze({
    id: "agent-federation",
    title: "Agent-to-agent federation and handoff protocol",
    required: Object.freeze([
      "read-agent-card",
      "handoff-agent",
      "read-federation",
    ]),
    sourceIds: Object.freeze(["orchestration-ecosystem", "multi-agent-practice"]),
    reading: (found: readonly string[]) => found.length === 0
      ? "No A2A/federation/handoff package scripts exist yet."
      : `Federation operations present: ${found.join(", ")}.`,
    next: "Define an agent card and handoff record operation before adding any peer-to-peer agent transport.",
  }),
]);

export function agenticReadiness(repoRoot: string): AgenticReadinessReport {
  const catalog = operationsManifoldScriptCatalog(repoRoot);
  const operationNames = new Set(catalog.scripts.map((script) => script.name));
  const criteria = CRITERIA.map((criterion) => readinessCriterion(criterion, operationNames));
  const summary = summaryFor(criteria);
  return Object.freeze({
    kind: "operations-manifold.assess-agentic-readiness" as const,
    generatedAt: new Date().toISOString(),
    package: catalog.package,
    scriptCount: catalog.scripts.length,
    summary,
    sources: SOURCES,
    criteria: Object.freeze(criteria),
    nextWork: Object.freeze(criteria
      .filter((criterion) => criterion.status !== "present")
      .sort((left, right) => left.score - right.score)
      .slice(0, 5)
      .map((criterion) => `${criterion.id}: ${criterion.next}`)),
  });
}

function readinessCriterion(
  definition: CriterionDefinition,
  operationNames: ReadonlySet<string>,
): AgenticReadinessCriterion {
  const found = definition.required.filter((name) => operationNames.has(name));
  const missing = definition.required.filter((name) => !operationNames.has(name));
  const score = definition.required.length === 0 ? 100 : Math.round((found.length / definition.required.length) * 100);
  const status: AgenticReadinessStatus = missing.length === 0 ? "present" : found.length === 0 ? "missing" : "partial";
  return Object.freeze({
    id: definition.id,
    title: definition.title,
    status,
    score,
    required: definition.required,
    found: Object.freeze(found),
    missing: Object.freeze(missing),
    sourceIds: definition.sourceIds,
    reading: definition.reading(found, missing),
    next: definition.next,
  });
}

function summaryFor(criteria: readonly AgenticReadinessCriterion[]): AgenticReadinessReport["summary"] {
  const present = criteria.filter((criterion) => criterion.status === "present").length;
  const partial = criteria.filter((criterion) => criterion.status === "partial").length;
  const missing = criteria.filter((criterion) => criterion.status === "missing").length;
  const score = Math.round(criteria.reduce((sum, criterion) => sum + criterion.score, 0) / criteria.length);
  return Object.freeze({ score, present, partial, missing });
}
