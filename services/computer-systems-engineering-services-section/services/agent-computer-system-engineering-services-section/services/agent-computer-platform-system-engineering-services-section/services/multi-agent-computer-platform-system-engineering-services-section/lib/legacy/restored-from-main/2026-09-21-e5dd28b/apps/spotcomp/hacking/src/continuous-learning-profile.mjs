import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateContinuousLearningProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'CL-PROFILE-001', path: '<profile>', message: 'continuous learning profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'CL-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'CL-PROFILE-003');

  checkSection(errors, profile, 'answeringReferencingCycle', [
    'answeringAsPositingIntoPhi',
    'referencingAsProjectionOutOfPhi',
    'cyclePreservesTraceEvidence',
    'closureAfterAnsweringDeclared',
    'futureReferencesReadUpdatedSettling',
  ], 'CL-CYCLE');

  checkSection(errors, profile, 'teachingBoundary', [
    'teachingAsBearerPredication',
    'conferredObjectNotMutated',
    'idempotentForUnchangedInput',
    'bearerConformancePreserved',
    'installationSeparated',
  ], 'CL-TEACHING');

  checkSection(errors, profile, 'skillClosure', [
    'skillImprovementAsClosure',
    'monotoneCoverageDeclared',
    'inflationaryImprovementDeclared',
    'idempotentIfCaseAlreadyCovered',
    'governanceRequiredForImprovement',
    'traceBearingSpecificationChange',
  ], 'CL-SKILL');

  checkSection(errors, profile, 'memoryBoundary', [
    'memoryAsLocalFragment',
    'updatesThroughGovernedSkills',
    'provenanceNotInvalidated',
    'retrievalNotDurableLearningEvidence',
    'typedResourceOrTraceEvidenceRequired',
  ], 'CL-MEMORY');

  checkSection(errors, profile, 'ruleLearning', [
    'evidenceLearningSeparated',
    'skillLearningSeparated',
    'ruleLearningChangesObserverRuleSystem',
    'closureEquivalenceNeededForSmoothness',
    'rulePerturbationDeclaredAsTransition',
  ], 'CL-RULE');

  checkSection(errors, profile, 'ludicCgsBoundary', [
    'learningAsPredicationActivity',
    'learningAsGameMoveWhenStrategyRelevant',
    'hiddenAdaptationRejected',
    'cgsStrategyBoundsPreserved',
    'ludicsOnPredicationFiberSubstrate',
  ], 'CL-LUDIC');

  checkSection(errors, profile, 'implementationBoundary', [
    'noHiddenWeightUpdateAsEvidence',
    'noContextPresenceAsDurableLearning',
    'noSkillInstallAsTeaching',
    'noRuleChangeWithoutTransitionRecord',
    'unknownLearningBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'CL-IMPLEMENTATION');

  return errors;
}

export const assertValidContinuousLearningProfile = createProfileAssertion(validateContinuousLearningProfile);
