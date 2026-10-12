import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REQUIRED_POSITIONS = new Set([
  'external-player',
  'modeled-player',
  'character',
  'persona',
  'role',
  'skill',
  'method-or-tool',
  'cgs-strategy',
]);
const PLAYER_KINDS = new Set(['character', 'peer', 'operator', 'inference-model', 'application', 'user', 'system', 'observer']);

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

function checkRequiredStrings(errors, object, keys, path, code) {
  for (const key of keys) {
    if (!hasString(object, key)) {
      push(errors, code, path, `${key} must be declared`);
    }
  }
}

export function validatePlayerCharacterProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'PCB-PROFILE-001', path: '<profile>', message: 'player character profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'PCB-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'PCB-PROFILE-003');

  if (!isObject(profile.taxonomy)) {
    push(errors, 'PCB-TAXONOMY-001', path, 'taxonomy must be declared');
  } else {
    const positions = new Set(Array.isArray(profile.taxonomy.distinctPositions) ? profile.taxonomy.distinctPositions : []);
    const missingPositions = missingFromSet(REQUIRED_POSITIONS, positions);
    if (missingPositions.length > 0) {
      push(errors, 'PCB-TAXONOMY-002', 'taxonomy.distinctPositions', `missing required positions: ${missingPositions.join(', ')}`);
    }
    checkBooleanTrue(errors, profile.taxonomy, [
      'externalPlayerIsNotModel',
      'characterIsPlayerKindNotPlayerDefinition',
      'personaScopesRoles',
      'rolesBundleSkills',
      'skillsInvokeMethodsOrTools',
    ], 'taxonomy', 'PCB-TAXONOMY-003');
    checkEvidence(errors, profile.taxonomy.evidence, 'taxonomy', 'PCB-TAXONOMY-004');
  }

  if (!isObject(profile.externalModelBoundary)) {
    push(errors, 'PCB-BOUNDARY-001', path, 'externalModelBoundary must be declared');
  } else {
    checkRequiredStrings(errors, profile.externalModelBoundary, [
      'externalPlayerRef',
      'modeledPlayerRef',
    ], 'externalModelBoundary', 'PCB-BOUNDARY-002');
    if (!PLAYER_KINDS.has(profile.externalModelBoundary.playerKind)) {
      push(errors, 'PCB-BOUNDARY-003', 'externalModelBoundary', 'playerKind is not recognized');
    }
    if (profile.externalModelBoundary.externalPlayerRef === profile.externalModelBoundary.modeledPlayerRef) {
      push(errors, 'PCB-BOUNDARY-004', 'externalModelBoundary', 'externalPlayerRef and modeledPlayerRef must remain distinct');
    }
    checkBooleanTrue(errors, profile.externalModelBoundary, [
      'systemHoldsSettling',
      'externalEntityNotMutatedByModel',
      'settlingRepresentsModel',
    ], 'externalModelBoundary', 'PCB-BOUNDARY-005');
    checkEvidence(errors, profile.externalModelBoundary.evidence, 'externalModelBoundary', 'PCB-BOUNDARY-006');
  }

  if (!isObject(profile.characterLayer)) {
    push(errors, 'PCB-CHAR-001', path, 'characterLayer must be declared');
  } else {
    if (profile.characterLayer.requiredWhenPlayerKindIsCharacter !== true) {
      push(errors, 'PCB-CHAR-002', 'characterLayer', 'requiredWhenPlayerKindIsCharacter must be true');
    }
    if (profile.externalModelBoundary?.playerKind === 'character') {
      checkRequiredStrings(errors, profile.characterLayer, [
        'characterRef',
        'personaRef',
        'identitySurface',
        'memorySurface',
        'governanceSurface',
      ], 'characterLayer', 'PCB-CHAR-003');
      if (!nonEmptyStringArray(profile.characterLayer.roleRefs)) {
        push(errors, 'PCB-CHAR-004', 'characterLayer', 'roleRefs must be non-empty strings');
      }
    }
    checkBooleanTrue(errors, profile.characterLayer, [
      'teachingDistinctFromInstallation',
      'installationDistinctFromPlayerBinding',
    ], 'characterLayer', 'PCB-CHAR-005');
    checkEvidence(errors, profile.characterLayer.evidence, 'characterLayer', 'PCB-CHAR-006');
  }

  if (!isObject(profile.skillOperatorLayer)) {
    push(errors, 'PCB-SKILL-001', path, 'skillOperatorLayer must be declared');
  } else {
    checkBooleanTrue(errors, profile.skillOperatorLayer, [
      'skillsAreTypedOperators',
      'skillFirstPolicy',
      'operatorsMonotone',
      'operatorsClosureCompatible',
      'operatorsFragmentPreserving',
      'failureMonotone',
      'skillImprovementIsClosure',
    ], 'skillOperatorLayer', 'PCB-SKILL-002');
    if (!Array.isArray(profile.skillOperatorLayer.skills) || profile.skillOperatorLayer.skills.length === 0) {
      push(errors, 'PCB-SKILL-003', 'skillOperatorLayer.skills', 'skills must be a non-empty array');
    } else {
      const roleRefs = new Set(Array.isArray(profile.characterLayer?.roleRefs) ? profile.characterLayer.roleRefs : []);
      for (const skill of profile.skillOperatorLayer.skills) {
        const skillPath = isObject(skill) && hasString(skill, 'id') ? skill.id : '<skill>';
        if (!isObject(skill)) {
          push(errors, 'PCB-SKILL-004', skillPath, 'skill must be an object');
          continue;
        }
        checkRequiredStrings(errors, skill, ['id', 'roleRef', 'capabilityBound', 'methodOrToolSurface'], skillPath, 'PCB-SKILL-005');
        if (roleRefs.size > 0 && !roleRefs.has(skill.roleRef)) {
          push(errors, 'PCB-SKILL-006', skillPath, `skill roleRef ${skill.roleRef} is not declared on characterLayer`);
        }
        checkEvidence(errors, skill.evidence, skillPath, 'PCB-SKILL-007');
      }
    }
  }

  if (!isObject(profile.localSettlingLayer)) {
    push(errors, 'PCB-LOCAL-001', path, 'localSettlingLayer must be declared');
  } else {
    checkRequiredStrings(errors, profile.localSettlingLayer, [
      'localSettlingRef',
      'observationFrontierRef',
      'actionBoundRef',
      'capabilityFiberRef',
      'governanceRef',
      'epistemicProfileRef',
      'normativeProfileRef',
    ], 'localSettlingLayer', 'PCB-LOCAL-002');
    checkBooleanTrue(errors, profile.localSettlingLayer, [
      'boundedRestrictionOfUniversalSettling',
      'sigmaDeltaCommutationDeclared',
    ], 'localSettlingLayer', 'PCB-LOCAL-003');
    checkEvidence(errors, profile.localSettlingLayer.evidence, 'localSettlingLayer', 'PCB-LOCAL-004');
  }

  if (!isObject(profile.cgsBinding)) {
    push(errors, 'PCB-CGS-001', path, 'cgsBinding must be declared');
  } else {
    checkRequiredStrings(errors, profile.cgsBinding, [
      'cgsProfileRef',
      'strategyRef',
      'observationMapRef',
      'symmetryQuotientRef',
    ], 'cgsBinding', 'PCB-CGS-002');
    checkBooleanTrue(errors, profile.cgsBinding, [
      'opponentEventsFromObservations',
      'playerEventsFromActions',
      'polarityNotIdentity',
    ], 'cgsBinding', 'PCB-CGS-003');
    checkEvidence(errors, profile.cgsBinding.evidence, 'cgsBinding', 'PCB-CGS-004');
  }

  if (!isObject(profile.implementationBoundary)) {
    push(errors, 'PCB-IMPL-001', path, 'implementationBoundary must be declared');
  } else {
    checkBooleanTrue(errors, profile.implementationBoundary, [
      'identifierKeyInboxOutboxInsufficient',
      'mustDeclareLocalSettling',
      'mustDeclareCharacterBindingForCharacterKind',
      'mustDeclareHandedness',
      'mustDeclareGovernanceAndCapabilities',
      'mustDeclareCgsStrategy',
      'mustPreserveTeachingInstallationBindingDistinction',
    ], 'implementationBoundary', 'PCB-IMPL-002');
    checkEvidence(errors, profile.implementationBoundary.evidence, 'implementationBoundary', 'PCB-IMPL-003');
  }

  return errors;
}

export const assertValidPlayerCharacterProfile = createProfileAssertion(validatePlayerCharacterProfile);
