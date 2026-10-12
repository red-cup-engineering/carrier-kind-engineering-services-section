/** The initial bare site identity and its mounted profiles. */
import { JSON_RESOURCE_ENVELOPE, canonicalizeJson } from "@red-cup-engineering/json-services-section";
import { addressArtifact } from "./index.mjs";

export const MARK_AND_ARTICULATION_PROFILE_ID = "metroplat-mark-articulation-1";
export const CAUSAL_PROFILE_ID = "metroplat-causal-witness-1";
export const FOUR_PROFILE_ID = "obsmetrologia-four-1";
export const NO_MEASUREMENT_PROFILE_ID = "metroplat-no-measurement-1";
export const NO_SEMANTIC_APPRAISAL_PROFILE_ID = "metroplat-no-semantic-appraisal-1";
export const RESOURCE_ENVELOPE_PROFILE_ID = "metroplat-resource-envelope-1";

const emptyProfileList = () => Object.freeze([]);

export const INITIAL_SITE_CONSTITUTION = Object.freeze({
  kind: "metroplat.site-constitution",
  version: 1,
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

const siteKeys = Object.freeze(Object.keys(INITIAL_SITE_CONSTITUTION).sort());

function refusal(message) {
  const error = new TypeError(`site-constitution at $: ${message}`);
  error.code = "site-constitution";
  error.path = "$";
  return error;
}

function exactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

/** Admit a site constitution; only the mounted articulation-only profile is admitted. */
export function validateSiteConstitution(value) {
  const record = canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  if (record === null || Array.isArray(record) || typeof record !== "object") throw refusal("site constitution must be an object");
  if (!exactKeys(record, siteKeys)) throw refusal("site constitution has missing or additional properties");
  const empty = (field) => Array.isArray(record[field]) && record[field].length === 0;
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
  ) throw refusal("constitution is not the mounted articulation-only site profile");
  return INITIAL_SITE_CONSTITUTION;
}

/** The site constitution as an addressed artifact. */
export function addressSiteConstitution(value = INITIAL_SITE_CONSTITUTION) {
  const constitution = validateSiteConstitution(value);
  return Object.freeze({ ...addressArtifact(constitution), constitution });
}
