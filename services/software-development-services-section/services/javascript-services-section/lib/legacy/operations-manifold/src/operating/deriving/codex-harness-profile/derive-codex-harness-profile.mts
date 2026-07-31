import { HARNESS_PREDICATES } from "@red-cup-engineering/organizing-with-llm-agents/harness";

import { agentPlatform, type AgentPlatformProjection } from "../../../agent-platform.mts";
import { agenticReadiness, type AgenticReadinessCriterion, type AgenticReadinessReport } from "../../../agentic-readiness.mts";
import { replayCheckpoint, type ReplayReading } from "../../../checkpoints.mts";
import { readSession, type SessionReading } from "../../../session.mts";
import { agentCard, type AgentCard } from "../../../federation.mts";
import { operationsManifoldAgentHarness } from "../../../agents/harness.mts";
import { readMessages, type ChannelMessageRecord, type ChannelSnapshot } from "../../../operating/messaging/channels/channel-message.mts";
import { operationsManifoldScriptCatalog } from "../../../package-surface.mts";
import { futureWorkTopology } from "../../../operating/planning/topologizing/future-work/library/future-work-topology.mts";
import { operationsLedger, type OperationLedgerEntry } from "../../../operating/recording/operations/ledgering/library/operation-ledger.mts";
import { readFindings, type FindingRecord } from "../../../operating/remembering/codex/findings.mts";
import { optionalText } from "../../../records.mts";
import { OPERATIONS_MANIFOLD_WEBUX_PAGES, operationsManifoldWebuxPagePaths, type OperationsManifoldWebuxPage } from "../../../site-surface.mts";
import { operationsManifoldWork, type ActiveWorkRecord } from "../../../work-management.mts";

export type CodexHarnessProfileParams = Readonly<{
  focus?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  session?: string | undefined;
  session_id?: string | undefined;
  trace?: string | undefined;
  limit?: string | number | undefined;
}>;

export type CodexHarnessCapability = Readonly<{
  id: string;
  status: "mounted" | "partial" | "gap" | "present" | "missing";
  title: string;
  evidence: readonly string[];
  next: string;
}>;

export type CodexHarnessGate = Readonly<{
  id: string;
  ready: boolean;
  severity: "pass" | "watch" | "block";
  summary: string;
  evidence: readonly string[];
  next: string;
}>;

export type CodexHarnessSessionInference = Readonly<{
  session: string | null;
  trace: string | null;
  source: "params" | "work" | "operations" | "session-bindings" | "unresolved";
  evidence: readonly string[];
}>;

export type CodexHarnessTopologyProjection = Readonly<{
  source: "@red-cup-engineering/organizing-with-llm-agents/harness";
  carrier: Readonly<{
    kind: "harness.carrier";
    term: string;
    agent: string;
    channels: readonly string[];
    utterances: number;
    predicates: readonly string[];
  }>;
  topology: Readonly<{
    kind: "agent-harness.topology.carrier";
    utterances: number;
    settlementKeys: readonly string[];
    fixedPointReadingKeys: readonly string[];
  }>;
  interfaces: readonly Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }>[];
}>;

export type CodexHarnessCheckpointReading = Readonly<{
  latest: SessionReading["createCheckpoint"]["latest"];
  count: number;
  status: "fresh" | "stale" | "incomplete" | "missing";
  ready: boolean;
  ageMinutes: number | null;
  missingFiles: readonly string[];
  evidence: readonly string[];
  next: string;
}>;

