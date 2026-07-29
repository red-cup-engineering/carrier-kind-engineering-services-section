import { ENDPOINTS } from "@emsenn/organizing-with-llm-agents/algebra";
import { endpointProjection, type EndpointProjection } from "@emsenn/organizing-with-llm-agents/holography";
import {
  dreaming,
  observation,
  task,
  type DreamResult,
  type Observation,
} from "@emsenn/knowing/dreaming";
import { cell, mark, witnessedPotential } from "@emsenn/relating";

import { contextControl, type ContextControlSnapshot } from "./operating/contextualizing/suiting/library/context-control.mts";
import { operationsManifoldGoals, type GoalSnapshot } from "./goals.mts";
import { office } from "./operating/governing/dispatching/readiness.mts";
import { operationsLedger, type OperationLedgerSnapshot } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { orchestration, type OrchestrationReading } from "./orchestration.mts";
import { operationsManifoldRelativePath, operationsManifoldStatePath } from "./package-surface.mts";
import { operationsManifoldWork, type WorkSnapshot } from "./work-management.mts";
import { managedWorkPriority, unmetDependencies, workItemForManagedWork } from "./work-projection.mts";
import { assignWork, fiberOf, officeTerm, predicate, term, termKey, workItem, workPriority, workProject, workTask, workTitle, type WorkItem, type WorkProject } from "./work-carriers.mts";

export type HeartbeatPressure = Readonly<{
  id: string;
  weight: number;
  source: string;
  signal: string;
  response: string;
}>;

export type ContextSpacesuit = Readonly<{
  workId: string;
  title: string;
  focus: string | null;
  sources: readonly string[];
  tools: readonly string[];
  keywords: readonly string[];
  nextPrompt: string;
}>;

export type OperationsManifoldHeartbeatReading = Readonly<{
  kind: "operations-manifold.heartbeat";
  generatedAt: string;
  focus: string | null;
  intent: string | null;
  endpointReadiness: readonly EndpointProjection[];
  pressures: readonly HeartbeatPressure[];
  observations: readonly Observation[];
  dreamContext: DreamResult;
  goals: GoalSnapshot;
  managedWork: WorkSnapshot;
  context: ContextControlSnapshot;
  operations: OperationLedgerSnapshot;
  workItems: readonly WorkItem[];
  project: WorkProject;
  spacesuits: readonly ContextSpacesuit[];
  orchestration: OrchestrationReading;
}>;

