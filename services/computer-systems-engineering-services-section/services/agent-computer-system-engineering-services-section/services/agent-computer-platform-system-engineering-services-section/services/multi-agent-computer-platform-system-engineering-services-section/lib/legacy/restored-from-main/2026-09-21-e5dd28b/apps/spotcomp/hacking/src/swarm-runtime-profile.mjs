import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const DERIVATION_DIRECTION = [
  'aperiodic-articulating',
  'transfinite-predicating',
  'scott-continuous-positing',
  'finite-settling',
];

const REQUIRED_SECTIONS = {
  swarmObject: [
    'observerCategoryDeclared',
    'observerLocalSettlingFunctorDeclared',
    'perObserverRuleSystemsDeclared',
    'playersBindExternalModeledAndBearerPositions',
    'sharedTraceMergedByCanonicalRowId',
    'federationRelationDeclared',
    'governanceSurfaceDeclared',
    'settlementSurfaceDeclared',
    'operationsSurfaceDeclared',
    'notJustPeerSet',
  ],
  federationAdmission: [
    'representationReceivedBeforeAdmission',
    'wireProfileIdentified',
    'carrierParsedUnderDeclaredProfile',
    'exactEavtOrTypedResourceShapeValidated',
    'canonicalIdentityPreconditionsValidated',
    'signaturesVerifiedWhenRequired',
    'traceAxesAndSwarmRoleRecognized',
    'governanceAndCapabilityRestrictionsApplied',
    'playerObservationActionBoundsAppliedForMoves',
    'admittedEvidenceAppendedOnlyAfterGates',
    'failedGateRecordedAsAuditOrDowngrade',
    'signatureValidityNotAdmission',
  ],
  traceStore: [
    'exactEavtRowsOnly',
    'canonicalRowIdSha256Jcs',
    'duplicateNameRejectionOrDowngrade',
    'appendOnlyLocalLogs',
    'gSetMergeByCanonicalRowId',
    'subjectPredicateDualFilingWhenUsingTrcTdp',
    'auditTraceForRejectionAndDowngrade',
    'indexesSnapshotsCachesNonAuthoritative',
    'jsonlLocalAppendCarrier',
    'rfc7464JsonSeqConservativeWireStream',
  ],
  playerLocalLoop: [
    'observableFrontierSelectedByHandedness',
    'frontierProjectedThroughRecognitionAndObservationMaps',
    'localViewSettledUnderVoAndRo',
    'governanceCapabilityBudgetCostEvaluated',
    'strategyAppliedOrDowngraded',
    'outputsAdmittedThroughLocalTraceDiscipline',
    'federationPayloadsPublishedOnlyAfterAdmission',
    'noGlobalSynchronizedFrontier',
    'differentPlayersMaySettleDifferentPrefixes',
  ],
  modeledPlayerState: [
    'externalPlayerBoundaryDeclared',
    'modeledPlayerIdentifierDeclared',
    'observerLocalSettlingDeclared',
    'perObserverRuleSystemDeclared',
    'identityAuthorityDeclaredWhenApplicable',
    'capabilitiesGovernanceDeclared',
    'handednessDeclared',
    'inputOutputTraceReferencesDeclared',
    'learningTransitionPolicyDeclared',
    'cgsStrategyReferenceOrDowngrade',
    'characterPersonaRoleSkillBindingsDeclaredWhenApplicable',
    'representedStateSeparateFromHostSessionState',
  ],
  cgsLudicHandoff: [
    'eventStructureArenaDeclared',
    'polarityAssignmentsDeclared',
    'causalityAndMinimalConflictDeclared',
    'symmetryClassesDeclared',
    'strategyMorphismAperpParBDeclared',
    'receptivityAndCompositionObligationsOrDowngrade',
    'sequentialInnocentOnlyAsRestrictions',
    'learningChangingPlayReviewedUnderGameBoundary',
  ],
  settlementProjectionPackets: [
    'traceEvidenceDistinctFromLocalSettlingTrajectory',
    'finiteSettlementStatusDeclared',
    'projectionMorphismDeclared',
    'packetObjectDeclared',
    'wireRepresentationDeclared',
    'shpPacketsFiniteProjectionObjects',
    'wireRepresentationsAreMorphisms',
    'packetsAndWireDoNotReplaceTraceSettlingOrStrategy',
  ],
  operationsGovernanceCost: [
    'workTypesDeclared',
    'operationsLoopStagesDeclared',
    'governanceCapabilityDecisionsRecorded',
    'budgetScopesExhaustionAndCoherenceDeclared',
    'lawvereQuantaleCostCompositionDeclared',
    'ledgerProjectionFromWitnessEvents',
    'stationarityLaplacianHandoffDeclaredWhenUsed',
    'auditDowngradeRowsForFailedGates',
    'readTriggeredSettlementSeparated',
  ],
  bigradedAperiodic: [
    'closureKzAndFibrationKzSeparated',
    'truthAndKnowledgeCommonKnowledgeSeparated',
    'h1TruthAndTopAuditSlotsPreserved',
    'consensusAndDisagreementSurfacesNamed',
    'localSettlingsAsTilesOrWindowsWhenTilingUsed',
    'aperiodicWitnessCitesSubstitutionPatchDirectLimitMldOrRegime',
    'peerCountJitterAsyncTopologyNotAperiodicEvidence',
  ],
  standardsBoundary: [
    'rfc8259JsonBoundary',
    'rfc8785CanonicalJsonBoundary',
    'rfc7464JsonSeqBoundary',
    'rfc9110HttpContentTypeBoundary',
    'rfc9457ProblemDetailsBoundary',
    'rfc8032Ed25519BoundaryWhenUsed',
    'rfc8410SpkiBoundaryWhenUsed',
    'mediaTypeSuffixDisciplineDeclared',
    'dripUasOnlyForDeploymentLayer',
    'dripDoesNotProveModeledPlayerCgsOrAperiodicConformance',
  ],
  nonConformanceBoundary: [
    'noSignedReplicationAsSwarmConformance',
    'noParseShapeOrSignatureAsAdmission',
    'noGlobalSynchronizedObservationFrontier',
    'noKeysInboxesOutboxesAsModeledPlayers',
    'noModeledPlayerWithoutVoAndRo',
    'noActionsWithoutGovernanceObservationSettlingAndStrategyBoundaries',
    'noPacketOrWireOutsideMathematics',
    'noPacketOrWireAsWholeMathematics',
    'noCgsClaimWithoutEventStructureAndStrategyLaws',
    'noAperiodicityWithoutTilingOrRegimeWitness',
    'noHiddenLearningCostBudgetRejectionOrDowngradeState',
  ],
};

