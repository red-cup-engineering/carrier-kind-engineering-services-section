import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REQUIRED_OPERATIONS = new Set([
  'knowledgeMeet',
  'knowledgeJoin',
  'truthMeet',
  'truthJoin',
  'negation',
  'fusion',
  'residual',
]);
const REQUIRED_FIBRATION_AXIOMS = new Set([
  'fiber-uniformity',
  'generator-action',
  'fiber-structure-preservation',
]);
const REQUIRED_GENERATORS = new Set([
  'specialization',
  'converse',
  'subject-projection',
  'object-projection',
]);
const REQUIRED_HYPERDOCTRINE_AXIOMS = new Set([
  'knowledge-quantifier-adjoints',
  'truth-quantifier-adjoints',
  'knowledge-frobenius',
  'truth-frobenius',
  'beck-chevalley',
  'dual-comprehension',
]);

import { isObject } from "./object-record.mjs";

function missingFromSet(expected, actual) {
  return [...expected].filter((item) => !actual.has(item));
}

function checkBooleanTrue(errors, object, keys, path, code) {
  for (const key of keys) {
    if (object[key] !== true) {
      push(errors, code, path, `${key} must be true`);
    }
  }
}

function checkOperation(errors, operation, path) {
  if (!isObject(operation)) {
    push(errors, 'PFA-OP-002', path, 'operation must be declared');
    return;
  }
  if (operation.declared !== true) {
    push(errors, 'PFA-OP-003', path, 'operation.declared must be true');
  }
  if (operation.pointwise !== true) {
    push(errors, 'PFA-OP-004', path, 'operation.pointwise must be true');
  }
}