export async function heartbeat(
  repoRoot: string,
  params: Readonly<{ focus?: string | undefined; intent?: string | undefined }> = {},
): Promise<OperationsManifoldHeartbeatReading> {
  const generatedAt = new Date().toISOString();
  const focus = params.focus ?? "@emsenn/koios.news";
  const intent = cleanText(params.intent);
  const [orchestrationReading, goals, managedWork, context, operations] = await Promise.all([
    orchestration(repoRoot, { focus }),
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    contextControl(repoRoot),
    operationsLedger(repoRoot),
  ]);
  const endpointReadiness = Object.freeze([
    endpointProjection(ENDPOINTS.nvidia, { now: generatedAt }),
    endpointProjection(ENDPOINTS.openai, { now: generatedAt }),
    endpointProjection(ENDPOINTS.groq, { now: generatedAt }),
    endpointProjection(ENDPOINTS.cerebras, { now: generatedAt }),
  ]);
  const pressures = pressureSignals(orchestrationReading, endpointReadiness, goals, managedWork, context, operations, intent);
  const observations = pressureObservations(pressures, generatedAt);
  const dreamContext = dreaming({ regime: "scott-continuous", observations }, { at: mark(["generated-at", generatedAt]), observer: term(["operations-manifold", "heartbeat", "dreamContext"]), limit: 16 });
  const workItems = heartbeatWorkItems(orchestrationReading, goals, managedWork, context, operations, pressures, dreamContext, intent);
  const offices = Object.freeze([
    office(officeTerm("operations-manifold.engineering"), {
      authorities: fiberOf(["edit-site-code", "run-checks", "invoke-tools", "restart-site-service"], "authority"),
      capabilities: fiberOf(["code.edit", "mcp.tool-use", "trace.fold", "heartbeat.pulse"]),
      duties: ["mount-heartbeat-surfaces", "verify-runtime", "wire-hooks"].map((value) => term(["duty", value])),
      evidence: [term(["label", "561 Group Operations Manifold Engineering"])],
    }),
    office(officeTerm("operations-manifold"), {
      authorities: fiberOf(["admit-goal-documents", "prioritize-goals", "fold-goal-logs"], "authority"),
      capabilities: fiberOf(["goal.intake", "eavt.fold", "work.propose", "planning"]),
      duties: ["preserve-user-goals", "surface-filed-goals", "connect-goals-to-read-work"].map((value) => term(["duty", value])),
      evidence: [term(["label", "561 Group Operations Manifold Filed Goals"])],
    }),
    office(officeTerm("operations-manifold.context"), {
      authorities: fiberOf(["admit-context-document", "project-suits", "assess-drift", "fold-context-logs"], "authority"),
      capabilities: fiberOf(["context.admit", "context.suit", "drift.assess", "eavt.fold"]),
      duties: ["preserve-context-provenance", "measure-agentic-drift", "prevent-context-presence-as-learning"].map((value) => term(["duty", value])),
      evidence: [term(["label", "561 Group Operations Manifold Context Control"])],
    }),
    office(officeTerm("operations-manifold.ledger"), {
      authorities: fiberOf(["book-operations", "fold-resource-logs", "project-ludic-feedback"], "authority"),
      capabilities: fiberOf(["operation.record", "token.bookkeeping", "tool-use.ledger", "file-touch.ledger", "game.project"]),
      duties: ["preserve-tool-use-evidence", "surface-token-cost", "turn-agent-actions-into-records"].map((value) => term(["duty", value])),
      evidence: [term(["label", "561 Group Operations Manifold Operations Ledger"])],
    }),
    office(officeTerm("operations-manifold.governance"), {
      authorities: fiberOf(["admit-work-document", "assign-read-work", "set-policy"], "authority"),
      capabilities: fiberOf(["governance.dispatch", "learning.validate", "human-control"]),
      duties: ["admit-dreamContext-proposals", "validate-learned-claims"].map((value) => term(["duty", value])),
      evidence: [term(["label", "561 Group Operations Manifold Governance"])],
    }),
  ]);
  const project = workProject({
    term: term(["operations-manifold", "heartbeat"]),
    work: workItems,
    offices: Object.freeze(offices.map((item) => item.term)),
    assignments: Object.freeze(workItems.map((item) => assignWork({
      term: term(["operations-manifold", "heartbeat", "assignment", termKey(item.term)]),
      work: item,
      office: item.office ?? officeTerm("operations-manifold.engineering"),
      duties: Object.freeze([item.task.term]),
      at: term(["generated-at", generatedAt]),
      evidence: Object.freeze([term(["source", "operations-manifold.heartbeat"])]),
    }))),
    evidence: Object.freeze([
      term(["title", "561 Group Operations Manifold Heartbeat Work"]),
      term(["generated-at", generatedAt]),
      term(["focus", focus]),
      term(["intent", intent ?? ""]),
      term(["open-goals", goals.open.length]),
      term(["open-managed-read-work", managedWork.active.length]),
      term(["stop-gated-read-work", managedWork.blocking.length]),
      term(["context-admissions", context.admissions.length]),
      term(["assess-driftments", context.assessments.length]),
      term(["operation-entries", operations.totals.entries]),
      term(["operation-tokens", operations.totals.tokens]),
      term(["operation-estimated-tokens", operations.totals.estimatedTokens]),
      term(["over-budget-operations", operations.totals.overBudgetEntries]),
      term(["operation-experience", operations.game.experience]),
    ]),
  });
  return Object.freeze({
    kind: "operations-manifold.heartbeat" as const,
    generatedAt,
    focus: orchestrationReading.focus,
    intent,
    endpointReadiness,
    pressures,
    observations: Object.freeze(observations),
    dreamContext,
    goals,
    managedWork,
    context,
    operations,
    workItems: Object.freeze(workItems),
    project,
    spacesuits: Object.freeze(workItems.slice(0, 8).map((item) => spacesuitFor(item, orchestrationReading, context, operations, intent))),
    orchestration: orchestrationReading,
  });
}

