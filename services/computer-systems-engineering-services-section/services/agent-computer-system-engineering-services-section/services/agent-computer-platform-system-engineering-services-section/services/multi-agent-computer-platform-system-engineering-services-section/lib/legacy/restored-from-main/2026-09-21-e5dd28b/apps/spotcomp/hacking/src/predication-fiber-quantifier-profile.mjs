import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const COVERED_MORPHISMS = new Set(['converse', 'subject-projection', 'object-projection']);
const ORDERS = new Set(['knowledge', 'truth']);
const FOLD_OPERATIONS = new Set(['join', 'meet']);
const BOUNDARY_KEYS = [
  'specializationQuantifierProofOpen',
  'finiteBooleanProbeOnly',
  'notFullHyperdoctrineProof',
  'notFourSubstrate',
  'beckChevalleyStillObligation',
  'frobeniusStillObligation',
  'comprehensionStillObligation',
];

import { isObject } from "./object-record.mjs";

function missingFromSet(expected, actual) {
  return [...expected].filter((item) => !actual.has(item));
}

function checkBooleanTrue(errors, object, keys, path, code) {
  for (const key of keys) {
    if (object[key] !== true) {
      push(errors, code, `${path}.${key}`, `${key} must be true`);
    }
  }
}

function checkOrderRule(errors, rule, path, expectedFold, expectedFill) {
  if (!isObject(rule)) {
    push(errors, 'PFQ-ORDER-001', path, 'order rule must be declared');
    return;
  }
  if (!ORDERS.has(rule.order)) {
    push(errors, 'PFQ-ORDER-002', path, 'order must be knowledge or truth');
  }
  if (!FOLD_OPERATIONS.has(rule.fold)) {
    push(errors, 'PFQ-ORDER-003', path, 'fold must be join or meet');
  } else if (rule.fold !== expectedFold) {
    push(errors, 'PFQ-ORDER-004', path, `fold must be ${expectedFold}`);
  }
  if (rule.fillOutsideImage !== expectedFill) {
    push(errors, 'PFQ-ORDER-005', path, `fillOutsideImage must be ${expectedFill}`);
  }
}

export function validatePredicationFiberQuantifierProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'PFQ-PROFILE-001', path: '<profile>', message: 'predication fiber quantifier profile must be an object' }];
  }

  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'PFQ-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'PFQ-PROFILE-003');

  if (!isObject(profile.reindexing)) {
    push(errors, 'PFQ-REINDEX-001', path, 'reindexing must be declared');
  } else {
    const reindexing = profile.reindexing;
    if (reindexing.symbol !== 'f*') {
      push(errors, 'PFQ-REINDEX-002', 'reindexing.symbol', 'reindexing symbol must be f*');
    }
    if (reindexing.type !== 'A_q -> A_p') {
      push(errors, 'PFQ-REINDEX-003', 'reindexing.type', 'reindexing type must be A_q -> A_p');
    }
    const morphisms = new Set(Array.isArray(reindexing.coveredMorphismKinds) ? reindexing.coveredMorphismKinds : []);
    const missing = missingFromSet(COVERED_MORPHISMS, morphisms);
    if (missing.length > 0) {
      push(errors, 'PFQ-REINDEX-004', 'reindexing.coveredMorphismKinds', `missing covered morphisms: ${missing.join(', ')}`);
    }
    checkBooleanTrue(errors, reindexing, [
      'converseSwapsSubjectObject',
      'subjectProjectionReadsSubjectDiagonal',
      'objectProjectionReadsObjectDiagonal',
      'preservesDatum',
      'notRowRewrite',
    ], 'reindexing', 'PFQ-REINDEX-005');
    checkEvidence(errors, reindexing.evidence, 'reindexing', 'PFQ-REINDEX-006');
  }

  if (!isObject(profile.existential)) {
    push(errors, 'PFQ-EXISTS-001', path, 'existential must be declared');
  } else {
    const existential = profile.existential;
    if (existential.symbol !== 'exists_f') {
      push(errors, 'PFQ-EXISTS-002', 'existential.symbol', 'existential symbol must be exists_f');
    }
    if (existential.adjointPosition !== 'left-adjoint-to-reindexing') {
      push(errors, 'PFQ-EXISTS-003', 'existential.adjointPosition', 'existential must be left adjoint to reindexing');
    }
    if (existential.law !== 'exists_f(w) <= v iff w <= f*(v)') {
      push(errors, 'PFQ-EXISTS-004', 'existential.law', 'existential law is not the required adjunction');
    }
    if (existential.outputFiber !== 'target-predicate') {
      push(errors, 'PFQ-EXISTS-005', 'existential.outputFiber', 'existential output fiber must be target-predicate');
    }
    const rules = Array.isArray(existential.orderRules) ? existential.orderRules : [];
    const seen = new Set(rules.map((rule) => rule?.order));
    for (const order of ORDERS) {
      if (!seen.has(order)) {
        push(errors, 'PFQ-EXISTS-006', 'existential.orderRules', `missing ${order} order rule`);
      }
    }
    for (const [index, rule] of rules.entries()) {
      checkOrderRule(errors, rule, `existential.orderRules[${index}]`, 'join', `${rule?.order}-bottom`);
    }
    checkEvidence(errors, existential.evidence, 'existential', 'PFQ-EXISTS-007');
  }

  if (!isObject(profile.universal)) {
    push(errors, 'PFQ-FORALL-001', path, 'universal must be declared');
  } else {
    const universal = profile.universal;
    if (universal.symbol !== 'forall_f') {
      push(errors, 'PFQ-FORALL-002', 'universal.symbol', 'universal symbol must be forall_f');
    }
    if (universal.adjointPosition !== 'right-adjoint-to-reindexing') {
      push(errors, 'PFQ-FORALL-003', 'universal.adjointPosition', 'universal must be right adjoint to reindexing');
    }
    if (universal.law !== 'v <= forall_f(w) iff f*(v) <= w') {
      push(errors, 'PFQ-FORALL-004', 'universal.law', 'universal law is not the required adjunction');
    }
    if (universal.outputFiber !== 'target-predicate') {
      push(errors, 'PFQ-FORALL-005', 'universal.outputFiber', 'universal output fiber must be target-predicate');
    }
    const rules = Array.isArray(universal.orderRules) ? universal.orderRules : [];
    const seen = new Set(rules.map((rule) => rule?.order));
    for (const order of ORDERS) {
      if (!seen.has(order)) {
        push(errors, 'PFQ-FORALL-006', 'universal.orderRules', `missing ${order} order rule`);
      }
    }
    for (const [index, rule] of rules.entries()) {
      checkOrderRule(errors, rule, `universal.orderRules[${index}]`, 'meet', `${rule?.order}-top`);
    }
    checkEvidence(errors, universal.evidence, 'universal', 'PFQ-FORALL-007');
  }

  if (!isObject(profile.orderSeparation)) {
    push(errors, 'PFQ-SEPARATION-001', path, 'orderSeparation must be declared');
  } else {
    checkBooleanTrue(errors, profile.orderSeparation, [
      'knowledgeAndTruthAdjunctionsDistinct',
      'truthQuantificationNotKnowledgeQuantification',
      'fusionNotHyperdoctrineMeet',
      'noFusionFrobeniusGeneralLaw',
      'noFourCollapse',
    ], 'orderSeparation', 'PFQ-SEPARATION-002');
    checkEvidence(errors, profile.orderSeparation.evidence, 'orderSeparation', 'PFQ-SEPARATION-003');
  }

  if (!isObject(profile.probeBoundary)) {
    push(errors, 'PFQ-BOUNDARY-001', path, 'probeBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.probeBoundary, BOUNDARY_KEYS, 'probeBoundary', 'PFQ-BOUNDARY-002');
    checkEvidence(errors, profile.probeBoundary.evidence, 'probeBoundary', 'PFQ-BOUNDARY-003');
  }

  return errors;
}

export const assertValidPredicationFiberQuantifierProfile = createProfileAssertion(validatePredicationFiberQuantifierProfile);
