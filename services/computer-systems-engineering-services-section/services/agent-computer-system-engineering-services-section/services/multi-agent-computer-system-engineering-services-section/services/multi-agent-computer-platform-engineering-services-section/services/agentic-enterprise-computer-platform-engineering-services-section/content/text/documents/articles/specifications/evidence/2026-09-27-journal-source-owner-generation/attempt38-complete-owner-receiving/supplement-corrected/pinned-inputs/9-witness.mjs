import { addressArtifact, addressSiteConstitution, admitArtifact, artifactId, INITIAL_SITE_CONSTITUTION, isArtifactRef } from "../identity/index.mjs";
import {
  isCausalWitness,
  causalObstruction,
  causalWitness,

} from "./judgment.mjs";

export const INITIAL_CAUSAL_RESOURCE_ENVELOPE = Object.freeze({
  maxCauses: 256,
  maxReferencedArtifacts: 1_024,
  maxObservedWitnesses: 4_096,
});

const witnessKeys = Object.freeze([
  "articulation",
  "attestationRefs",
  "boundaryObservationRefs",
  "causes",
  "kind",
  "referencedArtifacts",
  "site",
  "version",
]);

function isRecord(value) {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

function exactKeys(value) {
  const actual = Object.keys(value).sort();
  return actual.length === witnessKeys.length && actual.every((key, index) => key === witnessKeys[index]);
}

/** Run one identity step, carrying its refusal as a causal obstruction. */
function tryArtifact(step, code, path) {
  try {
    return causalWitness(step());
  } catch (error) {
    return causalObstruction(code, error.path ?? path, error.message);
  }
}

function parseReferenceSet(value, path, limit) {
  if (!Array.isArray(value)) return causalObstruction("witness-shape", path, "reference set must be an array");
  if (value.length > limit) return causalObstruction("dependency-limit", path, `reference set exceeds ${limit} entries`);
  const references = [];
  for (let index = 0; index < value.length; index += 1) {
    const reference = value[index];
    if (!isArtifactRef(reference)) {
      return causalObstruction("witness-shape", `${path}[${index}]`, "reference must be an artifact reference");
    }
    references.push(reference);
  }
  for (let index = 1; index < references.length; index += 1) {
    if (references[index - 1] === references[index]) {
      return causalObstruction("duplicate-reference", `${path}[${index}]`, "reference set contains a duplicate", [references[index]]);
    }
    if (references[index - 1] > references[index]) {
      return causalObstruction("reference-set-order", path, "reference set must be canonically sorted");
    }
  }
  return causalWitness(Object.freeze(references));
}

function validateCanonicalWitnessCore(canonical, site, causalEnvelope) {
  const siteAddress = tryArtifact(() => addressSiteConstitution(site), "site-mismatch", "$.site");
  if (!isCausalWitness(siteAddress)) return causalObstruction("site-mismatch", "$.site", siteAddress.message);
  const carried = canonical.value;
  if (!isRecord(carried) || !exactKeys(carried)) {
    return causalObstruction("witness-shape", "$", "WitnessCore must have exactly the target properties");
  }
  if (carried.kind !== "metroplat.witness-core" || carried.version !== 1) {
    return causalObstruction("witness-shape", "$", "unsupported WitnessCore kind or version");
  }
  if (carried.site !== siteAddress.value.ref) {
    return causalObstruction("site-mismatch", "$.site", "WitnessCore does not name the mounted site");
  }
  if (!isArtifactRef(carried.articulation)) return causalObstruction("witness-shape", "$.articulation", "articulation must be an artifact reference");
  const causes = parseReferenceSet(carried.causes, "$.causes", causalEnvelope.maxCauses);
  if (!isCausalWitness(causes)) return causes;
  const referenced = parseReferenceSet(
    carried.referencedArtifacts,
    "$.referencedArtifacts",
    causalEnvelope.maxReferencedArtifacts,
  );
  if (!isCausalWitness(referenced)) return referenced;
  const attestations = parseReferenceSet(
    carried.attestationRefs,
    "$.attestationRefs",
    0,
  );
  if (!isCausalWitness(attestations)) {
    return carried.attestationRefs instanceof Array && carried.attestationRefs.length > 0
      ? causalObstruction("unsupported-attestation", "$.attestationRefs", "mounted site admits no identity-attestation profile")
      : attestations;
  }
  const observations = parseReferenceSet(
    carried.boundaryObservationRefs,
    "$.boundaryObservationRefs",
    0,
  );
  if (!isCausalWitness(observations)) {
    return carried.boundaryObservationRefs instanceof Array && carried.boundaryObservationRefs.length > 0
      ? causalObstruction("unsupported-attestation", "$.boundaryObservationRefs", "mounted site admits no boundary-observation profile")
      : observations;
  }
  return causalWitness(Object.freeze({
    kind: "metroplat.witness-core",
    version: 1,
    site: carried.site,
    articulation: carried.articulation,
    causes: causes.value,
    referencedArtifacts: referenced.value,
    attestationRefs: attestations.value,
    boundaryObservationRefs: observations.value,
  }));
}

function addressValidatedWitness(canonical, core) {
  return causalWitness(Object.freeze({ ref: artifactId(canonical.value), canonical, core }));
}

export function addressWitnessCore(
  value,
  site = INITIAL_SITE_CONSTITUTION,
  causalEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
) {
  const addressed = tryArtifact(() => addressArtifact(value), "artifact-invalid", "$");
  if (!isCausalWitness(addressed)) return addressed;
  const core = validateCanonicalWitnessCore(addressed.value.canonical, site, causalEnvelope);
  return isCausalWitness(core) ? causalWitness(Object.freeze({ ...addressed.value, core: core.value })) : core;
}

export function admitWitnessCore(
  source,
  site = INITIAL_SITE_CONSTITUTION,
  causalEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
) {
  const admitted = tryArtifact(() => admitArtifact(source), "artifact-invalid", "$");
  if (!isCausalWitness(admitted)) return admitted;
  const core = validateCanonicalWitnessCore(admitted.value.canonical, site, causalEnvelope);
  return isCausalWitness(core) ? causalWitness(Object.freeze({ ...admitted.value, core: core.value })) : core;
}

export function validateAddressedWitnessCore(
  canonical,
  site = INITIAL_SITE_CONSTITUTION,
  causalEnvelope = INITIAL_CAUSAL_RESOURCE_ENVELOPE,
) {
  const core = validateCanonicalWitnessCore(canonical, site, causalEnvelope);
  return isCausalWitness(core) ? addressValidatedWitness(canonical, core.value) : core;
}
