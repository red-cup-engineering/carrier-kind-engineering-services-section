/**
 * integrations/agent-worker/services — host binding: pick one undischarged work-ledger
 * obligation, run one bounded tool-calling loop through provider-neutral
 * inference encounters with the projected RPC description as its tool
 * surface, and record a discharge or progress row on completion.
 *
 * Every part this loop chains already exists and is already accountable:
 * the injected inference encounter port, the agent-domain tool-move bridge,
 * `src/rpc/dispatch.mjs`'s witnessed dispatcher,
 * and `src/integrations/filesystem/services/agent-context.mjs`'s `suitForCell` (the landed context-spacesuit
 * sibling — used here in place of a hand-rolled minimal context composer,
 * per its own doctrine of ranking by carried structure rather than
 * hand-tuned tiers). This module is the loop that iterates them against one
 * obligation's own worked material.
 */
import { setTimeout as delay } from "node:timers/promises";

import type { ProjectedSurface } from "../../presentation/surface.mts";
import { dispatch, invocation, type ExecutionReceipt } from "../../rpc/index.mts";
import { suitForCell, type Suit, type SuitInput } from "../../claims/context.mts";
import {
  type AgentContextDiagnosis,
  type AgentContextImage,
} from "../../agents/context-image.mts";
import type { AgentStrategyDossier } from "../../agents/strategy.mts";
import {
  workLedgerObligationCollector,
  type WorkLedgerObligation,
} from "../../work/observations.mts";
import {
  agentWorkReadoutCollector,
  agentWorkDispatchReadoutOfWork,
  type AgentWorkDispatchReadout,
} from "../../work/index.mts";
import {
  claimSessionFeed,
  claimSessionObservation,
  claimSessionStatementRows,
} from "../../claims/session.mts";
import {
  inferenceCall,
  inferenceMessage,
  inferenceToolsFromRpcDescription,
  rpcInvocationFromInferenceToolMove,
  type InferenceMessage,
  type InferenceEncounterPort,
} from "../../agents/inference/index.mts";
import { isJsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { dataArtifactAddress, dataDatePartition } from "../../lib/addressing/index.mts";
import { openJournal, type EventWriteResult, journal } from "../../journal/index.mts";
import { journalRpcWitness } from "../filesystem/services/rpc-witness.mts";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section";
import { can, capabilityGrant } from "../../lib/capability/index.mts";
import { readCapabilityAssertions } from "../filesystem/services/capability-assertions.mts";

const WORK_LEDGER_SUBJECT = "work-ledger";

function workLedgerLogPath(dataRoot: string, rootName: string | undefined, date: string): string {
  return dataArtifactAddress({
    root: dataRoot,
    ...(rootName === undefined ? {} : { rootName }),
    tier: "log",
    encoding: "jsonl",
    at: date,
    action: WORK_LEDGER_SUBJECT,
    subject: WORK_LEDGER_SUBJECT,
  }).path;
}

// A live Claude Code or Codex session's own work claims
// (`admitClaudeSessionWorkClaims`/`admitCodexSessionWorkClaims`) land
// under `claude-session-<id>`/`codex-session-<id>` subjects, never under the
// literal `work-ledger` one — so reading only the `work-ledger` address left
// every real session's recorded obligations invisible to this worker,
// discoverable only by a test seeding that one file by hand. An obligation
// is recognized by its own `boundary.role === "obligation"` structure
// (`workLedgerObligationOfRow`, in the work-item owner), not by which file happened to carry it, so
// The journal's cross-feed scan reads every log file the
// day admitted, across every settlement subject.
/**
 * Every undischarged work-ledger obligation for one date, oldest first.
 *
 * "Undischarged" is read directly off `workItemObservationsOfRows`'s real
 * opened/settled reduction (no re-derived boolean): an item scope with an
 * `"opened"` observation and no later `"settled"` one. Each returned
 * obligation's own text/evidence/source is then recovered by re-scanning the
 * raw rows for that item's first `role: "obligation"` boundary — the
 * reduction itself discards boundary text, so this is presentation, not
 * classification.
 */
export function undischargedWorkLedgerObligations(
  dataRoot: string,
  date: string,
): readonly WorkLedgerObligation[] {
  const folded = journal.scanCausalAll(dataRoot, date, Object.freeze({
    collector: workLedgerObligationCollector(),
  }), (state, row) => {
    state.collector.push(row);
    return state;
  });
  if (folded.rows === 0) return Object.freeze([]);
  return folded.result.collector.read();
}

interface AgentWorkerAssignmentRead {
  readonly obligations: readonly WorkLedgerObligation[];
  readonly assigned: readonly WorkLedgerObligation[];
  readonly dispatch: AgentWorkDispatchReadout;
}

/** Match recorded obligations to this worker's causal frontier. The dispatch
 * queue is presentation; it is deliberately not a selection mechanism. */
export function agentWorkerFrontierAssignments(
  obligations: readonly WorkLedgerObligation[],
  dispatchRead: AgentWorkDispatchReadout,
  workerId: string,
): readonly WorkLedgerObligation[] {
  const frontier = dispatchRead.agents.find((agent) => agent.agent === workerId)?.frontier ?? [];
  const byScope = new Map(obligations.map((obligation) => [obligation.item, obligation]));
  const assigned: WorkLedgerObligation[] = [];
  const selectedScopes = new Set<string>();
  for (const item of frontier) {
    if (selectedScopes.has(item.scope)) continue;
    const obligation = byScope.get(item.scope);
    if (obligation === undefined) continue;
    selectedScopes.add(item.scope);
    assigned.push(obligation);
  }
  return Object.freeze(assigned);
}

/** Read open obligations and their settled work-to-agent assignment through the
 * same work-readout/dispatch projection exposed by the `agent-work-dispatch` RPC
 * operation. The worker does not infer assignment from an open item or from its
 * own identity. */
function agentWorkerAssignmentRead(
  dataRoot: string,
  date: string,
  workerId: string,
): AgentWorkerAssignmentRead {
  const folded = journal.scanCausalAll(dataRoot, date, Object.freeze({
    obligations: workLedgerObligationCollector(),
    workReadout: agentWorkReadoutCollector(),
  }), (state, row) => {
    state.obligations.push(row);
    state.workReadout.push(row);
    return state;
  });
  const obligations = folded.result.obligations.read();
  const workReadout = folded.result.workReadout.read({
    subject: workerId,
    date,
    feed: claimSessionFeed.name,
    agents: Object.freeze([workerId]),
  });
  const dispatchRead = agentWorkDispatchReadoutOfWork(workReadout);
  const assigned = agentWorkerFrontierAssignments(obligations, dispatchRead, workerId);
  return Object.freeze({ obligations, assigned, dispatch: dispatchRead });
}

function suitInputOf(obligation: WorkLedgerObligation): SuitInput {
  return Object.freeze({
    cell: obligation.item,
    kind: "feed-row" as const,
    charge: "unknown" as const,
    text: obligation.text,
    ...(obligation.source === undefined ? {} : { source: obligation.source }),
    evidence: obligation.evidence,
  });
}

function renderSuit(suit: Suit): string {
  const lines: string[] = [
    `Obligation cell: ${suit.query.cell}`,
    `Obligation: ${suit.query.text}`,
    "",
    "Context, ranked and budget-packed by carried structure (charge height, evidence linkage, magnitude, recency):",
  ];
  for (const section of suit.sections) {
    const tags = [section.kind, section.charge, ...(section.linked ? ["linked"] : [])].join("/");
    lines.push(`- [${tags}] ${section.cell}: ${section.text}`);
    if (section.evidence.length > 0) lines.push(`  evidence: ${section.evidence.join(", ")}`);
  }
  for (const omission of suit.omitted) {
    lines.push(`(omitted ${omission.count} lower-ranked section(s) for budget: ${omission.cells.join(", ")})`);
  }
  lines.push(
    "",
    "Use the available tools to make real progress on this obligation. When you believe the obligation is fully discharged, say so explicitly in your final reply.",
  );
  return lines.join("\n");
}

function renderContextPageMaterial(material: JsonValue | undefined): readonly string[] {
  if (!isJsonRecord(material)) return Object.freeze([]);
  const lines: string[] = [];
  const address = material["address"];
  const sha256 = material["sha256"];
  const excerpt = material["excerpt"];
  const recallPolicy = material["recallPolicy"];
  const claims = Array.isArray(material["claims"]) ? material["claims"].filter((entry): entry is string => typeof entry === "string") : [];
  const openQuestions = Array.isArray(material["openQuestions"]) ? material["openQuestions"].filter((entry): entry is string => typeof entry === "string") : [];
  if (typeof address === "string") lines.push(`  address: ${address}`);
  if (typeof sha256 === "string") lines.push(`  sha256: ${sha256}`);
  if (typeof excerpt === "string") lines.push(`  excerpt: ${excerpt}`);
  if (isJsonRecord(recallPolicy) && Array.isArray(recallPolicy["facets"])) {
    const facets = recallPolicy["facets"].filter((entry): entry is string => typeof entry === "string");
    if (facets.length > 0) lines.push(`  recall facets: ${facets.join(", ")}`);
  }
  if (claims.length > 0) lines.push(`  claims: ${claims.join(" | ")}`);
  if (openQuestions.length > 0) lines.push(`  open questions: ${openQuestions.join(" | ")}`);
  return Object.freeze(lines);
}

export function renderAgentContextImage(image: AgentContextImage): string {
  const lines: string[] = [
    `Agent context image: ${image.goal}`,
    `Policy: ${image.policy}`,
    `Dispatch state: ${image.dispatchState}`,
    `Context window: ${image.window.residentTokens}/${image.window.capacity} resident tokens (${image.window.pressure})`,
    "",
    "Resident and required pages:",
  ];
  for (const pageRead of image.pages) {
    lines.push(`- [${pageRead.state}] ${pageRead.id} ${pageRead.layer} priority:${pageRead.priority} tokens:${pageRead.tokenEstimate}`);
    lines.push(`  source: ${pageRead.source}`);
    lines.push(`  summary: ${pageRead.summary}`);
    if (pageRead.evidence.length > 0) lines.push(`  evidence: ${pageRead.evidence.join(", ")}`);
    lines.push(...renderContextPageMaterial(pageRead.material));
  }
  if (image.pageFaults.length > 0) {
    lines.push("", "Page faults:");
    for (const pageFault of image.pageFaults) {
      lines.push(`- ${pageFault.layer} before ${pageFault.requiredBefore}: ${pageFault.reason}`);
      if (pageFault.evidence.length > 0) lines.push(`  evidence: ${pageFault.evidence.join(", ")}`);
    }
  }
  lines.push("", "Writeback duties:");
  for (const duty of image.writeback) {
    lines.push(`- [${duty.state}] ${duty.id} -> ${duty.target}`);
    if (duty.evidence.length > 0) lines.push(`  evidence: ${duty.evidence.join(", ")}`);
  }
  lines.push(
    "",
    "Do not treat a faulted page as known. If a page needed for the next tool call is faulted, use available tools to page in real evidence or report the missing page as an obstruction.",
  );
  return lines.join("\n");
}

function toolResultContentOf(execution: ExecutionReceipt): JsonValue {
  return Object.freeze({
    ok: execution.ok,
    phase: execution.phase,
    ...(execution.value === undefined ? {} : { value: execution.value }),
    reasons: execution.reasons,
    receipt: execution.id,
  });
}

function admitObligationOutcome(input: {
  readonly dataRoot: string;
  readonly rootName?: string;
  readonly workerId: string;
  readonly obligation: WorkLedgerObligation;
  readonly date: string;
  readonly role: "discharge" | "obligation";
  readonly text: string;
  readonly evidence: readonly string[];
  readonly causes?: readonly string[];
}): EventWriteResult {
  const source = `agent-worker:${input.workerId}`;
  const observation = claimSessionObservation({
    sessionId: WORK_LEDGER_SUBJECT,
    transport: "claim-session",
    claim: Object.freeze({ cell: input.obligation.cell, charge: "unknown" as const }),
    session: Object.freeze({ claims: Object.freeze([]), closed: false }),
    judgement: Object.freeze({}),
    at: Object.freeze({ source, item: 1 }),
    boundary: Object.freeze({
      protocol: "metroplat",
      surface: WORK_LEDGER_SUBJECT,
      operation: "work-ledger-item",
      role: input.role,
      source,
      text: input.text,
      evidence: Object.freeze([...input.evidence]),
    }),
    caller: Object.freeze({ protocol: "metroplat", session: WORK_LEDGER_SUBJECT, surface: WORK_LEDGER_SUBJECT, worker: input.workerId }),
  });
  const rows = claimSessionStatementRows(observation);
  return openJournal(input.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: input.date,
    ...(input.rootName === undefined ? {} : { rootName: input.rootName }),
    subject: WORK_LEDGER_SUBJECT,
    caller: Object.freeze({ transport: "agent-worker", worker: input.workerId }),
    ...(input.causes === undefined ? {} : { eventCauses: input.causes }),
  });
}

