import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

function checkBooleanTrue(errors, object, keys, path, code) {
  for (const key of keys) {
    if (object[key] !== true) {
      push(errors, code, path, `${key} must be true`);
    }
  }
}

export function validateCanonicalIdentityProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'CID-PROFILE-001', path: '<profile>', message: 'canonical identity profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'CID-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'CID-PROFILE-003');

  if (!isObject(profile.rowIdentity)) {
    push(errors, 'CID-ROW-001', path, 'rowIdentity must be declared');
  } else {
    if (profile.rowIdentity.rowShape !== 'exact-eavt') {
      push(errors, 'CID-ROW-002', 'rowIdentity', 'rowShape must be exact-eavt');
    }
    if (profile.rowIdentity.canonicalization !== 'RFC8785-JCS') {
      push(errors, 'CID-ROW-003', 'rowIdentity', 'canonicalization must be RFC8785-JCS');
    }
    if (profile.rowIdentity.hashAlgorithm !== 'SHA-256') {
      push(errors, 'CID-ROW-004', 'rowIdentity', 'hashAlgorithm must be SHA-256');
    }
    if (profile.rowIdentity.identityFormula !== 'sha256(jcs(row))') {
      push(errors, 'CID-ROW-005', 'rowIdentity', 'identityFormula must be sha256(jcs(row))');
    }
    checkBooleanTrue(errors, profile.rowIdentity, [
      'memberOrderIndependent',
      'linePositionNonAuthoritative',
      'arrayOrderPreserved',
    ], 'rowIdentity', 'CID-ROW-006');
    checkEvidence(errors, profile.rowIdentity.evidence, 'rowIdentity', 'CID-ROW-007');
  }

  if (!isObject(profile.jsonPreconditions)) {
    push(errors, 'CID-JSON-001', path, 'jsonPreconditions must be declared');
  } else {
    if (profile.jsonPreconditions.jsonSyntaxRfc !== 'RFC8259') {
      push(errors, 'CID-JSON-002', 'jsonPreconditions', 'jsonSyntaxRfc must be RFC8259');
    }
    if (profile.jsonPreconditions.ijsonRfc !== 'RFC7493') {
      push(errors, 'CID-JSON-003', 'jsonPreconditions', 'ijsonRfc must be RFC7493');
    }
    if (profile.jsonPreconditions.jcsRfc !== 'RFC8785') {
      push(errors, 'CID-JSON-004', 'jsonPreconditions', 'jcsRfc must be RFC8785');
    }
    checkBooleanTrue(errors, profile.jsonPreconditions, [
      'duplicateNamesRejected',
      'unicodeStringsPreserved',
      'unicodeNormalizationForbidden',
      'numbersFinite',
      'largeExactNumbersAsStrings',
      'canonicalWhitespaceForbidden',
      'recursiveObjectSort',
      'arrayOrderNotChanged',
    ], 'jsonPreconditions', 'CID-JSON-005');
    checkEvidence(errors, profile.jsonPreconditions.evidence, 'jsonPreconditions', 'CID-JSON-006');
  }

  if (!isObject(profile.signatureInput)) {
    push(errors, 'CID-SIG-001', path, 'signatureInput must be declared');
  } else {
    if (profile.signatureInput.signatureAlgorithm !== 'Ed25519') {
      push(errors, 'CID-SIG-002', 'signatureInput', 'signatureAlgorithm must be Ed25519');
    }
    if (profile.signatureInput.signatureRfc !== 'RFC8032') {
      push(errors, 'CID-SIG-003', 'signatureInput', 'signatureRfc must be RFC8032');
    }
    checkBooleanTrue(errors, profile.signatureInput, [
      'canonicalizeUnsignedEnvelope',
      'removeSignatureMemberBeforeSigning',
      'verifyBeforeMerge',
      'scopeIncludesSenderKeyCreatedNonceProfileRows',
      'rejectIfCanonicalBytesNotReproducible',
    ], 'signatureInput', 'CID-SIG-004');
    checkEvidence(errors, profile.signatureInput.evidence, 'signatureInput', 'CID-SIG-005');
  }

  if (!isObject(profile.streamIdentity)) {
    push(errors, 'CID-STREAM-001', path, 'streamIdentity must be declared');
  } else {
    if (profile.streamIdentity.networkSequenceRfc !== 'RFC7464') {
      push(errors, 'CID-STREAM-002', 'streamIdentity', 'networkSequenceRfc must be RFC7464');
    }
    if (profile.streamIdentity.networkSequenceMediaType !== 'application/json-seq') {
      push(errors, 'CID-STREAM-003', 'streamIdentity', 'networkSequenceMediaType must be application/json-seq');
    }
    checkBooleanTrue(errors, profile.streamIdentity, [
      'jsonlOnDiskOnly',
      'sequenceHasNoCanonicalForm',
      'signItemsOrManifest',
      'itemIdentityByCanonicalRowId',
      'utf8Required',
    ], 'streamIdentity', 'CID-STREAM-004');
    checkEvidence(errors, profile.streamIdentity.evidence, 'streamIdentity', 'CID-STREAM-005');
  }

  if (!isObject(profile.timestampPolicy)) {
    push(errors, 'CID-TIME-001', path, 'timestampPolicy must be declared');
  } else {
    if (profile.timestampPolicy.timestampRfc !== 'RFC3339') {
      push(errors, 'CID-TIME-002', 'timestampPolicy', 'timestampRfc must be RFC3339');
    }
    if (profile.timestampPolicy.profile !== 'Internet date/time') {
      push(errors, 'CID-TIME-003', 'timestampPolicy', 'profile must be Internet date/time');
    }
    checkBooleanTrue(errors, profile.timestampPolicy, [
      'uppercaseTAndZ',
      'timezoneExplicit',
      'timestampsNotMergeAuthority',
    ], 'timestampPolicy', 'CID-TIME-004');
    checkEvidence(errors, profile.timestampPolicy.evidence, 'timestampPolicy', 'CID-TIME-005');
  }

  if (!isObject(profile.implementationBoundary)) {
    push(errors, 'CID-IMPL-001', path, 'implementationBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.implementationBoundary, [
      'duplicateDetectingParserRequiredForStrongImport',
      'postParseObjectCannotProveNoDuplicates',
      'canonicalizerMustBeJcsConformant',
      'currentProbeNotFullJcsImplementation',
      'canonicalizationFailureRejectsOrQuarantines',
      'rowIdStableAcrossObjectMemberOrder',
      'rowIdChangesWithValueChange',
      'mergeUsesCanonicalRowId',
    ], 'implementationBoundary', 'CID-IMPL-002');
    checkEvidence(errors, profile.implementationBoundary.evidence, 'implementationBoundary', 'CID-IMPL-003');
  }

  return errors;
}

export const assertValidCanonicalIdentityProfile = createProfileAssertion(validateCanonicalIdentityProfile);
