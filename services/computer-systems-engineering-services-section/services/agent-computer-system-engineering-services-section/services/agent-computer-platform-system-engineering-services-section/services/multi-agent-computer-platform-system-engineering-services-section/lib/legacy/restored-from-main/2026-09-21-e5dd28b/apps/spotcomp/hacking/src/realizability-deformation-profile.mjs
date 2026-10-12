import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateRealizabilityDeformationProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'RD-PROFILE-001', path: '<profile>', message: 'realizability deformation profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'RD-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'RD-PROFILE-003');

  checkSection(errors, profile, 'metaRealizabilityMap', [
    'stackMorphismDeclared',
    'settlingToMetaDirectionDeclared',
    'closureEquivalenceTargetDeclared',
    'essentialSurjectivityDeclared',
    'regimeRespectingUpperBoundDeclared',
    'incrementSequenceFiberDeclared',
    'fiberRegimeStratificationDeclared',
  ], 'RD-META');

  checkSection(errors, profile, 'realizabilityAxes', [
    'regimeLayerDeclared',
    'bigradedAxisDeclared',
    'predicateNaturalityAxisDeclared',
    'ruleLanguageFragmentAxisDeclared',
    'cardinalityBoundDeclared',
    'countableSupportRestrictionDeclared',
    'unrestrictedIncrementCollapseBlocked',
  ], 'RD-AXES');

  checkSection(errors, profile, 'predicateNaturalityCoupling', [
    'specializationRestrictsFiringSet',
    'conversePreservesOrdinalsAndSwapsCells',
    'subjectProjectionDiagonalOnly',
    'objectProjectionDiagonalOnly',
    'generalCategoryOrbitClosureDeclared',
    'generatorClassEvidenceRequired',
    'independentPerPredicateListsRejected',
  ], 'RD-CNAT');

  checkSection(errors, profile, 'deformationTangent', [
    'ext1TangentDeclared',
    'internalHomToH1Declared',
    'ext2VanishingUnobstructedDeclared',
    'perRegimeTangentValuesDeclared',
    'constructibleNotSemicontinuousDeclared',
    'zeroOneZeroChainDeclared',
    'noMonotoneTraceSemicontinuityHeuristic',
  ], 'RD-TANGENT');

  checkSection(errors, profile, 'chlStabilization', [
    'metaTangentComparisonDeclared',
    'nonFiberCokernelDeclared',
    'realizabilityDerivativeDeclared',
    'derivativeKernelIsFiberTangent',
    'booleanPi1StabilizationDeclared',
    'enrichmentScopeRequired',
    'noExampleOnlyTerminalityClaim',
  ], 'RD-CHL');

  checkSection(errors, profile, 'implementationBoundary', [
    'noSingleRunRealizability',
    'noRuleTextAsMetaPoint',
    'noEndpointAsIncrementFiber',
    'noIgnoringPredicateCoupling',
    'noSemicontinuityHeuristic',
    'unknownScopeBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'RD-IMPLEMENTATION');

  return errors;
}

export const assertValidRealizabilityDeformationProfile = createProfileAssertion(validateRealizabilityDeformationProfile);
