import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REQUIRED_EXTENSION_EXAMPLES = new Set([
  'enumerating-predication-cell-set',
  'sampling-a-predication-cell',
]);
const REQUIRED_RESTRICTION_EXAMPLES = new Set([
  'slicing-to-predication-cell-trace',
  'assembling-from-predication-settling',
]);
const REQUIRED_EXTENSION_LAWS = new Set(['reflexive', 'transitive']);
const VARIANCES = new Set(['extension', 'restriction', 'coincidence', 'unknown']);

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

function checkExample(errors, example, index) {
  const path = isObject(example) && hasString(example, 'exampleId') ? `examples.${example.exampleId}` : `examples.${index}`;
  if (!isObject(example)) {
    push(errors, 'GV-EX-001', path, 'example must be an object');
    return;
  }
  for (const key of ['exampleId', 'stage', 'domainShape', 'codomainShape', 'reason']) {
    if (!hasString(example, key)) {
      push(errors, 'GV-EX-002', path, `${key} must be a non-empty string`);
    }
  }
  if (!VARIANCES.has(example.variance)) {
    push(errors, 'GV-EX-003', path, `variance must be one of ${[...VARIANCES].join(', ')}`);
  }
  if (example.auditRowsRecordVariance !== true) {
    push(errors, 'GV-EX-004', path, 'auditRowsRecordVariance must be true');
  }
  checkEvidence(errors, example.evidence, path, 'GV-EX-005');

  if (example.variance === 'extension') {
    if (example.addsStructure !== true || example.preservesInput !== true) {
      push(errors, 'GV-EX-006', path, 'extension examples must add structure and preserve input');
    }
    if (!hasString(example, 'embeddingWitness')) {
      push(errors, 'GV-EX-007', path, 'extension examples must declare embeddingWitness');
    }
  }

  if (example.variance === 'restriction') {
    if (!nonEmptyStringArray(example.forgottenOrSelectedAxes)) {
      push(errors, 'GV-EX-008', path, 'restriction examples must declare forgottenOrSelectedAxes');
    }
    if (example.forgetsOnlyDeclaredAxes !== true) {
      push(errors, 'GV-EX-009', path, 'restriction examples must only forget declared axes');
    }
    if (!hasString(example, 'sourceFrontierOrSubobject')) {
      push(errors, 'GV-EX-010', path, 'restriction examples must declare sourceFrontierOrSubobject');
    }
  }

  if (example.variance === 'coincidence') {
    if (!hasString(example, 'theoremName') || !hasString(example, 'scope')) {
      push(errors, 'GV-EX-011', path, 'coincidence examples must declare theoremName and scope');
    }
    if (example.offScopeDistinct !== true) {
      push(errors, 'GV-EX-012', path, 'coincidence examples must preserve off-scope distinctness');
    }
  }

  if (example.variance === 'unknown' && example.blocksStrongConformance !== true) {
    push(errors, 'GV-EX-013', path, 'unknown examples must block strong conformance');
  }
}

