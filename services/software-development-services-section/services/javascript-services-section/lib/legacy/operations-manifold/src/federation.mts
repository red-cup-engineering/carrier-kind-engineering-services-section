import { agenticReadiness } from "./agentic-readiness.mts";
import { operationsManifoldAgents } from "./agents/index.mts";
import { capabilityCoverage, type CapabilityCoverageResult } from "./capability-index.mts";
import { operationsLedger, recordOperation, type OperationRecordResult } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { operationsManifoldScriptCatalog } from "./package-surface.mts";
import { hash, optionalText, slug, stringList } from "./records.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "./work-management.mts";

export type FederationParams = Readonly<{
  q?: string | undefined;
  query?: string | undefined;
  intent?: string | undefined;
  focus?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  peer?: string | undefined;
  peers?: string | readonly string[] | undefined;
  work?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  record?: string | undefined;
}>;

export type AgentCard = Readonly<{
  kind: "operations-manifold.agent.card";
  generatedAt: string;
  protocol: "operations-manifold.read-agent-card.v1";
  agent: Readonly<{
    id: string;
    name: string;
    package: string;
    role: string;
  }>;
  surface: Readonly<{
    scripts: number;
    webux: string;
    openapi: string;
    mcp: string;
    httpPost: string;
  }>;
  channels: readonly string[];
  capabilities: Readonly<{
    operations: readonly string[];
    focus: string | null;
    coverage: CapabilityCoverageResult | null;
  }>;
  authority: Readonly<{
    canAcceptHandoff: true;
    canRecordWitness: true;
    requiresExplicitRecord: true;
    safetyEnvelope: "local-package-script";
  }>;
  readiness: Readonly<{
    score: number;
    present: number;
    partial: number;
    missing: number;
    nextWork: readonly string[];
  }>;
}>;

export type AgentHandoffPacket = Readonly<{
  id: string;
  protocol: "operations-manifold.handoff-agent.v1";
  generatedAt: string;
  from: string;
  to: string;
  intent: string;
  focus: string | null;
  work: ActiveWorkRecord | null;
  evidence: readonly string[];
  controls: readonly HandoffControl[];
  payload: Readonly<{
    agentCard: string;
    operationSurface: string;
    recommendedEntry: string;
    capabilityCoverage: CapabilityCoverageResult;
  }>;
}>;

export type HandoffControl = Readonly<{
  condition: "capability" | "read-work" | "authority" | "transport" | "witness";
  verdict: "pass" | "missing" | "repair";
  evidence: string;
  requiredEvidence: string;
}>;

export type AgentHandoffReading = Readonly<{
  kind: "operations-manifold.agent.handoff";
  generatedAt: string;
  mode: "preview" | "record";
  recorded: boolean;
  packet: AgentHandoffPacket;
  witness: HandoffWitness | null;
}>;

export type HandoffWitness = Readonly<{
  kind: "operations-manifold.agent.handoff.witness";
  entryId: string;
  eventId: string;
  log: string;
  state: string;
  eavtJsonl: string;
}>;

export type FederationReading = Readonly<{
  kind: "operations-manifold.federation";
  generatedAt: string;
  protocol: "operations-manifold.federation.v1";
  topology: "local-boundary" | "declared-peers";
  local: AgentCard;
  peers: readonly FederationPeer[];
  channels: readonly FederationChannel[];
  upstream: Readonly<{
    package: "@emsenn/operations-manifold";
    carrier: "OperationsManifoldFederation";
    kind: "operations-manifold.agent.federation";
    members: number;
  }>;
  handoff: Readonly<{
    protocol: AgentHandoffPacket["protocol"];
    requiredFields: readonly string[];
    recordOperation: string;
    previewOperation: string;
  }>;
  ledger: Readonly<{
    log: string;
    state: string;
    handoffWitnesses: number;
  }>;
}>;

export type FederationPeer = Readonly<{
  id: string;
  endpoint: string;
  status: "declared";
}>;

export type FederationChannel = Readonly<{
  channel: "package-script" | "http" | "openapi" | "mcp" | "webux";
  endpoint: string;
  role: "local" | "projection";
}>;

const DEFAULT_FOCUS = "sites/ops.561.group";
const LOCAL_AGENT_ID = "operations-manifold.codex-harness";

