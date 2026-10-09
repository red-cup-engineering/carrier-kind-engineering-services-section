/**
 * sites/hole/record — append one computed causal-boundary
 * observation's rows under a data root. Split out of the generic
 * `filesystem-store/index.mts` for the same reason credential/x402/
 * accountability/raft/jupyter were: the generic source-append engine
 * (`openJournal`) should never have to import a specific
 * Hole domain directly — this file depends INTO that
 * generic engine, not the other way around.
 */
import {
  holeKeratinousBoundary,
  observeHole,

} from "./route.mjs";

import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";

/** Append computed hole observation rows under a data root and return the log artifact descriptor. */
export function appendHoleObservationAtRoot(
  root,
  input,
  options = {},
) {
  const observation = observeHole(input, options);
  const append = openJournal(root).appendRows("ingest", observation.rows, {
    ...options,
    at: observation.input.observedAt,
    // One daily ingest feed: the token names the material; each row's own
    // subject carries its source.
  });
  const boundary = holeKeratinousBoundary(observation, append);
  return Object.freeze({
    kind: observation.kind,
    settlement: observation.settlement,
    input: observation.input,
    report: observation.report,
    contract: observation.contract,
    exposure: observation.exposure,
    exposureReport: observation.exposureReport,
    append,
    boundary,
  });
}
