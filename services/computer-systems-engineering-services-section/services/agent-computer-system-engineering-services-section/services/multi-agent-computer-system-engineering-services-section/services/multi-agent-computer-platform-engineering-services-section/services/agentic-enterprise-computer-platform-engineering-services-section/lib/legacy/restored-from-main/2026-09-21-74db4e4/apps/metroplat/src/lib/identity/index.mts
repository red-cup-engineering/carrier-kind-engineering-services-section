/**
 * Identity owns strict bounded RFC 8785 JSON and MetroPlat's one exact
 * self-describing artifact-reference form.
 */
import { createHash } from "node:crypto";

import {
  addressCanonicalJson,
  addressJsonValue,
  type ArtifactRef,
} from "./artifact-ref.mts";
import {
  admitCanonicalJson,
  canonicalizeJsonValue,
} from "./canonical-json.mts";
import { isIdentityWitness, type IdentityJudgment } from "./judgment.mts";

function requireIdentity<T>(judgment: IdentityJudgment<T>): T {
  if (isIdentityWitness(judgment)) return judgment.value;
  throw new TypeError(`${judgment.code} at ${judgment.path}: ${judgment.message}`);
}

/** Canonical RFC 8785 JSON text for an admitted runtime value. */
export function canonicalBytes(value: unknown): string {
  return requireIdentity(canonicalizeJsonValue(value)).text;
}

/** Generic hexadecimal SHA-256 for protocols that explicitly require it. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Address canonical JSON source with the sole `ArtifactRef` form. */
export function digest(source: string | Uint8Array): ArtifactRef {
  const canonical = requireIdentity(admitCanonicalJson(source));
  return requireIdentity(addressCanonicalJson(canonical)).ref;
}

/** Address an admitted runtime value with the sole `ArtifactRef` form. */
export function contentAddress(value: unknown): ArtifactRef {
  return requireIdentity(addressJsonValue(value)).ref;
}

export {
  admitCanonicalJson,
  canonicalizeJsonValue,
  canonicalUtf8,
  type CanonicalJson,
  type CanonicalJsonValue,
} from "./canonical-json.mts";
export {
  addressCanonicalJson,
  addressJsonValue,
  encodeArtifactRef,
  parseArtifactRef,
  verifyArtifact,
  type AddressedArtifact,
  type ArtifactSource,
  type ArtifactRef,
  type ArtifactRefFields,
} from "./artifact-ref.mts";
export {
  addressSiteConstitution,
  INITIAL_SITE_CONSTITUTION,
  validateSiteConstitution,
  type AddressedSiteConstitution,
  type SiteConstitution,
  type SiteRef,
} from "./site.mts";
export {
  addressTextDocument,
  TEXT_DOCUMENT_BRANCH_WIDTH,
  TEXT_DOCUMENT_LEAF_BYTES,
  type AddressedTextDocument,
} from "./text-document.mts";
export {
  CANONICAL_PROFILE_ID,
  CAUSAL_PROFILE_ID,
  DIGEST_ALGORITHM_ID,
  FOUR_PROFILE_ID,
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  INITIAL_RESOURCE_ENVELOPE,
  MARK_AND_ARTICULATION_PROFILE_ID,
  NO_MEASUREMENT_PROFILE_ID,
  NO_SEMANTIC_APPRAISAL_PROFILE_ID,
  RESOURCE_ENVELOPE_PROFILE_ID,
  resolveCanonicalProfile,
  resolveDigestAlgorithm,
  type CanonicalProfile,
  type IdentityProfileRegistry,
  type ResourceEnvelope,
} from "./profiles.mts";
export {
  identityObstruction,
  identityWitness,
  isIdentityWitness,
  type IdentityJudgment,
  type IdentityObstruction,
  type IdentityObstructionCode,
  type IdentityWitness,
} from "./judgment.mts";
export {
  addressPrimitiveArticulation,
  admitPrimitiveArticulation,
  type AddressedPrimitiveArticulation,
  type PrimitiveArticulation,
} from "./primitive-articulation.mts";
