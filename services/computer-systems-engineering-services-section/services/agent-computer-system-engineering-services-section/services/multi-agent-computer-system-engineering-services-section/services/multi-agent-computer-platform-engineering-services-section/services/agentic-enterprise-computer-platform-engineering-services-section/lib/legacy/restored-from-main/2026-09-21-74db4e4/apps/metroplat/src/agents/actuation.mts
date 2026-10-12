/**
 * @packageDocumentation
 *
 * Agent actuation read model — the MAPE-K Execute leg.
 *
 * The strategy dossier (Plan) emits monitoring moves such as
 * `verify:codebase-monitor` when the Monitor aggregate charge is denied or
 * contested.  This module closes the loop: a declarative dispatch table maps
 * each monitoring move name to the RPC operation verb that re-runs the
 * corresponding monitoring observation, and a pure planner decides which ready
 * moves may fire.  The RPC catalog itself is the mux — no adapter layer sits
 * between the plan and the operation (see the platform-adapter decision).
 *
 * Guarantees enforced by the pure planner:
 *   - **ready-only** — a move fires only when its strategy state is `"ready"`.
 *   - **mapped-only** — a move fires only when the dispatch table names its operation.
 *   - **single-fire per diagnosis** — the actuation request key is deterministic
 *     in (diagnosis, move); an already-journaled request is skipped.
 *   - **paraconsistency-preserving** — execution outcomes join evidence records
 *     with `addEvidenceRecords`; evidence accumulates and never cancels.
 */