export const AGENT_WORKER_STAGE_VERBS = Object.freeze([
  "agent-context-image",
  "agent-diagnosis",
  "agent-strategy",
] as const);

type AgentWorkerStage = "monitor" | "analyze" | "strategy";
type AgentWorkerStageVerb = typeof AGENT_WORKER_STAGE_VERBS[number];

export interface AgentWorkerOptions {
  readonly dataRoot: string;
  readonly rootName?: string;
  /** The worker's declared agent identity: the capability holder, the tool-
   *  call bridge holder, the accountable-transaction actor, the OpenAI wire
   *  canonical inference call's subject (so accounting can fold per-worker),
   *  and the recorded discharge/progress row's caller. */
  readonly workerId: string;
  /** Target one specific obligation by its work-item scope (`item`); the
   *  oldest undischarged obligation otherwise. */
  readonly cell?: string;
  readonly model: string;
  readonly maxTurns?: number;
  readonly suitBudget?: number;
  readonly now?: () => string;
  /** Required provider-neutral boundary; the worker has no vendor fallback. */
  /** The agent loop can only start a witnessed encounter; raw provider sources are not accepted. */
  readonly inference: InferenceEncounterPort;
  /** A provider may narrow the existing catalog to declared, held operation
   * implementations. Omitted preserves the ordinary worker surface. */
  readonly allowedOperationRefs?: readonly string[];
  /** Canonical allocation facts supplied by the provider boundary.  These are
   * input to the existing worker loop, never inferred from a model response. */
  readonly allocationContext?: Readonly<{
    readonly method: string;
    readonly receiverCondition: string;
    readonly workText: string;
  }>;
  /** A capability-free inquiry may return its witnessed prose.  Every
   * declared capability still narrows the offered tool set and requires its
   * own successful receipt at the provider boundary. */
  readonly allowNoToolCompletion?: boolean;
  /** Causal predecessors for each dispatch arrival admitted by this worker. */
  readonly eventCauses?: readonly string[];
}