export function validateGeneratorVarianceProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'GV-PROFILE-001', path: '<profile>', message: 'generator variance profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'GV-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'GV-PROFILE-003');

  if (!isObject(profile.variancePrinciples)) {
    push(errors, 'GV-PRINCIPLES-001', path, 'variancePrinciples must be declared');
  } else {
    checkBooleanTrue(errors, profile.variancePrinciples, [
      'categoryGeneratorCodomainRequired',
      'varianceDeterminesCodomainShape',
      'unknownVarianceBlocksStrongConformance',
      'extensionRestrictionAreNotTopicLabels',
      'sameNameDifferentPositionsRemainDistinct',
    ], 'variancePrinciples', 'GV-PRINCIPLES-002');
    checkEvidence(errors, profile.variancePrinciples.evidence, 'variancePrinciples', 'GV-PRINCIPLES-003');
  }

  if (!isObject(profile.extensionCriteria)) {
    push(errors, 'GV-EXT-001', path, 'extensionCriteria must be declared');
  } else {
    checkBooleanTrue(errors, profile.extensionCriteria, [
      'requiresStructurePreservingEmbedding',
      'addsAdmissibleStructure',
      'preservesBaseOperations',
      'admitsNewRowsOrPositionsOrObjects',
      'examplesRequired',
    ], 'extensionCriteria', 'GV-EXT-002');
    const laws = new Set(Array.isArray(profile.extensionCriteria.preorderLaws) ? profile.extensionCriteria.preorderLaws : []);
    const missing = missingFromSet(REQUIRED_EXTENSION_LAWS, laws);
    if (missing.length > 0) {
      push(errors, 'GV-EXT-003', 'extensionCriteria.preorderLaws', `missing required preorder laws: ${missing.join(', ')}`);
    }
    checkEvidence(errors, profile.extensionCriteria.evidence, 'extensionCriteria', 'GV-EXT-004');
  }

  if (!isObject(profile.restrictionCriteria)) {
    push(errors, 'GV-RES-001', path, 'restrictionCriteria must be declared');
  } else {
    checkBooleanTrue(errors, profile.restrictionCriteria, [
      'selectsSubstructureOrView',
      'forgetsOnlyDeclaredAxes',
      'requiresSourceFrontierOrSubobject',
      'codomainIsSubcategorySubfiberTraceOrProjection',
      'mustDeclareForgottenAxes',
      'examplesRequired',
    ], 'restrictionCriteria', 'GV-RES-002');
    checkEvidence(errors, profile.restrictionCriteria.evidence, 'restrictionCriteria', 'GV-RES-003');
  }

  if (!isObject(profile.coincidenceCriteria)) {
    push(errors, 'GV-COIN-001', path, 'coincidenceCriteria must be declared');
  } else {
    checkBooleanTrue(errors, profile.coincidenceCriteria, [
      'requiresTheoremName',
      'requiresScope',
      'doesNotCollapseMorphismPositions',
      'offScopeRemainsDistinct',
    ], 'coincidenceCriteria', 'GV-COIN-002');
    checkEvidence(errors, profile.coincidenceCriteria.evidence, 'coincidenceCriteria', 'GV-COIN-003');
  }

  if (!Array.isArray(profile.examples) || profile.examples.length === 0) {
    push(errors, 'GV-EX-014', path, 'examples must be a non-empty array');
  } else {
    profile.examples.forEach((example, index) => checkExample(errors, example, index));
    const byVariance = new Set(profile.examples.map((example) => example?.variance));
    if (!byVariance.has('extension') || !byVariance.has('restriction')) {
      push(errors, 'GV-EX-015', 'examples', 'profile must include extension and restriction examples');
    }
    const ids = new Set(profile.examples.map((example) => example?.exampleId));
    const missingExtension = missingFromSet(REQUIRED_EXTENSION_EXAMPLES, ids);
    const missingRestriction = missingFromSet(REQUIRED_RESTRICTION_EXAMPLES, ids);
    if (missingExtension.length > 0 || missingRestriction.length > 0) {
      push(errors, 'GV-EX-016', 'examples', `missing required examples: ${[...missingExtension, ...missingRestriction].join(', ')}`);
    }
  }

  if (!isObject(profile.implementationBoundary)) {
    push(errors, 'GV-IMPL-001', path, 'implementationBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.implementationBoundary, [
      'pathRoleGeneratorVarianceRequired',
      'eavtAuditRowsRecordVariance',
      'projectionArtifactsRequireRestrictionProof',
      'extensionsRequireEmbeddingWitness',
      'unknownVarianceRejectsStrongConformance',
      'checksCannotInferFromDirectoryNameAlone',
    ], 'implementationBoundary', 'GV-IMPL-002');
    checkEvidence(errors, profile.implementationBoundary.evidence, 'implementationBoundary', 'GV-IMPL-003');
  }

  return errors;
}

export const assertValidGeneratorVarianceProfile = createProfileAssertion(validateGeneratorVarianceProfile);
