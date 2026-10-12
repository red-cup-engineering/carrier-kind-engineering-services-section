import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateDripUasProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'DRIP-PROFILE-001', path: '<profile>', message: 'DRIP UAS profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'DRIP-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'DRIP-PROFILE-003');

  checkSection(errors, profile, 'rfcInventory', [
    'rfc9153RequirementsTerminology',
    'rfc9374DetForUasRid',
    'rfc9434Architecture',
    'rfc9575BroadcastAuthentication',
    'rfc9886DetsInDns',
    'activeDraftsNotNormative',
  ], 'DRIP-RFC');

  checkSection(errors, profile, 'standardsBoundary', [
    'dripLayerSeparateFromSpotcompMath',
    'remoteIdNotAperiodicTiling',
    'remoteIdNotCgsStrategy',
    'remoteIdNotModeledPlayerProof',
    'civilAviationRulesExternalUnlessProfiled',
  ], 'DRIP-BOUNDARY');

  checkSection(errors, profile, 'detIdentityBinding', [
    'detOrUasIdRoleDeclared',
    'hhitDetBindingDeclared',
    'registryIdentifierDeclared',
    'uniquenessEvidenceRequired',
    'nonSpoofabilityEvidenceRequired',
    'localSlugNotDet',
    'rowIdNotDet',
    'modeledPlayerIdNotDetWithoutBinding',
  ], 'DRIP-DET');

  checkSection(errors, profile, 'broadcastAuthentication', [
    'detAuthenticationFormatDeclared',
    'signedRidEvidenceVerifiedBeforeAdmission',
    'freshnessOrUniquenessEvidenceRequired',
    'observerVerificationOutcomeRecorded',
    'unauthenticatedRidDowngradesToAudit',
    'spotcompEnvelopeSignatureNotRidAuthentication',
  ], 'DRIP-AUTH');

  checkSection(errors, profile, 'dnsDimeRegistry', [
    'detDnsLookupDeclared',
    'dimeRolesDeclared',
    'registryHierarchyDeclared',
    'issuanceDiscoveryVerificationSeparated',
    'dnsLookupNotModeledPlayerProof',
    'registrationDataFeedsRecognitionOnlyAfterAdmission',
  ], 'DRIP-DNS');

  checkSection(errors, profile, 'spotcompAdmissionBinding', [
    'standardsLayerBeforeLocalRecognition',
    'localGovernanceStillRequired',
    'capabilityBoundsStillRequired',
    'traceMergeRequiresSpotcompAdmission',
    'rejectedRidCanBecomeLocalAudit',
    'unknownDripStateBlocksUasConformanceClaim',
  ], 'DRIP-ADMISSION');

  checkSection(errors, profile, 'implementationBoundary', [
    'doesNotQueryLiveDns',
    'doesNotValidateLiveBroadcasts',
    'doesNotImplementAstmRules',
    'doesNotTreatDraftsAsRfcs',
    'doesNotInferConformanceFromTiling',
    'codeRemainsProbe',
  ], 'DRIP-IMPLEMENTATION');

  return errors;
}

export const assertValidDripUasProfile = createProfileAssertion(validateDripUasProfile);
