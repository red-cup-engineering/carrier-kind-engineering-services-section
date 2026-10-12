import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
import { isObject } from "./object-record.mjs";

function checkBooleanTrue(errors, object, keys, path, code) {
  for (const key of keys) {
    if (object[key] !== true) {
      push(errors, code, `${path}.${key}`, `${key} must be true`);
    }
  }
}

function checkSection(errors, profile, sectionName, keys, codePrefix) {
  const section = profile[sectionName];
  if (!isObject(section)) {
    push(errors, `${codePrefix}-001`, sectionName, `${sectionName} must be declared`);
    return undefined;
  }
  checkBooleanTrue(errors, section, keys, sectionName, `${codePrefix}-002`);
  checkEvidence(errors, section.evidence, sectionName, `${codePrefix}-003`);
  return section;
}

function isSquareNumberMatrix(matrix) {
  return Array.isArray(matrix)
    && matrix.length > 0
    && matrix.every((row) => Array.isArray(row)
      && row.length === matrix.length
      && row.every((item) => Number.isFinite(item)));
}

function determinant(matrix) {
  if (!isSquareNumberMatrix(matrix)) {
    return undefined;
  }
  if (matrix.length === 1) {
    return matrix[0][0];
  }
  if (matrix.length === 2) {
    return (matrix[0][0] * matrix[1][1]) - (matrix[0][1] * matrix[1][0]);
  }
  return matrix[0].reduce((sum, entry, column) => {
    const minor = matrix.slice(1).map((row) => row.filter((_, index) => index !== column));
    return sum + ((column % 2 === 0 ? 1 : -1) * entry * determinant(minor));
  }, 0);
}

function checkSubstitutionMatrix(errors, substitution) {
  if (!Array.isArray(substitution?.alphabet) || substitution.alphabet.length < 2) {
    push(errors, 'ASW-SUBSTITUTION-004', 'substitutionWitness.alphabet', 'alphabet must contain at least two letters');
    return;
  }
  if (!isSquareNumberMatrix(substitution.substitutionMatrix)) {
    push(errors, 'ASW-SUBSTITUTION-005', 'substitutionWitness.substitutionMatrix', 'substitutionMatrix must be a non-empty square numeric matrix');
    return;
  }
  if (substitution.substitutionMatrix.length !== substitution.alphabet.length) {
    push(errors, 'ASW-SUBSTITUTION-006', 'substitutionWitness.substitutionMatrix', 'matrix dimension must match alphabet size');
  }
  if (Number.isInteger(substitution.stepDepth) && substitution.stepDepth !== substitution.alphabet.length) {
    push(errors, 'ASW-SUBSTITUTION-007', 'substitutionWitness.stepDepth', 'stepDepth must match alphabet size for this declaration profile');
  }

  const det = determinant(substitution.substitutionMatrix);
  if (det === 0 && substitution.rankNClaimed === true && substitution.singularDowngradeDeclared !== true) {
    push(errors, 'ASW-SUBSTITUTION-008', 'substitutionWitness.rankNClaimed', 'singular substitutions cannot claim generic rank n without downgrade');
  }
  if (det !== 0 && substitution.nonSingularStatusDeclared !== true) {
    push(errors, 'ASW-SUBSTITUTION-009', 'substitutionWitness.nonSingularStatusDeclared', 'non-singular substitutions must declare non-singular status');
  }
}

function checkBilatticeAlignment(errors, section) {
  if (section?.bilatticeAlignmentClaimed !== true) {
    return;
  }
  if (!hasString(section, 'alphabetMap')) {
    push(errors, 'ASW-BILATTICE-004', 'bilatticeAlignment.alphabetMap', 'claimed alignment must name the alphabet map');
  }
  if (!hasString(section, 'bilatticeOperation')) {
    push(errors, 'ASW-BILATTICE-005', 'bilatticeAlignment.bilatticeOperation', 'claimed alignment must name the bilattice operation');
  }
  if (section.operationCommutationWitnessDeclared !== true) {
    push(errors, 'ASW-BILATTICE-006', 'bilatticeAlignment.operationCommutationWitnessDeclared', 'claimed alignment must cite commutation evidence');
  }
  if (section.cardinalityOnlyRejected !== true) {
    push(errors, 'ASW-BILATTICE-007', 'bilatticeAlignment.cardinalityOnlyRejected', 'cardinality coincidence alone is insufficient');
  }
}

export function validateAperiodicSwarmWitnessProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'ASW-PROFILE-001', path: '<profile>', message: 'aperiodic swarm witness profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'ASW-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'ASW-PROFILE-003');

  checkSection(errors, profile, 'settlingWitness', [
    'modeledPlayersAsLocalSettlings',
    'universalSettlingBoundDeclared',
    'closureOrdinalAperiodicDeclared',
    'finiteWindowsAsProjections',
  ], 'ASW-SETTLING');

  const substitution = checkSection(errors, profile, 'substitutionWitness', [
    'substitutionRuleDeclared',
    'substitutionMatrixDeclared',
    'stepDepthDeclared',
    'closureRuleReadsPriorStages',
    'noFourExceptionalization',
  ], 'ASW-SUBSTITUTION');
  checkSubstitutionMatrix(errors, substitution);

  checkSection(errors, profile, 'directLimitWitness', [
    'andersonPutnamShapeDeclared',
    'finiteApproximantsDeclared',
    'transitionMapsDeclared',
    'directLimitCohomologyDeclared',
    'h1ClassifyingInvariantDeclared',
  ], 'ASW-DIRECT');

  checkSection(errors, profile, 'mldWitness', [
    'commonBaseScopeDeclared',
    'settlingMorphismDeclared',
    'invertibleLocalDerivationsDeclared',
    'settlingShiftEquivalenceDeclared',
    'classifyingInvariantEqualityCriterion',
  ], 'ASW-MLD');

  checkSection(errors, profile, 'bigradedInvariantWitness', [
    'truthRowPreserved',
    'inconsistencyRowPreserved',
    'h1TruthSlotDeclared',
    'h1TopSlotDeclared',
    'coClassifyingInvariantStatusDeclared',
    'verdierDualityStatusDeclared',
  ], 'ASW-BIGRADED');

  const bilattice = checkSection(errors, profile, 'bilatticeAlignment', [
    'fourNotExceptional',
    'cardinalityOnlyRejected',
    'operationCommutationRequired',
  ], 'ASW-BILATTICE');
  checkBilatticeAlignment(errors, bilattice);

  checkSection(errors, profile, 'weightedSwarmBoundary', [
    'weightsDeclaredWhenUsed',
    'stabilityConeOrDowngradeDeclared',
    'rankClaimsConditionedOnStability',
    'protocolWeightsNotHiddenTopology',
  ], 'ASW-WEIGHTED');

  checkSection(errors, profile, 'implementationBoundary', [
    'notPeerCount',
    'notClockJitter',
    'notGraphTopologyAlone',
    'singularMatrixDowngradesRankClaims',
    'unknownWitnessBlocksStrongAperiodicConformance',
    'codeRemainsProbe',
  ], 'ASW-IMPLEMENTATION');

  return errors;
}

export const assertValidAperiodicSwarmWitnessProfile = createProfileAssertion(validateAperiodicSwarmWitnessProfile);
