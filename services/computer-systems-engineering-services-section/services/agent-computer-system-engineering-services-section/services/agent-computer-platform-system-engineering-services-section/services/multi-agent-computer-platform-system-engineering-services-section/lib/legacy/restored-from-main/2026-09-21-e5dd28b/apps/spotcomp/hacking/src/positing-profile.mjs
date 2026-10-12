import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const GENERATOR_ACTIONS = new Set(['specialization', 'converse', 'subject-projection', 'object-projection']);
const ROLES = new Set(['locution', 'illocution', 'perlocution']);
const EFFECTS = new Map([
  ['locution', 'environmental-decoding'],
  ['illocution', 'pure-event'],
  ['perlocution', 'closure-propagation'],
]);

import { isObject } from "./object-record.mjs";

function checkExactEavtRow(errors, row, path) {
  if (!isObject(row)) {
    push(errors, 'POS-ROW-001', path, 'row must be an object');
    return;
  }
  const keys = Object.keys(row).sort();
  if (keys.join(',') !== 'a,e,t,v') {
    push(errors, 'POS-ROW-002', path, 'EAVT row must have exactly e, a, v, and t');
  }
  for (const key of ['e', 'a', 'v', 't']) {
    if (!hasString(row, key)) {
      push(errors, 'POS-ROW-003', path, `${key} must be a non-empty string`);
    }
  }
}

