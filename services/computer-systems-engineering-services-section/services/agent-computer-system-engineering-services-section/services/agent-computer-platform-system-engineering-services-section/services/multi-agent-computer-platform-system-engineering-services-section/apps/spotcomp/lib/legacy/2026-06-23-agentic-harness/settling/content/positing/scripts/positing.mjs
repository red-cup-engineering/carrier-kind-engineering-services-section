/**
 * positing — the primitive morphism of the predication category.
 *
 * Forced by Belnap 1977: classifies a (pos,neg) datum by the four-partition
 * into {assertion, denial, contestation, abstention}, then packages the cell
 * coordinates and transaction-id into a positing-entry (math object) whose
 * POSIX realization is an EAVT row {e, a, v, t}.
 *
 * The belnap-class is NOT a field of the eavt-row; it is encoded by which
 * JSONL file the row lives in (Yoneda: path = identity = class).
 *
 * Input schema:  positing.schema.json  (cell + datum + t)
 * Output:        { class: string, entry: { e, a, v, t } }
 *
 * Note: predication-cell uses {subject, predicate, object} (math object),
 * not {s, p, o} (cell-coordinate-triple / substrate). The eavt-row maps:
 *   cell.subject   → e
 *   cell.predicate → a
 *   cell.object    → v
 *   t              → t
 */

/**
 * @param {{ pos: boolean, neg: boolean }} datum
 * @returns {'assertion'|'denial'|'contestation'|'abstention'}
 */
function classifyDatum(datum) {
  if (datum.pos && !datum.neg) return 'assertion';
  if (!datum.pos && datum.neg) return 'denial';
  if (datum.pos && datum.neg) return 'contestation';
  return 'abstention';
}

/**
 * @param {{ cell: { subject: string, predicate: string, object: string }, datum: { pos: boolean, neg: boolean }, t: string }} input
 * @returns {{ class: string, entry: { e: string, a: string, v: string, t: string } }}
 */
export function positing(input) {
  const { cell, datum, t } = input;
  const belnapClass = classifyDatum(datum);
  const entry = {
    e: cell.subject,
    a: cell.predicate,
    v: cell.object,
    t,
  };
  return { class: belnapClass, entry };
}
