/** Immutable context supplied to a process-local handler by the governed dispatcher. */
import type { Operation } from "./operation.mts";
import type { RpcInvocation } from "./invocation.mts";
import { requireJsonValue, type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { ArtifactSource } from "../lib/identity/index.mts";

export interface OperationExecutionContext {
  readonly kind: "metroplat.rpc.execution-context";
  readonly invocation: RpcInvocation;
  readonly operation: Operation;
  readonly startedAt: string;
  /** Durable RPC evidence frontier after authorization and coordination. */
  readonly evidence: readonly string[];
}

/** Process-local handler return carrying durable effect causes to the dispatcher. */
export interface OperationHandlerResult {
  readonly kind: "metroplat.rpc.handler-result";
  readonly value: JsonValue;
  readonly evidence: readonly string[];
  /** Exact source material the governed outcome witness must make durable. */
  readonly artifacts: readonly ArtifactSource[];
}

export function operationHandlerResult(
  value: unknown,
  evidence: readonly string[],
  artifacts: readonly ArtifactSource[] = [],
): OperationHandlerResult {
  return Object.freeze({
    kind: "metroplat.rpc.handler-result" as const,
    value: requireJsonValue(value, "operation handler result value"),
    evidence: Object.freeze([...new Set(evidence)].sort()),
    artifacts: Object.freeze([...artifacts]),
  });
}

export function isOperationHandlerResult(value: unknown): value is OperationHandlerResult {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: unknown }).kind === "metroplat.rpc.handler-result"
    && Array.isArray((value as { readonly evidence?: unknown }).evidence)
    && Array.isArray((value as { readonly artifacts?: unknown }).artifacts);
}
