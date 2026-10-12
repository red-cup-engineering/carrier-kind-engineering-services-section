/**
 * Claim-session threads as the tests write and read them: a subject is a thread of `claim-session`
 * records `{ e, a, v, t, thread }` (feltos work/claim-session-store), each following no other row.
 */
import { extend, readHead, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";

export const CLAIM_SESSION = "claim-session";

/** Admit EAVT rows `[e, a, v, t]` to a subject's thread; returns the addresses. */
export function admitRows(root, subject, rows, { causes = [] } = {}) {
  return rows.map(([e, a, v, t]) => extend(root, CLAIM_SESSION, subject, { e, a, v, t, thread: subject }, { causes }));
}

/** Every row of a subject's thread, as `[e, a, v, t]`, in no order the thread does not give. */
export function threadRows(root, subject) {
  const rows = [];
  for (const step of walk(root, CLAIM_SESSION, readHead(root, CLAIM_SESSION, subject)?.frontier ?? [], { limit: 100_000 })) {
    if (step.record !== undefined) rows.push([step.record.e, step.record.a, step.record.v, step.record.t]);
  }
  return rows;
}

/** A subject's thread as records `{ address, row }`, causes first. */
export function threadRecords(root, subject) {
  const found = [];
  for (const step of walk(root, CLAIM_SESSION, readHead(root, CLAIM_SESSION, subject)?.frontier ?? [], { limit: 100_000 })) {
    if (step.record !== undefined) found.push({ address: step.address, row: [step.record.e, step.record.a, step.record.v, step.record.t] });
  }
  return found.reverse();
}