export type CodexHarnessProfile = Readonly<{
  kind: "operations-manifold.derive-codex-harness-profile";
  generatedAt: string;
  domain: Readonly<{
    focus: string;
    intent: string;
    session: string | null;
    trace: string | null;
    sessionSource: CodexHarnessSessionInference["source"];
  }>;
  sources: Readonly<{
    agentCard: "read-agent-card";
    agentPlatform: "read-agent-platform";
    readiness: "assess-agentic-readiness";
    readSession: "read-session";
    work: "read-work";
    topology: "topologize-future-work";
    packageBins: "package.json#bin";
    researchLibrary: "content";
  }>;
  summary: Readonly<{
    scripts: number;
    toolSurfaces: number;
    readinessScore: number;
    capabilities: number;
    partialCapabilities: number;
    gaps: number;
    activeWork: number;
    sessionBindings: number;
    sessionPressures: number;
    checkpointMissingFiles: number;
    nextInterfaces: number;
    harnessChannels: number;
    harnessUtterances: number;
  }>;
  agent: AgentCard["agent"];
  surfaces: AgentCard["surface"] & Readonly<{
    webuxPages: readonly string[];
    webuxPageCatalog: readonly OperationsManifoldWebuxPage[];
  }>;
  capabilities: readonly CodexHarnessCapability[];
  harnessTopology: CodexHarnessTopologyProjection;
  gates: readonly CodexHarnessGate[];
  session: Readonly<{
    inference: CodexHarnessSessionInference;
    bindings: SessionReading["codomain"]["bindings"];
    pressures: SessionReading["codomain"]["pressures"];
    operationsMatched: number;
    workMatched: number;
    messagesMatched: number;
    messageChannels: number;
    findingsMatched: number;
    recallSubjects: number;
    latestCheckpoint: SessionReading["createCheckpoint"]["latest"];
    checkpoint: CodexHarnessCheckpointReading;
  }>;
  currentWork: readonly Readonly<{
    id: string;
    title: string;
    workKind: ActiveWorkRecord["workKind"];
    workStatus: ActiveWorkRecord["workStatus"];
    gate: ActiveWorkRecord["gate"];
    evidence: readonly string[];
  }>[];
  researchBasis: readonly Readonly<{
    id: string;
    path: string;
    claim: string;
  }>[];
  nextInterfaces: readonly Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }>[];
}>;

export async function deriveCodexHarnessProfile(
  repoRoot: string,
  params: CodexHarnessProfileParams = {},
): Promise<CodexHarnessProfile> {
  const focus = optionalText(params.focus) ?? "sites/ops.561.group";
  const intent = optionalText(params.intent ?? params.q) ?? "derive the Codex harness profile for Operations Manifold work";
  const session = optionalText(params.session ?? params.session_id);
  const trace = optionalText(params.trace);
  const catalog = operationsManifoldScriptCatalog(repoRoot);
  const [work, operations, messages, findings] = await Promise.all([
    operationsManifoldWork(repoRoot),
    operationsLedger(repoRoot),
    readMessages(repoRoot, { limit: 200 }),
    readFindings(repoRoot),
  ]);
  const sessionInference = inferHarnessSession({
    requestedSession: session,
    requestedTrace: trace,
    focus,
    work: work.items,
    operations: operations.entries,
    messageChannels: messages.channels,
    messages: messages.messages,
    findings: findings.findings,
  });
  const [card, platform, readiness, sessionReading, topology, checkpointReplay] = await Promise.all([
    agentCard(repoRoot, { focus, intent }),
    agentPlatform(repoRoot, { focus, limit: params.limit }) as Promise<AgentPlatformProjection>,
    Promise.resolve(agenticReadiness(repoRoot)),
    readSession(repoRoot, { focus, intent, session: sessionInference.session ?? undefined, trace: sessionInference.trace ?? undefined }),
    futureWorkTopology(repoRoot, { focus, intent, limit: params.limit }),
    replayCheckpoint(repoRoot, {
      label: `codex-harness-profile-${sessionInference.session ?? "unbound"}`,
      reason: intent,
      source: "operations-manifold.derive-codex-harness-profile",
    }),
  ]);
  const activeWork = work.items.filter((item) => item.status !== "complete");
  const capabilities = capabilityReadings(platform, readiness);
  const harnessTopology = harnessTopologyProjection({ focus, intent });
  const checkpoint = checkpointReading(sessionReading, checkpointReplay);
  const gates = harnessGates({ card, platform, readiness, sessionReading, checkpoint, activeWork, catalogScripts: catalog.scripts.length });
  const nextInterfaces = nextHarnessInterfaces({ focus, intent, session: sessionInference.session, trace: sessionInference.trace });
  return Object.freeze({
    kind: "operations-manifold.derive-codex-harness-profile" as const,
    generatedAt: new Date().toISOString(),
    domain: Object.freeze({ focus, intent, session: sessionInference.session, trace: sessionInference.trace, sessionSource: sessionInference.source }),
    sources: Object.freeze({
      agentCard: "read-agent-card" as const,
      agentPlatform: "read-agent-platform" as const,
      readiness: "assess-agentic-readiness" as const,
      readSession: "read-session" as const,
      work: "read-work" as const,
      topology: "topologize-future-work" as const,
      packageBins: "package.json#bin" as const,
      researchLibrary: "content" as const,
    }),
    summary: Object.freeze({
      scripts: catalog.scripts.length,
      toolSurfaces: 5,
      readinessScore: readiness.summary.score,
      capabilities: capabilities.length,
      partialCapabilities: capabilities.filter((item) => item.status === "partial").length,
      gaps: gates.filter((gate) => gate.severity !== "pass").length,
      activeWork: activeWork.length,
      sessionBindings: sessionReading.codomain.bindings.length,
      sessionPressures: sessionReading.codomain.pressures.length,
      checkpointMissingFiles: checkpoint.missingFiles.length,
      nextInterfaces: nextInterfaces.length,
      harnessChannels: harnessTopology.carrier.channels.length,
      harnessUtterances: harnessTopology.topology.utterances,
    }),
    agent: card.agent,
    surfaces: Object.freeze({
      ...card.surface,
      webuxPages: operationsManifoldWebuxPagePaths("primary"),
      webuxPageCatalog: OPERATIONS_MANIFOLD_WEBUX_PAGES,
    }),
    capabilities,
    harnessTopology,
    gates,
    session: Object.freeze({
      inference: sessionInference,
      bindings: sessionReading.codomain.bindings,
      pressures: sessionReading.codomain.pressures,
      operationsMatched: sessionReading.operations.matched,
      workMatched: sessionReading.work.matched,
      messagesMatched: sessionReading.messages.matched,
      messageChannels: sessionReading.messages.channels.length,
      findingsMatched: sessionReading.findings.matched,
      recallSubjects: sessionReading.findings.recall.length,
      latestCheckpoint: sessionReading.createCheckpoint.latest,
      checkpoint,
    }),
    currentWork: Object.freeze(activeWork.slice(0, 12).map((item) => Object.freeze({
      id: item.id,
      title: item.title,
      workKind: item.workKind,
      workStatus: item.workStatus,
      gate: item.gate,
      evidence: Object.freeze(item.evidence.slice(0, 8)),
    }))),
    researchBasis: Object.freeze(readiness.sources.map((source) => Object.freeze({
      id: source.id,
      path: source.path,
      claim: source.claim,
    }))),
    nextInterfaces,
  });
}

