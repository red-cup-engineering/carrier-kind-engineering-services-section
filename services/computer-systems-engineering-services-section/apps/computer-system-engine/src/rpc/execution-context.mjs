/** Immutable context supplied to a process-local handler by the governed dispatcher. */

import { requireJsonValue } from "@red-cup-engineering/json-services-section";

/** Process-local handler return carrying durable effect causes to the dispatcher. */

export function operationHandlerResult(
  value,
  evidence,
  artifacts = [],
) {
  return Object.freeze({
    kind: "metroplat.rpc.handler-result",
    value: requireJsonValue(value, "operation handler result value"),
    evidence: Object.freeze([...new Set(evidence)].sort()),
    artifacts: Object.freeze([...artifacts]),
  });
}

export function isOperationHandlerResult(value) {
  return typeof value === "object"
    && value !== null
    && (value).kind === "metroplat.rpc.handler-result"
    && Array.isArray((value).evidence)
    && Array.isArray((value).artifacts);
}
