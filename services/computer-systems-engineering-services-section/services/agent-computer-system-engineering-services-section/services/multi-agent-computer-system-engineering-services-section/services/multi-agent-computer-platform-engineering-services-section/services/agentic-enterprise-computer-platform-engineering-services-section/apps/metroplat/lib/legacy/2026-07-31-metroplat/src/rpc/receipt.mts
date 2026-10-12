/** Typed authorization decisions and execution receipts. */
import { contentAddress } from "../lib/identity/index.mts";
import { requireJsonValue, type JsonValue } from "../lib/codecs/json/core.mts";
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

export type ExecutionPhase = "admission" | "resolution" | "authorization" | "input" | "coordination" | "execution" | "output" | "witnessing";

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

/** Seal a content-addressed, serializable execution result. */
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
  return Object.freeze({ ...generator, id: contentAddress(generator as unknown as JsonValue) });
}