function inferHarnessSession(input: Readonly<{
  requestedSession: string | null;
  requestedTrace: string | null;
  focus: string;
  work: readonly ActiveWorkRecord[];
  operations: readonly OperationLedgerEntry[];
  messageChannels: readonly ChannelSnapshot[];
  messages: readonly ChannelMessageRecord[];
  findings: readonly FindingRecord[];
}>): CodexHarnessSessionInference {
  if (input.requestedSession !== null || input.requestedTrace !== null) {
    const session = input.requestedSession ?? input.requestedTrace;
    const trace = input.requestedTrace ?? (input.requestedSession === null ? null : `codex.hook:${input.requestedSession}`);
    return inference(session, trace, "params", ["derive-codex-harness-profile:params"]);
  }

  const candidates = new Map<string, SessionCandidate>();
  for (const item of input.work.filter((work) => work.status !== "complete" && (work.focus === input.focus || work.agent.toLowerCase().includes("codex")))) {
    if (item.session !== null) scoreSession(candidates, item.session, "work", item.focus === input.focus ? 8 : 5, item.updatedAt, [item.id, ...item.evidence.slice(0, 3)]);
    for (const candidate of sessionCandidatesFromText([item.id, ...item.evidence].join(" "))) {
      scoreSession(candidates, candidate, "work", 2, item.updatedAt, [item.id, ...item.evidence.slice(0, 2)]);
    }
  }

  for (const entry of input.operations) {
    const sessions = sessionCandidatesFromText([entry.trace, entry.subject, entry.tool ?? "", ...entry.evidence].join(" "));
    for (const session of sessions) scoreSession(candidates, session, "operations", 7, entry.at, [entry.eventId, ...entry.evidence.slice(0, 3)], entry.trace);
  }

  for (const channel of input.messageChannels) {
    for (const session of sessionCandidatesFromText(channel.id)) {
      scoreSession(candidates, session, "session-bindings", 10 + Math.min(channel.messageCount, 4), channel.updatedAt, [channel.id, ...channel.messages.flatMap((message) => [message.messageId, message.eventId]).slice(0, 4)]);
    }
  }
  for (const message of input.messages) {
    const sessions = sessionCandidatesFromText([message.channel, message.session ?? "", message.trace ?? "", ...message.evidence].join(" "));
    for (const session of sessions) scoreSession(candidates, session, "session-bindings", 6, message.at, [message.messageId, message.eventId, ...message.evidence.slice(0, 2)], message.trace);
  }

  for (const finding of input.findings) {
    scoreSession(candidates, finding.session, "session-bindings", 12, finding.at, [finding.id, finding.eventId, ...finding.evidence.slice(0, 3)], finding.trace);
    for (const session of sessionCandidatesFromText([finding.trace ?? "", ...finding.evidence].join(" "))) {
      scoreSession(candidates, session, "session-bindings", 4, finding.at, [finding.id, finding.eventId, ...finding.evidence.slice(0, 2)], finding.trace);
    }
  }

  const candidate = [...candidates.values()]
    .sort((left, right) => right.score - left.score || right.at.localeCompare(left.at) || left.session.localeCompare(right.session))[0];
  if (candidate !== undefined) return inference(candidate.session, candidate.trace ?? `codex.hook:${candidate.session}`, candidate.source, candidate.evidence);

  const operation = input.operations.find((entry) => {
    const trace = entry.trace.toLowerCase();
    const agent = entry.agent?.toLowerCase() ?? "";
    return trace.includes("codex") || agent.includes("codex") || entry.subject.toLowerCase().includes("codex");
  });
  if (operation !== undefined) {
    return inference(operation.trace, operation.trace, "operations", [operation.eventId, ...operation.evidence.slice(0, 3)]);
  }

  return inference(null, null, "unresolved", []);
}

