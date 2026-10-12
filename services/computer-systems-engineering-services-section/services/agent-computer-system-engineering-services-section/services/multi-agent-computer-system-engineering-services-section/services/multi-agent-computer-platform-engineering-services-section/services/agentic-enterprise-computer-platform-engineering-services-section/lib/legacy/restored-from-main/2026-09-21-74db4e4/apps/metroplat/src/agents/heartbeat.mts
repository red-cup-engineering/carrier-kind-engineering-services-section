/** Agent heartbeat read model. */
import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export type AgentHeartbeatDecision = "invoke" | "wait" | "pause";
export type AgentHeartbeatContextMode = "thin" | "fat";
export type AgentHeartbeatSessionTarget = "main" | "isolated";
export type AgentHeartbeatDelivery = "announce" | "silent";

export interface AgentHeartbeatAdapterContract {
  readonly kind: "metroplat.agent.heartbeat-adapter-contract";
  readonly methods: readonly ["invoke", "status", "cancel"];
  readonly controls: readonly ["when", "how", "context"];
  readonly doesNotControl: readonly ["run-duration", "agent-actions", "task-scope"];
  readonly evidence: readonly string[];
}

export interface AgentHeartbeatTrigger {
  readonly kind: "metroplat.agent.heartbeat-trigger";
  readonly id: string;
  readonly source: string;
  readonly reason: string;
  readonly decision: AgentHeartbeatDecision;
  readonly evidence: readonly string[];
}

export interface AgentHeartbeatTurnPlan {
  readonly kind: "metroplat.agent.heartbeat-turn-plan";
  readonly id: string;
  readonly source: string;
  readonly promptIntent: string;
  readonly sessionTarget: AgentHeartbeatSessionTarget;
  readonly delivery: AgentHeartbeatDelivery;
  readonly contextMode: AgentHeartbeatContextMode;
  readonly evidence: readonly string[];
}

export interface AgentHeartbeatDossierInput {
  readonly date: string;
  readonly actor?: string;
  readonly goal?: string;
  readonly strategy?: JsonValue;
  readonly presence?: JsonValue;
  readonly inferenceCost?: JsonValue;
  readonly failures?: readonly string[];
}

