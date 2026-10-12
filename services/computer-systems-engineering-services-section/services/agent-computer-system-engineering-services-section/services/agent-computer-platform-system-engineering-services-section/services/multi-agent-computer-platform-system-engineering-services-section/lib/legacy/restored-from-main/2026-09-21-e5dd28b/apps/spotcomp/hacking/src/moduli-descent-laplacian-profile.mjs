import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateModuliDescentLaplacianProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'MDL-PROFILE-001', path: '<profile>', message: 'moduli descent Laplacian profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'MDL-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'MDL-PROFILE-003');

  checkSection(errors, profile, 'metaModuliDescent', [
    'settlingModuliStackReferenced',
    'metaPrestackIsStackDeclared',
    'closureOperatorDescentDeclared',
    'closureEquivalenceNotRuleSyntax',
    'effectiveDescentRequired',
    'oneStackTruncationDeclared',
  ], 'MDL-DESCENT');

  checkSection(errors, profile, 'regimeStratification', [
    'settlingRegimePartitionDeclared',
    'metaRegimeByMaximumDeclared',
    'ruleLanguageFragmentDeterminesMetaRegime',
    'setTheoreticVsTopologicalSeparated',
    'stepNRefinementTracked',
    'namedSubstitutionsAreRegimeSensitive',
    'padovanFibonacciTribonacciPlacementsTracked',
    'singleRunNotMetaRegimeProof',
  ], 'MDL-REGIME');

  checkSection(errors, profile, 'qEnrichedCohomology', [
    'dFrameValueCategoryDeclared',
    'tarskiLawvereLaplacianFrameworkDeclared',
    'shadowFallbackSeparated',
    'grothendieckSiteLayerDeclared',
    'fiberedCellularLayerDeclared',
    'transfiniteDirectLimitBoundaryDeclared',
    'theoremScopeTracked',
  ], 'MDL-QCOH');

  checkSection(errors, profile, 'verdierSixFunctor', [
    'verdierSheafCosheafDualityDeclared',
    'valueNegationComposedDualityDeclared',
    'coClassificationScopeDeclared',
    'directInverseImageFunctorsDeclared',
    'sixFunctorAxiomsScopeTracked',
    'properMorphismScopeTracked',
  ], 'MDL-VERDIER');

  checkSection(errors, profile, 'strongMld', [
    'ordinaryMldSeparated',
    'firingOrbitTypeFunctionDeclared',
    'truthFalsityTopFiringTypesDeclared',
    'valueSideAndSpatialSideTracked',
    'strongInvariantRequiredForStrongClaim',
    'cosheafSideEquivalentWhenInScope',
  ], 'MDL-SMLD');

  checkSection(errors, profile, 'implementationBoundary', [
    'noImplementationDefinesMath',
    'noEndpointOnlyMetaRegime',
    'noSingleH1ForDFrame',
    'noStaleStatusMetadataAsDowngrade',
    'unknownDescentBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'MDL-IMPLEMENTATION');

  return errors;
}

export const assertValidModuliDescentLaplacianProfile = createProfileAssertion(validateModuliDescentLaplacianProfile);
