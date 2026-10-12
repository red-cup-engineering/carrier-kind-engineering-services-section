/**
 * projecting-value — projects a FOUR bilattice value from a cell-trace.
 *
 * Forced by the knowledge-order join (⊕ₖ = componentwise max on (pos, neg)):
 *   pos = true  iff  any assertion or contestation is in the trace
 *   neg = true  iff  any denial or contestation is in the trace
 *   abstentions contribute nothing (⊥=(0,0) is ⊕ₖ identity, Belnap 1977)
 *
 * Result ⊤=(true,true) means assertion and denial both exist at this cell —
 * the Δ-pass has detected a contestation requiring σ-pass resolution.
 *
 * Input schema:  projecting-value.schema.json  (cell-trace with four arrays)
 * Output:        { pos: boolean, neg: boolean }  — a FOUR value
 */

/**
 * @param {{ assertions: unknown[], denials: unknown[], contestations: unknown[], abstentions?: unknown[] }} cellTrace
 * @returns {{ pos: boolean, neg: boolean }}
 */
export function projectingValue(cellTrace) {
  const { assertions, denials, contestations } = cellTrace;
  return {
    pos: assertions.length > 0 || contestations.length > 0,
    neg: denials.length > 0 || contestations.length > 0,
  };
}
