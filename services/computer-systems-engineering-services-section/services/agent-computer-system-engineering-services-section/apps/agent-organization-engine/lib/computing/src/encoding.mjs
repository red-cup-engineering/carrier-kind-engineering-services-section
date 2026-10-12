/**
 * encoding - JSON boundary for the lightweight operating observation face.
 */

import { requireJsonValue } from "@red-cup-engineering/json-services-section";

export function encodeObservation(observation) {
  return requireJsonValue(observation, "computing observation");
}

export function encodeProvenance(provenance) {
  return requireJsonValue(provenance, "computing derivation provenance");
}