type SessionCandidate = {
  session: string;
  trace: string | null;
  source: CodexHarnessSessionInference["source"];
  score: number;
  at: string;
  evidence: string[];
};

function scoreSession(
  candidates: Map<string, SessionCandidate>,
  rawSession: string | null | undefined,
  source: CodexHarnessSessionInference["source"],
  score: number,
  at: string,
  evidence: readonly string[],
  rawTrace: string | null | undefined = undefined,
): void {
  const session = normalizeSession(rawSession);
  if (session === null) return;
  const current = candidates.get(session) ?? { session, trace: null, source, score: 0, at: "", evidence: [] };
  current.score += score;
  if (at.localeCompare(current.at) > 0) current.at = at;
  if (rawTrace !== null && rawTrace !== undefined && rawTrace.trim() !== "") current.trace = rawTrace.trim();
  if (current.source !== "session-bindings" && (source === "session-bindings" || current.source === "work")) current.source = source;
  for (const item of evidence) {
    if (item.trim() === "" || current.evidence.includes(item)) continue;
    if (source === "session-bindings") current.evidence.unshift(item);
    else current.evidence.push(item);
  }
  candidates.set(session, current);
}

function sessionCandidatesFromText(value: string): readonly string[] {
  const candidates = new Set<string>();
  if (value.includes("codex.current-session")) candidates.add("codex-current");
  for (const match of value.matchAll(/\bcodex-[a-z0-9][a-z0-9-]*/giu)) {
    const session = normalizeSession(match[0]);
    if (session !== null) candidates.add(session);
  }
  return Object.freeze([...candidates]);
}

function normalizeSession(value: string | null | undefined): string | null {
  const text = value?.trim().toLowerCase();
  if (text === undefined || text === "" || text === "codex" || text === "codex.hook" || text === "unknown-session") return null;
  if (text === "codex.current-session" || text === "codex-current-session") return "codex-current";
  const match = text.match(/\bcodex-[a-z0-9][a-z0-9-]*/u);
  return match?.[0] ?? null;
}

function inference(
  session: string | null,
  trace: string | null,
  source: CodexHarnessSessionInference["source"],
  evidence: readonly string[],
): CodexHarnessSessionInference {
  return Object.freeze({
    session,
    trace,
    source,
    evidence: Object.freeze([...new Set(evidence)].slice(0, 6)),
  });
}

