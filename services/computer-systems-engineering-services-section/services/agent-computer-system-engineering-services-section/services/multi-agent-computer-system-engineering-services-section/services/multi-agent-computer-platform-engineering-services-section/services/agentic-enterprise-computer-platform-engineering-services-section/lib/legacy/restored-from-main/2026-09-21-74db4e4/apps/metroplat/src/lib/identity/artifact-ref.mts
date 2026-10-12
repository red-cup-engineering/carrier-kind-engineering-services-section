/** Exact self-describing artifact references. */
import { createHash } from "node:crypto";

import {
  admitCanonicalJson,
  canonicalizeJsonValue,
  type CanonicalJson,
} from "./canonical-json.mts";
import {
  isIdentityWitness,
  identityObstruction,
  identityWitness,
  type IdentityJudgment,
} from "./judgment.mts";
import {
  CANONICAL_PROFILE_ID,
  DIGEST_ALGORITHM_ID,
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  resolveCanonicalProfile,
  resolveDigestAlgorithm,
  type IdentityProfileRegistry,
} from "./profiles.mts";

declare const artifactRefBrand: unique symbol;
export type ArtifactRef = string & { readonly [artifactRefBrand]: true };

/** Exact canonical source material carried under its verified artifact reference. */
export interface ArtifactSource {
  readonly ref: ArtifactRef;
  readonly canonicalText: string;
}

export interface ArtifactRefFields {
  readonly referenceVersion: "1";
  readonly canonicalProfile: string;
  readonly digestAlgorithm: "sha-256";
  readonly digest: string;
}

export interface AddressedArtifact {
  readonly ref: ArtifactRef;
  readonly fields: ArtifactRefFields;
  readonly canonical: CanonicalJson;
}

const identifierGrammar = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const lowerHex64 = /^[0-9a-f]{64}$/u;

function validIdentifier(value: string): boolean {
  return value.length <= 64 && identifierGrammar.test(value);
}

export function parseArtifactRef(
  reference: unknown,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<ArtifactRefFields> {
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
  const version = fields[2]!;
  const profileId = fields[3]!;
  const algorithmId = fields[4]!;
  const digest = fields[5]!;
  if (version !== "1") return identityObstruction("reference-version", "$.referenceVersion", `unsupported reference version: ${version}`);
  if (!validIdentifier(profileId)) return identityObstruction("reference-syntax", "$.canonicalProfile", "invalid canonical profile identifier grammar");
  if (!validIdentifier(algorithmId)) return identityObstruction("reference-syntax", "$.digestAlgorithm", "invalid digest algorithm identifier grammar");
  if (!lowerHex64.test(digest)) return identityObstruction("reference-syntax", "$.digest", "sha-256 digest must be 64 lowercase hexadecimal digits");

  const profile = resolveCanonicalProfile(profileId, registry);
  if (!isIdentityWitness(profile)) return profile;
  const algorithm = resolveDigestAlgorithm(algorithmId, registry);
  if (!isIdentityWitness(algorithm)) return algorithm;

  const parsed: ArtifactRefFields = Object.freeze({
    referenceVersion: "1" as const,
    canonicalProfile: profile.value.id,
    digestAlgorithm: algorithm.value,
    digest,
  });
  if (encodeArtifactRefUnchecked(parsed) !== reference) {
    return identityObstruction("reference-syntax", "$", "artifact reference is not in canonical external form");
  }
  return identityWitness(parsed);
}

function encodeArtifactRefUnchecked(fields: ArtifactRefFields): ArtifactRef {
  return `metroplat:artifact:${fields.referenceVersion}:${fields.canonicalProfile}:${fields.digestAlgorithm}:${fields.digest}` as ArtifactRef;
}

export function encodeArtifactRef(
  fields: ArtifactRefFields,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<ArtifactRef> {
  const reference = encodeArtifactRefUnchecked(fields);
  const parsed = parseArtifactRef(reference, registry);
  return isIdentityWitness(parsed) ? identityWitness(reference) : parsed;
}

function sha256(canonical: CanonicalJson): string {
  return createHash("sha256").update(canonical.text, "utf8").digest("hex");
}

export function addressCanonicalJson(
  canonical: CanonicalJson,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<AddressedArtifact> {
  const fields: ArtifactRefFields = Object.freeze({
    referenceVersion: "1" as const,
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
  value: unknown,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<AddressedArtifact> {
  const profile = resolveCanonicalProfile(CANONICAL_PROFILE_ID, registry);
  if (!isIdentityWitness(profile)) return profile;
  const canonical = canonicalizeJsonValue(value, profile.value.resourceEnvelope);
  return isIdentityWitness(canonical) ? addressCanonicalJson(canonical.value, registry) : canonical;
}

export function verifyArtifact(
  reference: unknown,
  source: string | Uint8Array,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<AddressedArtifact> {
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
  return identityWitness(Object.freeze({ ref: reference as ArtifactRef, fields: parsed.value, canonical: canonical.value }));
}
