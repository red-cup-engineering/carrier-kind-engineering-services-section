/**
 * @packageDocumentation
 * Identity admission for the primitive token/claim articulation carrier.
 *
 * @metroplatSubject identity
 */
import { addressArtifact, admitArtifact, isArtifactRef } from "./index.mjs";
import { INITIAL_SITE_CONSTITUTION, validateSiteConstitution } from "./site.mjs";

const articulationKeys = Object.freeze(["claim", "kind", "token", "version"]);

function refusal(path, message) {
  const error = new TypeError(`primitive-articulation at ${path}: ${message}`);
  error.code = "primitive-articulation";
  error.path = path;
  return error;
}

function exactKeys(value) {
  const actual = Object.keys(value).sort();
  return actual.length === articulationKeys.length && actual.every((key, index) => key === articulationKeys[index]);
}

function validateArticulation(record, site) {
  validateSiteConstitution(site);
  if (record === null || Array.isArray(record) || typeof record !== "object") throw refusal("$", "primitive articulation must be an object");
  if (!exactKeys(record)) throw refusal("$", "primitive articulation has missing or additional properties");
  if (record.kind !== "metroplat.primitive-articulation" || record.version !== 1) {
    throw refusal("$", "unsupported primitive articulation kind or version");
  }
  if (!isArtifactRef(record.token)) throw refusal("$.token", "token must be an artifact reference");
  if (!isArtifactRef(record.claim)) throw refusal("$.claim", "claim must be an artifact reference");
  return Object.freeze({ kind: "metroplat.primitive-articulation", version: 1, token: record.token, claim: record.claim });
}

/** Address a runtime primitive articulation. */
export function addressPrimitiveArticulation(value, site = INITIAL_SITE_CONSTITUTION) {
  const addressed = addressArtifact(value);
  return Object.freeze({ ...addressed, articulation: validateArticulation(addressed.canonical.value, site) });
}

/** Admit a primitive articulation from JSON source. */
export function admitPrimitiveArticulation(source, site = INITIAL_SITE_CONSTITUTION) {
  const admitted = admitArtifact(source);
  return Object.freeze({ ...admitted, articulation: validateArticulation(admitted.canonical.value, site) });
}