function harnessTopologyProjection(input: Readonly<{ focus: string; intent: string }>): CodexHarnessTopologyProjection {
  const harness = operationsManifoldAgentHarness();
  return Object.freeze({
    source: "@red-cup-engineering/organizing-with-llm-agents/harness" as const,
    carrier: Object.freeze({
      kind: harness.carrier.kind,
      term: harness.carrier.term,
      agent: harness.carrier.agent,
      channels: harness.carrier.channels,
      utterances: harness.carrier.utterances.length,
      predicates: Object.freeze(Object.values(HARNESS_PREDICATES)),
    }),
    topology: Object.freeze({
      kind: harness.topology.kind,
      utterances: harness.topology.utterances.length,
      settlementKeys: Object.freeze(Object.keys(harness.topology.settlement)),
      fixedPointReadingKeys: Object.freeze(Object.keys(harness.topology.fixedPointReadings)),
    }),
    interfaces: Object.freeze([
      iface("derive-codex-harness-profile", "read this upstream organizing-with-llm-agents harness topology projection", { focus: input.focus, intent: input.intent }),
      iface("read-agent-platform", "compare the harness topology with mounted agent platform capabilities", { focus: input.focus, intent: input.intent }),
      iface("derive-context-relevance", "find upstream harness functions and neighboring LLM-agent carriers by prompt keyword", { focus: input.focus, intent: "harness upstream llm computing", limit: "8" }),
    ]),
  });
}

function capabilityReadings(platform: AgentPlatformProjection, readiness: AgenticReadinessReport): readonly CodexHarnessCapability[] {
  const platformCapabilities = platform.capabilities.map((capability) => Object.freeze({
    id: capability.capability,
    status: capability.status,
    title: capability.codexReference,
    evidence: Object.freeze([capability.operationsManifoldCarrier, ...capability.evidence]),
    next: capability.status === "mounted" ? "Keep this carrier wired through package-bin and witnessed work state." : "Promote this partial capability into a package-bin carrier or upstream substrate function.",
  }));
  const readinessCapabilities = readiness.criteria.map((criterion) => Object.freeze({
    id: criterion.id,
    status: criterion.status,
    title: criterion.title,
    evidence: Object.freeze([...criterion.found, ...criterion.sourceIds.map((id) => `research:${id}`)].slice(0, 12)),
    next: criterion.next,
  }));
  return Object.freeze([...platformCapabilities, ...readinessCapabilities]
    .sort((left, right) => severityRank(left.status) - severityRank(right.status) || left.id.localeCompare(right.id)));
}

function checkpointReading(sessionReading: SessionReading, replay: ReplayReading): CodexHarnessCheckpointReading {
  const latest = sessionReading.createCheckpoint.latest;
  if (latest === null) {
    const missingFiles = Object.freeze(replay.current.files.filter((file) => !file.exists).map((file) => file.path));
    return Object.freeze({
      latest,
      count: sessionReading.createCheckpoint.count,
      status: "missing" as const,
      ready: false,
      ageMinutes: null,
      missingFiles,
      evidence: Object.freeze([sessionReading.createCheckpoint.log, sessionReading.createCheckpoint.state, ...missingFiles].slice(0, 8)),
      next: "Run createCheckpoint for the current Codex session before treating the harness as replayable.",
    });
  }
  const missingFiles = Object.freeze(replay.current.files.filter((file) => !file.exists).map((file) => file.path));
  const ageMinutes = checkpointAgeMinutes(latest.at);
  const status = missingFiles.length > 0
    ? "incomplete" as const
    : ageMinutes > 120
      ? "stale" as const
      : "fresh" as const;
  return Object.freeze({
    latest,
    count: sessionReading.createCheckpoint.count,
    status,
    ready: status === "fresh",
    ageMinutes,
    missingFiles,
    evidence: Object.freeze([latest.id, latest.label, latest.at, ...replay.deltas.filter((delta) => delta.status !== "unchanged").map((delta) => `${delta.path}:${delta.status}`), ...missingFiles].slice(0, 8)),
    next: status === "fresh"
      ? "Checkpoint evidence is fresh enough for the current harness profile."
      : status === "incomplete"
        ? "Run createCheckpoint after restoring missing log or state files."
        : "Run createCheckpoint for the current Codex session so replay evidence reflects current work, context, and operations.",
  });
}

function checkpointAgeMinutes(at: string): number {
  const value = Date.parse(at);
  if (!Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - value) / 60000));
}

