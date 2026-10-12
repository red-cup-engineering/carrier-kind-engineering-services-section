import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateModeledPlayerSwarmDynamicsProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'MPSD-PROFILE-001', path: '<profile>', message: 'modeled player swarm dynamics profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'MPSD-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'MPSD-PROFILE-003');

  checkSection(errors, profile, 'playerBoundary', [
    'externalPlayerSeparate',
    'modeledPlayerIsObserverObject',
    'characterIsImplementationBearer',
    'keyIdentityNotPlayerModel',
    'localSettlingCarriesModel',
  ], 'MPSD-PLAYER');

  checkSection(errors, profile, 'ruledObserverSettling', [
    'observerCategoryDeclared',
    'observerFunctorToSettlingsDeclared',
    'perObserverRuleMapDeclared',
    'localSettlingReferencesDeclared',
    'jointClosureOrdinalSupremumDeclared',
    'evidenceAndInferentialDisagreementSeparated',
  ], 'MPSD-RULED');

  checkSection(errors, profile, 'agentivePositing', [
    'observerAttributionDeclared',
    'cellAndDatumDeclared',
    'localAndMergedUpdateDeclared',
    'assertionClaimStatusRelational',
    'truthWindowBoundaryDeclared',
    'gradedChannelReadingDeclared',
  ], 'MPSD-POSITING');

  checkSection(errors, profile, 'configurationTrajectory', [
    'fiberFunctorConfigurationSpaceDeclared',
    'settlingTrajectoryDeclared',
    'baseVariationSeparateFromTrajectory',
    'traceFrontierNotWholeSpace',
  ], 'MPSD-CONFIG');

  checkSection(errors, profile, 'networkSheafSwarm', [
    'agentGraphIncidencePosetDeclared',
    'consensusAsLimitH0Declared',
    'disagreementAsJoinOrH1Declared',
    'dFrameConsensusDeclared',
    'conFailureTopWitnessDeclared',
    'calmCompatibilityDeclared',
    'meetJoinAndGlobalSectionsSeparated',
  ], 'MPSD-SHEAF');

  checkSection(errors, profile, 'strategyBoundary', [
    'cgsEventStructureDeclared',
    'strategyReadsObserverLocalSettling',
    'playerPolaritySeparateFromIdentity',
    'receptivityAndSymmetryObligationsDeclared',
    'sequentialStrategiesAsRestrictionsOnly',
    'bigradedAndRuledEvidencePreserved',
  ], 'MPSD-STRATEGY');

  checkSection(errors, profile, 'dynamicsBoundary', [
    'settlingPathDeclared',
    'smoothPathPreservesMldClass',
    'regimeJumpTransitionDeclared',
    'incrementEventTransitionDeclared',
    'rulePerturbationTransitionDeclared',
    'swarmPhaseTransitionLocalizedToObservers',
  ], 'MPSD-DYNAMICS');

  checkSection(errors, profile, 'aperiodicSwarmWitness', [
    'modeledPlayerTilesAreLocalSettlings',
    'substitutionOrPatchWitnessRequired',
    'directLimitOrMldInvariantRequired',
    'finiteWindowsAreProjections',
    'graphTopologyAloneRejected',
    'dripLayerSeparateForUas',
  ], 'MPSD-APERIODIC');

  checkSection(errors, profile, 'implementationBoundary', [
    'noPeerRecordAsModeledPlayer',
    'noSingleSharedFiniteStageDefault',
    'noLocalLoopAsCgsStrategy',
    'noConsensusAxisCollapse',
    'noAperiodicClaimWithoutWitness',
    'unknownDynamicsBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'MPSD-IMPLEMENTATION');

  return errors;
}

export const assertValidModeledPlayerSwarmDynamicsProfile = createProfileAssertion(validateModeledPlayerSwarmDynamicsProfile);
