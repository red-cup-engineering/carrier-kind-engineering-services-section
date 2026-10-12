import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

export function validateVoidRelationlessnessProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'VR-PROFILE-001', path: '<profile>', message: 'void relationlessness profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'VR-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'VR-PROFILE-003');

  checkSection(errors, profile, 'stageTranslation', [
    'voidConeAsEarlierVocabulary',
    'articulatingAperiodicReframe',
    'predicatingTransfiniteReframe',
    'positingScottContinuousReframe',
    'settlingFiniteReframe',
    'noFifthStageIntroduced',
    'noFourExceptionalization',
  ], 'VR-STAGE');

  checkSection(errors, profile, 'nullRelationlessness', [
    'voidIsNullCase',
    'relationlessnessDeclared',
    'jsonNullFiniteWitnessDeclared',
    'potentialCellBothSlotsVoid',
    'tokenClaimSiblingBoundary',
    'notErrorOrException',
  ], 'VR-NULL');

  checkSection(errors, profile, 'voidFiltration', [
    'descendingVoidFiltrationDeclared',
    'limitVoidSeparateInvariant',
    'closurePointedValueCategoryDeclared',
    'supportRespectingClosureDeclared',
    'regimeVoidShrinkageDeclared',
    'permanentVoidNotH1',
  ], 'VR-FILTRATION');

  checkSection(errors, profile, 'cohomologyPairing', [
    'associatedGradedDeclared',
    'apexH1PairingDeclared',
    'cosheafHomologyDeclared',
    'verdierRouteDeclared',
    'directChainRouteDeclared',
    'legacyH0Reinterpreted',
  ], 'VR-COHOMOLOGY');

  checkSection(errors, profile, 'valueAgnosticInstances', [
    'bilatticeBottomInstanceDeclared',
    'stochasticZeroInstanceDeclared',
    'lawvereNoPathInstanceDeclared',
    'lorentzianSpacelikeInstanceDeclared',
    'conflationVoidFullnessAxisDeclared',
    'negationTruthAxisSeparated',
  ], 'VR-VALUE');

  checkSection(errors, profile, 'failureGeometry', [
    'failureGeometryAsStageObstruction',
    'nonScottFiringsTracked',
    'voidShrinkageDiscontinuitiesTracked',
    'failureEventTypingDeclared',
    'agenticContinuingAgencyAperiodicDeclared',
    'noRuntimeFailureCollapse',
  ], 'VR-FAILURE');

  checkSection(errors, profile, 'weightedContinuousBoundary', [
    'weightStabilityConeRequired',
    'shapeSpecificConeDeclared',
    'rankDropDowngradeDeclared',
    'padovanOppositeOrderingDeclared',
    'noArityOnlyContinuousRank',
  ], 'VR-WEIGHTED');

  checkSection(errors, profile, 'implementationBoundary', [
    'noExceptionHandlerAsVoid',
    'noFiniteOnlyVoidOntology',
    'noVoidPairingWithoutStageOrdinals',
    'noPermanentVoidAsAssociatedGraded',
    'noContinuousWeightsWithoutStabilityCone',
    'unknownVoidScopeBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'VR-IMPLEMENTATION');

  return errors;
}

export const assertValidVoidRelationlessnessProfile = createProfileAssertion(validateVoidRelationlessnessProfile);