function cleanText(value: string | undefined): string | null {
  const text = value?.trim();
  return text === undefined || text === "" ? null : text.slice(0, 2000);
}

function pressureSignals(
  orchestrationReading: OrchestrationReading,
  endpoints: readonly EndpointProjection[],
  goals: GoalSnapshot,
  managedWork: WorkSnapshot,
  context: ContextControlSnapshot,
  operations: OperationLedgerSnapshot,
  intent: string | null,
): readonly HeartbeatPressure[] {
  const pressures: HeartbeatPressure[] = [];
  for (const item of orchestrationReading.next.slice(0, 4)) {
    pressures.push(pressure(`orchestration:${item.workId}`, item.priority, "orchestration", item.title, `advance ${item.settlement} through ${item.office}`));
  }
  for (const goal of goals.goals.filter((item) => goals.open.includes(item.id)).slice(0, 6)) {
    pressures.push(pressure(
      `goal:${slug(goal.id)}`,
      Math.min(100, goal.priority + 20),
      "goal-log",
      `filed goal remains open: ${goal.title}`,
      `fold ${goal.id} into heartbeat read-work and preserve evidence from ${goals.log}`,
    ));
  }
  for (const item of managedWork.items.filter((candidate) => candidate.status !== "complete").slice(0, 8)) {
    const unmet = unmetDependencies(item, managedWork);
    const blocking = item.gate === "stop";
    pressures.push(pressure(
      `work:${slug(item.id)}`,
      Math.min(100, managedWorkPriority(item) + (blocking ? 8 : 0) + (unmet.length > 0 ? 6 : 0)),
      "read-work-management",
      `${item.workKind} ${item.id} is ${blocking ? "stop-gated" : "record-gated"} and ${unmet.length > 0 ? `awaits ${unmet.join(", ")}` : "ready for settlement"}`,
      `advance ${item.title}; success is ${item.success}`,
    ));
  }
  if (context.admissions.length === 0) {
    pressures.push(pressure(
      "context:no-admission",
      96,
      "control-context",
      "no context admission has been filed",
      `admit context through ${context.log} before using spacesuit projection as durable learning`,
    ));
  }
  const latestSuit = context.latestSuit;
  if (latestSuit !== null && latestSuit.tokenEstimate > latestSuit.budget) {
    pressures.push(pressure(
      "context:suit-budget",
      92,
      "control-context",
      `latest suit estimate ${latestSuit.tokenEstimate} exceeds budget ${latestSuit.budget}`,
      "trim admitted context or increase budget before reusing the suit",
    ));
  }
  for (const assessment of context.assessments.slice(0, 4)) {
    if (assessment.drift || assessment.score < 80) {
      pressures.push(pressure(
        `context-drift:${slug(assessment.id)}`,
        assessment.drift ? 100 : 90,
        "control-context",
        `drift assessment ${assessment.id} scored ${assessment.score}`,
        `inspect ${assessment.evidence.join(", ")} and file corrective context, scope, or governance evidence`,
      ));
    }
  }
  if (operations.totals.entries === 0) {
    pressures.push(pressure(
      "operations:no-ledger-entries",
      98,
      "read-operations-ledger",
      "no operations have been booked",
      `record tool, token, file, and MCP activity through ${operations.log}`,
    ));
  }
  if (operations.totals.tokens === 0) {
    pressures.push(pressure(
      "operations:no-token-bookkeeping",
      88,
      "read-operations-ledger",
      "token usage is not yet visible in the ledger",
      "book the next model call or estimated token cost before treating inference as governed read-work",
    ));
  }
  if (operations.totals.estimatedTokens > 0) {
    pressures.push(pressure(
      "operations:context-metered",
      operations.totals.overBudgetEntries > 0 ? 94 : 62,
      "read-operations-ledger",
      `operation context estimate=${operations.totals.estimatedTokens} tokens, input=${operations.totals.inputBytes} bytes, output=${operations.totals.outputBytes} bytes`,
      operations.totals.overBudgetEntries > 0
        ? `reduce or summarize ${operations.totals.overBudgetEntries} over-budget operation payload(s)`
        : "keep booking context sizes so routes can detect growth before drift",
    ));
  }
  if (operations.totals.hugeEntries > 0) {
    pressures.push(pressure(
      "operations:huge-context-emitters",
      99,
      "read-operations-ledger",
      `${operations.totals.hugeEntries} operation(s) emitted more than double their context budget`,
      "replace raw payload replayCheckpoint with compact hashes, previews, and source pointers",
    ));
  }
  if (operations.totals.fileReads === 0 || operations.totals.fileWrites === 0) {
    pressures.push(pressure(
      "operations:file-touch-gap",
      84,
      "read-operations-ledger",
      `file reads=${operations.totals.fileReads} writes=${operations.totals.fileWrites}`,
      "book file-read and file-write events so agent action traces become auditable records",
    ));
  }
  for (const friction of operations.game.friction.slice(0, 3)) {
    pressures.push(pressure(
      `operations-friction:${slug(friction)}`,
      76,
      "read-operations-ledger",
      friction,
      "answer the ledger challenge so experience reflects better evidence, not only more activity",
    ));
  }
  const presentEndpoints = endpoints.filter((endpoint) => endpoint.apiKey.present).map((endpoint) => endpoint.endpoint);
  pressures.push(pressure(
    "endpoint:availability",
    presentEndpoints.length > 0 ? 70 : 95,
    "endpoint-projection",
    presentEndpoints.length > 0 ? `available outbound endpoints: ${presentEndpoints.join(", ")}` : "no outbound endpoint api key is projected as present",
    presentEndpoints.length > 0 ? "route aperiodic dreaming through governed dispatch when needed" : "record endpoint admission gap before relying on cloud inference",
  ));
  if (intent !== null) {
    for (const keyword of intentKeywords(intent).slice(0, 8)) {
      pressures.push(pressure(`intent:${keyword}`, 65, "user-intent", `user intent mentions ${keyword}`, `open candidate read-work around ${keyword}`));
    }
  }
  return Object.freeze(pressures.sort((left, right) => right.weight - left.weight || left.id.localeCompare(right.id)));
}

