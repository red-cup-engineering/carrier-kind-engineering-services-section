import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateIdentifierPolicyProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'IDPOL-PROFILE-001', path: '<profile>', message: 'identifier policy profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'IDPOL-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'IDPOL-PROFILE-003');

  checkSection(errors, profile, 'uriPolicy', [
    'rfc3986',
    'identificationNotDereference',
    'absoluteForCanonicalWireIdentity',
    'relativeReferencesRequireBase',
    'comparisonPolicyDeclared',
    'fragmentParticipationDeclared',
    'schemeSpecificNormalizationDeclared',
  ], 'IDPOL-URI');

  checkSection(errors, profile, 'iriPolicy', [
    'rfc3987',
    'iriUseIsExplicit',
    'iriToUriMappingDeclaredForProtocolSlots',
    'unicodeComparisonPolicyDeclared',
    'noSilentUnicodeNormalization',
    'jsonStringPreservationRespected',
  ], 'IDPOL-IRI');

  checkSection(errors, profile, 'urnPolicy', [
    'rfc8141',
    'urnIsUriScheme',
    'namespaceIdentifierDeclared',
    'namespaceSpecificStringPolicyDeclared',
    'urnEquivalencePolicyDeclared',
    'schemeSpecificPartsOpaqueUnlessKnown',
    'dereferenceOrResolutionPolicyDeclared',
  ], 'IDPOL-URN');

  checkSection(errors, profile, 'hashNamePolicy', [
    'rfc6920',
    'rfc4648Base64urlForNiDigest',
    'digestAlgorithmDeclared',
    'hashInputDeclared',
    'digestValueNoPadding',
    'nameDataIntegrityCheckDeclared',
    'notReplacementForCanonicalRowId',
  ], 'IDPOL-HASH');

  checkSection(errors, profile, 'spotcompBindings', [
    'eavtEntityAttributeMayUseLocalSlug',
    'federationRequiresStableIdentifierMapping',
    'rowIdUsesCanonicalHashNotIdentifierText',
    'problemTypeUriStable',
    'profileIdentifiersStable',
    'playerTraceKeyIdentifiersStableAtWireBoundary',
    'localSlugsNotWireUriUnlessMapped',
  ], 'IDPOL-BIND');

  checkSection(errors, profile, 'implementationBoundary', [
    'rejectUndeclaredSchemesForStrongWireConformance',
    'doNotDereferenceDuringValidation',
    'doNotUseUriNormalizationAsRowIdentity',
    'doNotTreatDidKeyAsIetfStandard',
    'quarantineIdentifierConfusablesWhenPolicyMissing',
  ], 'IDPOL-IMPL');

  return errors;
}

export const assertValidIdentifierPolicyProfile = createProfileAssertion(validateIdentifierPolicyProfile);
