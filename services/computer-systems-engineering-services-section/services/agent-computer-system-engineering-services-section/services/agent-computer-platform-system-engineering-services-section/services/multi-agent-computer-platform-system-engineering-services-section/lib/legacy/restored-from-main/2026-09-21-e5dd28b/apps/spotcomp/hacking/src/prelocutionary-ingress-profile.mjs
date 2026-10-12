import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REQUIRED_HANDLERS = new Set(['script-argv', 'hook-payload', 'http-request']);
const TARGET_ROLES = new Set(['articulating', 'predicating', 'positing', 'settling', 'projection']);

import { isObject } from "./object-record.mjs";

function checkBooleanTrue(errors, object, keys, path, code) {
  for (const key of keys) {
    if (object[key] !== true) {
      push(errors, code, path, `${key} must be true`);
    }
  }
}

function missingFromSet(expected, actual) {
  return [...expected].filter((item) => !actual.has(item));
}

function checkHandler(errors, handler, index) {
  const path = isObject(handler) && hasString(handler, 'name') ? `handlerClasses.${handler.name}` : `handlerClasses.${index}`;
  if (!isObject(handler)) {
    push(errors, 'PRE-HANDLER-001', path, 'handler class must be an object');
    return;
  }
  if (!REQUIRED_HANDLERS.has(handler.name)) {
    push(errors, 'PRE-HANDLER-002', path, 'handler name must be script-argv, hook-payload, or http-request');
  }
  for (const key of ['environmentalShape', 'typedCodomain']) {
    if (!hasString(handler, key)) {
      push(errors, 'PRE-HANDLER-003', path, `${key} must be a non-empty string`);
    }
  }
  if (!TARGET_ROLES.has(handler.targetMorphismRole)) {
    push(errors, 'PRE-HANDLER-004', path, 'targetMorphismRole must name a known stage or projection target');
  }
  checkBooleanTrue(errors, handler, [
    'stageDeclarationRequired',
    'parsesBeforeIllocution',
    'validatesBeforeIllocution',
    'parseFailureBeforeIllocution',
    'downstreamEffectsSeparate',
  ], path, 'PRE-HANDLER-005');
  checkEvidence(errors, handler.evidence, path, 'PRE-HANDLER-006');
}

export function validatePrelocutionaryIngressProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'PRE-PROFILE-001', path: '<profile>', message: 'prelocutionary ingress profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'PRE-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'PRE-PROFILE-003');

  if (!isObject(profile.primitiveBoundary)) {
    push(errors, 'PRE-PRIM-001', path, 'primitiveBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.primitiveBoundary, [
      'tokenClaimPrimitive',
      'utteranceOrderedPair',
      'utteranceCarrierNotAct',
      'stringPresentationNotIdentity',
      'recursionGroundedByPrimitives',
      'twoPrimitivesForceFourCellPartition',
      'orderingDeclaredNotSilentlyFinal',
    ], 'primitiveBoundary', 'PRE-PRIM-002');
    checkEvidence(errors, profile.primitiveBoundary.evidence, 'primitiveBoundary', 'PRE-PRIM-003');
  }

  if (!isObject(profile.articulatingIngress)) {
    push(errors, 'PRE-ART-001', path, 'articulatingIngress must be declared');
  } else {
    if (profile.articulatingIngress.domain !== 'utterance') {
      push(errors, 'PRE-ART-002', 'articulatingIngress', 'domain must be utterance');
    }
    if (profile.articulatingIngress.codomain !== 'aperiodic-predication-category') {
      push(errors, 'PRE-ART-003', 'articulatingIngress', 'codomain must be aperiodic-predication-category');
    }
    checkBooleanTrue(errors, profile.articulatingIngress, [
      'generatesAperiodicPredicationCategory',
      'initialPresentationCarriesPotentialCell',
      'downstreamCellLifeSeparate',
      'noFiniteSettlementPrerequisite',
      'noRowRecordAsArticulatingCodomain',
    ], 'articulatingIngress', 'PRE-ART-004');
    checkEvidence(errors, profile.articulatingIngress.evidence, 'articulatingIngress', 'PRE-ART-005');
  }

  if (!isObject(profile.speechActFactorization)) {
    push(errors, 'PRE-SPEECH-001', path, 'speechActFactorization must be declared');
  } else {
    if (profile.speechActFactorization.order !== 'locution -> illocution -> perlocution') {
      push(errors, 'PRE-SPEECH-002', 'speechActFactorization', 'order must be locution -> illocution -> perlocution');
    }
    checkBooleanTrue(errors, profile.speechActFactorization, [
      'locutionEnvironmentalDecoding',
      'locutionCodomainTypedInput',
      'illocutionEventBoundedPositing',
      'perlocutionProcessBoundedClosure',
      'noBundledWrapperAsProofObject',
      'stageDeclarationPreservedBeforeIllocution',
    ], 'speechActFactorization', 'PRE-SPEECH-003');
    checkEvidence(errors, profile.speechActFactorization.evidence, 'speechActFactorization', 'PRE-SPEECH-004');
  }

  if (!Array.isArray(profile.handlerClasses) || profile.handlerClasses.length === 0) {
    push(errors, 'PRE-HANDLER-007', path, 'handlerClasses must be a non-empty array');
  } else {
    profile.handlerClasses.forEach((handler, index) => checkHandler(errors, handler, index));
    const names = new Set(profile.handlerClasses.map((handler) => handler?.name));
    const missing = missingFromSet(REQUIRED_HANDLERS, names);
    if (missing.length > 0) {
      push(errors, 'PRE-HANDLER-008', 'handlerClasses', `missing required handler classes: ${missing.join(', ')}`);
    }
  }

  if (!isObject(profile.implementationBoundary)) {
    push(errors, 'PRE-IMPL-001', path, 'implementationBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.implementationBoundary, [
      'environmentBytesNotTraceEvidence',
      'typedInputRequiredBeforeIllocution',
      'locutionCannotWriteEavtAsIllocution',
      'pureIllocutionNoIo',
      'perlocutionRequiresClosureProfile',
      'stageProfileRequired',
      'handlerCompositionNamesEachMorphism',
      'eavtRowsExactAfterIllocution',
    ], 'implementationBoundary', 'PRE-IMPL-002');
    checkEvidence(errors, profile.implementationBoundary.evidence, 'implementationBoundary', 'PRE-IMPL-003');
  }

  return errors;
}

export const assertValidPrelocutionaryIngressProfile = createProfileAssertion(validatePrelocutionaryIngressProfile);