function pressure(id: string, weight: number, sourceName: string, signal: string, response: string): HeartbeatPressure {
  return Object.freeze({ id, weight, source: sourceName, signal, response });
}

function pressureObservations(pressures: readonly HeartbeatPressure[], generatedAt: string): readonly Observation[] {
  return Object.freeze(pressures.flatMap((item) => [
    observation({
      observer: term(["operations-manifold", "heartbeat"]),
      task: task({
        subject: term(["operations-manifold", "heartbeat", item.source]),
        predicate: predicate(["pressure", "observed"]),
        object: term([item.id]),
      }),
      charge: witnessedPotential(mark({ pressure: item.id, source: item.source })),
      at: term(["generated-at", generatedAt]),
      note: term(["operations-manifold.heartbeat.pressure", item.id, item.signal, item.response, item.weight]),
    }),
    observation({
      observer: term(["operations-manifold", "heartbeat"]),
      task: task({
        subject: term(["operations-manifold", "heartbeat", item.source]),
        predicate: predicate(["pressure", "observed"]),
        object: term([item.id, "repeat"]),
      }),
      charge: witnessedPotential(mark({ pressure: item.id, repeated: true })),
      at: term(["generated-at", generatedAt]),
      note: term(["operations-manifold.heartbeat.pressure-repeat", item.id, item.response, item.weight]),
    }),
  ]));
}

