import {
  appendSeavt,
  journalDateFor,
  logPathFor,
  readSeavt as readSeavtStrict,
  streamSeavt as streamSeavtStrict,
} from "@red-cup-engineering/witness-journal-log-service";

// appendSeavt stays a direct, unchanged composition: every row it is
// handed already carries SRN-encoded e/a/v, because kernel/seavt.mjs's
// seavt() is the only place FARS builds one. readSeavt/streamSeavt read
// the physical file back — including a directory PyFARS wrote, per
// kernel/seavt.mjs's shared, total codec (S2.2) — so they decode e/a/v
// back to the real coordinates a caller actually witnessed.
export function readSeavt(root, feed, at) {
  return Object.freeze(readSeavtStrict(root, feed, at));
}

export function* streamSeavt(root, feed, at) {
  yield* streamSeavtStrict(root, feed, at);
}

export { appendSeavt, journalDateFor, logPathFor };