export function validatePositingProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'POS-PROFILE-001', path: '<profile>', message: 'positing profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'POS-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'POS-PROFILE-003');

  if (!isObject(profile.positingMorphism)) {
    push(errors, 'POS-MORPH-001', path, 'positingMorphism must be declared');
  } else {
    const morphism = profile.positingMorphism;
    for (const key of ['id', 'categoryPosition']) {
      if (!hasString(morphism, key)) {
        push(errors, 'POS-MORPH-002', 'positingMorphism', `${key} must be declared`);
      }
    }
    if (morphism.kind !== 'scott-continuous-category-generator') {
      push(errors, 'POS-MORPH-003', 'positingMorphism', 'kind must identify positing as Scott-continuous category generator');
    }
    if (morphism.operation !== 'knowledge-order-least-extension') {
      push(errors, 'POS-MORPH-004', 'positingMorphism', 'operation must be knowledge-order least extension');
    }
    if (morphism.formula !== 'v join_k delta_(phi,q)') {
      push(errors, 'POS-MORPH-005', 'positingMorphism', 'formula must be the knowledge-join indicator extension');
    }
    for (const key of [
      'knowledgeMonotone',
      'scottContinuous',
      'leastExtension',
      'changesOnlyPredicateFiber',
      'changesOnlyEntityPairCoordinate',
      'settlingDownstream',
      'recordsDownstream',
    ]) {
      if (morphism[key] !== true) {
        push(errors, 'POS-MORPH-006', 'positingMorphism', `${key} must be true`);
      }
    }
    checkEvidence(errors, morphism.evidence, 'positingMorphism', 'POS-MORPH-007');
  }

  if (!isObject(profile.fiberParameters)) {
    push(errors, 'POS-FIBER-001', path, 'fiberParameters must be declared');
  } else {
    const fiber = profile.fiberParameters;
    if (fiber.generalCarrier !== 'L^bowtie') {
      push(errors, 'POS-FIBER-002', 'fiberParameters', 'generalCarrier must be L^bowtie');
    }
    if (fiber.entityIndex !== 'E x E') {
      push(errors, 'POS-FIBER-003', 'fiberParameters', 'entityIndex must be E x E');
    }
    if (!hasString(fiber, 'predicateCategory')) {
      push(errors, 'POS-FIBER-004', 'fiberParameters', 'predicateCategory must be declared');
    }
    if (fiber.activeSpecialization === 'FOUR/articulation-cell') {
      if (fiber.specializationOnly !== true) {
        push(errors, 'POS-FIBER-005', 'fiberParameters', 'FOUR/articulation-cell must be declared specialization-only');
      }
      if (fiber.generalDatumSchemaStatus !== 'open') {
        push(errors, 'POS-FIBER-006', 'fiberParameters', 'active FOUR specialization must keep general datum derivation open');
      }
    }
    if (!['FOUR/articulation-cell', 'none'].includes(fiber.activeSpecialization)) {
      push(errors, 'POS-FIBER-007', 'fiberParameters', 'activeSpecialization is not recognized');
    }
    if (!['derived', 'open'].includes(fiber.generalDatumSchemaStatus)) {
      push(errors, 'POS-FIBER-008', 'fiberParameters', 'generalDatumSchemaStatus is not recognized');
    }
    checkEvidence(errors, fiber.evidence, 'fiberParameters', 'POS-FIBER-009');
  }

  if (!isObject(profile.naturality)) {
    push(errors, 'POS-NAT-001', path, 'naturality must be declared');
  } else {
    const naturality = profile.naturality;
    if (!['proved-corpus', 'declared', 'open'].includes(naturality.theoremStatus)) {
      push(errors, 'POS-NAT-002', 'naturality', 'theoremStatus is not recognized');
    }
    if (naturality.equation !== 'f*(posit_(phi,q)(v)) = posit_(f*(phi),q)(f*(v))') {
      push(errors, 'POS-NAT-003', 'naturality', 'naturality equation must match the positing theorem');
    }
    if (naturality.datumPreserved !== true || naturality.twoCellStatus !== true) {
      push(errors, 'POS-NAT-004', 'naturality', 'datum preservation and 2-cell status must be declared');
    }
    const actions = new Set();
    if (!Array.isArray(naturality.generatorActions)) {
      push(errors, 'POS-NAT-005', 'naturality', 'generatorActions must be an array');
    } else {
      for (const action of naturality.generatorActions) {
        const actionPath = isObject(action) && hasString(action, 'class') ? action.class : '<generator-action>';
        if (!isObject(action)) {
          push(errors, 'POS-NAT-006', actionPath, 'generator action must be an object');
          continue;
        }
        if (!GENERATOR_ACTIONS.has(action.class)) {
          push(errors, 'POS-NAT-007', actionPath, 'generator action class is not recognized');
        } else if (actions.has(action.class)) {
          push(errors, 'POS-NAT-008', actionPath, 'generator action classes must be unique');
        } else {
          actions.add(action.class);
        }
        if (!hasString(action, 'cellAction')) {
          push(errors, 'POS-NAT-009', actionPath, 'cellAction must be declared');
        }
        if (action.valueAction !== 'q preserved') {
          push(errors, 'POS-NAT-010', actionPath, 'valueAction must preserve q');
        }
        checkEvidence(errors, action.evidence, actionPath, 'POS-NAT-011');
      }
      for (const required of GENERATOR_ACTIONS) {
        if (!actions.has(required)) {
          push(errors, 'POS-NAT-012', 'naturality', `missing generator action ${required}`);
        }
      }
    }
    if (!['witnessed', 'open'].includes(naturality.batchProjectionStatus)) {
      push(errors, 'POS-NAT-013', 'naturality', 'batchProjectionStatus is not recognized');
    }
    checkEvidence(errors, naturality.evidence, 'naturality', 'POS-NAT-014');
  }

  if (!isObject(profile.speechActFactorization)) {
    push(errors, 'POS-SPEECH-001', path, 'speechActFactorization must be declared');
  } else {
    const speech = profile.speechActFactorization;
    if (speech.distinctCategoricalPositions !== true || speech.noBundledMorphism !== true) {
      push(errors, 'POS-SPEECH-002', 'speechActFactorization', 'speech-act roles must be distinct and unbundled');
    }
    if (speech.canonicalOrder !== 'locution -> illocution -> perlocution') {
      push(errors, 'POS-SPEECH-003', 'speechActFactorization', 'canonical order must be locution -> illocution -> perlocution');
    }
    const roles = new Set();
    const positions = new Set();
    if (!Array.isArray(speech.roles)) {
      push(errors, 'POS-SPEECH-004', 'speechActFactorization', 'roles must be an array');
    } else {
      for (const role of speech.roles) {
        const rolePath = isObject(role) && hasString(role, 'name') ? role.name : '<speech-act-role>';
        if (!isObject(role)) {
          push(errors, 'POS-SPEECH-005', rolePath, 'role must be an object');
          continue;
        }
        if (!ROLES.has(role.name)) {
          push(errors, 'POS-SPEECH-006', rolePath, 'role name is not recognized');
        } else if (roles.has(role.name)) {
          push(errors, 'POS-SPEECH-007', rolePath, 'role names must be unique');
        } else {
          roles.add(role.name);
        }
        if (!hasString(role, 'categoricalPosition')) {
          push(errors, 'POS-SPEECH-008', rolePath, 'categoricalPosition must be declared');
        } else if (positions.has(role.categoricalPosition)) {
          push(errors, 'POS-SPEECH-009', rolePath, 'speech-act positions must be distinct');
        } else {
          positions.add(role.categoricalPosition);
        }
        if (role.effectBoundary !== EFFECTS.get(role.name)) {
          push(errors, 'POS-SPEECH-010', rolePath, 'effectBoundary does not match role');
        }
        if (role.name === 'illocution' && (role.noIo !== true || role.noClosureFiring !== true)) {
          push(errors, 'POS-SPEECH-011', rolePath, 'illocution must be pure with no IO and no closure firing');
        }
        if (role.name === 'perlocution' && role.closureToLeastFixedPoint !== true) {
          push(errors, 'POS-SPEECH-012', rolePath, 'perlocution must declare closure to least fixed point');
        }
        if (!hasString(role, 'role')) {
          push(errors, 'POS-SPEECH-013', rolePath, 'role description must be declared');
        }
        checkEvidence(errors, role.evidence, rolePath, 'POS-SPEECH-014');
      }
      for (const required of ROLES) {
        if (!roles.has(required)) {
          push(errors, 'POS-SPEECH-015', 'speechActFactorization', `missing speech-act role ${required}`);
        }
      }
    }
    checkEvidence(errors, speech.evidence, 'speechActFactorization', 'POS-SPEECH-016');
  }

  if (!isObject(profile.rowBoundary)) {
    push(errors, 'POS-BOUNDARY-001', path, 'rowBoundary must be declared');
  } else {
    const boundary = profile.rowBoundary;
    if (boundary.categoricalOutput !== 'predication-valuation') {
      push(errors, 'POS-BOUNDARY-002', 'rowBoundary', 'categoricalOutput must remain predication-valuation');
    }
    if (boundary.eventPresentation !== 'exact-eavt-row') {
      push(errors, 'POS-BOUNDARY-003', 'rowBoundary', 'eventPresentation must be exact-eavt-row');
    }
    if (boundary.rowsAreFiniteCarrier !== true || boundary.axesCarriedElsewhere !== true) {
      push(errors, 'POS-BOUNDARY-004', 'rowBoundary', 'rows must be finite carriers and axes must be carried elsewhere');
    }
    if (!Array.isArray(boundary.sampleRows) || boundary.sampleRows.length === 0) {
      push(errors, 'POS-BOUNDARY-005', 'rowBoundary', 'sampleRows must be non-empty');
    } else {
      boundary.sampleRows.forEach((row, index) => checkExactEavtRow(errors, row, `rowBoundary.sampleRows[${index}]`));
    }
    checkEvidence(errors, boundary.evidence, 'rowBoundary', 'POS-BOUNDARY-006');
  }

  if (!isObject(profile.downstreamBoundary)) {
    push(errors, 'POS-DOWN-001', path, 'downstreamBoundary must be declared');
  } else {
    const downstream = profile.downstreamBoundary;
    for (const key of [
      'writesArePerlocution',
      'closureFiringIsPerlocution',
      'logsArePresentations',
      'positionValueProjectedFromTrace',
      'entryDoesNotCarryChargeField',
    ]) {
      if (downstream[key] !== true) {
        push(errors, 'POS-DOWN-002', 'downstreamBoundary', `${key} must be true`);
      }
    }
    checkEvidence(errors, downstream.evidence, 'downstreamBoundary', 'POS-DOWN-003');
  }

  return errors;
}

export const assertValidPositingProfile = createProfileAssertion(validatePositingProfile);