function heartbeatWorkItems(
  orchestrationReading: OrchestrationReading,
  goals: GoalSnapshot,
  managedWork: WorkSnapshot,
  context: ContextControlSnapshot,
  operations: OperationLedgerSnapshot,
  pressures: readonly HeartbeatPressure[],
  dreamContext: DreamResult,
  intent: string | null,
): readonly WorkItem[] {
  const work: WorkItem[] = [];
  for (const goal of goals.goals.filter((item) => goals.open.includes(item.id)).slice(0, 6)) {
    work.push(goal.workItem);
  }
  for (const item of managedWork.items.filter((candidate) => candidate.status !== "complete").slice(0, 8)) {
    work.push(workItemForManagedWork(item, managedWork));
  }
  if (context.admissions.length === 0) {
    work.push(makeWork(
      "operations-manifold.heartbeat.context-admission",
      "Admit Heartbeat Context",
      "active",
      98,
      "operations-manifold.context",
      "The heartbeat needs a filed context admission before future agents can distinguish transient context presence from durable learning.",
      [context.log],
      ["operations-manifold", "context", "admission"],
    ));
  }
  for (const assessment of context.assessments.filter((item) => item.drift || item.score < 80).slice(0, 4)) {
    work.push(makeWork(
      `operations-manifold.heartbeat.resolve-drift.${slug(assessment.id)}`,
      `Resolve Drift Assessment ${assessment.score}`,
      assessment.drift ? "active" : "proposed",
      assessment.drift ? 99 : 88,
      "operations-manifold.context",
      `Assessment ${assessment.id} indicates ${assessment.drift ? "drift" : "weak alignment"} for ${assessment.action}. File corrective context, scope, or governance evidence.`,
      assessment.evidence,
      ["operations-manifold", "context", "drift", assessment.id],
    ));
  }
  if (context.assessments.length === 0 && context.admissions.length > 0) {
    work.push(makeWork(
      "operations-manifold.heartbeat.assess-driftment",
      "Assess Current Work Drift",
      "active",
      90,
      "operations-manifold.context",
      "A context admission exists without a drift assessment. File an assessment over the current action trace so heartbeat can measure alignment instead of trusting chat state.",
      [context.log, context.state],
      ["operations-manifold", "context", "assess-driftment"],
    ));
  }
  if (operations.totals.entries === 0) {
    work.push(makeWork(
      "operations-manifold.heartbeat.read-operations-ledger-seed",
      "Seed Operations Ledger",
      "active",
      97,
      "operations-manifold.ledger",
      "Book the current turn's tool use, file touches, and token/cost estimates so 561 Group Operations Manifold can fold agent activity into auditable governance evidence.",
      [operations.log],
      ["operations-manifold", "operations", "ledger"],
    ));
  }
  if (operations.totals.tokens === 0) {
    work.push(makeWork(
      "operations-manifold.heartbeat.token-bookkeeping",
      "Book Token Cost",
      "active",
      86,
      "operations-manifold.ledger",
      "Token and cloud inference costs are still invisible. Add record-operation support from hooks or manual forms for token-cost events.",
      [operations.log],
      ["operations-manifold", "operations", "tokens"],
    ));
  }
  if (operations.totals.overBudgetEntries > 0) {
    work.push(makeWork(
      "operations-manifold.heartbeat.context-budget-pressure",
      "Reduce Context Budget Pressure",
      operations.totals.hugeEntries > 0 ? "active" : "proposed",
      operations.totals.hugeEntries > 0 ? 96 : 88,
      "operations-manifold.ledger",
      `Operations ledger reports ${operations.totals.overBudgetEntries} over-budget operation(s), ${operations.totals.hugeEntries} huge operation(s), and ${operations.totals.estimatedTokens} estimated context tokens. Summarize oversized payloads and route consumers through compact projections.`,
      [operations.log, operations.state],
      ["operations-manifold", "operations", "context-budget"],
    ));
  }
  if (operations.game.challenges.length > 0) {
    work.push(makeWork(
      "operations-manifold.heartbeat.ledger-game-challenge",
      "Clear Ledger Game Challenge",
      "proposed",
      78,
      "operations-manifold.ledger",
      operations.game.challenges[0] ?? "Advance the operations ledger challenge list.",
      [operations.state, ...operations.game.friction],
      ["operations-manifold", "operations", "game"],
    ));
  }
  if (dreamContext.observations.length > 0) {
    work.push(makeWork(
      "operations-manifold.heartbeat.dreamContext-proposal-governance",
      "Govern Dream Proposals Into Work",
      "active",
      92,
      "operations-manifold.governance",
      `${dreamContext.observations.length} deterministic dreamContext observation(s) surfaced repeated pressure that should be admitted, deferred, or rejected.`,
      ["@emsenn/knowing/dreaming"],
      ["operations-manifold", "heartbeat", "dreamContext"],
    ));
  }
  work.push(makeWork(
    "operations-manifold.heartbeat.context-spacesuits",
    "Project Context Spacesuits For Next Work",
    "active",
    88,
    "operations-manifold.context",
    "Build compact context bundles from next work, endpoint readiness, and current modules so hook-driven runs can start with the right substrate context.",
    ["orchestration.next", "endpointProjection"],
    ["operations-manifold", "heartbeat", "context"],
  ));
  if (intent !== null) {
    work.push(makeWork(
      "operations-manifold.heartbeat.intent-intake",
      "Admit User Intent Into Candidate Work",
      "active",
      86,
      "operations-manifold.governance",
      `The current intent should be decomposed into keywords and candidate read-work before it silently disappears into chat context: ${intent.slice(0, 240)}`,
      ["user-intent"],
      ["operations-manifold", "heartbeat", "intent"],
    ));
  }
  for (const enactment of orchestrationReading.next.slice(0, 3)) {
    work.push(makeWork(
      `operations-manifold.heartbeat.followup.${slug(enactment.workId)}`,
      `Heartbeat Follow-Up: ${enactment.title}`,
      enactment.status === "admitted" ? "assigned" : "proposed",
      Math.max(40, enactment.priority - 5),
      enactment.office,
      `Heartbeat carried forward orchestration work: ${enactment.doneWhen.join("; ")}`,
      [enactment.target, ...enactment.missingEvidence],
      ["operations-manifold", "orchestration", enactment.workId],
    ));
  }
  const pressureEvidence = pressures.slice(0, 5).map((item) => `${item.source}: ${item.signal}`);
  work.push(makeWork(
    "operations-manifold.heartbeat.pulse-runner",
    "Wire Heartbeat Pulse Runner",
    "proposed",
    82,
    "operations-manifold.engineering",
    "Expose this read-only pulse through hooks or a timer after the projection is stable, preserving MCP/script/HTTP parity.",
    pressureEvidence,
    ["operations-manifold", "heartbeat", "runner"],
  ));
  return Object.freeze(dedupeWork(work).slice(0, 16));
}

