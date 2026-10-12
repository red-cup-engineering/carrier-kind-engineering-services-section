/** Agent-owned bridge from provider-neutral tool moves to governed RPC requests. */
import { invocation, type RpcInvocation } from "../../rpc/index.mts";
import type { OperationCatalog } from "../../rpc/operation.mts";
import { isJsonRecord, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { CapabilityInvocation } from "../../lib/capability/index.mts";
import type { InferenceToolMove } from "./model.mts";

export interface InferenceToolInvocationContext {
  readonly catalog: OperationCatalog;
  readonly subject: string;
  readonly resource: string;
  readonly observedAt: string;
  readonly caller?: JsonRecord;
  readonly causes?: readonly string[];
}

function rpcInput(move: InferenceToolMove): JsonValue {
  return isJsonRecord(move.input) && Object.hasOwn(move.input, "input") ? move.input["input"] ?? null : move.input;
}

/** Resolution and canonical invocation construction live here, never in a vendor codec. */
export function rpcInvocationFromInferenceToolMove(
  move: InferenceToolMove,
  context: InferenceToolInvocationContext,
): RpcInvocation {
  const operation = context.catalog.byVerb.get(move.name);
  return invocation({
    request: move.request,
    subject: context.subject,
    operation: operation?.ref ?? `unresolved:${move.name}`,
    verb: move.name,
    resource: context.resource,
    input: rpcInput(move),
    caller: context.caller ?? Object.freeze({ transport: "inference" }),
    observedAt: context.observedAt,
    causes: context.causes ?? [],
  });
}

export function capabilityInvocationFromInferenceToolMove(
  move: InferenceToolMove,
  context: Pick<InferenceToolInvocationContext, "subject" | "resource">,
): CapabilityInvocation {
  return Object.freeze({
    kind: "capability.invocation" as const,
    actor: context.subject,
    resource: context.resource,
    action: move.name,
    input: rpcInput(move),
  });
}