export async function agentCard(repoRoot: string, params: FederationParams = {}): Promise<AgentCard> {
  const generatedAt = new Date().toISOString();
  const focus = optionalText(params.focus) ?? DEFAULT_FOCUS;
  const query = optionalText(params.q ?? params.query ?? params.intent);
  const catalog = operationsManifoldScriptCatalog(repoRoot);
  const [coverage] = await Promise.all([
    query === null ? Promise.resolve(null) : capabilityCoverage(repoRoot, query),
  ]);
  const readiness = agenticReadiness(repoRoot);
  const agents = operationsManifoldAgents();
  return Object.freeze({
    kind: "operations-manifold.agent.card" as const,
    generatedAt,
    protocol: "operations-manifold.read-agent-card.v1" as const,
    agent: Object.freeze({
      id: LOCAL_AGENT_ID,
      name: "561 Group Operations Manifold Codex harness",
      package: catalog.package,
      role: "agentic coding and orchestration surface",
    }),
    surface: Object.freeze({
      scripts: catalog.scripts.length,
      webux: "/",
      openapi: "/openapi.json",
      mcp: "/mcp",
      httpPost: "/{process}",
    }),
    channels: Object.freeze([...agents.harness.channels]),
    capabilities: Object.freeze({
      operations: Object.freeze(catalog.scripts.map((script) => script.name).sort()),
      focus,
      coverage,
    }),
    authority: Object.freeze({
      canAcceptHandoff: true as const,
      canRecordWitness: true as const,
      requiresExplicitRecord: true as const,
      safetyEnvelope: "local-package-script" as const,
    }),
    readiness: Object.freeze({
      score: readiness.summary.score,
      present: readiness.summary.present,
      partial: readiness.summary.partial,
      missing: readiness.summary.missing,
      nextWork: readiness.nextWork,
    }),
  });
}

export async function agentHandoff(repoRoot: string, params: FederationParams = {}): Promise<AgentHandoffReading> {
  const generatedAt = new Date().toISOString();
  const card = await agentCard(repoRoot, { focus: params.focus });
  const intent = optionalText(params.intent ?? params.q ?? params.query) ?? "agent handoff";
  const focus = optionalText(params.focus) ?? DEFAULT_FOCUS;
  const to = optionalText(params.to ?? params.peer) ?? "external.agent";
  const from = optionalText(params.from) ?? card.agent.id;
  const evidence = stringList(params.evidence);
  const [coverage, workSnapshot] = await Promise.all([
    capabilityCoverage(repoRoot, intent),
    operationsManifoldWork(repoRoot),
  ]);
  const work = selectedWork(workSnapshot.items, optionalText(params.work));
  const packet = handoffPacket({ generatedAt, from, to, intent, focus, evidence, card, coverage, work, record: shouldRecord(params.record) });
  const record = shouldRecord(params.record)
    ? await recordHandoff(repoRoot, packet)
    : null;
  return Object.freeze({
    kind: "operations-manifold.agent.handoff" as const,
    generatedAt,
    mode: record === null ? "preview" as const : "record" as const,
    recorded: record !== null,
    packet,
    witness: record === null ? null : witnessFor(record),
  });
}

export async function federation(repoRoot: string, params: FederationParams = {}): Promise<FederationReading> {
  const generatedAt = new Date().toISOString();
  const [local, ledger] = await Promise.all([
    agentCard(repoRoot, params),
    operationsLedger(repoRoot),
  ]);
  const peers = federationPeers(params);
  const upstream = operationsManifoldFederation(peers);
  return Object.freeze({
    kind: "operations-manifold.federation" as const,
    generatedAt,
    protocol: "operations-manifold.federation.v1" as const,
    topology: peers.length === 0 ? "local-boundary" as const : "declared-peers" as const,
    local,
    peers,
    channels: Object.freeze([
      channel("package-script", "read-agent-card", "local"),
      channel("package-script", "handoff-agent", "local"),
      channel("package-script", "federation", "local"),
      channel("http", "/read-agent-card", "projection"),
      channel("http", "/handoff-agent", "projection"),
      channel("http", "/federation", "projection"),
      channel("openapi", "/openapi.json", "projection"),
      channel("mcp", "/mcp", "projection"),
      channel("webux", "/", "projection"),
    ]),
    upstream: Object.freeze({
      package: "@emsenn/operations-manifold" as const,
      carrier: "OperationsManifoldFederation" as const,
      kind: upstream.kind,
      members: upstream.members.length,
    }),
    handoff: Object.freeze({
      protocol: "operations-manifold.handoff-agent.v1" as const,
      requiredFields: Object.freeze(["from", "to", "intent", "focus", "evidence", "controls"]),
      recordOperation: "handoff-agent record=true",
      previewOperation: "handoff-agent",
    }),
    ledger: Object.freeze({
      log: ledger.log,
      state: ledger.state,
      handoffWitnesses: ledger.entries.filter((entry) => entry.predicate === "operations-manifold.agent.handed-off").length,
    }),
  });
}

