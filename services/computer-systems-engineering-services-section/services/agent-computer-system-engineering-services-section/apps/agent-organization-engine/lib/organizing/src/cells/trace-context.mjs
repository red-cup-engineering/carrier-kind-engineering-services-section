/**
 * W3C Trace Context binding for agent coordination.
 *
 * Trace Context correlates distributed request processing. It is deliberately
 * not a MetroPlat causal proof, work parent, represented-principal assertion,
 * office binding, or authorization witness.
 *
 * This adapter implements the stable W3C Recommendation version-00 traceparent
 * shape. Higher versions are left to a future negotiated adapter rather than
 * being silently reinterpreted.
 */

const TRACEPARENT_V00 =
  /^00-([0-9a-f]{32})-([0-9a-f]{16})-(00|01)$/u;
const ZERO_TRACE_ID = "00000000000000000000000000000000";
const ZERO_PARENT_ID = "0000000000000000";

function nonempty(value, label) {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return value;
}

/** Parse the stable W3C version-00 traceparent representation. */
export function parseTraceParentV00(value) {
  const match = TRACEPARENT_V00.exec(value);
  if (match === null) {
    throw new TypeError("traceparent: expected W3C v00 lowercase version-trace-parent-flags");
  }
  const [, traceId, parentId, flags] = match;
  if (traceId === ZERO_TRACE_ID) throw new TypeError("traceparent: all-zero trace-id is invalid");
  if (parentId === ZERO_PARENT_ID) throw new TypeError("traceparent: all-zero parent-id is invalid");

  return Object.freeze({
    kind: "w3c.traceparent.v00",
    version: "00",
    traceId,
    parentId,
    flags: flags,
    sampled: flags === "01",
    value,
  });
}

/**
 * Bind W3C correlation context beside MetroPlat causal context.
 *
 * A caller must supply causalParents independently. This function never derives
 * them from traceId/parentId and never treats sampled=true as evidence of effect,
 * receipt, truth, authority, or successful execution.
 */
export function agentTraceContextBinding(input

 ) {
  const trace = parseTraceParentV00(input.traceparent);
  const coordinationId = nonempty(input.coordinationId, "coordination id");
  const cell = nonempty(input.cell, "cell");
  const tracestate = input.tracestate === undefined
    ? undefined
    : nonempty(input.tracestate, "tracestate");

  return Object.freeze({
    kind: "organizing.cell.trace-context-binding",
    trace,
    ...(tracestate === undefined ? {} : { tracestate }),
    coordinationId,
    cell,
    causalParents: Object.freeze([...(input.causalParents ?? [])]),
    semantics: "correlation-only",
    authority: "none",
    causalAuthority: "none",
    evidence: Object.freeze([...(input.evidence ?? [])]),
  });
}

