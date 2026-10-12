/**
 * sites/hole/record — record one computed causal-boundary
 * observation's rows under a data root, each as a `hole-observation`
 * record `{ e, a, v, t }` of the store.
 */
import {
  holeKeratinousBoundary,
  observeHole,

} from "./route.mjs";

import { has, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

/** The store type of an observed hole's statement rows. */
export const HOLE_OBSERVATION_TYPE = "hole-observation";

/** Record computed hole observation rows under a data root and return what was recorded. */
export function appendHoleObservationAtRoot(
  root,
  input,
  options = {},
) {
  const observation = observeHole(input, options);
  // Each row is one record; a row recorded already is recorded once.
  const addresses = [];
  let appended = 0;
  for (const [e, a, v, t] of observation.rows) {
    const record = { e, a, v, t };
    if (!has(root, HOLE_OBSERVATION_TYPE, semanticId(record))) appended += 1;
    addresses.push(put(root, HOLE_OBSERVATION_TYPE, record));
  }
  const append = Object.freeze({ rows: observation.rows.length, appended, artifact: Object.freeze({ type: HOLE_OBSERVATION_TYPE, addresses: Object.freeze(addresses) }) });
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
