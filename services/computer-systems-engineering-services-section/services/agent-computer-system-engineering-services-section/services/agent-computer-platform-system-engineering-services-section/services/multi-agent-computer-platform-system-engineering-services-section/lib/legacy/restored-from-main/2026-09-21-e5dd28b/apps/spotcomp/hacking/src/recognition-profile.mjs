import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
const REQUIRED_SECTIONS = [
  'recognitionBoundary',
  'traceRecognitionAxis',
  'admissionPolicy',
  'swarmRecognition',
  'cgsAdmission',
  'implementationBoundary',
];

import { isObject } from "./object-record.mjs";

export function validateRecognitionProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'REC-PROFILE-001', path: '<profile>', message: 'recognition profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'REC-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'REC-PROFILE-003');
  for (const section of REQUIRED_SECTIONS) {
    if (!Object.hasOwn(profile, section)) {
      push(errors, 'REC-PROFILE-004', path, `missing ${section}`);
    }
  }

  checkSection(errors, profile, 'recognitionBoundary', [
    'recognitionIsTraceAxis',
    'finiteRowsDoNotCarryRecognitionInline',
    'recognitionHasSeparateResourceOrProjection',
    'shapeRecognitionIsCarrierCheckOnly',
    'mathematicalRecognitionRequiresSettlement',
    'aliasRecognitionNeedsScopedTheorem',
  ], 'REC-BOUNDARY');

  if (!isObject(profile.traceRecognitionAxis)) {
    push(errors, 'REC-TRACE-001', 'traceRecognitionAxis', 'traceRecognitionAxis must be declared');
  } else {
    if (profile.traceRecognitionAxis.axisName !== 'recognition-fiber') {
      push(errors, 'REC-TRACE-002', 'traceRecognitionAxis.axisName', 'axisName must be recognition-fiber');
    }
    checkBooleanTrue(errors, profile.traceRecognitionAxis, [
      'preservedByDeclaredResource',
      'forgottenByFiniteRowProjectionUnlessDeclared',
      'receiverRelative',
      'connectsToInformationObservation',
      'connectsToSwarmAdmission',
    ], 'traceRecognitionAxis', 'REC-TRACE-003');
    checkEvidence(errors, profile.traceRecognitionAxis.evidence, 'traceRecognitionAxis', 'REC-TRACE-004');
  }

  checkSection(errors, profile, 'admissionPolicy', [
    'signatureVerificationBeforeFederationAdmission',
    'canonicalIdentityBeforeMerge',
    'governanceBeforeSideEffectAdmission',
    'capabilityBoundsBeforeActionAdmission',
    'observationBoundsBeforeMoveAdmission',
    'typedShapeRecognitionBeforeSettlementClaim',
    'dualFilingBeforeLocalAdmission',
    'failedRecognitionDowngradesOrRejects',
  ], 'REC-ADMIT');

  checkSection(errors, profile, 'swarmRecognition', [
    'rolesDerivedFromRecognitionCellsAndGovernance',
    'leaderNotOutOfBand',
    'validatorNotOutOfBand',
    'participantsReferenceModeledPlayers',
    'sharedTraceIsAdmittedTrace',
    'recognitionDisciplineDeclared',
  ], 'REC-SWARM');

  checkSection(errors, profile, 'cgsAdmission', [
    'admittedFederateDeliveryRequiresVerificationAndGovernance',
    'admittedMoveRequiresObservationActionCapabilityBounds',
    'rejectedAdmissionsCanSupplyConflictEvidence',
    'observationMapsArePlayerLocal',
    'polarityNotIdentity',
  ], 'REC-CGS');

  checkSection(errors, profile, 'implementationBoundary', [
    'doNotTreatParseSuccessAsRecognitionFiber',
    'doNotTreatRowPresenceAsAdmission',
    'doNotInferRolesFromFlagsOnly',
    'recordRecognitionEvidenceRows',
    'separateShapeRecognitionFromMathematicalRecognition',
    'unknownRecognitionBlocksStrongSwarmConformance',
  ], 'REC-IMPL');

  return errors;
}

export const assertValidRecognitionProfile = createProfileAssertion(validateRecognitionProfile);
