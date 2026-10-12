import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateCgsStrategyLawsProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'CGSL-PROFILE-001', path: '<profile>', message: 'CGS strategy laws profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'CGSL-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'CGSL-PROFILE-003');

  checkSection(errors, profile, 'objectBoundary', [
    'primeEventStructureRequired',
    'minimalConflictGeneratesInheritedConflict',
    'conflictInheritanceRequired',
    'polarityAdditionalToEventStructure',
    'polarityNotPlayerIdentity',
    'symmetryGroupoidPreservesCausalityConflictPolarity',
  ], 'CGSL-OBJECT');

  if (!isObject(profile.morphismBoundary)) {
    push(errors, 'CGSL-MORPHISM-001', 'morphismBoundary', 'morphismBoundary must be declared');
  } else {
    if (profile.morphismBoundary.arenaFormula !== 'A^perp || B') {
      push(errors, 'CGSL-MORPHISM-002', 'morphismBoundary.arenaFormula', 'arenaFormula must be A^perp || B');
    }
    checkBooleanTrue(errors, profile.morphismBoundary, [
      'dualizesDomainPolarity',
      'strategyMapFromEventStructure',
      'quotientBySymmetryGroupoid',
      'receptiveToOpponentExtensions',
      'noPlayerSequentializationRequired',
      'causalityPreserving',
      'conflictPreserving',
    ], 'morphismBoundary', 'CGSL-MORPHISM-003');
    checkEvidence(errors, profile.morphismBoundary.evidence, 'morphismBoundary', 'CGSL-MORPHISM-004');
  }

  checkSection(errors, profile, 'compositionBoundary', [
    'compositionIsInteractionAndHiding',
    'parallelInteractionOverSharedInterface',
    'intermediateMovesHidden',
    'associativeUpToCanonicalIsomorphism',
    'wellDefinedRequiresReceptivity',
    'wellDefinedRequiresCausalityPreservation',
    'wellDefinedRequiresConflictPreservation',
    'notTraceConcatenation',
  ], 'CGSL-COMPOSE');

  checkSection(errors, profile, 'restrictionBoundary', [
    'sequentialIsRestrictionOfConcurrent',
    'innocentIsRestrictionOfConcurrent',
    'deterministicConcurrentAtMostOnePlayerMove',
    'innocenceRequiresPlayerViewDependence',
    'innocenceRequiresFiniteViewActionEvidence',
    'fullFaithfulEmbeddingOnlyAsRestriction',
    'generalSwarmModelAllowsConcurrentPlayerMoves',
  ], 'CGSL-RESTRICT');

  checkSection(errors, profile, 'swarmBoundary', [
    'strategyEquivalenceNotKeyIdentity',
    'strategyEquivalenceNotTraceLoopEquality',
    'localObservationViewsRequired',
    'playerActionsMayBeConcurrent',
    'traceMergeRespectingSymmetryRemainsOpen',
    'unknownStrategyLawsBlockStrongSwarmConformance',
  ], 'CGSL-SWARM');

  return errors;
}

export const assertValidCgsStrategyLawsProfile = createProfileAssertion(validateCgsStrategyLawsProfile);