export interface AgentWorkerTurn {
  readonly turn: number;
  readonly inferenceResult: string;
  readonly inferenceEvidence: readonly string[];
  readonly assistantMessage: InferenceMessage;
  readonly executions: readonly ExecutionReceipt[];
}

export type AgentWorkerRunResult =
  | Readonly<{ kind: "metroplat.agent-worker.no-obligation" }>
  | Readonly<{
      kind: "metroplat.agent-worker.assignment-obstruction";
      reason: "no-held-duty" | "target-not-assigned" | "frontier-selection-required" | "coordination-required";
      evidence: readonly string[];
    }>
  | Readonly<{
      kind: "metroplat.agent-worker.authorization-obstruction";
      reason: "settled-capability-reading-required" | "no-held-agent-stage-capability" | "no-held-operation-capability";
      evidence: readonly string[];
    }>
  | Readonly<{
      kind: "metroplat.agent-worker.stage-obstruction";
      stage: AgentWorkerStage;
      reason: "operation-missing" | "dispatch-obstructed" | "invalid-output";
      evidence: readonly string[];
      receipt?: ExecutionReceipt;
    }>
  | Readonly<{
      kind: "metroplat.agent-worker.completion-failed";
      condition: string;
      reason: string;
      turn: number;
    }>
  | Readonly<{
      kind: "metroplat.agent-worker.run";
      obligation: WorkLedgerObligation;
      suit: Suit;
      contextImage: AgentContextImage;
      diagnosis: AgentContextDiagnosis;
      strategy: AgentStrategyDossier;
      planningObstruction: Readonly<{
        kind: "metroplat.agent-worker.planning-obstruction";
        reason: "no-admitted-adjustment-plan";
        diagnosis: string;
        strategy: string;
        evidence: readonly string[];
      }>;
      stageExecutions: Readonly<{
        readonly observation: ExecutionReceipt;
        readonly diagnosis: ExecutionReceipt;
        readonly strategy: ExecutionReceipt;
      }>;
      stageCausalHeads: Readonly<{
        readonly observation: readonly string[];
        readonly diagnosis: readonly string[];
        readonly strategy: readonly string[];
      }>;
      turns: readonly AgentWorkerTurn[];
      stoppedBy: "no-tool-calls" | "max-turns";
      dischargedRole: "discharge" | "obligation";
      /** Durable RPC outcome frontier that causally precedes the worker admission. */
      rpcCausalHead: readonly string[];
      admission: EventWriteResult;
    }>;

