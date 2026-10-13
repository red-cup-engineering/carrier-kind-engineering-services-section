/** Agent strategy read model. */
import type { JsonValue } from "../lib/codecs/json/core.mts";
import { contentAddress } from "../lib/identity/index.mts";

export type AgentStrategyGateState = "satisfied" | "required" | "blocked";
export type AgentStrategyState = "ready" | "waiting" | "blocked";

export interface AgentStrategyGate {
  readonly name:
    | "read-root-orientation"
    | "refresh-external-comparator"
    | "read-live-code"
    | "read-prior-research"
    | "analyze-context"
    | "select-governed-work"
    | "review-skill-proposals"
    | "focused-verification"
    | "human-skill-approval"
    | "monitor-codebase-health"
    | "monitor-proof-health";
  readonly state: AgentStrategyGateState;
  readonly source: string;
  readonly evidence: readonly string[];
}

export interface AgentStrategyMove {
  readonly kind: "metroplat.agent.strategy-move";
  readonly id: string;
  readonly source: string;
  readonly action: string;
  readonly state: AgentStrategyState;
  readonly target?: string;
  readonly priority?: number;
  readonly reasons: readonly string[];
  readonly evidence: readonly string[];
}

export interface AgentStrategy {
  readonly kind: "metroplat.agent.strategy";
  readonly id: string;
  readonly state: AgentStrategyState;
  readonly gates: readonly string[];
  readonly moves: readonly AgentStrategyMove[];
  readonly evidence: readonly string[];
}

export interface AgentStrategyDossierInput {
  readonly date: string;
  readonly actor?: string;
  readonly goal?: string;
  readonly orientation?: JsonValue;
  readonly diagnosis?: JsonValue;
  readonly dispatch?: JsonValue;
  readonly skillProposals?: JsonValue;
  readonly failures?: readonly string[];
}

export interface AgentStrategyDossier {
  readonly kind: "metroplat.agent.strategy-dossier";
  readonly id: string;
  readonly date: string;
  readonly actor: string;
  readonly goal: string;
  readonly diagnosis?: string;
  readonly policy: "view-innocent-read-only-strategy";
  readonly view: readonly string[];
  readonly gates: readonly AgentStrategyGate[];
  readonly strategies: readonly AgentStrategy[];
  readonly nextMoves: readonly AgentStrategyMove[];
  readonly failures?: readonly string[];
  readonly evidence: readonly string[];
}

const DEFAULT_ACTOR = "agent:codex";
const DEFAULT_GOAL = "continue governed metroplat development";

function record(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, JsonValue> : undefined;
}

function records(value: JsonValue | undefined): readonly Record<string, JsonValue>[] {
  return Array.isArray(value)
    ? Object.freeze(value.map(record).filter((entry): entry is Record<string, JsonValue> => entry !== undefined))
    : Object.freeze([]);
}

function strings(value: JsonValue | undefined): readonly string[] {
  return Array.isArray(value)
    ? Object.freeze(value.filter((entry): entry is string => typeof entry === "string"))
    : Object.freeze([]);
}

