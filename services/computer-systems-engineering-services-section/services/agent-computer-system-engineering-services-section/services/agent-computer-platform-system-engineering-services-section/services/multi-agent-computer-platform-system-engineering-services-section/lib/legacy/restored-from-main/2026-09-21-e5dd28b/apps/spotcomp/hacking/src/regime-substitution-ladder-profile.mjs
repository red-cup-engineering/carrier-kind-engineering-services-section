import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, checkSection, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

const requiredPlacements = new Map([
  ['padovan', { stepDepth: 3, placementRegime: 'finite-strict', stageCategory: 'settling-finite' }],
  ['fibonacci', { stepDepth: 2, placementRegime: 'scott-continuous', stageCategory: 'positing-scott-continuous' }],
  ['tribonacci', { stepDepth: 3, placementRegime: 'transfinite', stageCategory: 'predicating-transfinite' }],
]);

function checkNamedPlacements(errors, profile) {
  const placements = profile.namedPlacements;
  if (!Array.isArray(placements)) {
    push(errors, 'RSL-PLACEMENT-001', 'namedPlacements', 'namedPlacements must be declared');
    return;
  }
  const byName = new Map();
  placements.forEach((placement, index) => {
    const path = `namedPlacements[${index}]`;
    if (!isObject(placement)) {
      push(errors, 'RSL-PLACEMENT-002', path, 'placement must be an object');
      return;
    }
    if (!hasString(placement, 'name')) {
      push(errors, 'RSL-PLACEMENT-003', `${path}.name`, 'name must be a non-empty string');
      return;
    }
    byName.set(placement.name.toLowerCase(), { placement, path });
    checkEvidence(errors, placement.evidence, path, 'RSL-PLACEMENT-004');
    if (!Number.isInteger(placement.stepDepth) || placement.stepDepth < 1) {
      push(errors, 'RSL-PLACEMENT-005', `${path}.stepDepth`, 'stepDepth must be a positive integer');
    }
    for (const key of ['placementRegime', 'stageCategory', 'benchmarkLiftStatus']) {
      if (!hasString(placement, key)) {
        push(errors, 'RSL-PLACEMENT-006', `${path}.${key}`, `${key} must be a non-empty string`);
      }
    }
  });

  for (const [name, expected] of requiredPlacements) {
    const entry = byName.get(name);
    if (!entry) {
      push(errors, 'RSL-PLACEMENT-007', `namedPlacements.${name}`, `${name} placement must be declared`);
      continue;
    }
    const { placement, path } = entry;
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (placement[key] !== expectedValue) {
        push(errors, 'RSL-PLACEMENT-008', `${path}.${key}`, `${name} ${key} must be ${expectedValue}`);
      }
    }
  }
}

export function validateRegimeSubstitutionLadderProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'RSL-PROFILE-001', path: '<profile>', message: 'regime substitution ladder profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'RSL-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'RSL-PROFILE-003');
  checkNamedPlacements(errors, profile);

  checkSection(errors, profile, 'placementLadder', [
    'padovanFinitePlacement',
    'fibonacciScottContinuousPlacement',
    'tribonacciTransfinitePlacement',
    'stagePlacementSeparatedFromStepDepth',
    'laterFamiliesRequireDeclaredPlacement',
    'noGenericAperiodicFromName',
  ], 'RSL-LADDER');

  checkSection(errors, profile, 'benchmarkLiftBoundary', [
    'omega1LiftRecognized',
    'benchmarkRegimeNotDefaultPlacement',
    'baseCofinalityRequired',
    'lambdaBoundRequired',
    'liftMayBeAperiodic',
    'suiteCoverageNotNormativePlacement',
  ], 'RSL-LIFT');

  checkSection(errors, profile, 'stepNAndBilattice', [
    'stepDepthDeclared',
    'moduliSubstackDeclared',
    'alphabetCardinalityDeclared',
    'bilatticeCardinalityBoundaryDeclared',
    'structuralAlignmentRequiresOperationCommutation',
    'thueMorsePositiveCaseSeparated',
    'nGreaterThanFourNoFourCardinalityShortcut',
  ], 'RSL-STEP');

  checkSection(errors, profile, 'implementationBoundary', [
    'noNameOnlyRegimeInference',
    'noAlphabetOnlyRegimeInference',
    'noStepDepthOnlyRegimeInference',
    'noBenchmarkSuiteAsNormativePlacement',
    'unknownPlacementBlocksStrongConformance',
    'codeRemainsProbe',
  ], 'RSL-IMPLEMENTATION');

  return errors;
}

export const assertValidRegimeSubstitutionLadderProfile = createProfileAssertion(validateRegimeSubstitutionLadderProfile);
