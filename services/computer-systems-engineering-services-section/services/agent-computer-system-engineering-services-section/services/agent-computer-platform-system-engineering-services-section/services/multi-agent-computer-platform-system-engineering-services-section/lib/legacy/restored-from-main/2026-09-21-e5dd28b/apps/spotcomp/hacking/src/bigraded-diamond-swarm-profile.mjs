import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateBigradedDiamondSwarmProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'BDS-PROFILE-001', path: '<profile>', message: 'bigraded diamond swarm profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'BDS-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'BDS-PROFILE-003');

  checkSection(errors, profile, 'kzDiamond', [
    'fibrationKzDeclared',
    'closureKzDeclared',
    'axisOrthogonalityDeclared',
    'valuesVsCleavageSeparated',
    'strictCommutationRequired',
    'dualSideScopeTracked',
  ], 'BDS-KZ');

  checkSection(errors, profile, 'bigradedEpistemic', [
    'truthAdjointSystemDeclared',
    'knowledgeAdjointSystemDeclared',
    'perAxisCommonKnowledgeFixedPoints',
    'axisDivergenceNotCollapsed',
    'modeledPlayersCarryBothAxes',
  ], 'BDS-EPISTEMIC');

  checkSection(errors, profile, 'bigradedCohomology', [
    'twoRowComplexDeclared',
    'truthRowDeclared',
    'inconsistencyRowDeclared',
    'verticalDifferentialDeclared',
    'aperiodicTrichotomyDeclared',
    'h1TruthAndTopSlotsRequired',
  ], 'BDS-COHOMOLOGY');

  checkSection(errors, profile, 'multiObserverSwarm', [
    'observerFunctorDeclared',
    'agentGraphIncidencePosetAllowed',
    'consensusAsLimitAndH0',
    'disagreementAsJoinOrH1',
    'perObserverRuleSystemsAllowed',
    'closureOrdinalSupremumForJointStage',
    'evidenceLayerAndInferentialLayerSeparated',
  ], 'BDS-OBSERVER');

  checkSection(errors, profile, 'aperiodicTilingBoundary', [
    'aperiodicRequiresRegimeOrSubstitutionWitness',
    'tilingNotNetworkTopology',
    'modeledPlayerTilesAreLocalSettlings',
    'finiteWindowsAreProjections',
    'noPeerCountOrClockJitterClaim',
  ], 'BDS-TILING');

  checkSection(errors, profile, 'droneStandardsBoundary', [
    'dripRemoteIdLayerSeparate',
    'tilingDoesNotSatisfyDroneStandardsAlone',
    'detIdentityAndAuthenticationRemainRequired',
    'ietfClaimsCiteApplicableRfcs',
  ], 'BDS-DRONE');

  checkSection(errors, profile, 'implementationBoundary', [
    'noSingleAxisCheckerAsStrongConformance',
    'noKeyIdentityAsModeledPlayer',
    'noTraceLoopAsStrategy',
    'unknownBigradingBlocksStrongSwarmConformance',
    'codeRemainsProbe',
  ], 'BDS-IMPLEMENTATION');

  return errors;
}

export const assertValidBigradedDiamondSwarmProfile = createProfileAssertion(validateBigradedDiamondSwarmProfile);
