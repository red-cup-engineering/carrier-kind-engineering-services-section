import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const EXPECTED = [
  ['articulating', 'aperiodic-predication-category', 'aperiodic', 'aperiodic-predication-generator'],
  ['predicating', 'transfinite-predication-category', 'transfinite', 'transfinite-homotopy-generator'],
  ['positing', 'scott-continuous-predication-category', 'scott-continuous', 'scott-continuous-category-generator'],
  ['settling', 'finite-predication-category', 'finite', 'finite-algebra-generator'],
];

const ORDER = EXPECTED.map(([name]) => name);
const CATEGORY_ORDER = 'articulating -> predicating -> positing -> settling';
const REGIME_ORDER = 'aperiodic -> transfinite -> scott-continuous -> finite';

import { isObject } from "./object-record.mjs";

export function validatePredicationStageProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'PST-PROFILE-001', path: '<profile>', message: 'predication stage profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'PST-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'PST-PROFILE-003');

  if (!Array.isArray(profile.stageOrder) || profile.stageOrder.join('\u0000') !== ORDER.join('\u0000')) {
    push(errors, 'PST-ORDER-001', path, 'stageOrder must be articulating -> predicating -> positing -> settling');
  }

  const stageByName = new Map();
  if (!Array.isArray(profile.stages) || profile.stages.length !== 4) {
    push(errors, 'PST-STAGE-001', path, 'stages must contain exactly four stage declarations');
  } else {
    for (const stage of profile.stages) {
      const stagePath = isObject(stage) && hasString(stage, 'name') ? stage.name : '<stage>';
      if (!isObject(stage)) {
        push(errors, 'PST-STAGE-002', stagePath, 'stage must be an object');
        continue;
      }
      if (!hasString(stage, 'name')) {
        push(errors, 'PST-STAGE-003', stagePath, 'stage name must be declared');
      } else if (stageByName.has(stage.name)) {
        push(errors, 'PST-STAGE-004', stagePath, 'stage names must be unique');
      } else {
        stageByName.set(stage.name, stage);
      }
      for (const key of ['inputBoundary', 'codomainBoundary']) {
        if (!hasString(stage, key)) {
          push(errors, 'PST-STAGE-005', stagePath, `${key} must be declared`);
        }
      }
      if (!nonEmptyStringArray(stage.forbids)) {
        push(errors, 'PST-STAGE-006', stagePath, 'stage must declare forbidden collapses');
      }
      checkEvidence(errors, stage.evidence, stagePath, 'PST-STAGE-007');
    }
    for (const [name, categoryReading, regime, generatorKind] of EXPECTED) {
      const stage = stageByName.get(name);
      if (!stage) {
        push(errors, 'PST-STAGE-008', path, `missing stage ${name}`);
        continue;
      }
      if (stage.categoryReading !== categoryReading) {
        push(errors, 'PST-STAGE-009', name, `${name} must map to ${categoryReading}`);
      }
      if (stage.regime !== regime) {
        push(errors, 'PST-STAGE-010', name, `${name} must map to ${regime}`);
      }
      if (stage.generatorKind !== generatorKind) {
        push(errors, 'PST-STAGE-011', name, `${name} must use ${generatorKind}`);
      }
    }
  }

  if (!isObject(profile.direction)) {
    push(errors, 'PST-DIR-001', path, 'direction must be declared');
  } else {
    if (profile.direction.categoryOrder !== CATEGORY_ORDER) {
      push(errors, 'PST-DIR-002', 'direction', `categoryOrder must be ${CATEGORY_ORDER}`);
    }
    if (profile.direction.regimeOrder !== REGIME_ORDER) {
      push(errors, 'PST-DIR-003', 'direction', `regimeOrder must be ${REGIME_ORDER}`);
    }
    if (profile.direction.downstreamOnly !== true || profile.direction.finiteDoesNotDefineUpstream !== true) {
      push(errors, 'PST-DIR-004', 'direction', 'stage direction must be downstream-only and finite must not define upstream');
    }
    checkEvidence(errors, profile.direction.evidence, 'direction', 'PST-DIR-005');
  }

  if (!isObject(profile.finiteBoundary)) {
    push(errors, 'PST-FINITE-001', path, 'finiteBoundary must be declared');
  } else {
    if (profile.finiteBoundary.fourPlacement !== 'settling-finite-predication-category') {
      push(errors, 'PST-FINITE-002', 'finiteBoundary', 'FOUR must be placed at settling finite predication category');
    }
    for (const key of ['fourSpecializationOnly', 'finiteArtifactsDownstream', 'shpFiniteProjection']) {
      if (profile.finiteBoundary[key] !== true) {
        push(errors, 'PST-FINITE-003', 'finiteBoundary', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.finiteBoundary.evidence, 'finiteBoundary', 'PST-FINITE-004');
  }

  if (!isObject(profile.prelocutionaryBoundary)) {
    push(errors, 'PST-PRELOC-001', path, 'prelocutionaryBoundary must be declared');
  } else {
    for (const key of [
      'environmentalDecodingDoesNotChooseStage',
      'typedInputDeclaresStage',
      'illocutionRequiresPositingStage',
      'perlocutionRequiresSettlingStage',
    ]) {
      if (profile.prelocutionaryBoundary[key] !== true) {
        push(errors, 'PST-PRELOC-002', 'prelocutionaryBoundary', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.prelocutionaryBoundary.evidence, 'prelocutionaryBoundary', 'PST-PRELOC-003');
  }

  return errors;
}

export const assertValidPredicationStageProfile = createProfileAssertion(validatePredicationStageProfile);