export interface AgentHeartbeatDossier {
  readonly kind: "metroplat.agent.heartbeat-dossier";
  readonly date: string;
  readonly actor: string;
  readonly goal: string;
  readonly policy: "protocol-only-delegate-work";
  readonly decision: AgentHeartbeatDecision;
  readonly contextMode: AgentHeartbeatContextMode;
  readonly adapter: AgentHeartbeatAdapterContract;
  readonly triggers: readonly AgentHeartbeatTrigger[];
  readonly turns: readonly AgentHeartbeatTurnPlan[];
  readonly observations: Readonly<{
    readonly strategyMoves: number;
    readonly staleSessions: number;
    readonly recentSessions: number;
    readonly settledSessions: number;
    readonly costReadout: "present" | "absent";
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

function stringOf(value: JsonValue | undefined, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberOf(value: JsonValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function slugPart(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return slug.length === 0 ? "turn" : slug;
}

function adapterContract(): AgentHeartbeatAdapterContract {
  return Object.freeze({
    kind: "metroplat.agent.heartbeat-adapter-contract" as const,
    methods: Object.freeze(["invoke", "status", "cancel"] as const),
    controls: Object.freeze(["when", "how", "context"] as const),
    doesNotControl: Object.freeze(["run-duration", "agent-actions", "task-scope"] as const),
    evidence: Object.freeze([
      "heartbeat is a protocol, not an executor",
      "adapter supplies invoke/status/cancel",
    ]),
  });
}

function strategyMoves(strategy: Record<string, JsonValue> | undefined): readonly Record<string, JsonValue>[] {
  return records(strategy?.["nextMoves"]).filter((move) => move["state"] === "ready");
}

function stalePresenceSessions(presence: Record<string, JsonValue> | undefined): readonly Record<string, JsonValue>[] {
  const staleAfterSeconds = numberOf(presence?.["staleAfterSeconds"]);
  if (staleAfterSeconds <= 0) return Object.freeze([]);
  return Object.freeze(records(presence?.["sessions"]).filter((session) =>
    session["state"] === "deshrouded" && numberOf(session["idleSeconds"]) > staleAfterSeconds));
}

function recentPresenceSessions(presence: Record<string, JsonValue> | undefined): readonly Record<string, JsonValue>[] {
  const staleAfterSeconds = numberOf(presence?.["staleAfterSeconds"]);
  if (staleAfterSeconds <= 0) return Object.freeze([]);
  return Object.freeze(records(presence?.["sessions"]).filter((session) =>
    session["state"] === "deshrouded" && numberOf(session["idleSeconds"]) <= staleAfterSeconds));
}

function closedPresenceSessions(presence: Record<string, JsonValue> | undefined): readonly Record<string, JsonValue>[] {
  return Object.freeze(records(presence?.["sessions"]).filter((session) => session["state"] === "settled"));
}

function trigger(
  id: string,
  source: string,
  reason: string,
  decision: AgentHeartbeatDecision,
  evidence: readonly string[],
): AgentHeartbeatTrigger {
  return Object.freeze({
    kind: "metroplat.agent.heartbeat-trigger" as const,
    id,
    source,
    reason,
    decision,
    evidence: Object.freeze(evidence),
  });
}

function turnPlan(
  id: string,
  source: string,
  promptIntent: string,
  sessionTarget: AgentHeartbeatSessionTarget,
  delivery: AgentHeartbeatDelivery,
  contextMode: AgentHeartbeatContextMode,
  evidence: readonly string[],
): AgentHeartbeatTurnPlan {
  return Object.freeze({
    kind: "metroplat.agent.heartbeat-turn-plan" as const,
    id,
    source,
    promptIntent,
    sessionTarget,
    delivery,
    contextMode,
    evidence: Object.freeze(evidence),
  });
}

function turnForStrategyMove(move: Record<string, JsonValue>, contextMode: AgentHeartbeatContextMode): AgentHeartbeatTurnPlan {
  const id = stringOf(move["id"], "strategy-move");
  const action = stringOf(move["action"], "continue-strategy");
  const source = stringOf(move["source"], "agent-strategy");
  const target = typeof move["target"] === "string" ? move["target"] : undefined;
  const needsHuman = action.includes("review") || source === "skill-proposals";
  return turnPlan(
    `turn:${slugPart(id)}`,
    source,
    target === undefined ? action : `${action}:${target}`,
    needsHuman ? "main" : "isolated",
    needsHuman ? "announce" : "silent",
    contextMode,
    Object.freeze([
      `move:${id}`,
      `action:${action}`,
      ...(target === undefined ? [] : [`target:${target}`]),
    ]),
  );
}

export function agentHeartbeatDossier(input: AgentHeartbeatDossierInput): AgentHeartbeatDossier {
  const strategy = record(input.strategy);
  const presence = record(input.presence);
  const inferenceCost = record(input.inferenceCost);
  const moves = strategyMoves(strategy);
  const staleSessions = stalePresenceSessions(presence);
  const recentSessions = recentPresenceSessions(presence);
  const closedSessions = closedPresenceSessions(presence);
  const contextMode: AgentHeartbeatContextMode = moves.length > 0 || staleSessions.length > 0 ? "fat" : "thin";
  const triggers: AgentHeartbeatTrigger[] = [];
  if (moves.length > 0) {
    triggers.push(trigger(
      "strategy-ready",
      "agent-strategy",
      "ready strategy moves are waiting for an agent turn",
      "invoke",
      Object.freeze([`moves:${moves.length}`]),
    ));
  }
  if (staleSessions.length > 0) {
    triggers.push(trigger(
      "presence-stale",
      "session-presence",
      "deshrouded sessions exceeded the caller staleness threshold",
      "invoke",
      Object.freeze(staleSessions.map((session) => `session:${String(session["session"] ?? "unknown")}:idle:${numberOf(session["idleSeconds"])}`)),
    ));
  }
  if (moves.length === 0 && staleSessions.length === 0) {
    triggers.push(trigger(
      "nothing-due",
      "agent-heartbeat",
      "no ready strategy moves or stale sessions",
      "wait",
      Object.freeze([
        `recent-sessions:${recentSessions.length}`,
        `settled-sessions:${closedSessions.length}`,
      ]),
    ));
  }
  const turns = Object.freeze([
    ...moves.slice(0, 6).map((move) => turnForStrategyMove(move, contextMode)),
    ...staleSessions.slice(0, 6).map((session) => turnPlan(
      `turn:presence-review:${slugPart(String(session["session"] ?? "unknown"))}`,
      "session-presence",
      `review-stale-session:${String(session["session"] ?? "unknown")}`,
      "isolated",
      "silent",
      "thin",
      Object.freeze([
        `session:${String(session["session"] ?? "unknown")}`,
        `idle-seconds:${numberOf(session["idleSeconds"])}`,
      ]),
    )),
  ]);
  const decision: AgentHeartbeatDecision = triggers.some((entry) => entry.decision === "invoke") ? "invoke" : "wait";
  const failures = input.failures?.filter((entry) => entry.length > 0) ?? [];
  return Object.freeze({
    kind: "metroplat.agent.heartbeat-dossier" as const,
    date: input.date,
    actor: input.actor ?? DEFAULT_ACTOR,
    goal: input.goal ?? stringOf(strategy?.["goal"], DEFAULT_GOAL),
    policy: "protocol-only-delegate-work" as const,
    decision,
    contextMode,
    adapter: adapterContract(),
    triggers: Object.freeze(triggers),
    turns,
    observations: Object.freeze({
      strategyMoves: moves.length,
      staleSessions: staleSessions.length,
      recentSessions: recentSessions.length,
      settledSessions: closedSessions.length,
      costReadout: inferenceCost === undefined ? "absent" as const : "present" as const,
    }),
    ...(failures.length === 0 ? {} : { failures: Object.freeze(failures) }),
    evidence: Object.freeze([
      "policy:protocol-only-delegate-work",
      `decision:${decision}`,
      `context:${contextMode}`,
      `strategy-moves:${moves.length}`,
      `stale-sessions:${staleSessions.length}`,
      `cost-readout:${inferenceCost === undefined ? "absent" : "present"}`,
      `failures:${failures.length}`,
    ]),
  });
}