function operationsManifoldFederation(peers: readonly FederationPeer[]): Readonly<{
  kind: "operations-manifold.agent.federation";
  members: readonly string[];
}> {
  return Object.freeze({
    kind: "operations-manifold.agent.federation" as const,
    members: Object.freeze([LOCAL_AGENT_ID, ...peers.map((peer) => peer.id)]),
  });
}

function handoffPacket(input: Readonly<{
  generatedAt: string;
  from: string;
  to: string;
  intent: string;
  focus: string;
  evidence: readonly string[];
  card: AgentCard;
  coverage: CapabilityCoverageResult;
  work: ActiveWorkRecord | null;
  record: boolean;
}>): AgentHandoffPacket {
  const id = `handoff:${slug(input.to)}:${hash({
    from: input.from,
    to: input.to,
    intent: input.intent,
    focus: input.focus,
    work: input.work?.id,
    evidence: input.evidence,
  }).slice(0, 16)}`;
  return Object.freeze({
    id,
    protocol: "operations-manifold.handoff-agent.v1" as const,
    generatedAt: input.generatedAt,
    from: input.from,
    to: input.to,
    intent: input.intent,
    focus: input.focus,
    work: input.work,
    evidence: input.evidence,
    controls: Object.freeze([
      control(
        "capability",
        input.coverage.gaps.length === 0 ? "pass" : "repair",
        input.coverage.gaps.length === 0
          ? `covered terms: ${input.coverage.coveredTerms.join(", ") || "none"}`
          : `coverage gaps: ${input.coverage.gaps.join(", ")}`,
        "capability coverage for handoff intent",
      ),
      control(
        "read-work",
        input.work === null ? "missing" : "pass",
        input.work === null ? "no active read-work item selected" : `${input.work.id}: ${input.work.title}`,
        "read-work item or explicit non-read-work handoff rationale",
      ),
      control("authority", "pass", input.card.authority.safetyEnvelope, "local package-script safety envelope"),
      control("transport", "pass", "package-bin graph projected to HTTP, OpenAPI, MCP, and WebUX", "shared package-script graph"),
      control(
        "witness",
        input.record ? "pass" : "missing",
        input.record ? "record=true requested" : "preview only; no ledger witness will be appended",
        "record=true when the handoff should become durable evidence",
      ),
    ]),
    payload: Object.freeze({
      agentCard: input.card.agent.id,
      operationSurface: input.card.surface.httpPost,
      recommendedEntry: "handoff-agent",
      capabilityCoverage: input.coverage,
    }),
  });
}

async function recordHandoff(repoRoot: string, packet: AgentHandoffPacket): Promise<OperationRecordResult> {
  return recordOperation(repoRoot, {
    kind: "note",
    subject: packet.from,
    predicate: "operations-manifold.agent.handed-off",
    object: packet.to,
    trace: `operations-manifold.handoff:${packet.id}`,
    tool: "handoff-agent",
    agent: packet.from,
    source: "operations-manifold.handoff-agent",
    evidence: packet.evidence,
    note: JSON.stringify(packet),
  });
}

function witnessFor(record: OperationRecordResult): HandoffWitness {
  return Object.freeze({
    kind: "operations-manifold.agent.handoff.witness" as const,
    entryId: record.entry.id,
    eventId: record.entry.eventId,
    log: record.snapshot.log,
    state: record.snapshot.state,
    eavtJsonl: record.eavtJsonl,
  });
}

function selectedWork(items: readonly ActiveWorkRecord[], id: string | null): ActiveWorkRecord | null {
  if (id !== null) {
    return items.find((item) => item.id === id || item.id.includes(id) || item.title === id) ?? null;
  }
  return items.find((item) => item.status === "active") ?? null;
}

function shouldRecord(value: string | undefined): boolean {
  const text = optionalText(value)?.toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "record";
}

function federationPeers(params: FederationParams): readonly FederationPeer[] {
  return Object.freeze(stringList(params.peers ?? params.peer).map((endpoint) => Object.freeze({
    id: `peer:${slug(endpoint)}`,
    endpoint,
    status: "declared" as const,
  })));
}

function channel(
  channelName: FederationChannel["channel"],
  endpoint: string,
  role: FederationChannel["role"],
): FederationChannel {
  return Object.freeze({ channel: channelName, endpoint, role });
}

function control(
  condition: HandoffControl["condition"],
  verdict: HandoffControl["verdict"],
  evidence: string,
  requiredEvidence: string,
): HandoffControl {
  return Object.freeze({ condition, verdict, evidence, requiredEvidence });
}
