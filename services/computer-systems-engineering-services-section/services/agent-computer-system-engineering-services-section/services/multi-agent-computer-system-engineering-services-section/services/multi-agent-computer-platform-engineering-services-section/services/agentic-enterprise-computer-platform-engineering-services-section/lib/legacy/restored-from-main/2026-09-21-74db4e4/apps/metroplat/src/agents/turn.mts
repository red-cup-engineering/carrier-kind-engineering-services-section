/** Agent turn read model. */
import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export type AgentTurnLayerName =
  | "orientation"
  | "strategy"
  | "work-dispatch"
  | "skill-snapshot"
  | "session-presence"
  | "cost-attribution";
export type AgentTurnLayerState = "present" | "required" | "absent";
export type AgentTurnPreflightState = "satisfied" | "required";
export type AgentTurnCommunicationChannel =
  | "work-item"
  | "human-review"
  | "session-status"
  | "operator-session";

export interface AgentTurnContextLayer {
  readonly kind: "metroplat.agent.turn-context-layer";
  readonly name: AgentTurnLayerName;
  readonly state: AgentTurnLayerState;
  readonly sources: readonly string[];
  readonly evidence: readonly string[];
}

export interface AgentTurnSkillSnapshotEntry {
  readonly id: string;
  readonly state: string;
  readonly risk: string;
  readonly chain: readonly string[];
  readonly gates: readonly string[];
}

export interface AgentTurnSkillSnapshot {
  readonly kind: "metroplat.agent.turn-skill-snapshot";
  readonly policy: "proposal-only-human-approval-required";
  readonly state: "present" | "empty";
  readonly proposals: number;
  readonly reviewable: number;
  readonly skills: readonly AgentTurnSkillSnapshotEntry[];
  readonly evidence: readonly string[];
}

export interface AgentTurnCommunication {
  readonly channel: AgentTurnCommunicationChannel;
  readonly source: string;
  readonly policy: "trace-through-existing-work-surfaces";
  readonly evidence: readonly string[];
}

export interface AgentTurnPreflightGate {
  readonly name:
    | "orientation"
    | "strategy"
    | "work-item-trace"
    | "skill-snapshot"
    | "human-approval"
    | "cost-attribution"
    | "no-execution";
  readonly state: AgentTurnPreflightState;
  readonly evidence: readonly string[];
}

export interface AgentTurnInvocationEnvelope {
  readonly kind: "metroplat.agent.turn-invocation-envelope";
  readonly id: string;
  readonly source: string;
  readonly promptIntent: string;
  readonly sessionTarget: string;
  readonly delivery: string;
  readonly contextMode: string;
  readonly communication: AgentTurnCommunication;
  readonly contextLayers: readonly AgentTurnLayerName[];
  readonly skillSnapshot: "proposal-only" | "empty";
  readonly preflight: readonly AgentTurnPreflightGate[];
  readonly evidence: readonly string[];
}

export interface AgentTurnDossierInput {
  readonly date: string;
  readonly actor?: string;
  readonly goal?: string;
  readonly heartbeat?: JsonValue;
  readonly orientation?: JsonValue;
  readonly strategy?: JsonValue;
  readonly dispatch?: JsonValue;
  readonly skillProposals?: JsonValue;
  readonly inferenceCost?: JsonValue;
  readonly failures?: readonly string[];
}

