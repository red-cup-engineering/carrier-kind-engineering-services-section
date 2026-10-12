/** The sole governed execution path for canonical RPC invocations. */
import type { JsonValue } from "../lib/codecs/json/core.mts";
import type { Operation, OperationCatalog } from "./operation.mts";
import type { RpcInvocation } from "./invocation.mts";
import { executionReceipt, type AuthorizationDecision, type CoordinationDecision, type ExecutionReceipt } from "./receipt.mts";
import type { RpcEvidenceReceipt, RpcWitness } from "./witness.mts";
import { executeOperationHandler } from "./handler.mts";
import { isOperationHandlerResult } from "./execution-context.mts";
import type { ArtifactSource } from "../lib/identity/index.mts";
import { can, capabilityGrant, type CapabilityAssertion } from "../lib/capability/index.mts";

export type RpcAuthorize = (
  invocation: RpcInvocation,
  operation: Operation,
  decidedAt: string,
) => AuthorizationDecision;

export type RpcCoordinate = (
  invocation: RpcInvocation,
  operation: Operation,
  decidedAt: string,
) => CoordinationDecision;

export type CapabilityAssertionSource = readonly CapabilityAssertion[] | (() => readonly CapabilityAssertion[]);

export interface RpcRuntime {
  readonly catalog: OperationCatalog;
  readonly witness: RpcWitness;
  readonly authorize: RpcAuthorize;
  readonly coordinate?: RpcCoordinate;
  readonly now: () => string;
}

/** Build the engine-facing policy adapter from settled operation charges. */
export function authorizationFromStanding(
  standing: ReadonlyMap<string, AuthorizationDecision["charge"]>,
  source = "operation-standing",
): RpcAuthorize {
  return (invocation, operation, decidedAt): AuthorizationDecision => {
    const charge = standing.get(operation.ref) ?? "unknown";
    const ok = charge === "held";
    return Object.freeze({
      kind: ok ? "metroplat.rpc.authorization:witness" as const : "metroplat.rpc.authorization:obstruction" as const,
      ok,
      invocation: invocation.id,
      operation: operation.ref,
      subject: invocation.subject,
      charge,
      evidence: Object.freeze([`${source}:${operation.ref}:${charge}`]),
      reasons: Object.freeze(ok ? [] : [`operation standing is ${charge}; held standing is required`]),
      decidedAt,
    });
  };
}

/** Conjoin operation availability with the subject's settled capability claim.
 * Both must be held; the base decision remains authoritative when the operation
 * itself is unavailable. */