export interface AgentWorkerEngineOptions extends AgentWorkerOptions {
  /** Delay between completed iterations. The engine never overlaps turns. */
  readonly intervalMs?: number;
  /** The process host owns lifecycle cancellation. */
  readonly signal?: AbortSignal;
  /** Observe each completed iteration without creating a second write path. */
  readonly onResult?: (result: AgentWorkerRunResult) => void | Promise<void>;
}

const DEFAULT_MAX_TURNS = 8;

/** Run one bounded tool-calling turn loop against one work-ledger obligation. */
export async function runAgentWorker(induced: ProjectedSurface, options: AgentWorkerOptions): Promise<AgentWorkerRunResult> {
  const now = options.now ?? processIsoNow;
  const date = dataDatePartition(now()).date;
  const work = agentWorkerAssignmentRead(options.dataRoot, date, options.workerId);
  const obligations = work.obligations;
  if (obligations.length === 0) return Object.freeze({ kind: "metroplat.agent-worker.no-obligation" as const });
  if (work.dispatch.coordination !== "clear") {
    return Object.freeze({
      kind: "metroplat.agent-worker.assignment-obstruction" as const,
      reason: "coordination-required" as const,
      evidence: work.dispatch.evidence,
    });
  }
  const obligation = options.cell === undefined
    ? work.assigned.length === 1 ? work.assigned[0] : undefined
    : work.assigned.find((candidate) => candidate.item === options.cell);
  if (obligation === undefined) {
    return Object.freeze({
      kind: "metroplat.agent-worker.assignment-obstruction" as const,
      reason: options.cell === undefined
        ? work.assigned.length > 1 ? "frontier-selection-required" as const : "no-held-duty" as const
        : "target-not-assigned" as const,
      evidence: Object.freeze([
        ...work.dispatch.evidence,
        `worker:${options.workerId}`,
        ...(options.cell === undefined ? [] : [`target:${options.cell}`]),
      ]),
    });
  }

  if (induced.capabilities === undefined) {
    return Object.freeze({
      kind: "metroplat.agent-worker.authorization-obstruction" as const,
      reason: "settled-capability-reading-required" as const,
      evidence: Object.freeze([
        "authorization:obstructed",
        "source:projected-surface",
        "required:settled-operation-standing",
      ]),
    });
  }

  const peers = work.assigned.filter((candidate) => candidate.item !== obligation.item);
  const suit = suitForCell(
    [suitInputOf(obligation), ...peers.map(suitInputOf)],
    { cell: obligation.item, text: obligation.text },
    options.suitBudget === undefined ? {} : { budget: options.suitBudget },
  );
  const heldOperationReferences = new Set(induced.capabilities.designated
    .filter((designation) => designation.charge === "held")
    .flatMap((designation) => designation.carriers.map((operation) => operation.ref)));
  const assertions = readCapabilityAssertions(options.dataRoot);
  const heldForWorker = new Set(induced.operations
    .filter((operation) => heldOperationReferences.has(operation.ref))
    .filter((operation) => can(assertions, options.workerId, capabilityGrant(induced.discovery.package, operation.verb)).value === "held")
    .map((operation) => operation.ref));
  const stageSpecifications = Object.freeze([
    Object.freeze({ stage: "monitor" as const, verb: "agent-context-image" as const, kind: "metroplat.agent.context-image" }),
    Object.freeze({ stage: "analyze" as const, verb: "agent-diagnosis" as const, kind: "metroplat.agent.context-diagnosis" }),
    Object.freeze({ stage: "strategy" as const, verb: "agent-strategy" as const, kind: "metroplat.agent.strategy-dossier" }),
  ]);
  const stageOperations = new Map<AgentWorkerStageVerb, (typeof induced.operations)[number]>();
  for (const specification of stageSpecifications) {
    const stageOperation = induced.operations.find((candidate) => candidate.verb === specification.verb);
    if (stageOperation === undefined) {
      return Object.freeze({
        kind: "metroplat.agent-worker.stage-obstruction" as const,
        stage: specification.stage,
        reason: "operation-missing" as const,
        evidence: Object.freeze([`required-operation:${specification.verb}`, `surface:${induced.discovery.package}`]),
      });
    }
    stageOperations.set(specification.verb, stageOperation);
  }
  const unavailableStage = stageSpecifications.find((specification) => {
    const stageOperation = stageOperations.get(specification.verb);
    return stageOperation === undefined || !heldForWorker.has(stageOperation.ref);
  });
  if (unavailableStage !== undefined) {
    return Object.freeze({
      kind: "metroplat.agent-worker.authorization-obstruction" as const,
      reason: "no-held-agent-stage-capability" as const,
      evidence: Object.freeze([
        `worker:${options.workerId}`,
        `resource:${induced.discovery.package}`,
        `required:${unavailableStage.verb}`,
      ]),
    });
  }
  const internalStageVerbs = new Set<string>(AGENT_WORKER_STAGE_VERBS);
  const tools = Object.freeze(inferenceToolsFromRpcDescription(induced.description)
    .filter((tool) => !internalStageVerbs.has(tool.name))
    .filter((tool) => tool.operation !== undefined && heldForWorker.has(tool.operation))
    .filter((tool) => options.allowedOperationRefs === undefined || (tool.operation !== undefined && options.allowedOperationRefs.includes(tool.operation))));
  if (tools.length === 0 && options.allowNoToolCompletion !== true) {
    return Object.freeze({
      kind: "metroplat.agent-worker.authorization-obstruction" as const,
      reason: "no-held-operation-capability" as const,
      evidence: Object.freeze([
        `worker:${options.workerId}`,
        `resource:${induced.discovery.package}`,
        "required:held-subject-operation-standing",
      ]),
    });
  }
  const witness = journalRpcWitness(options.dataRoot, {
    namespace: options.rootName ?? induced.discovery.package,
    ...(options.eventCauses === undefined ? {} : { causes: () => options.eventCauses ?? [] }),
  });

  const executeStage = async (
    specification: typeof stageSpecifications[number],
    causes: readonly string[],
    input: JsonValue,
  ): Promise<Readonly<{
    receipt: ExecutionReceipt;
    value: JsonValue;
    head: readonly string[];
  }> | AgentWorkerRunResult> => {
    const stageOperation = stageOperations.get(specification.verb)!;
    const candidate = invocation({
      request: `agent-worker:${options.workerId}:${obligation.item}:${specification.stage}`,
      subject: options.workerId,
      operation: stageOperation.ref,
      verb: stageOperation.verb,
      resource: induced.discovery.package,
      input,
      caller: Object.freeze({
        transport: "agent-worker",
        worker: options.workerId,
        cell: obligation.item,
        stage: specification.stage,
      }),
      observedAt: now(),
      causes,
    });
    const receipt = await dispatch({ catalog: induced.catalog, witness, now, authorize: induced.authorize }, candidate);
    const head = witness.causalHead(candidate.id);
    if (!receipt.ok || head.length === 0) {
      return Object.freeze({
        kind: "metroplat.agent-worker.stage-obstruction" as const,
        stage: specification.stage,
        reason: "dispatch-obstructed" as const,
        evidence: Object.freeze([...receipt.evidence, ...receipt.reasons]),
        receipt,
      });
    }
    if (!isJsonRecord(receipt.value) || receipt.value["kind"] !== specification.kind) {
      return Object.freeze({
        kind: "metroplat.agent-worker.stage-obstruction" as const,
        stage: specification.stage,
        reason: "invalid-output" as const,
        evidence: Object.freeze([`expected-kind:${specification.kind}`, `receipt:${receipt.id}`]),
        receipt,
      });
    }
    return Object.freeze({ receipt, value: receipt.value, head: Object.freeze([...head]) });
  };

  const stageInput = Object.freeze({ date, id: options.workerId, query: obligation.text });
  const observationExecution = await executeStage(stageSpecifications[0]!, options.eventCauses ?? [], stageInput);
  if (!("value" in observationExecution)) return observationExecution;
  const diagnosisExecution = await executeStage(stageSpecifications[1]!, observationExecution.head, Object.freeze({
    ...stageInput,
    observation: observationExecution.value,
  }));
  if (!("value" in diagnosisExecution)) return diagnosisExecution;
  const strategyExecution = await executeStage(stageSpecifications[2]!, diagnosisExecution.head, Object.freeze({
    ...stageInput,
    observation: observationExecution.value,
    diagnosis: diagnosisExecution.value,
  }));
  if (!("value" in strategyExecution)) return strategyExecution;
  const contextImage = observationExecution.value as unknown as AgentContextImage;
  const diagnosis = diagnosisExecution.value as unknown as AgentContextDiagnosis;
  const strategy = strategyExecution.value as unknown as AgentStrategyDossier;
  const planningObstruction = Object.freeze({
    kind: "metroplat.agent-worker.planning-obstruction" as const,
    reason: "no-admitted-adjustment-plan" as const,
    diagnosis: diagnosis.id,
    strategy: strategy.id,
    evidence: Object.freeze([
      "required:admitted-typed-adjustment-plan",
      "strategy-is-read-only-evidence",
      "strategy-grants-no-execution-authority",
      "sad:5.22-planAdjustment",
      "sad:5.32-observation-diagnosis-adjustment-plan-decision",
    ]),
  });

  const messages: InferenceMessage[] = [
    inferenceMessage({
      role: "system",
      content: "You are an MetroPlat agent worker booted from a recorded context image and assigned one work-ledger obligation. The supplied diagnosis and strategy are governed evidence, not an admitted MAPE-K AdjustmentPlan and not authorization. Call only the offered governed tools to make real progress; do not fabricate results or pretend faulted context pages are resident.",
    }),
    inferenceMessage({
      role: "user",
      content: `${renderAgentContextImage(contextImage)}\n\nGoverned Analyze artifact (preserve this diagnosis):\n${JSON.stringify(diagnosis, null, 2)}\n\nGoverned strategy evidence (not an AdjustmentPlan or authority):\n${JSON.stringify(strategy, null, 2)}\n\nPlanning obstruction:\n${JSON.stringify(planningObstruction, null, 2)}\n\n${options.allocationContext === undefined ? "" : `Canonical allocation method (follow it exactly):\n${options.allocationContext.method}\n\nReceiver condition (a later independent receiver evaluates this; do not claim it settled):\n${options.allocationContext.receiverCondition}\n\nOriginal declared work text:\n${options.allocationContext.workText}\n\n`} ${renderSuit(suit)}`,
    }),
  ];
  const infer = options.inference;

  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const turns: AgentWorkerTurn[] = [];
  const executionHeads: string[] = [];
  let stoppedBy: "no-tool-calls" | "max-turns" = "max-turns";

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    const request = inferenceCall({
      request: `agent-worker:${options.workerId}:${obligation.item}:${turn}`,
      subject: options.workerId,
      model: options.model,
      messages: Object.freeze([...messages]),
      tools,
      caller: Object.freeze({ transport: "agent-worker", worker: options.workerId, cell: obligation.item, turn }),
      observedAt: now(),
      causes: executionHeads.length === 0 ? strategyExecution.head : Object.freeze([executionHeads.at(-1)!]),
    });
    const completion = await infer(request).settled;
    if (completion.kind === "metroplat.inference.obstruction") {
      return Object.freeze({ kind: "metroplat.agent-worker.completion-failed" as const, condition: completion.condition, reason: completion.reasons.join("; "), turn });
    }
    executionHeads.push(...completion.causes);
    const assistantMessage = completion.message;
    if (assistantMessage === undefined) {
      return Object.freeze({ kind: "metroplat.agent-worker.completion-failed" as const, condition: "no-choices", reason: "completion returned no choices", turn });
    }
    messages.push(assistantMessage);

    if (completion.toolMoves.length === 0) {
      turns.push(Object.freeze({ turn, inferenceResult: completion.id, inferenceEvidence: completion.causes, assistantMessage, executions: Object.freeze([]) }));
      stoppedBy = "no-tool-calls";
      break;
    }

    const executions: ExecutionReceipt[] = [];
    for (const call of completion.toolMoves) {
      const candidate = rpcInvocationFromInferenceToolMove(call, {
        catalog: induced.catalog,
        subject: options.workerId,
        resource: induced.discovery.package,
        caller: Object.freeze({ transport: "agent-worker", worker: options.workerId, cell: obligation.item }),
        observedAt: now(),
        causes: completion.causes,
      });
      const execution = await dispatch({
        catalog: induced.catalog,
        witness,
        now,
        authorize: induced.authorize,
      }, candidate);
      executionHeads.push(...witness.causalHead(candidate.id));
      executions.push(execution);
      messages.push(inferenceMessage({
        role: "tool",
        toolRequest: call.request,
        content: JSON.stringify(toolResultContentOf(execution)),
      }));
    }
    turns.push(Object.freeze({ turn, inferenceResult: completion.id, inferenceEvidence: completion.causes, assistantMessage, executions: Object.freeze(executions) }));
    if (turn === maxTurns) stoppedBy = "max-turns";
  }

  // Completion is a journal fact, never a language-model self-assessment.
  // A verifier/tool must have appended a settlement row for this exact item;
  // the same canonical fold that selected the work must now no longer return it.
  const remainsOpen = undischargedWorkLedgerObligations(options.dataRoot, date)
    .some((candidate) => candidate.item === obligation.item);
  const dischargedRole: "discharge" | "obligation" = remainsOpen ? "obligation" : "discharge";
  const text = dischargedRole === "discharge"
    ? `Agent worker ${options.workerId} observed governed settlement of "${obligation.text}" after ${turns.length} turn(s).`
    : `Agent worker ${options.workerId} made progress on "${obligation.text}" over ${turns.length} turn(s), stopped by ${stoppedBy}; the obligation remains open.`;
  const evidence = turns.flatMap((turn) => turn.executions.map((execution) =>
    `invocation:${turn.turn}:${execution.ok ? "ok" : "failed"}:${execution.id}`));
  const dispatchStatementId = executionHeads.at(-1);
  const admission = admitObligationOutcome({
    dataRoot: options.dataRoot,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    workerId: options.workerId,
    obligation,
    date,
    role: dischargedRole,
    text,
    evidence: Object.freeze([
      `worklog-path:${workLedgerLogPath(options.dataRoot, options.rootName, date)}`,
      `verification:work-ledger:${remainsOpen ? "open" : "settled"}`,
      ...evidence,
    ]),
    ...(dispatchStatementId === undefined
      ? (options.eventCauses === undefined ? {} : { causes: options.eventCauses })
      : { causes: Object.freeze([dispatchStatementId]) }),
  });

  return Object.freeze({
    kind: "metroplat.agent-worker.run" as const,
    obligation,
    suit,
    contextImage,
    diagnosis,
    strategy,
    planningObstruction,
    stageExecutions: Object.freeze({
      observation: observationExecution.receipt,
      diagnosis: diagnosisExecution.receipt,
      strategy: strategyExecution.receipt,
    }),
    stageCausalHeads: Object.freeze({
      observation: observationExecution.head,
      diagnosis: diagnosisExecution.head,
      strategy: strategyExecution.head,
    }),
    turns: Object.freeze(turns),
    stoppedBy,
    dischargedRole,
    rpcCausalHead: Object.freeze([...new Set(executionHeads)]),
    admission,
  });
}

/** Repeatedly consume assigned work as one non-overlapping engine. The host
 * supplies the managed-element surface, inference encounter, and AbortSignal; this loop is
 * deliberately not an RPC operation and therefore cannot dispatch itself. */
export async function runAgentWorkerEngine(
  induced: ProjectedSurface,
  options: AgentWorkerEngineOptions,
): Promise<void> {
  const intervalMs = options.intervalMs ?? 1_000;
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new RangeError("agent worker interval must be a non-negative finite number");
  }
  const aborted = (): boolean => options.signal?.aborted === true;
  while (!aborted()) {
    const result = await runAgentWorker(induced, options);
    await options.onResult?.(result);
    if (aborted()) return;
    try {
      await delay(intervalMs, undefined, options.signal === undefined ? {} : { signal: options.signal });
    } catch (error) {
      if (aborted()) return;
      throw error;
    }
  }
}