export interface AgentTurnDossier {
  readonly kind: "metroplat.agent.turn-dossier";
  readonly date: string;
  readonly actor: string;
  readonly goal: string;
  readonly policy: "read-only-turn-context-snapshot";
  readonly decision: string;
  readonly contextLayers: readonly AgentTurnContextLayer[];
  readonly skillSnapshot: AgentTurnSkillSnapshot;
  readonly invocations: readonly AgentTurnInvocationEnvelope[];
  readonly observations: Readonly<{
    readonly heartbeatTurns: number;
    readonly workItems: number;
    readonly skillProposals: number;
    readonly reviewableSkills: number;
  }>;
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

function stringOf(value: JsonValue | undefined, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberOf(value: JsonValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function contextLayer(
  name: AgentTurnLayerName,
  state: AgentTurnLayerState,
  sources: readonly string[],
  evidence: readonly string[],
): AgentTurnContextLayer {
  return Object.freeze({
    kind: "metroplat.agent.turn-context-layer" as const,
    name,
    state,
    sources: Object.freeze(sources),
    evidence: Object.freeze(evidence),
  });
}

function proposalGateNames(proposal: Record<string, JsonValue>): readonly string[] {
  return Object.freeze(records(proposal["gates"]).map((gate) => stringOf(gate["name"], "unknown-gate")));
}

function skillSnapshot(skillProposals: Record<string, JsonValue> | undefined): AgentTurnSkillSnapshot {
  const proposals = records(skillProposals?.["proposals"]);
  const skills = Object.freeze(proposals
    .filter((proposal) => proposal["state"] === "reviewable")
    .slice(0, 12)
    .map((proposal) => Object.freeze({
      id: stringOf(proposal["id"], "skill-proposal"),
      state: stringOf(proposal["state"], "unknown"),
      risk: stringOf(proposal["risk"], "unknown"),
      chain: strings(proposal["chain"]),
      gates: proposalGateNames(proposal),
    })));
  return Object.freeze({
    kind: "metroplat.agent.turn-skill-snapshot" as const,
    policy: "proposal-only-human-approval-required" as const,
    state: skills.length > 0 ? "present" : "empty",
    proposals: proposals.length,
    reviewable: numberOf(skillProposals?.["reviewable"]),
    skills,
    evidence: Object.freeze([
      `proposals:${proposals.length}`,
      `reviewable:${numberOf(skillProposals?.["reviewable"])}`,
      "skills are not installed by this readout",
    ]),
  });
}

function communicationForSource(source: string): AgentTurnCommunication {
  if (source === "agent-work-dispatch") {
    return Object.freeze({
      channel: "work-item" as const,
      source,
      policy: "trace-through-existing-work-surfaces" as const,
      evidence: Object.freeze(["dispatch-derived work items carry the trace"]),
    });
  }
  if (source === "skill-proposals") {
    return Object.freeze({
      channel: "human-review" as const,
      source,
      policy: "trace-through-existing-work-surfaces" as const,
      evidence: Object.freeze(["skill promotion requires explicit human approval"]),
    });
  }
  if (source === "session-presence") {
    return Object.freeze({
      channel: "session-status" as const,
      source,
      policy: "trace-through-existing-work-surfaces" as const,
      evidence: Object.freeze(["presence review stays attached to session state"]),
    });
  }
  return Object.freeze({
    channel: "operator-session" as const,
    source,
    policy: "trace-through-existing-work-surfaces" as const,
    evidence: Object.freeze(["operator session receives non-work-item prompts"]),
  });
}

function preflightGate(
  name: AgentTurnPreflightGate["name"],
  state: AgentTurnPreflightState,
  evidence: readonly string[],
): AgentTurnPreflightGate {
  return Object.freeze({ name, state, evidence: Object.freeze(evidence) });
}

function preflightForTurn(
  turn: Record<string, JsonValue>,
  options: {
    readonly orientationPresent: boolean;
    readonly strategyPresent: boolean;
    readonly costPresent: boolean;
    readonly snapshotPresent: boolean;
  },
): readonly AgentTurnPreflightGate[] {
  const source = stringOf(turn["source"], "agent-heartbeat");
  return Object.freeze([
    preflightGate("orientation", options.orientationPresent ? "satisfied" : "required", Object.freeze([
      options.orientationPresent ? "orientation:present" : "orientation:missing",
    ])),
    preflightGate("strategy", options.strategyPresent ? "satisfied" : "required", Object.freeze([
      options.strategyPresent ? "strategy:present" : "strategy:missing",
    ])),
    ...(source === "agent-work-dispatch" ? [
      preflightGate("work-item-trace", "satisfied", Object.freeze(["source:agent-work-dispatch"])),
    ] : []),
    ...(source === "skill-proposals" ? [
      preflightGate("skill-snapshot", options.snapshotPresent ? "satisfied" : "required", Object.freeze([
        options.snapshotPresent ? "skill-snapshot:present" : "skill-snapshot:missing",
      ])),
      preflightGate("human-approval", "required", Object.freeze(["promotion cannot be automatic"])),
    ] : []),
    preflightGate("cost-attribution", options.costPresent ? "satisfied" : "required", Object.freeze([
      options.costPresent ? "inference-cost:present" : "inference-cost:missing",
    ])),
    preflightGate("no-execution", "satisfied", Object.freeze(["turn dossier does not invoke an adapter"])),
  ]);
}

function layerNamesForTurn(turn: Record<string, JsonValue>): readonly AgentTurnLayerName[] {
  const source = stringOf(turn["source"], "agent-heartbeat");
  const names: AgentTurnLayerName[] = ["orientation", "strategy", "cost-attribution"];
  if (source === "agent-work-dispatch") names.push("work-dispatch");
  if (source === "skill-proposals") names.push("skill-snapshot");
  if (source === "session-presence") names.push("session-presence");
  return Object.freeze(names);
}

function invocationEnvelope(
  turn: Record<string, JsonValue>,
  options: {
    readonly snapshotPresent: boolean;
    readonly orientationPresent: boolean;
    readonly strategyPresent: boolean;
    readonly costPresent: boolean;
  },
): AgentTurnInvocationEnvelope {
  const source = stringOf(turn["source"], "agent-heartbeat");
  const layers = layerNamesForTurn(turn);
  return Object.freeze({
    kind: "metroplat.agent.turn-invocation-envelope" as const,
    id: stringOf(turn["id"], "turn"),
    source,
    promptIntent: stringOf(turn["promptIntent"], "continue"),
    sessionTarget: stringOf(turn["sessionTarget"], "isolated"),
    delivery: stringOf(turn["delivery"], "silent"),
    contextMode: stringOf(turn["contextMode"], "thin"),
    communication: communicationForSource(source),
    contextLayers: layers,
    skillSnapshot: options.snapshotPresent ? "proposal-only" : "empty",
    preflight: preflightForTurn(turn, options),
    evidence: Object.freeze([
      ...strings(turn["evidence"]),
      `layers:${layers.join(",")}`,
      "execution-boundary:adapter-not-called",
    ]),
  });
}

export function agentTurnDossier(input: AgentTurnDossierInput): AgentTurnDossier {
  const heartbeat = record(input.heartbeat);
  const orientation = record(input.orientation);
  const strategy = record(input.strategy);
  const dispatch = record(input.dispatch);
  const skillProposals = record(input.skillProposals);
  const inferenceCost = record(input.inferenceCost);
  const snapshot = skillSnapshot(skillProposals);
  const turns = records(heartbeat?.["turns"]);
  const layerOptions = {
    orientationPresent: orientation !== undefined,
    strategyPresent: strategy !== undefined,
    costPresent: inferenceCost !== undefined,
    snapshotPresent: snapshot.state === "present",
  };
  const invocations = Object.freeze(turns.map((turn) => invocationEnvelope(turn, layerOptions)));
  const workItems = records(dispatch?.["queue"]);
  const failures = input.failures?.filter((entry) => entry.length > 0) ?? [];
  const goal = input.goal ?? stringOf(heartbeat?.["goal"], stringOf(strategy?.["goal"], DEFAULT_GOAL));
  return Object.freeze({
    kind: "metroplat.agent.turn-dossier" as const,
    date: input.date,
    actor: input.actor ?? stringOf(heartbeat?.["actor"], DEFAULT_ACTOR),
    goal,
    policy: "read-only-turn-context-snapshot" as const,
    decision: stringOf(heartbeat?.["decision"], "wait"),
    contextLayers: Object.freeze([
      contextLayer("orientation", orientation === undefined ? "required" : "present", Object.freeze(["agent-orientation"]), Object.freeze([
        orientation === undefined ? "orientation:missing" : "orientation:present",
      ])),
      contextLayer("strategy", strategy === undefined ? "required" : "present", Object.freeze(["agent-strategy", "agent-heartbeat"]), Object.freeze([
        strategy === undefined ? "strategy:missing" : "strategy:present",
      ])),
      contextLayer("work-dispatch", dispatch === undefined ? "absent" : "present", Object.freeze(["agent-work-dispatch"]), Object.freeze([
        dispatch === undefined ? "dispatch:absent" : `work-items:${workItems.length}`,
      ])),
      contextLayer("skill-snapshot", snapshot.state === "empty" ? "absent" : "present", Object.freeze(["skill-proposals"]), Object.freeze(snapshot.evidence)),
      contextLayer("session-presence", heartbeat === undefined ? "absent" : "present", Object.freeze(["agent-heartbeat", "session-presence"]), Object.freeze([
        heartbeat === undefined ? "heartbeat:missing" : `heartbeat-turns:${turns.length}`,
      ])),
      contextLayer("cost-attribution", inferenceCost === undefined ? "required" : "present", Object.freeze(["inference-cost"]), Object.freeze([
        inferenceCost === undefined ? "inference-cost:missing" : "inference-cost:present",
      ])),
    ]),
    skillSnapshot: snapshot,
    invocations,
    observations: Object.freeze({
      heartbeatTurns: turns.length,
      workItems: workItems.length,
      skillProposals: snapshot.proposals,
      reviewableSkills: snapshot.reviewable,
    }),
    ...(failures.length === 0 ? {} : { failures: Object.freeze(failures) }),
    evidence: Object.freeze([
      `heartbeat-turns:${turns.length}`,
      `invocations:${invocations.length}`,
      `decision:${stringOf(heartbeat?.["decision"], "wait")}`,
      "policy:read-only-turn-context-snapshot",
    ]),
  });
}
