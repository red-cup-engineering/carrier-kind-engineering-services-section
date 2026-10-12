import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateProofTreeIrresolutionProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'PTI-PROFILE-001', path: '<profile>', message: 'proof-tree irresolution profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'PTI-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'PTI-PROFILE-003');

  checkSection(errors, profile, 'recursionBase', [
    'tokenPrimitive',
    'claimPrimitive',
    'utteranceOrderedPair',
    'articulatingRecursivePair',
    'finiteInstancesBottomOutAtPrimitives',
    'externalPresentationRequiresUtterance',
  ], 'PTI-RECURSION');

  checkSection(errors, profile, 'stagePreservation', [
    'articulatingAperiodic',
    'predicatingTransfinite',
    'positingScottContinuous',
    'settlingFinite',
    'noCrossRegimeShortcut',
    'boundedPrefixNotFinalSettlement',
  ], 'PTI-STAGE');

  checkSection(errors, profile, 'partialFunctionBoundary', [
    'partialMapSupportDeclared',
    'outsideSupportDefaultDeclared',
    'bottomExtensionDisciplineDeclared',
    'obstructionEvidencePreserved',
    'hostNullNotProofTreeResult',
    'hostExceptionNotProofTreeResult',
  ], 'PTI-PARTIAL');

  checkSection(errors, profile, 'closureBoundary', [
    'closureMonadDeclared',
    'settlingOrbitDeclared',
    'fixedPointEvidenceRequiredForFinal',
    'trajectoryPrefixAllowedWhenNonFinal',
    'obstructionOrCohomologyAuditAllowed',
    'downgradeRequiredWithoutEvidence',
    'boundedExecutionNotSettlement',
  ], 'PTI-CLOSURE');

  checkSection(errors, profile, 'trcTdpBoundary', [
    'schemasAsTypeWitnesses',
    'logsAsTraceEvidence',
    'scriptsAsMorphismWitnesses',
    'dualFilingAnchorsEvidence',
    'replayFromTraceRequired',
    'closureExecutionAsProgram',
    'unresolvedCasesRemainReplayable',
  ], 'PTI-TRCTDP');

  checkSection(errors, profile, 'outsideSystemBoundary', [
    'outsideSystemsPresentOnly',
    'llmCompletionNotSettlement',
    'modeledPlayerEvidenceRequired',
    'generatedClaimRequiresAdmission',
    'toolCallRequiresTypedLocution',
    'stageClaimsRequireStageEvidence',
  ], 'PTI-OUTSIDE');

  checkSection(errors, profile, 'standardsBoundary', [
    'objectBoundaryBeforeStandards',
    'jsonOnlyCarrierConstraint',
    'signatureOnlyAuthenticatesCarrier',
    'httpDoesNotChangeStage',
    'mediaTypeBindsDerivedObject',
    'problemDetailsCanReportNonFinalBoundary',
  ], 'PTI-STANDARDS');

  checkSection(errors, profile, 'implementationBoundary', [
    'noTotalFunctionShortcut',
    'noSilentDefaultAsResolution',
    'noHostExceptionAsMathematicalFailure',
    'noParserAsProofEngine',
    'noEndpointStateAsHistory',
    'codeRemainsProbe',
  ], 'PTI-IMPLEMENTATION');

  return errors;
}

export const assertValidProofTreeIrresolutionProfile = createProfileAssertion(validateProofTreeIrresolutionProfile);
