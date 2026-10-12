/** Exact self-describing artifact references. */
import { createHash } from "node:crypto";

import {
  admitCanonicalJson,
  canonicalizeJsonValue,

} from "./canonical-json.mjs";
import {
  isIdentityWitness,
  identityObstruction,
  identityWitness,

} from "./judgment.mjs";
import {
  CANONICAL_PROFILE_ID,
  DIGEST_ALGORITHM_ID,
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  resolveCanonicalProfile,
  resolveDigestAlgorithm,

} from "./profiles.mjs";

/** Exact canonical source material carried under its verified artifact reference. */

const identifierGrammar = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const lowerHex64 = /^[0-9a-f]{64}$/u;

function validIdentifier(value) {
  return value.length <= 64 && identifierGrammar.test(value);
}

export function parseArtifactRef(
  reference,
  registry = INITIAL_IDENTITY_PROFILE_REGISTRY,
) {
  if (typeof reference !== "string") {
    return identityObstruction("reference-syntax", "$", "artifact reference must be a string");
  }
  if (reference.trim() !== reference || reference.includes("%")) {
    return identityObstruction("reference-syntax", "$", "artifact reference admits neither whitespace nor percent encoding");
  }
  const fields = reference.split(":");
  if (fields.length !== 6 || fields[0] !== "metroplat" || fields[1] !== "artifact") {
    return identityObstruction("reference-syntax", "$", "artifact reference must use metroplat:artifact:1:<profile>:<algorithm>:<digest>");
  }
  const version = fields[2];
  const profileId = fields[3];
  const algorithmId = fields[4];
  const digest = fields[5];
  if (version !== "1") return identityObstruction("reference-version", "$.referenceVersion", `unsupported reference version: ${version}`);
  if (!validIdentifier(profileId)) return identityObstruction("reference-syntax", "$.canonicalProfile", "invalid canonical profile identifier grammar");
  if (!validIdentifier(algorithmId)) return identityObstruction("reference-syntax", "$.digestAlgorithm", "invalid digest algorithm identifier grammar");
  if (!lowerHex64.test(digest)) return identityObstruction("reference-syntax", "$.digest", "sha-256 digest must be 64 lowercase hexadecimal digits");

  const profile = resolveCanonicalProfile(profileId, registry);
  if (!isIdentityWitness(profile)) return profile;
  const algorithm = resolveDigestAlgorithm(algorithmId, registry);
  if (!isIdentityWitness(algorithm)) return algorithm;

  const parsed = Object.freeze({
    referenceVersion: "1",
    canonicalProfile: profile.value.id,
    digestAlgorithm: algorithm.value,
    digest,
  });
  if (encodeArtifactRefUnchecked(parsed) !== reference) {
    return identityObstruction("reference-syntax", "$", "artifact reference is not in canonical external form");
  }
  return identityWitness(parsed);
}

function encodeArtifactRefUnchecked(fields) {
  return `metroplat:artifact:${fields.referenceVersion}:${fields.canonicalProfile}:${fields.digestAlgorithm}:${fields.digest}`;
}

export function encodeArtifactRef(
  fields,
  registry = INITIAL_IDENTITY_PROFILE_REGISTRY,
) {
  const reference = encodeArtifactRefUnchecked(fields);
  const parsed = parseArtifactRef(reference, registry);
  return isIdentityWitness(parsed) ? identityWitness(reference) : parsed;
}

function sha256(canonical) {
  return createHash("sha256").update(canonical.text, "utf8").digest("hex");
}

export function addressCanonicalJson(
  canonical,
  registry = INITIAL_IDENTITY_PROFILE_REGISTRY,
) {
  const fields = Object.freeze({
    referenceVersion: "1",
    canonicalProfile: CANONICAL_PROFILE_ID,
    digestAlgorithm: DIGEST_ALGORITHM_ID,
    digest: sha256(canonical),
  });
  const encoded = encodeArtifactRef(fields, registry);
  return isIdentityWitness(encoded)
    ? identityWitness(Object.freeze({ ref: encoded.value, fields, canonical }))
    : encoded;
}

export function addressJsonValue(
  value,
  registry = INITIAL_IDENTITY_PROFILE_REGISTRY,
) {
  const profile = resolveCanonicalProfile(CANONICAL_PROFILE_ID, registry);
  if (!isIdentityWitness(profile)) return profile;
  const canonical = canonicalizeJsonValue(value, profile.value.resourceEnvelope);
  return isIdentityWitness(canonical) ? addressCanonicalJson(canonical.value, registry) : canonical;
}

export function verifyArtifact(
  reference,
  source,
  registry = INITIAL_IDENTITY_PROFILE_REGISTRY,
) {
  const parsed = parseArtifactRef(reference, registry);
  if (!isIdentityWitness(parsed)) return parsed;
  const profile = resolveCanonicalProfile(parsed.value.canonicalProfile, registry);
  if (!isIdentityWitness(profile)) return profile;
  const canonical = admitCanonicalJson(source, profile.value.resourceEnvelope);
  if (!isIdentityWitness(canonical)) return canonical;
  const actual = sha256(canonical.value);
  if (actual !== parsed.value.digest) {
    return identityObstruction("digest-mismatch", "$.digest", `artifact digest mismatch: expected ${parsed.value.digest}, computed ${actual}`);
  }
  return identityWitness(Object.freeze({ ref: reference, fields: parsed.value, canonical: canonical.value }));
}
