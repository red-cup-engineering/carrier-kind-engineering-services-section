/** The initial bare site identity and mounted profiles. */
import { addressJsonValue, type AddressedArtifact, type ArtifactRef } from "./artifact-ref.mts";
import { canonicalizeJsonValue, type CanonicalJsonValue } from "./canonical-json.mts";
import { isIdentityWitness, identityObstruction, identityWitness, type IdentityJudgment } from "./judgment.mts";
import {
  CAUSAL_PROFILE_ID,
  FOUR_PROFILE_ID,
  INITIAL_IDENTITY_PROFILE_REGISTRY,
  MARK_AND_ARTICULATION_PROFILE_ID,
  NO_MEASUREMENT_PROFILE_ID,
  NO_SEMANTIC_APPRAISAL_PROFILE_ID,
  RESOURCE_ENVELOPE_PROFILE_ID,
  type IdentityProfileRegistry,
} from "./profiles.mts";

export interface SiteConstitution {
  readonly kind: "metroplat.site-constitution";
  readonly version: 1;
  readonly markAndArticulationProfile: typeof MARK_AND_ARTICULATION_PROFILE_ID;
  readonly causalProfile: typeof CAUSAL_PROFILE_ID;
  readonly FOURProfile: typeof FOUR_PROFILE_ID;
  readonly languageAndTypingProfiles: readonly [];
  readonly measurementKernelProfile: typeof NO_MEASUREMENT_PROFILE_ID;
  readonly appraisalKernelProfile: typeof NO_SEMANTIC_APPRAISAL_PROFILE_ID;
  readonly coordinationAndReconciliationProfiles: readonly [];
  readonly identityAttestationProfiles: readonly [];
  readonly resourceEnvelopeProfile: typeof RESOURCE_ENVELOPE_PROFILE_ID;
  readonly formalCorrespondenceRefs: readonly [];
}

export type SiteRef = ArtifactRef;

export interface AddressedSiteConstitution extends AddressedArtifact {
  readonly constitution: SiteConstitution;
  readonly ref: SiteRef;
}

const emptyProfileList = (): readonly [] => Object.freeze([]) as readonly [];

export const INITIAL_SITE_CONSTITUTION: SiteConstitution = Object.freeze({
  kind: "metroplat.site-constitution" as const,
  version: 1 as const,
  markAndArticulationProfile: MARK_AND_ARTICULATION_PROFILE_ID,
  causalProfile: CAUSAL_PROFILE_ID,
  FOURProfile: FOUR_PROFILE_ID,
  languageAndTypingProfiles: emptyProfileList(),
  measurementKernelProfile: NO_MEASUREMENT_PROFILE_ID,
  appraisalKernelProfile: NO_SEMANTIC_APPRAISAL_PROFILE_ID,
  coordinationAndReconciliationProfiles: emptyProfileList(),
  identityAttestationProfiles: emptyProfileList(),
  resourceEnvelopeProfile: RESOURCE_ENVELOPE_PROFILE_ID,
  formalCorrespondenceRefs: emptyProfileList(),
});

const siteKeys = Object.freeze([
  "FOURProfile",
  "appraisalKernelProfile",
  "causalProfile",
  "coordinationAndReconciliationProfiles",
  "formalCorrespondenceRefs",
  "identityAttestationProfiles",
  "kind",
  "languageAndTypingProfiles",
  "markAndArticulationProfile",
  "measurementKernelProfile",
  "resourceEnvelopeProfile",
  "version",
]);

function exactKeys(value: Record<string, CanonicalJsonValue>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function validateSiteConstitution(value: unknown): IdentityJudgment<SiteConstitution> {
  const canonical = canonicalizeJsonValue(value);
  if (!isIdentityWitness(canonical)) return canonical;
  const carried = canonical.value.value;
  if (carried === null || Array.isArray(carried) || typeof carried !== "object") {
    return identityObstruction("site-constitution", "$", "site constitution must be an object");
  }
  const record = carried as Record<string, CanonicalJsonValue>;
  if (!exactKeys(record, siteKeys)) return identityObstruction("site-constitution", "$", "site constitution has missing or additional properties");
  const empty = (field: string): boolean => Array.isArray(record[field]) && record[field]!.length === 0;
  if (
    record.kind !== INITIAL_SITE_CONSTITUTION.kind ||
    record.version !== INITIAL_SITE_CONSTITUTION.version ||
    record.markAndArticulationProfile !== MARK_AND_ARTICULATION_PROFILE_ID ||
    record.causalProfile !== CAUSAL_PROFILE_ID ||
    record.FOURProfile !== FOUR_PROFILE_ID ||
    record.measurementKernelProfile !== NO_MEASUREMENT_PROFILE_ID ||
    record.appraisalKernelProfile !== NO_SEMANTIC_APPRAISAL_PROFILE_ID ||
    record.resourceEnvelopeProfile !== RESOURCE_ENVELOPE_PROFILE_ID ||
    !empty("languageAndTypingProfiles") ||
    !empty("coordinationAndReconciliationProfiles") ||
    !empty("identityAttestationProfiles") ||
    !empty("formalCorrespondenceRefs")
  ) {
    return identityObstruction("site-constitution", "$", "constitution is not the mounted articulation-only site profile");
  }
  return identityWitness(INITIAL_SITE_CONSTITUTION);
}

export function addressSiteConstitution(
  value: unknown = INITIAL_SITE_CONSTITUTION,
  registry: IdentityProfileRegistry = INITIAL_IDENTITY_PROFILE_REGISTRY,
): IdentityJudgment<AddressedSiteConstitution> {
  const valid = validateSiteConstitution(value);
  if (!isIdentityWitness(valid)) return valid;
  const addressed = addressJsonValue(valid.value, registry);
  return isIdentityWitness(addressed)
    ? identityWitness(Object.freeze({ ...addressed.value, constitution: valid.value, ref: addressed.value.ref as SiteRef }))
    : addressed;
}