import { isObject } from "./object-record.mjs";

function checkSection(errors, profile, sectionName, requiredKeys, codePrefix) {
  const section = profile[sectionName];
  if (!isObject(section)) {
    push(errors, `${codePrefix}-001`, sectionName, `${sectionName} must be declared`);
    return;
  }
  for (const key of requiredKeys) {
    if (section[key] !== true) {
      push(errors, `${codePrefix}-002`, `${sectionName}.${key}`, `${key} must be true`);
    }
  }
  checkEvidence(errors, section.evidence, sectionName, `${codePrefix}-003`);
}

export function validateSwarmRuntimeProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'SWARM-PROFILE-001', path: '<profile>', message: 'swarm runtime profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'SWARM-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'SWARM-PROFILE-003');

  if (!Array.isArray(profile.derivationDirection) || profile.derivationDirection.length !== DERIVATION_DIRECTION.length) {
    push(errors, 'SWARM-DIRECTION-001', path, 'derivationDirection must list the four SPOTCOMP stages');
  } else {
    for (const [index, stage] of DERIVATION_DIRECTION.entries()) {
      if (profile.derivationDirection[index] !== stage) {
        push(errors, 'SWARM-DIRECTION-002', `derivationDirection[${index}]`, 'derivation direction must be aperiodic to transfinite to Scott-continuous to finite');
      }
    }
  }

  for (const [sectionName, keys] of Object.entries(REQUIRED_SECTIONS)) {
    const codePrefix = `SWARM-${sectionName.replace(/[A-Z]/g, (letter) => `-${letter}`).toUpperCase()}`;
    checkSection(errors, profile, sectionName, keys, codePrefix);
  }

  return errors;
}

export const assertValidSwarmRuntimeProfile = createProfileAssertion(validateSwarmRuntimeProfile);