function harnessGates(input: Readonly<{
  card: AgentCard;
  platform: AgentPlatformProjection;
  readiness: AgenticReadinessReport;
  sessionReading: SessionReading;
  checkpoint: CodexHarnessCheckpointReading;
  activeWork: readonly ActiveWorkRecord[];
  catalogScripts: number;
}>): readonly CodexHarnessGate[] {
  return Object.freeze([
    gate("single-script-graph", input.catalogScripts >= input.card.surface.scripts && input.card.surface.scripts > 0, `package-bin catalog exposes ${input.catalogScripts} script(s)`, ["package.json#bin", "read-agent-card"], "Keep new operations in package.json#bin so WebUX/OpenAPI/MCP stay one graph."),
    gate("readiness-score", input.readiness.summary.missing === 0, `readiness score ${input.readiness.summary.score}; missing=${input.readiness.summary.missing}`, ["assess-agentic-readiness"], "Repair missing or partial readiness criteria before adding transport complexity."),
    gate("session-bindings", input.sessionReading.codomain.bindings.every((binding) => binding.ready), `${input.sessionReading.codomain.bindings.filter((binding) => binding.ready).length}/${input.sessionReading.codomain.bindings.length} session binding(s) ready`, ["read-session"], "Bind active hooks, work, context, drift, and checkpoints to the current session."),
    gate("session-pressures", input.sessionReading.codomain.pressures.every((pressure) => pressure.severity !== "block"), `${input.sessionReading.codomain.pressures.length} session pressure(s)`, ["read-session"], "Resolve blocking session pressures before treating the harness as settled."),
    gate("checkpoint-freshness", input.checkpoint.ready, `checkpoint ${input.checkpoint.status}${input.checkpoint.ageMinutes === null ? "" : `; age ${input.checkpoint.ageMinutes} minute(s)`}; missing files=${input.checkpoint.missingFiles.length}`, input.checkpoint.evidence, input.checkpoint.next),
    gate("work-bound", input.activeWork.length > 0, `${input.activeWork.length} active work carrier(s)`, ["read-work"], "Start or select an active work carrier before dispatching Codex work."),
    gate("dispatch-governance", input.platform.governance.every((entry) => entry.ready), `${input.platform.governance.filter((entry) => entry.ready).length}/${input.platform.governance.length} governance operation(s) ready`, ["read-agent-platform", "assess-dispatch-readiness"], "Use assess-dispatch-readiness before governed Codex tool operations."),
  ]);
}

function gate(id: string, ready: boolean, summary: string, evidence: readonly string[], next: string): CodexHarnessGate {
  return Object.freeze({
    id,
    ready,
    severity: ready ? "pass" as const : "watch" as const,
    summary,
    evidence: Object.freeze(evidence),
    next,
  });
}

function nextHarnessInterfaces(input: Readonly<{ focus: string; intent: string; session: string | null; trace: string | null }>): CodexHarnessProfile["nextInterfaces"] {
  const sessionParams = {
    focus: input.focus,
    intent: input.intent,
    ...(input.session === null ? {} : { session: input.session }),
    ...(input.trace === null ? {} : { trace: input.trace }),
  };
  return Object.freeze([
    iface("enact-strategy", "choose the next admitted Codex strategy move and the package-bin interfaces for that move", { focus: input.focus, intent: input.intent, phase: "request" }),
    iface("read-session", "inspect current session bindings, pressures, operations, work, context, and checkpoints", sessionParams),
    iface("record-finding", "persist a Codex session finding through Operations Manifold JSONL/state memory", { ...sessionParams, subject: "operations-manifold/codex-session", predicate: "has-durable-finding", charge: "potential" }),
    iface("derive-context-relevance", "feed Codex hooks keyword-matched functions, types, and scripts before planning or editing", { focus: input.focus, intent: input.intent, limit: "8" }),
    iface("assess-dispatch-readiness", "check Codex capability and office authority before a governed tool operation", { focus: input.focus, intent: input.intent, operation: "invoke-mcp-tool" }),
    iface("project-context-suit", "assemble bounded context for the next Codex action", { focus: input.focus, intent: input.intent }),
    iface("derive-codebase-profile", "inspect codebase carriers, attention, and applicable functions for this work", { focus: input.focus, intent: input.intent, limit: "8" }),
    iface("derive-organizational-profile", "read goals, work, operations, and topology as the current organizational profile", { focus: input.focus, intent: input.intent }),
    iface("handoff-agent", "prepare a witnessable handoff packet for another agent or human", { focus: input.focus, intent: input.intent }),
    iface("update-work", "record the next witnessed phase of Codex work", { evidence: "verification:..." }),
  ]);
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>): Readonly<{ bin: string; purpose: string; params: Readonly<Record<string, string>> }> {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }) });
}

function severityRank(status: CodexHarnessCapability["status"]): number {
  if (status === "gap" || status === "missing") return 0;
  if (status === "partial") return 1;
  return 2;
}
