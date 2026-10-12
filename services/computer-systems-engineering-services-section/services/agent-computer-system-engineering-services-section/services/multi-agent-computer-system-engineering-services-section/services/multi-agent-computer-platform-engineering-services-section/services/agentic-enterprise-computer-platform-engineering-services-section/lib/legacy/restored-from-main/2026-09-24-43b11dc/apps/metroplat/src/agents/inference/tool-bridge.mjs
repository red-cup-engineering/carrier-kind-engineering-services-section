/** Agent-owned bridge from provider-neutral tool moves to governed RPC requests. */
import { invocation } from "../../rpc/invocation.mjs";

import { isJsonRecord } from "@red-cup-engineering/json-services-section";

function rpcInput(move) {
  return isJsonRecord(move.input) && Object.hasOwn(move.input, "input") ? move.input["input"] ?? null : move.input;
}

/** Resolution and canonical invocation construction live here, never in a vendor codec. */
export function rpcInvocationFromInferenceToolMove(
  move,
  context,
) {
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
  move,
  context,
) {
  return Object.freeze({
    kind: "capability.invocation",
    actor: context.subject,
    resource: context.resource,
    action: move.name,
    input: rpcInput(move),
  });
}