export function validatePredicationFiberProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'PFA-PROFILE-001', path: '<profile>', message: 'predication fiber profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'PFA-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'PFA-PROFILE-003');

  if (!isObject(profile.base)) {
    push(errors, 'PFA-BASE-001', path, 'base must be declared');
  } else {
    checkBooleanTrue(errors, profile.base, [
      'parameterLatticeDeclared',
      'predicateCategoryDeclared',
      'entitySetDeclared',
      'predicateFamilyUniform',
    ], 'base', 'PFA-BASE-002');
    if (profile.base.chargeCarrier !== 'L x L') {
      push(errors, 'PFA-BASE-003', 'base', 'chargeCarrier must be L x L');
    }
    checkEvidence(errors, profile.base.evidence, 'base', 'PFA-BASE-004');
  }

  if (!isObject(profile.fiberAlgebra)) {
    push(errors, 'PFA-FIBER-001', path, 'fiberAlgebra must be declared');
  } else {
    if (profile.fiberAlgebra.formula !== 'A_p = (L x L)^(E x E)') {
      push(errors, 'PFA-FIBER-002', 'fiberAlgebra', 'formula must be A_p = (L x L)^(E x E)');
    }
    if (profile.fiberAlgebra.index !== 'E x E') {
      push(errors, 'PFA-FIBER-003', 'fiberAlgebra', 'index must be E x E');
    }
    const components = new Set(Array.isArray(profile.fiberAlgebra.chargeComponents) ? profile.fiberAlgebra.chargeComponents : []);
    const missingComponents = missingFromSet(new Set(['positive-evidence', 'negative-evidence']), components);
    if (missingComponents.length > 0 || components.size !== 2) {
      push(errors, 'PFA-FIBER-004', 'fiberAlgebra', 'chargeComponents must be positive-evidence and negative-evidence');
    }
    if (profile.fiberAlgebra.valuationAcrossPredicates !== 'p |-> A_p') {
      push(errors, 'PFA-FIBER-005', 'fiberAlgebra', 'valuationAcrossPredicates must be p |-> A_p');
    }
    checkBooleanTrue(errors, profile.fiberAlgebra, [
      'pointwiseOperations',
      'knowledgeOrderStructural',
      'truthOrderLoadBearing',
      'uniformAcrossPredicates',
    ], 'fiberAlgebra', 'PFA-FIBER-006');
    checkEvidence(errors, profile.fiberAlgebra.evidence, 'fiberAlgebra', 'PFA-FIBER-007');
  }

  if (!isObject(profile.operations)) {
    push(errors, 'PFA-OP-001', path, 'operations must be declared');
  } else {
    for (const operation of REQUIRED_OPERATIONS) {
      checkOperation(errors, profile.operations[operation], `operations.${operation}`);
    }
    checkBooleanTrue(errors, profile.operations, [
      'negationSwapsEvidence',
      'fusionResidualTruthAdjunction',
    ], 'operations', 'PFA-OP-005');
    checkEvidence(errors, profile.operations.evidence, 'operations', 'PFA-OP-006');
  }

  if (!isObject(profile.fibration)) {
    push(errors, 'PFA-FIBRATION-001', path, 'fibration must be declared');
  } else {
    if (profile.fibration.kind !== 'cloven-grothendieck-fibration') {
      push(errors, 'PFA-FIBRATION-002', 'fibration', 'kind must be cloven-grothendieck-fibration');
    }
    if (profile.fibration.baseCategory !== 'predicate-category') {
      push(errors, 'PFA-FIBRATION-003', 'fibration', 'baseCategory must be predicate-category');
    }
    const axioms = new Set(Array.isArray(profile.fibration.axioms) ? profile.fibration.axioms : []);
    const missingAxioms = missingFromSet(REQUIRED_FIBRATION_AXIOMS, axioms);
    if (missingAxioms.length > 0) {
      push(errors, 'PFA-FIBRATION-004', 'fibration.axioms', `missing required fibration axioms: ${missingAxioms.join(', ')}`);
    }
    const generators = new Set(Array.isArray(profile.fibration.generatorClasses) ? profile.fibration.generatorClasses : []);
    const missingGenerators = missingFromSet(REQUIRED_GENERATORS, generators);
    if (missingGenerators.length > 0) {
      push(errors, 'PFA-FIBRATION-005', 'fibration.generatorClasses', `missing required generator classes: ${missingGenerators.join(', ')}`);
    }
    checkBooleanTrue(errors, profile.fibration, [
      'reindexingsAreBilatticeResiduatedHomomorphisms',
      'knowledgeMonotone',
    ], 'fibration', 'PFA-FIBRATION-006');
    if (profile.fibration.functor !== 'C^op -> DBiLat(L)') {
      push(errors, 'PFA-FIBRATION-007', 'fibration', 'functor must be C^op -> DBiLat(L)');
    }
    checkEvidence(errors, profile.fibration.evidence, 'fibration', 'PFA-FIBRATION-008');
  }

  if (!isObject(profile.hyperdoctrine)) {
    push(errors, 'PFA-HYPER-001', path, 'hyperdoctrine must be declared');
  } else {
    checkBooleanTrue(errors, profile.hyperdoctrine, [
      'propertyLike',
      'requiresFibration',
      'twoAdjointSystemsIndependent',
      'classicalCollapseMergesAdjoints',
    ], 'hyperdoctrine', 'PFA-HYPER-002');
    if (profile.hyperdoctrine.fusionFrobeniusAvailable !== false) {
      push(errors, 'PFA-HYPER-003', 'hyperdoctrine', 'fusionFrobeniusAvailable must be false');
    }
    const axioms = new Set(Array.isArray(profile.hyperdoctrine.axioms) ? profile.hyperdoctrine.axioms : []);
    const missingAxioms = missingFromSet(REQUIRED_HYPERDOCTRINE_AXIOMS, axioms);
    if (missingAxioms.length > 0) {
      push(errors, 'PFA-HYPER-004', 'hyperdoctrine.axioms', `missing required hyperdoctrine axioms: ${missingAxioms.join(', ')}`);
    }
    checkEvidence(errors, profile.hyperdoctrine.evidence, 'hyperdoctrine', 'PFA-HYPER-005');
  }

  if (!isObject(profile.specializationBoundary)) {
    push(errors, 'PFA-SPEC-001', path, 'specializationBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.specializationBoundary, [
      'fourIsBooleanSpecialization',
      'fourOnlyWhenLIsBoolean',
      'booleanCollapseOptional',
      'classicalRelationIsDoubleCollapse',
      'nonFourFibersLegal',
      'activeFourCodeProjectionOnly',
    ], 'specializationBoundary', 'PFA-SPEC-002');
    checkEvidence(errors, profile.specializationBoundary.evidence, 'specializationBoundary', 'PFA-SPEC-003');
  }

  if (!isObject(profile.implementationBoundary)) {
    push(errors, 'PFA-IMPL-001', path, 'implementationBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.implementationBoundary, [
      'traceValuesCarryDeclaredFiber',
      'rejectUndeclaredFiberCarrier',
      'doNotRequireFourValues',
      'finiteProjectionMayTargetFour',
      'preserveDatumAcrossReindexing',
      'reindexingMustDeclareGeneratorClass',
    ], 'implementationBoundary', 'PFA-IMPL-002');
    checkEvidence(errors, profile.implementationBoundary.evidence, 'implementationBoundary', 'PFA-IMPL-003');
  }

  return errors;
}

export const assertValidPredicationFiberProfile = createProfileAssertion(validatePredicationFiberProfile);