import type { JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  contentAddress } from "../lib/identity/index.mts";
import {
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import {
  evidenceRecord,
  type EvidenceRecord,
  addEvidenceRecords,
} from "@red-cup-engineering/computer-data-engine/evidence-record";


/** Declarative move-name → RPC operation-verb dispatch table.
 *  New monitoring domains (proof-health, filesystem) join by adding an entry —
 *  no new actuator code is required. */
export const MONITORING_MOVE_OPERATIONS: Readonly<Record<string, string>> = Object.freeze({
  "verify:codebase-monitor": "source-code-monitor-aggregate",
  "verify:proof-health-monitor": "proof-health-monitor-aggregate",
});

/** The RPC operation verb actuating one monitoring strategy move, if registered. */
export function monitoringOperationForMove(moveId: string): string | undefined {
  return MONITORING_MOVE_OPERATIONS[moveId];
}

/** Deterministic actuation request key: at most one execution per (diagnosis, move). */
export function actuationRequestKey(diagnosisId: string, moveId: string): string {
  return `agent-actuation:${diagnosisId}:${moveId}`;
}

export type AgentActuationEntryState = "planned" | "skipped";

export interface AgentActuationPlanEntry {
  readonly kind: "metroplat.agent.actuation-plan-entry";
  readonly move: string;
  readonly operation?: string;
  readonly request?: string;
  readonly state: AgentActuationEntryState;
  readonly reasons: readonly string[];
  readonly evidence: readonly string[];
}

export interface AgentActuationPlanInput {
  readonly date: string;
  readonly diagnosis?: string;
  /** Strategy moves (`metroplat.agent.strategy-move` values) considered for actuation. */
  readonly moves: readonly JsonValue[];
  /** Actuation request keys already journaled — replays are skipped. */
  readonly executedRequests?: readonly string[];
}

export interface AgentActuationPlan {
  readonly kind: "metroplat.agent.actuation-plan";
  readonly id: string;
  readonly date: string;
  readonly diagnosis?: string;
  readonly entries: readonly AgentActuationPlanEntry[];
  readonly planned: number;
  readonly skipped: number;
  readonly evidence: readonly string[];
}

export interface AgentActuationExecution {
  readonly kind: "metroplat.agent.actuation-execution";
  readonly move: string;
  readonly operation: string;
  readonly request: string;
  readonly ok: boolean;
  /** Journal receipt id of the executed operation (provenance). */
  readonly receipt?: string;
  /** Invocation id of the executed operation (provenance). */
  readonly invocation?: string;
  /** The operation outcome value (e.g. a fresh SourceCodeMonitorAggregate). */
  readonly outcome?: JsonValue;
  readonly evidence: readonly string[];
}

export interface AgentActuationDossierInput {
  readonly date: string;
  readonly actor?: string;
  readonly goal?: string;
  readonly diagnosis?: string;
  readonly plan: AgentActuationPlan;
  readonly executions: readonly AgentActuationExecution[];
  /** Keyed source-code claim readings before actuation. */
  readonly monitoringClaimsBefore: readonly string[];
  /** Keyed source-code claim readings after knowledge writeback. */
  readonly monitoringClaimsAfter: readonly string[];
  /** Content address of the refreshed post-execution context image, when produced. */
  readonly contextImage?: string;
  readonly failures?: readonly string[];
}

export interface AgentActuationDossier {
  readonly kind: "metroplat.agent.actuation-dossier";
  readonly id: string;
  readonly date: string;
  readonly actor: string;
  readonly goal: string;
  readonly policy: "execute-ready-monitoring-moves-once-per-diagnosis";
  readonly diagnosis?: string;
  readonly plan: AgentActuationPlan;
  readonly executions: readonly AgentActuationExecution[];
  readonly monitoringClaimsBefore: readonly string[];
  readonly monitoringClaimsAfter: readonly string[];
  readonly contextImage?: string;
  readonly failures?: readonly string[];
  readonly evidence: readonly string[];
}

const DEFAULT_ACTOR = "agent:codex";
const DEFAULT_GOAL = "continue governed metroplat development";

function record(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, JsonValue> : undefined;
}

function entry(
  move: string,
  state: AgentActuationEntryState,
  reasons: readonly string[],
  options: { readonly operation?: string; readonly request?: string } = {},
): AgentActuationPlanEntry {
  return Object.freeze({
    kind: "metroplat.agent.actuation-plan-entry" as const,
    move,
    ...(options.operation === undefined ? {} : { operation: options.operation }),
    ...(options.request === undefined ? {} : { request: options.request }),
    state,
    reasons: Object.freeze(reasons),
    evidence: Object.freeze([
      `move:${move}`,
      `state:${state}`,
      ...(options.operation === undefined ? [] : [`operation:${options.operation}`]),
      ...(options.request === undefined ? [] : [`request:${options.request}`]),
    ]),
  });
}

/** Decide which monitoring strategy moves may execute.
 *
 * Only moves that are (a) registered in the dispatch table, (b) in strategy
 * state `"ready"`, (c) attributable to a known diagnosis, and (d) not already
 * executed for that diagnosis are planned. Everything else is recorded as a
 * skipped entry with explicit reasons — the plan never silently drops a move. */
export function agentActuationPlan(input: AgentActuationPlanInput): AgentActuationPlan {
  const executed = new Set(input.executedRequests ?? []);
  const entries: AgentActuationPlanEntry[] = [];
  for (const candidate of input.moves) {
    const move = record(candidate);
    if (move === undefined || move["kind"] !== "metroplat.agent.strategy-move") continue;
    const moveId = typeof move["id"] === "string" ? move["id"] : undefined;
    if (moveId === undefined) continue;
    const operation = monitoringOperationForMove(moveId);
    if (operation === undefined) continue; // not a monitoring move — outside the actuator's charter
    if (move["state"] !== "ready") {
      entries.push(entry(moveId, "skipped", [`move state is ${String(move["state"])}; only ready moves fire`], { operation }));
      continue;
    }
    if (input.diagnosis === undefined) {
      entries.push(entry(moveId, "skipped", ["no diagnosis identity; single-fire guard requires a diagnosis"], { operation }));
      continue;
    }
    const request = actuationRequestKey(input.diagnosis, moveId);
    if (executed.has(request)) {
      entries.push(entry(moveId, "skipped", ["already executed for this diagnosis"], { operation, request }));
      continue;
    }
    entries.push(entry(moveId, "planned", [`ready monitoring move maps to operation ${operation}`], { operation, request }));
  }
  const planned = entries.filter((item) => item.state === "planned").length;
  const identity = Object.freeze({
    kind: "metroplat.agent.actuation-plan" as const,
    date: input.date,
    ...(input.diagnosis === undefined ? {} : { diagnosis: input.diagnosis }),
    entries: Object.freeze(entries),
    planned,
    skipped: entries.length - planned,
    evidence: Object.freeze([
      "policy:execute-ready-monitoring-moves-once-per-diagnosis",
      `moves-considered:${input.moves.length}`,
      `planned:${planned}`,
      `skipped:${entries.length - planned}`,
      ...(input.diagnosis === undefined ? ["diagnosis:missing"] : [`diagnosis:${input.diagnosis}`]),
    ]),
  });
  return Object.freeze({ ...identity, id: contentAddress(identity as unknown as JsonValue) });
}

export function agentActuationExecution(input: {
  readonly move: string;
  readonly operation: string;
  readonly request: string;
  readonly ok: boolean;
  readonly receipt?: string;
  readonly invocation?: string;
  readonly outcome?: JsonValue;
  readonly reasons?: readonly string[];
}): AgentActuationExecution {
  return Object.freeze({
    kind: "metroplat.agent.actuation-execution" as const,
    move: input.move,
    operation: input.operation,
    request: input.request,
    ok: input.ok,
    ...(input.receipt === undefined ? {} : { receipt: input.receipt }),
    ...(input.invocation === undefined ? {} : { invocation: input.invocation }),
    ...(input.outcome === undefined ? {} : { outcome: input.outcome }),
    evidence: Object.freeze([
      `move:${input.move}`,
      `operation:${input.operation}`,
      `request:${input.request}`,
      `ok:${input.ok}`,
      ...(input.receipt === undefined ? [] : [`receipt:${input.receipt}`]),
      ...(input.invocation === undefined ? [] : [`invocation:${input.invocation}`]),
      ...(input.reasons ?? []),
    ]),
  });
}

/** Content-addressed record of one actuation turn: plan, executions, and the
 *  Knowledge writeback (pre/post monitoring charges and the refreshed context image). */
export function agentActuationDossier(input: AgentActuationDossierInput): AgentActuationDossier {
  const failures = input.failures?.filter((item) => item.length > 0) ?? [];
  const identity = Object.freeze({
    kind: "metroplat.agent.actuation-dossier" as const,
    date: input.date,
    actor: input.actor ?? DEFAULT_ACTOR,
    goal: input.goal ?? DEFAULT_GOAL,
    policy: "execute-ready-monitoring-moves-once-per-diagnosis" as const,
    ...(input.diagnosis === undefined ? {} : { diagnosis: input.diagnosis }),
    plan: input.plan,
    executions: Object.freeze([...input.executions]),
    monitoringClaimsBefore: Object.freeze([...input.monitoringClaimsBefore]),
    monitoringClaimsAfter: Object.freeze([...input.monitoringClaimsAfter]),
    ...(input.contextImage === undefined ? {} : { contextImage: input.contextImage }),
    ...(failures.length === 0 ? {} : { failures: Object.freeze(failures) }),
    evidence: Object.freeze([
      "policy:execute-ready-monitoring-moves-once-per-diagnosis",
      `planned:${input.plan.planned}`,
      `executed:${input.executions.filter((item) => item.ok).length}`,
      `monitoring-claims-before:${input.monitoringClaimsBefore.length}`,
      `monitoring-claims-after:${input.monitoringClaimsAfter.length}`,
      ...(input.contextImage === undefined ? [] : [`context-image:${input.contextImage}`]),
      `failures:${failures.length}`,
    ]),
  });
  return Object.freeze({ ...identity, id: contentAddress(identity as unknown as JsonValue) });
}

/** Join pre- and post-execution evidence records paraconsistently.
 *  Belnap knowledge join: pos/neg masses accumulate; contradictions never cancel. */
export function joinActuationEvidence(before: EvidenceRecord, after: EvidenceRecord): EvidenceRecord {
  return addEvidenceRecords(before, after);
}

/** Executable law receipt for the actuator's behaviour.
 *
 * 1. **no-fire-on-non-ready** — a waiting/blocked monitoring move is never planned.
 * 2. **fire-on-ready** — a ready mapped move is planned exactly once with the mapped operation.
 * 3. **single-fire-per-diagnosis** — the request key is deterministic and a
 *    previously executed request is skipped on replan.
 * 4. **unmapped-moves-ignored** — moves outside the dispatch table produce no entries.
 * 5. **paraconsistency** — joined post-execution evidence never loses mass. */
export function agentActuationLawReceipt(): JsonValue {
  const failures: string[] = [];
  const check = (law: string, actual: unknown, expected: unknown): void => {
    if (actual !== expected) failures.push(`${law}: expected ${String(expected)}, got ${String(actual)}`);
  };
  const move = (id: string, state: string): JsonValue => Object.freeze({
    kind: "metroplat.agent.strategy-move",
    id,
    source: "source-code-monitor-aggregate",
    action: "address-monitor-findings",
    state,
    reasons: [],
    evidence: [],
  }) as JsonValue;

  // 1. no-fire on non-ready moves.
  for (const state of ["waiting", "blocked"]) {
    const plan = agentActuationPlan({ date: "2026-07-16", diagnosis: "diag-1", moves: [move("verify:codebase-monitor", state)] });
    check(`no-fire-on-${state}`, plan.planned, 0);
    check(`no-fire-on-${state}-recorded`, plan.entries.length, 1);
    check(`no-fire-on-${state}-state`, plan.entries[0]?.state, "skipped");
  }

  // 2. fire on ready.
  const ready = agentActuationPlan({ date: "2026-07-16", diagnosis: "diag-1", moves: [move("verify:codebase-monitor", "ready")] });
  check("fire-on-ready", ready.planned, 1);
  check("fire-on-ready-operation", ready.entries[0]?.operation, "source-code-monitor-aggregate");
  check("fire-on-ready-request", ready.entries[0]?.request, actuationRequestKey("diag-1", "verify:codebase-monitor"));

  // 2b. proof-health monitoring move is mapped and fires on ready.
  const proofHealthReady = agentActuationPlan({ date: "2026-07-16", diagnosis: "diag-1", moves: [move("verify:proof-health-monitor", "ready")] });
  check("fire-on-ready-proof-health", proofHealthReady.planned, 1);
  check("fire-on-ready-proof-health-operation", proofHealthReady.entries[0]?.operation, "proof-health-monitor-aggregate");

  // 3. single fire per diagnosis: request keys are deterministic and replays skip.
  check("request-key-deterministic", actuationRequestKey("d", "m"), actuationRequestKey("d", "m"));
  const replay = agentActuationPlan({
    date: "2026-07-16",
    diagnosis: "diag-1",
    moves: [move("verify:codebase-monitor", "ready")],
    executedRequests: [actuationRequestKey("diag-1", "verify:codebase-monitor")],
  });
  check("single-fire-replay-skipped", replay.planned, 0);
  check("single-fire-replay-recorded", replay.entries[0]?.state, "skipped");
  const otherDiagnosis = agentActuationPlan({
    date: "2026-07-16",
    diagnosis: "diag-2",
    moves: [move("verify:codebase-monitor", "ready")],
    executedRequests: [actuationRequestKey("diag-1", "verify:codebase-monitor")],
  });
  check("new-diagnosis-fires-again", otherDiagnosis.planned, 1);
  const noDiagnosis = agentActuationPlan({ date: "2026-07-16", moves: [move("verify:codebase-monitor", "ready")] });
  check("no-diagnosis-no-fire", noDiagnosis.planned, 0);

  // 4. unmapped moves are ignored (outside the actuator's charter).
  const unmapped = agentActuationPlan({ date: "2026-07-16", diagnosis: "diag-1", moves: [move("verify:focused-contract", "ready")] });
  check("unmapped-ignored", unmapped.entries.length, 0);

  // 5. paraconsistency: joined evidence records accumulate, never cancel.
  const before = evidenceRecord(3, 2);
  const after = evidenceRecord(5, 0);
  const joined = joinActuationEvidence(before, after);
  if (joined.pos < before.pos || joined.pos < after.pos) failures.push(`paraconsistency-pos: join lost positive mass (${joined.pos})`);
  if (joined.neg < before.neg || joined.neg < after.neg) failures.push(`paraconsistency-neg: join lost negative mass (${joined.neg})`);

  const passed = failures.length === 0;
  return Object.freeze({
    kind: "metroplat.proof-health.agent-actuation-laws",
    laws: [
      "no-fire-on-non-ready-moves",
      "fire-on-ready-mapped-move",
      "single-fire-per-diagnosis",
      "unmapped-moves-ignored",
      "paraconsistent-evidence-join",
    ],
    failures: Object.freeze(failures),
    passed,
    charge: passed ? "held" : "denied",
  }) as unknown as JsonValue;
}
