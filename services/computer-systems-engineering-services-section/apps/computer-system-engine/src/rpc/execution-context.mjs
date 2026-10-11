/** Optional process-owned result projector on a genuine execution context.
 * `projectResult(value)` synchronously validates the operation codomain, applies
 * the actual selected output codec and asks the receiving host to admit its
 * complete reply. It returns an immutable semantic-value snapshot. A handler
 * must call it before its successful local effects and return that snapshot.
 * The dispatcher rechecks the exact projected bytes and host metadata before
 * witnessing success. The native actor host retains and sends the same wire.
 * Missing ports refuse operations that require this contract; remote argv,
 * stdin, caller claims or a lookalike context never install a function port.
 * This is neither caller authorization, remote delivery nor an atomic journal
 * transaction. Separate appends can still fail after an earlier local effect.
 */

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
