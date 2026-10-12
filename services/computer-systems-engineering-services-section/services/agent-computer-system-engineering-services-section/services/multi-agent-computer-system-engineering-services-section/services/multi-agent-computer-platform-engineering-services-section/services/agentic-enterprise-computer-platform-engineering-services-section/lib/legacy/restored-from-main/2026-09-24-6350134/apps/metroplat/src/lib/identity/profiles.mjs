/** Mounted identity, digest, articulation, and resource profiles. */
import { identityObstruction, identityWitness } from "./judgment.mjs";

export const CANONICAL_PROFILE_ID = "rfc8785-jcs";
export const DIGEST_ALGORITHM_ID = "sha-256";
export const MARK_AND_ARTICULATION_PROFILE_ID = "metroplat-mark-articulation-1";
export const CAUSAL_PROFILE_ID = "metroplat-causal-witness-1";
export const FOUR_PROFILE_ID = "obsmetrologia-four-1";
export const NO_MEASUREMENT_PROFILE_ID = "metroplat-no-measurement-1";
export const NO_SEMANTIC_APPRAISAL_PROFILE_ID = "metroplat-no-semantic-appraisal-1";
export const RESOURCE_ENVELOPE_PROFILE_ID = "metroplat-resource-envelope-1";

export const INITIAL_RESOURCE_ENVELOPE = Object.freeze({
  maxSourceBytes: 1_048_576,
  maxCanonicalBytes: 1_048_576,
  maxDepth: 64,
  maxNodes: 100_000,
  maxObjectMembers: 4_096,
  maxArrayLength: 65_536,
  maxStringBytes: 262_144,
  maxKeyBytes: 1_024,
});

const initialCanonicalProfile = Object.freeze({
  id: CANONICAL_PROFILE_ID,
  resourceEnvelope: INITIAL_RESOURCE_ENVELOPE,
});

export const INITIAL_IDENTITY_PROFILE_REGISTRY = Object.freeze({
  canonicalProfiles: Object.freeze({ [CANONICAL_PROFILE_ID]: initialCanonicalProfile }),
  digestAlgorithms: Object.freeze([DIGEST_ALGORITHM_ID]),
});

export function resolveCanonicalProfile(
  id,
  registry = INITIAL_IDENTITY_PROFILE_REGISTRY,
) {
  const profile = Object.hasOwn(registry.canonicalProfiles, id)
    ? registry.canonicalProfiles[id]
    : undefined;
  return profile === undefined
    ? identityObstruction("canonical-profile", "$.canonicalProfile", `unmounted canonical profile: ${id}`)
    : identityWitness(profile);
}

export function resolveDigestAlgorithm(
  id,
  registry = INITIAL_IDENTITY_PROFILE_REGISTRY,
) {
  return id === DIGEST_ALGORITHM_ID && registry.digestAlgorithms.includes(id)
    ? identityWitness(DIGEST_ALGORITHM_ID)
    : identityObstruction("digest-algorithm", "$.digestAlgorithm", `unmounted digest algorithm: ${id}`);
}