function makeWork(
  id: string,
  title: string,
  status: string,
  priority: number,
  officeName: string,
  prompt: string,
  evidence: readonly string[],
  subject: readonly string[],
): WorkItem {
  const subjectTerm = term(subject);
  return workItem({
    term: subjectTerm,
    task: workTask({
      term: term([...subject, "task"]),
      goals: Object.freeze([
        cell(subjectTerm, predicate(["operations-manifold", "heartbeat", "normalize"]), term(["site", "ops.561.group"])),
      ]),
      evidence: Object.freeze([
        term(["title", title]),
        term(["status", status]),
        term(["priority", priority]),
        term(["prompt", prompt]),
        ...evidence.map((entry) => term(["evidence", entry])),
        term(["source", "operations-manifold.heartbeat"]),
      ]),
    }),
    office: officeTerm(officeName),
    evidence: Object.freeze([
      term(["id", id]),
      term(["title", title]),
      term(["status", status]),
      term(["priority", priority]),
      term(["prompt", prompt]),
      ...evidence.map((entry) => term(["evidence", entry])),
      term(["source", "operations-manifold.heartbeat"]),
    ]),
  });
}

function dedupeWork(work: readonly WorkItem[]): readonly WorkItem[] {
  const seen = new Set<string>();
  const out: WorkItem[] = [];
  for (const item of work) {
    const key = termKey(item.term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((left, right) => workPriority(right) - workPriority(left) || termKey(left.term).localeCompare(termKey(right.term)));
}

function spacesuitFor(
  item: WorkItem,
  orchestrationReading: OrchestrationReading,
  context: ContextControlSnapshot,
  operations: OperationLedgerSnapshot,
  intent: string | null,
): ContextSpacesuit {
  const keywords = Object.freeze([...new Set([
    ...workTitle(item).toLowerCase().split(/[^a-z0-9]+/u).filter((part) => part.length > 3),
    ...intentKeywords(intent ?? "").slice(0, 6),
  ])].slice(0, 10));
  return Object.freeze({
    workId: termKey(item.term),
    title: workTitle(item),
    focus: orchestrationReading.focus,
    sources: Object.freeze([
      operationsManifoldRelativePath("src", "goals.mts"),
      operationsManifoldStatePath("goals"),
      operationsManifoldRelativePath("src", "read-work-management.mts"),
      operationsManifoldStatePath("work"),
      operationsManifoldRelativePath("src", "operating", "contextualizing", "suiting", "library", "context-control.mts"),
      operationsManifoldStatePath("context"),
      operationsManifoldRelativePath("src", "operating", "recording", "operations", "ledgering", "library", "operation-ledger.mts"),
      operationsManifoldStatePath("operations"),
      operationsManifoldRelativePath("src", "heartbeat.mts"),
      operationsManifoldRelativePath("src", "orchestration.mts"),
      ...(context.latestSuit === null ? [] : context.latestSuit.provenance),
    ]),
    tools: Object.freeze([
      "mcp:operations-manifold.read-heartbeat",
      "mcp:operations-manifold.goals",
      "mcp:operations-manifold.read-work",
      "mcp:operations-manifold.start-work",
      "mcp:operations-manifold.update-work",
      "mcp:operations-manifold.complete-work",
      "mcp:operations-manifold.set-work-stop-gate",
      "mcp:operations-manifold.control-context",
      "mcp:operations-manifold.project-context-suit",
      "mcp:operations-manifold.assess-drift",
      "mcp:operations-manifold.read-operations-ledger",
      "mcp:operations-manifold.import-operation-trace",
      "mcp:operations-manifold.record-operation",
      "mcp:operations-manifold.orchestration",
      "mcp:operations-manifold.check-capability",
    ]),
    keywords,
    nextPrompt: `Use 561 Group Operations Manifold heartbeat context for ${workTitle(item)}; inspect carriers first, book relevant operations in ${operations.log}, then settle the next read-work item as evidence.`,
  });
}

function intentKeywords(intent: string): readonly string[] {
  const stop = new Set(["this", "that", "with", "from", "into", "able", "like", "what", "have", "will", "your", "about", "based", "some", "task", "tasks"]);
  const terms = intent.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term.length > 3 && !stop.has(term));
  return Object.freeze([...new Set(terms)]);
}

function slug(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized === "" ? "read-work" : normalized.slice(0, 96);
}