export function authorizationFromCapabilityAssertions(
  base: RpcAuthorize,
  assertions: CapabilityAssertionSource,
  source = "subject-standing",
): RpcAuthorize {
  return (invocation, operation, decidedAt): AuthorizationDecision => {
    const available = base(invocation, operation, decidedAt);
    if (!available.ok) return available;
    const current = typeof assertions === "function" ? assertions() : assertions;
    const standing = can(current, invocation.subject, capabilityGrant(invocation.resource, operation.verb));
    const ok = standing.value === "held";
    return Object.freeze({
      kind: ok ? "metroplat.rpc.authorization:witness" as const : "metroplat.rpc.authorization:obstruction" as const,
      ok,
      invocation: invocation.id,
      operation: operation.ref,
      subject: invocation.subject,
      charge: standing.value,
      evidence: Object.freeze([...available.evidence, `${source}:${standing.holder}:${standing.grants}:${standing.value}`]),
      reasons: Object.freeze(ok ? [] : [`subject standing is ${standing.value}; held standing is required`]),
      decidedAt,
    });
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function evidenceIds(receipts: readonly RpcEvidenceReceipt[]): readonly string[] {
  return Object.freeze(receipts.flatMap((receipt) => receipt.eventIds.length === 0 ? [receipt.id] : receipt.eventIds));
}

function obstruction(
  invocation: RpcInvocation,
  operation: string,
  phase: ExecutionReceipt["phase"],
  startedAt: string,
  completedAt: string,
  reasons: readonly string[],
  evidence: readonly RpcEvidenceReceipt[],
  decision?: AuthorizationDecision,
): ExecutionReceipt {
  return executionReceipt({
    ok: false,
    invocation,
    operation,
    ...(decision === undefined ? {} : { decision }),
    phase,
    reasons,
    evidence: evidenceIds(evidence),
    startedAt,
    completedAt,
  });
}

/**
 * Witness, authorize, execute, and witness one invocation.
 *
 * Attempt and decision admission are fail-closed: the handler is unreachable
 * unless both are durable. Outcome admission happens after execution; failure
 * there returns a witnessing obstruction and leaves the admitted intent visible.
 */
export async function dispatch(runtime: RpcRuntime, invocation: RpcInvocation): Promise<ExecutionReceipt> {
  const startedAt = runtime.now();
  const evidence: RpcEvidenceReceipt[] = [];
  try {
    evidence.push(runtime.witness.admit(Object.freeze({
      kind: "metroplat.rpc.attempt" as const,
      invocation,
      at: startedAt,
    })));
  } catch (error) {
    return obstruction(invocation, invocation.operation, "admission", startedAt, runtime.now(), [message(error)], evidence);
  }

  const operation = runtime.catalog.byReference.get(invocation.operation);
  if (operation === undefined || operation.verb !== invocation.verb) {
    const receipt = obstruction(
      invocation,
      invocation.operation,
      "resolution",
      startedAt,
      runtime.now(),
      [operation === undefined ? `unknown operation reference ${invocation.operation}` : "operation verb does not match its content reference"],
      evidence,
    );
    try {
      evidence.push(runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome" as const, invocation: invocation.id, receipt, at: receipt.completedAt })));
    } catch {
      // The attempt is already durable; the returned obstruction remains honest about resolution.
    }
    return receipt;
  }

  let decision: AuthorizationDecision;
  try {
    decision = runtime.authorize(invocation, operation, runtime.now());
  } catch (error) {
    return obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), [message(error)], evidence);
  }
  const invalidDecision = [
    ...(decision.invocation === invocation.id ? [] : ["authorization decision names a different invocation"]),
    ...(decision.operation === operation.ref ? [] : ["authorization decision names a different operation"]),
    ...(decision.subject === invocation.subject ? [] : ["authorization decision names a different subject"]),
    ...(decision.ok === (decision.charge === "held") ? [] : ["authorization ok must coincide with held standing"]),
  ];
  if (invalidDecision.length > 0) {
    return obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), invalidDecision, evidence);
  }
  try {
    evidence.push(runtime.witness.admit(Object.freeze({
      kind: "metroplat.rpc.decision" as const,
      invocation: invocation.id,
      decision,
      at: decision.decidedAt,
    })));
  } catch (error) {
    return obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), [`authorization decision was not witnessed: ${message(error)}`], evidence, decision);
  }

  if (!decision.ok) {
    const receipt = obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), decision.reasons, evidence, decision);
    try {
      runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome" as const, invocation: invocation.id, receipt, at: receipt.completedAt }));
    } catch {
      // Attempt and refusal decision remain durable even if the summary outcome cannot be appended.
    }
    return receipt;
  }

  if (operation.effects.coordination === "coordination-required") {
    if (runtime.coordinate === undefined) {
      const receipt = obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), ["operation requires coordination but no coordinator is installed"], evidence, decision);
      try {
        runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome" as const, invocation: invocation.id, receipt, at: receipt.completedAt }));
      } catch {
        // Attempt and authorization remain durable.
      }
      return receipt;
    }
    let coordination: CoordinationDecision;
    try {
      coordination = runtime.coordinate(invocation, operation, runtime.now());
    } catch (error) {
      return obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), [message(error)], evidence, decision);
    }
    try {
      evidence.push(runtime.witness.admit(Object.freeze({
        kind: "metroplat.rpc.coordination" as const,
        invocation: invocation.id,
        decision: coordination,
        at: coordination.decidedAt,
      })));
    } catch (error) {
      return obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), [`coordination decision was not witnessed: ${message(error)}`], evidence, decision);
    }
    if (!coordination.ok) {
      const receipt = obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), coordination.reasons, evidence, decision);
      try {
        runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome" as const, invocation: invocation.id, receipt, at: receipt.completedAt }));
      } catch {
        // Attempt, authorization, and coordination obstruction remain durable.
      }
      return receipt;
    }
  }

  let value: JsonValue;
  let handlerEvidence: readonly string[] = Object.freeze([]);
  let handlerArtifacts: readonly ArtifactSource[] = Object.freeze([]);
  try {
    const arguments_ = operation.effects.replay === "idempotency-key"
      ? { ...invocation.arguments, "idempotency-key": invocation.id }
      : invocation.arguments;
    const handled = await executeOperationHandler(operation, invocation.input, arguments_, Object.freeze({
      kind: "metroplat.rpc.execution-context" as const,
      invocation,
      operation,
      startedAt,
      evidence: runtime.witness.causalHead(invocation.id),
    }));
    if (isOperationHandlerResult(handled)) {
      value = handled.value;
      handlerEvidence = handled.evidence;
      handlerArtifacts = handled.artifacts;
    } else {
      value = handled as JsonValue;
    }
  } catch (error) {
    const receipt = obstruction(invocation, operation.ref, "execution", startedAt, runtime.now(), [message(error)], evidence, decision);
    try {
      runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome" as const, invocation: invocation.id, receipt, at: receipt.completedAt }));
    } catch {
      // The durable intent and decision still expose the interrupted execution.
    }
    return receipt;
  }

  const receipt = executionReceipt({
    ok: true,
    invocation,
    operation: operation.ref,
    decision,
    phase: "output",
    value,
    evidence: Object.freeze([...new Set([...evidenceIds(evidence), ...handlerEvidence])]),
    startedAt,
    completedAt: runtime.now(),
  });
  try {
    runtime.witness.admit(
      Object.freeze({ kind: "metroplat.rpc.outcome" as const, invocation: invocation.id, receipt, at: receipt.completedAt }),
      handlerArtifacts,
    );
  } catch (error) {
    return obstruction(invocation, operation.ref, "witnessing", startedAt, runtime.now(), [`execution completed but outcome witnessing failed: ${message(error)}`], evidence, decision);
  }
  return receipt;
}