function numberOf(value: JsonValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function slugPart(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return slug.length === 0 ? "move" : slug;
}

function gate(name: AgentStrategyGate["name"], state: AgentStrategyGateState, source: string, evidence: readonly string[]): AgentStrategyGate {
  return Object.freeze({ name, state, source, evidence: Object.freeze(evidence) });
}

function move(
  id: string,
  source: string,
  action: string,
  state: AgentStrategyState,
  options: {
    readonly target?: string;
    readonly priority?: number;
    readonly reasons?: readonly string[];
    readonly evidence?: readonly string[];
  } = {},
): AgentStrategyMove {
  return Object.freeze({
    kind: "metroplat.agent.strategy-move" as const,
    id,
    source,
    action,
    state,
    ...(options.target === undefined ? {} : { target: options.target }),
    ...(options.priority === undefined ? {} : { priority: options.priority }),
    reasons: Object.freeze(options.reasons ?? []),
    evidence: Object.freeze(options.evidence ?? []),
  });
}

function dispatchMoves(dispatch: Record<string, JsonValue> | undefined): readonly AgentStrategyMove[] {
  if (dispatch === undefined) return Object.freeze([]);
  const queue = records(dispatch["queue"]);
  return Object.freeze(queue
    .filter((item) => item["state"] === "ready")
    .slice(0, 6)
    .map((item) => {
      const actor = typeof item["agent"] === "string" ? item["agent"] : DEFAULT_ACTOR;
      const scope = typeof item["scope"] === "string" ? item["scope"] : "work";
      const priority = typeof item["priority"] === "number" ? item["priority"] : undefined;
      return move(
        `dispatch:${slugPart(actor)}:${slugPart(scope)}`,
        "agent-work-dispatch",
        "select-ready-work",
        "ready",
        {
          target: scope,
          ...(priority === undefined ? {} : { priority }),
          reasons: strings(item["reasons"]),
          evidence: Object.freeze([
            `actor:${actor}`,
            `scope:${scope}`,
            `state:${String(item["state"] ?? "ready")}`,
            ...(priority === undefined ? [] : [`priority:${priority}`]),
          ]),
        },
      );
    }));
}

function proposalMoves(skillProposals: Record<string, JsonValue> | undefined): readonly AgentStrategyMove[] {
  if (skillProposals === undefined) return Object.freeze([]);
  return Object.freeze(records(skillProposals["proposals"])
    .filter((proposal) => proposal["state"] === "reviewable")
    .slice(0, 6)
    .map((proposal) => {
      const id = typeof proposal["id"] === "string" ? proposal["id"] : "skill-proposal";
      const chain = strings(proposal["chain"]);
      return move(
        `skill:${slugPart(id)}`,
        "skill-proposals",
        "review-skill-proposal",
        "ready",
        {
          target: id,
          priority: 5,
          reasons: Object.freeze([
            `support:${numberOf(proposal["support"])}`,
            `risk:${String(proposal["risk"] ?? "unknown")}`,
            `chain:${chain.join(">")}`,
          ]),
          evidence: Object.freeze([
            `proposal:${id}`,
            `state:${String(proposal["state"] ?? "reviewable")}`,
          ]),
        },
      );
    }));
}

function strategyStateForDispatch(dispatch: Record<string, JsonValue> | undefined, moves: readonly AgentStrategyMove[]): AgentStrategyState {
  if (dispatch === undefined) return "waiting";
  if (dispatch["coordination"] === "coordination-required") return "blocked";
  return moves.length > 0 ? "ready" : "waiting";
}

function strategyStateForSkillProposals(skillProposals: Record<string, JsonValue> | undefined): AgentStrategyState {
  if (skillProposals === undefined) return "waiting";
  return numberOf(skillProposals["reviewable"]) > 0 ? "ready" : "waiting";
}

function compareMoves(left: AgentStrategyMove, right: AgentStrategyMove): number {
  const leftPriority = left.priority ?? 9;
  const rightPriority = right.priority ?? 9;
  if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  if (left.source !== right.source) return left.source.localeCompare(right.source);
  return left.id.localeCompare(right.id);
}

/** Produce at most one high-priority move when a Monitor aggregate signals a
 *  non-held charge for its domain.  No move when the charge is unknown (no data)
 *  or held (no remediation needed).  Ready when denied or contested. */
function monitorChargeMoves(input: {
  readonly charge: string;
  readonly diagnosisId: string | undefined;
  readonly moveId: string;
  readonly source: string;
  readonly subject: string;
  readonly chargeTag: string;
}): readonly AgentStrategyMove[] {
  if (input.charge !== "denied" && input.charge !== "contested") return Object.freeze([]);
  const reason = input.charge === "denied"
    ? `monitor aggregate denied: ${input.subject} has active violations`
    : `monitor aggregate contested: ${input.subject} has paraconsistent evidence`;
  return Object.freeze([move(
    input.moveId,
    input.source,
    "address-monitor-findings",
    "ready",
    {
      priority: 2,
      reasons: Object.freeze([reason, `charge:${input.charge}`]),
      evidence: Object.freeze([
        `${input.chargeTag}:${input.charge}`,
        ...(input.diagnosisId === undefined ? [] : [`diagnosis:${input.diagnosisId}`]),
        `source:${input.source}`,
      ]),
    },
  )]);
}

function monitoringStrategyMoves(monitoringCharge: string, diagnosisId: string | undefined): readonly AgentStrategyMove[] {
  return monitorChargeMoves({
    charge: monitoringCharge,
    diagnosisId,
    moveId: "verify:codebase-monitor",
    source: "source-code-monitor-aggregate",
    subject: "codebase",
    chargeTag: "monitoring-charge",
  });
}

function proofHealthStrategyMoves(proofHealthCharge: string, diagnosisId: string | undefined): readonly AgentStrategyMove[] {
  return monitorChargeMoves({
    charge: proofHealthCharge,
    diagnosisId,
    moveId: "verify:proof-health-monitor",
    source: "proof-health-monitor-aggregate",
    subject: "proof-health corpus",
    chargeTag: "proof-health-charge",
  });
}

export function agentStrategyDossier(input: AgentStrategyDossierInput): AgentStrategyDossier {
  const orientation = record(input.orientation);
  const diagnosis = record(input.diagnosis);
  const diagnosisId = typeof diagnosis?.["id"] === "string" ? diagnosis["id"] : undefined;
  // Read the monitoring charge surfaced by diagnoseAgentContext from the Monitor aggregate.
  const monitoringCharge: string = typeof diagnosis?.["monitoringCharge"] === "string"
    ? diagnosis["monitoringCharge"]
    : "unknown";
  // Read the proof-health charge surfaced by diagnoseAgentContext from the proof-health Monitor aggregate.
  const proofHealthCharge: string = typeof diagnosis?.["proofHealthCharge"] === "string"
    ? diagnosis["proofHealthCharge"]
    : "unknown";
  const dispatch = record(input.dispatch);
  const skillProposals = record(input.skillProposals);
  const workMoves = dispatchMoves(dispatch);
  const learningMoves = proposalMoves(skillProposals);
  const monitorMoves = monitoringStrategyMoves(monitoringCharge, diagnosisId);
  const proofHealthMoves = proofHealthStrategyMoves(proofHealthCharge, diagnosisId);
  const orientationReady = orientation !== undefined;
  const dispatchState = strategyStateForDispatch(dispatch, workMoves);
  const skillProposalState = strategyStateForSkillProposals(skillProposals);
  // Monitoring strategy state: waiting when no data, waiting when held, ready when action needed.
  const monitorState: AgentStrategyState = monitorMoves.length > 0 ? "ready" : "waiting";
  const proofHealthState: AgentStrategyState = proofHealthMoves.length > 0 ? "ready" : "waiting";
  const gates = Object.freeze([
    gate("analyze-context", diagnosisId === undefined ? "required" : "satisfied", "agent-context-diagnosis", Object.freeze([
      diagnosisId === undefined ? "diagnosis:missing" : `diagnosis:${diagnosisId}`,
    ])),
    gate("read-root-orientation", orientationReady ? "satisfied" : "required", "agent-orientation", Object.freeze([
      orientationReady ? "orientation:present" : "orientation:missing",
    ])),
    gate("refresh-external-comparator", "required", "operator-session-protocol", Object.freeze(["not inferable from local service action"])),
    gate("read-live-code", dispatch === undefined ? "required" : "satisfied", "agent-work-dispatch", Object.freeze([
      dispatch === undefined ? "dispatch:missing" : `dispatch:${String(dispatch["kind"] ?? "present")}`,
    ])),
    gate("read-prior-research", "required", "operator-session-protocol", Object.freeze(["not inferable from local service action"])),
    gate("select-governed-work", dispatchState === "blocked" ? "blocked" : workMoves.length > 0 ? "satisfied" : "required", "agent-work-dispatch", Object.freeze([
      `dispatch-state:${dispatchState}`,
      `ready-moves:${workMoves.length}`,
    ])),
    gate("review-skill-proposals", skillProposalState === "ready" ? "satisfied" : "required", "skill-proposals", Object.freeze([
      `skill-proposals:${skillProposalState}`,
      `reviewable:${numberOf(skillProposals?.["reviewable"])}`,
    ])),
    gate("human-skill-approval", numberOf(skillProposals?.["reviewable"]) > 0 ? "required" : "satisfied", "skill-proposals", Object.freeze([
      "promotion requires explicit human approval",
    ])),
    gate("focused-verification", "required", "operator-session-protocol", Object.freeze(["verify touched public contract"])),
    gate(
      "monitor-codebase-health",
      // Satisfied when held (clean) or unknown (no data yet); required when denied/contested (action needed).
      monitoringCharge === "denied" || monitoringCharge === "contested" ? "required" : "satisfied",
      "source-code-monitor-aggregate",
      Object.freeze([`monitoring-charge:${monitoringCharge}`, `monitor-moves:${monitorMoves.length}`]),
    ),
    gate(
      "monitor-proof-health",
      // Satisfied when held (clean) or unknown (no data yet); required when denied/contested (action needed).
      proofHealthCharge === "denied" || proofHealthCharge === "contested" ? "required" : "satisfied",
      "proof-health-monitor-aggregate",
      Object.freeze([`proof-health-charge:${proofHealthCharge}`, `proof-health-moves:${proofHealthMoves.length}`]),
    ),
  ]);
  const orientMove = move(
    "orient:doctrine-and-prior-art",
    "agent-orientation",
    "orient-before-action",
    orientationReady ? "ready" : "waiting",
    {
      priority: 1,
      reasons: Object.freeze(["root orientation", "prior research", "external comparator"]),
      evidence: Object.freeze([
        orientationReady ? "orientation:present" : "orientation:missing",
      ]),
    },
  );
  const verifyMove = move(
    "verify:focused-contract",
    "operator-session-protocol",
    "verify-governed-work",
    "ready",
    {
      priority: 8,
      reasons: Object.freeze(["focused verification"]),
      evidence: Object.freeze(["verification:required"]),
    },
  );
  const strategies = Object.freeze([
    Object.freeze({
      kind: "metroplat.agent.strategy" as const,
      id: "doctrine-oriented-workflow",
      state: orientationReady ? "ready" as const : "waiting" as const,
      gates: Object.freeze(["read-root-orientation", "refresh-external-comparator", "read-prior-research"]),
      moves: Object.freeze([orientMove]),
      evidence: Object.freeze([
        "source:agent-orientation",
        orientationReady ? "state:ready" : "state:waiting",
      ]),
    }),
    Object.freeze({
      kind: "metroplat.agent.strategy" as const,
      id: "governed-work-selection",
      state: dispatchState,
      gates: Object.freeze(["read-live-code", "select-governed-work"]),
      moves: workMoves,
      evidence: Object.freeze([
        "source:agent-work-dispatch",
        `state:${dispatchState}`,
        `moves:${workMoves.length}`,
      ]),
    }),
    Object.freeze({
      kind: "metroplat.agent.strategy" as const,
      id: "continuous-learning-review",
      state: skillProposalState,
      gates: Object.freeze(["review-skill-proposals", "human-skill-approval"]),
      moves: learningMoves,
      evidence: Object.freeze([
        "source:skill-proposals",
        `state:${skillProposalState}`,
        `moves:${learningMoves.length}`,
      ]),
    }),
    Object.freeze({
      kind: "metroplat.agent.strategy" as const,
      id: "focused-verification",
      state: "ready" as const,
      gates: Object.freeze(["focused-verification"]),
      moves: Object.freeze([verifyMove]),
      evidence: Object.freeze(["source:operator-session-protocol", "state:ready"]),
    }),
    Object.freeze({
      kind: "metroplat.agent.strategy" as const,
      id: "codebase-monitor-response",
      state: monitorState,
      gates: Object.freeze(["monitor-codebase-health"]),
      moves: monitorMoves,
      evidence: Object.freeze([
        "source:source-code-monitor-aggregate",
        `monitoring-charge:${monitoringCharge}`,
        `state:${monitorState}`,
        `moves:${monitorMoves.length}`,
      ]),
    }),
    Object.freeze({
      kind: "metroplat.agent.strategy" as const,
      id: "proof-health-monitor-response",
      state: proofHealthState,
      gates: Object.freeze(["monitor-proof-health"]),
      moves: proofHealthMoves,
      evidence: Object.freeze([
        "source:proof-health-monitor-aggregate",
        `proof-health-charge:${proofHealthCharge}`,
        `state:${proofHealthState}`,
        `moves:${proofHealthMoves.length}`,
      ]),
    }),
  ]);
  const nextMoves = Object.freeze([orientMove, ...workMoves, ...learningMoves, verifyMove, ...monitorMoves, ...proofHealthMoves].sort(compareMoves));
  const failures = input.failures?.filter((entry) => entry.length > 0) ?? [];
  const identity = Object.freeze({
    kind: "metroplat.agent.strategy-dossier" as const,
    date: input.date,
    actor: input.actor ?? DEFAULT_ACTOR,
    goal: input.goal ?? DEFAULT_GOAL,
    ...(diagnosisId === undefined ? {} : { diagnosis: diagnosisId }),
    policy: "view-innocent-read-only-strategy" as const,
    view: Object.freeze([
      ...(orientation === undefined ? [] : ["agent-orientation"]),
      ...(dispatch === undefined ? [] : ["agent-work-dispatch"]),
      ...(skillProposals === undefined ? [] : ["skill-proposals"]),
      ...(diagnosisId === undefined ? [] : ["agent-context-diagnosis"]),
    ]),
    gates,
    strategies,
    nextMoves,
    ...(failures.length === 0 ? {} : { failures: Object.freeze(failures) }),
    evidence: Object.freeze([
      "policy:view-innocent-read-only-strategy",
      `actor:${input.actor ?? DEFAULT_ACTOR}`,
      `goal:${input.goal ?? DEFAULT_GOAL}`,
      `view:${[orientation, dispatch, skillProposals].filter((entry) => entry !== undefined).length}`,
      `next-moves:${nextMoves.length}`,
      `failures:${failures.length}`,
      ...(diagnosisId === undefined ? [] : [`diagnosis:${diagnosisId}`]),
      `monitoring-charge:${monitoringCharge}`,
      `proof-health-charge:${proofHealthCharge}`,
    ]),
  });
  return Object.freeze({ ...identity, id: contentAddress(identity as unknown as JsonValue) });
}
