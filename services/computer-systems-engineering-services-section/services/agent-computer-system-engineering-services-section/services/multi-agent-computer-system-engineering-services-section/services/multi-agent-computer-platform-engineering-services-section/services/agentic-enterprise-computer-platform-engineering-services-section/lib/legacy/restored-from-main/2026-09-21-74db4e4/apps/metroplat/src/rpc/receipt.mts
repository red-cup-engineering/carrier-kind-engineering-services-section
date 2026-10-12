/** Typed authorization decisions and execution receipts. */
import { addressJsonValue, isIdentityWitness, sha256Hex } from "../lib/identity/index.mts";
import { requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { RpcInvocation } from "./invocation.mts";

export interface AuthorizationDecision {
  readonly kind: "metroplat.rpc.authorization:witness" | "metroplat.rpc.authorization:obstruction";
  readonly ok: boolean;
  readonly invocation: string;
  readonly operation: string;
  readonly subject: string;
  readonly charge: "held" | "denied" | "contested" | "unknown";
  readonly evidence: readonly string[];
  readonly reasons: readonly string[];
  readonly decidedAt: string;
}

export interface CoordinationDecision {
  readonly kind: "metroplat.rpc.coordination:witness" | "metroplat.rpc.coordination:obstruction";
  readonly ok: boolean;
  readonly invocation: string;
  readonly operation: string;
  readonly evidence: readonly string[];
  readonly reasons: readonly string[];
  readonly decidedAt: string;
}

export type ExecutionPhase = "admission" | "resolution" | "authorization" | "input" | "coordination" | "execution" | "output" | "witnessing" | "receipt";

export interface ExecutionReceipt {
  readonly kind: "metroplat.rpc.execution:witness" | "metroplat.rpc.execution:obstruction";
  readonly id: string;
  readonly ok: boolean;
  readonly invocation: RpcInvocation;
  readonly operation: string;
  readonly decision?: AuthorizationDecision;
  readonly phase: ExecutionPhase;
  readonly value?: JsonValue;
  readonly reasons: readonly string[];
  readonly evidence: readonly string[];
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface ExecutionReceiptDraft extends Omit<ExecutionReceipt, "id" | "kind" | "value" | "reasons" | "evidence"> {
  readonly value?: JsonValue;
  readonly reasons?: readonly string[];
  readonly evidence?: readonly string[];
}

/**
 * Seal a content-addressed, serializable execution result.
 *
 * When the sealed receipt cannot itself be content-addressed — the identity
 * judgment refuses, most commonly `canonical-limit` on an oversized handler
 * `value` — the receipt is never thrown past this boundary. It is instead
 * resealed without the unaddressable `value`, as a `phase: "receipt"`
 * refusal naming the judgment's code and path, so the caller learns the
 * result was too large to witness instead of the process dying.
 */
export function executionReceipt(draft: ExecutionReceiptDraft): ExecutionReceipt {
  const generator = Object.freeze({
    kind: draft.ok ? "metroplat.rpc.execution:witness" as const : "metroplat.rpc.execution:obstruction" as const,
    ok: draft.ok,
    invocation: draft.invocation,
    operation: draft.operation,
    ...(draft.decision === undefined ? {} : { decision: draft.decision }),
    phase: draft.phase,
    ...(draft.value === undefined ? {} : { value: requireJsonValue(draft.value, "execution receipt value") }),
    reasons: Object.freeze([...(draft.reasons ?? [])]),
    evidence: Object.freeze([...(draft.evidence ?? [])]),
    startedAt: draft.startedAt,
    completedAt: draft.completedAt,
  });
  const addressed = addressJsonValue(generator as unknown as JsonValue);
  if (isIdentityWitness(addressed)) {
    return Object.freeze({ ...generator, id: addressed.value.ref });
  }
  return receiptAddressRefusal(draft, addressed.code, addressed.path, addressed.message);
}

/**
 * Reseal a receipt whose full form could not be content-addressed: drop the
 * unaddressable `value` and report the identity judgment's code and path as
 * the refusal's sole reason. Falls back to a plain SHA-256 of the receipt's
 * stable small fields for `id` on the residual case where even the reduced
 * form cannot be addressed (an oversized `reasons` or `evidence`).
 */
function receiptAddressRefusal(
  draft: ExecutionReceiptDraft,
  code: string,
  path: string,
  message: string,
): ExecutionReceipt {
  const reduced = Object.freeze({
    kind: "metroplat.rpc.execution:obstruction" as const,
    ok: false as const,
    invocation: draft.invocation,
    operation: draft.operation,
    ...(draft.decision === undefined ? {} : { decision: draft.decision }),
    phase: "receipt" as const,
    reasons: Object.freeze([`${code} at ${path}: ${message}`]),
    evidence: Object.freeze([...(draft.evidence ?? [])]),
    startedAt: draft.startedAt,
    completedAt: draft.completedAt,
  });
  const reducedAddressed = addressJsonValue(reduced as unknown as JsonValue);
  const id = isIdentityWitness(reducedAddressed)
    ? reducedAddressed.value.ref
    : sha256Hex(JSON.stringify({
        invocation: draft.invocation.id,
        operation: draft.operation,
        startedAt: draft.startedAt,
        completedAt: draft.completedAt,
      }));
  return Object.freeze({ ...reduced, id });
}
