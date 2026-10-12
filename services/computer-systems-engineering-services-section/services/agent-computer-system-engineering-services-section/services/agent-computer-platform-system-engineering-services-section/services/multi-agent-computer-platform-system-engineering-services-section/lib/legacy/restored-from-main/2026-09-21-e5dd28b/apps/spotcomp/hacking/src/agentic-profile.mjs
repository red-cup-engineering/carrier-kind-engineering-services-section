import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, push } from "./profile-admission.mjs";
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const EFFECT_CLASSES = new Set(['read-only', 'trace-append', 'tool-actuation', 'federation', 'governance']);
const SIDE_EFFECTING = new Set(['trace-append', 'tool-actuation', 'federation', 'governance']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}


function isSlug(value) {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
}


export function validateAgenticProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'AGENTIC-PROFILE-001', path: '<profile>', message: 'agentic profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'AGENTIC-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'AGENTIC-PROFILE-003');

  if (!isObject(profile.system)) {
    push(errors, 'AGENTIC-SYSTEM-001', path, 'system must be declared');
    return errors;
  }
  const system = profile.system;
  if (!isSlug(system.id)) {
    push(errors, 'AGENTIC-SYSTEM-002', 'system', 'system id must be a slug');
  }
  if (!nonEmptyStringArray(system.memberSet) || system.memberSet.some((item) => !isSlug(item))) {
    push(errors, 'AGENTIC-SYSTEM-003', system.id ?? 'system', 'memberSet must be non-empty slugs');
  }
  for (const key of ['governanceProcess', 'governingSoul']) {
    if (!hasString(system, key)) {
      push(errors, 'AGENTIC-SYSTEM-004', system.id ?? 'system', `${key} must be declared`);
    }
  }
  checkEvidence(errors, system.evidence, system.id ?? 'system', 'AGENTIC-SYSTEM-005');

  if (!Array.isArray(profile.characters) || profile.characters.length === 0) {
    push(errors, 'AGENTIC-CHAR-001', path, 'characters must be a non-empty array');
    return errors;
  }
  const characters = new Map();
  for (const character of profile.characters) {
    const charPath = isObject(character) && hasString(character, 'slug') ? character.slug : '<character>';
    if (!isObject(character)) {
      push(errors, 'AGENTIC-CHAR-002', charPath, 'character must be an object');
      continue;
    }
    if (!isSlug(character.slug)) {
      push(errors, 'AGENTIC-CHAR-003', charPath, 'character slug must be a slug');
    } else if (characters.has(character.slug)) {
      push(errors, 'AGENTIC-CHAR-004', character.slug, 'character slugs must be unique');
    } else {
      characters.set(character.slug, character);
    }
    for (const key of ['agentKind', 'governanceRegime', 'identityKey', 'behavioralSpaceBound']) {
      if (!hasString(character, key)) {
        push(errors, 'AGENTIC-CHAR-005', charPath, `${key} must be declared`);
      }
    }
    if (!nonEmptyStringArray(character.skills) || character.skills.some((item) => !isSlug(item))) {
      push(errors, 'AGENTIC-CHAR-006', charPath, 'skills must be non-empty slugs');
    }
    if (!nonEmptyStringArray(character.memberOf) || !character.memberOf.includes(system.id)) {
      push(errors, 'AGENTIC-CHAR-007', charPath, 'memberOf must include the declared system id');
    }
    if (typeof character.commutesWithSigma !== 'boolean' || typeof character.commutesWithDelta !== 'boolean') {
      push(errors, 'AGENTIC-CHAR-008', charPath, 'sigma/delta commutation declarations must be boolean');
    }
    if (!isObject(character.agenticConditions)) {
      push(errors, 'AGENTIC-CHAR-009', charPath, 'agenticConditions must be declared');
    } else {
      for (const key of ['environmentalAction', 'goalDirectedPlanning', 'persistentState']) {
        if (!hasString(character.agenticConditions, key)) {
          push(errors, 'AGENTIC-CHAR-010', charPath, `agenticConditions.${key} must be declared`);
        }
      }
    }
    checkEvidence(errors, character.evidence, charPath, 'AGENTIC-CHAR-011');
  }

  for (const member of system.memberSet ?? []) {
    if (!characters.has(member)) {
      push(errors, 'AGENTIC-SYSTEM-006', system.id ?? 'system', `memberSet references unknown character ${member}`);
    }
  }

  const skills = new Map();
  for (const skill of profile.skills ?? []) {
    const skillPath = isObject(skill) && hasString(skill, 'slug') ? skill.slug : '<skill>';
    if (!isObject(skill)) {
      push(errors, 'AGENTIC-SKILL-001', skillPath, 'skill must be an object');
      continue;
    }
    if (!isSlug(skill.slug)) {
      push(errors, 'AGENTIC-SKILL-002', skillPath, 'skill slug must be a slug');
    } else if (skills.has(skill.slug)) {
      push(errors, 'AGENTIC-SKILL-003', skill.slug, 'skill slugs must be unique');
    } else {
      skills.set(skill.slug, skill);
    }
    if (!EFFECT_CLASSES.has(skill.effectClass)) {
      push(errors, 'AGENTIC-SKILL-004', skillPath, 'effectClass is not recognized');
    }
    for (const key of ['capabilityBound', 'surface']) {
      if (!hasString(skill, key)) {
        push(errors, 'AGENTIC-SKILL-005', skillPath, `${key} must be declared`);
      }
    }
    if (SIDE_EFFECTING.has(skill.effectClass)) {
      if (!hasString(skill, 'actionBound')) {
        push(errors, 'AGENTIC-SKILL-006', skillPath, 'side-effecting skill must declare actionBound');
      }
      if (!hasString(skill, 'governance')) {
        push(errors, 'AGENTIC-SKILL-007', skillPath, 'side-effecting skill must declare governance');
      }
    }
    checkEvidence(errors, skill.evidence, skillPath, 'AGENTIC-SKILL-008');
  }

  for (const character of characters.values()) {
    for (const skillSlug of character.skills ?? []) {
      if (!skills.has(skillSlug)) {
        push(errors, 'AGENTIC-CHAR-012', character.slug, `character references unknown skill ${skillSlug}`);
      }
    }
  }

  if (!Array.isArray(profile.playerBindings) || profile.playerBindings.length === 0) {
    push(errors, 'AGENTIC-BINDING-001', path, 'playerBindings must be a non-empty array');
  }
  const boundCharacters = new Set();
  for (const binding of Array.isArray(profile.playerBindings) ? profile.playerBindings : []) {
    const bindingPath = isObject(binding) && hasString(binding, 'playerId') ? binding.playerId : '<binding>';
    if (!isObject(binding)) {
      push(errors, 'AGENTIC-BINDING-002', bindingPath, 'player binding must be an object');
      continue;
    }
    if (!characters.has(binding.character)) {
      push(errors, 'AGENTIC-BINDING-003', bindingPath, `binding references unknown character ${binding.character}`);
    } else {
      boundCharacters.add(binding.character);
    }
    for (const key of ['playerId', 'inbox', 'outbox', 'localSettling', 'cgsProfile']) {
      if (!hasString(binding, key)) {
        push(errors, 'AGENTIC-BINDING-004', bindingPath, `${key} must be declared`);
      }
    }
    if (!isObject(binding.handedness)) {
      push(errors, 'AGENTIC-BINDING-005', bindingPath, 'handedness must be declared');
    } else {
      for (const key of ['recv', 'send', 'actuate', 'observe']) {
        if (!hasString(binding.handedness, key)) {
          push(errors, 'AGENTIC-BINDING-006', bindingPath, `handedness.${key} must be declared`);
        }
      }
    }
    checkEvidence(errors, binding.evidence, bindingPath, 'AGENTIC-BINDING-007');
  }

  if (!isObject(profile.swarm)) {
    push(errors, 'AGENTIC-SWARM-001', path, 'swarm must be declared');
    return errors;
  }
  const swarm = profile.swarm;
  if (!isSlug(swarm.id)) {
    push(errors, 'AGENTIC-SWARM-002', 'swarm', 'swarm id must be a slug');
  }
  if (!nonEmptyStringArray(swarm.participants) || swarm.participants.some((item) => !isSlug(item))) {
    push(errors, 'AGENTIC-SWARM-003', swarm.id ?? 'swarm', 'participants must be non-empty slugs');
  }
  for (const participant of swarm.participants ?? []) {
    if (!characters.has(participant)) {
      push(errors, 'AGENTIC-SWARM-004', swarm.id ?? 'swarm', `participant ${participant} is not a declared character`);
    }
    if (!boundCharacters.has(participant)) {
      push(errors, 'AGENTIC-SWARM-005', swarm.id ?? 'swarm', `participant ${participant} has no modeled-player binding`);
    }
  }
  if (swarm.leader !== undefined && !swarm.participants?.includes(swarm.leader)) {
    push(errors, 'AGENTIC-SWARM-006', swarm.id ?? 'swarm', 'leader must be one of the participants');
  }
  for (const key of ['coordinatesVia', 'recognitionDiscipline', 'governanceProcess', 'sharedTrace', 'federationProfile', 'regimeProfile']) {
    if (!hasString(swarm, key)) {
      push(errors, 'AGENTIC-SWARM-007', swarm.id ?? 'swarm', `${key} must be declared`);
    }
  }
  checkEvidence(errors, swarm.evidence, swarm.id ?? 'swarm', 'AGENTIC-SWARM-008');

  return errors;
}

export const assertValidAgenticProfile = createProfileAssertion(validateAgenticProfile);
