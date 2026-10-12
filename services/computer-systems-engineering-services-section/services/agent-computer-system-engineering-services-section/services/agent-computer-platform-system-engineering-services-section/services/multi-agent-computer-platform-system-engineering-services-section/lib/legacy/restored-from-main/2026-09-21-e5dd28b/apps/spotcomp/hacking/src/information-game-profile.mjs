import { createProfileAssertion, push } from "./profile-admission.mjs";
import { nonEmptyStringArray, stringArray } from "./primitive-admission.mjs";
const STATUSES = new Set(['candidate', 'open', 'proved']);
const TRACE_AXES = new Set([
  'events',
  'temporal-causal',
  'evidence-trajectory',
  'recognition-fiber',
  'refinement',
  'provenance',
  'aboutness',
  'frontier',
]);
const FEDERATION_MODES = new Set(['parallel-composition', 'open']);
const SETTLEMENT_REGIMES = new Set(['strict', 'scott-continuous', 'transfinite-bounded', 'aperiodic', 'open']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}



function hasDuplicate(items) {
  return new Set(items).size !== items.length;
}

function validateAxes(errors, path, label, axes) {
  if (!stringArray(axes) || axes.some((axis) => !TRACE_AXES.has(axis))) {
    push(errors, 'IG-OBS-006', path, `${label} must contain declared trace axes`);
    return;
  }
  if (hasDuplicate(axes)) {
    push(errors, 'IG-OBS-007', path, `${label} must not repeat axes`);
  }
}

export function validateInformationGameProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'IG-PROFILE-001', path: '<profile>', message: 'information-game profile must be an object' }];
  }

  if (!hasString(profile, 'profileId')) {
    push(errors, 'IG-PROFILE-002', '<profile>', 'profileId must be a non-empty string');
  }
  const profilePath = profile.profileId ?? '<profile>';
  if (!STATUSES.has(profile.status)) {
    push(errors, 'IG-PROFILE-003', profilePath, 'status must be candidate, open, or proved');
  }
  if (!nonEmptyStringArray(profile.evidence)) {
    push(errors, 'IG-PROFILE-004', profilePath, 'profile must cite evidence');
  }
  if (profile.polarityRule !== 'game-theoretic-player-opponent') {
    push(errors, 'IG-PROFILE-005', profilePath, 'polarityRule must keep game Player/Opponent separate from modeled-player identity');
  }
  if (profile.globalFrontierAssumption === true) {
    push(errors, 'IG-PROFILE-006', profilePath, 'information-to-games profiles must not require a global synchronized frontier');
  }

  const informationById = new Map();
  if (!Array.isArray(profile.informationObjects) || profile.informationObjects.length === 0) {
    push(errors, 'IG-INFO-001', profilePath, 'profile must declare informationObjects');
  }
  for (const info of Array.isArray(profile.informationObjects) ? profile.informationObjects : []) {
    const path = isObject(info) && hasString(info, 'id') ? info.id : '<information-object>';
    if (!isObject(info)) {
      push(errors, 'IG-INFO-002', path, 'information object must be an object');
      continue;
    }
    if (!hasString(info, 'id')) {
      push(errors, 'IG-INFO-003', path, 'information object must declare id');
    } else if (informationById.has(info.id)) {
      push(errors, 'IG-INFO-004', info.id, 'information object ids must be unique');
    } else {
      informationById.set(info.id, info);
    }
    if (!hasString(info, 'receiver')) {
      push(errors, 'IG-INFO-005', path, 'information object must declare receiver');
    }
    if (!isObject(info.settlement) || !hasString(info.settlement, 'ruleSystem') || !SETTLEMENT_REGIMES.has(info.settlement.regime)) {
      push(errors, 'IG-INFO-006', path, 'information object must declare settlement regime and ruleSystem');
    }
    if (!nonEmptyStringArray(info.settledFrontier)) {
      push(errors, 'IG-INFO-007', path, 'information object must declare a non-empty settledFrontier');
    }
    if (!Array.isArray(info.aboutness) || info.aboutness.length === 0) {
      push(errors, 'IG-INFO-008', path, 'information object must declare aboutness as predication participation');
    }
    for (const aboutness of Array.isArray(info.aboutness) ? info.aboutness : []) {
      if (!isObject(aboutness) || !hasString(aboutness, 'entity') || !hasString(aboutness, 'predicate') || !nonEmptyStringArray(aboutness.evidence)) {
        push(errors, 'IG-INFO-009', path, 'aboutness entries must cite entity, predicate, and evidence');
      }
    }
    if (!hasString(info, 'recognitionFiber')) {
      push(errors, 'IG-INFO-010', path, 'information object must declare recognitionFiber');
    }
    if (!hasString(info, 'provenance')) {
      push(errors, 'IG-INFO-011', path, 'information object must declare provenance');
    }
    if (!nonEmptyStringArray(info.evidence)) {
      push(errors, 'IG-INFO-012', path, 'information object must cite evidence');
    }
  }

  const observationById = new Map();
  if (!Array.isArray(profile.observationMaps) || profile.observationMaps.length === 0) {
    push(errors, 'IG-OBS-001', profilePath, 'profile must declare observationMaps');
  }
  for (const observation of Array.isArray(profile.observationMaps) ? profile.observationMaps : []) {
    const path = isObject(observation) && hasString(observation, 'id') ? observation.id : '<observation-map>';
    if (!isObject(observation)) {
      push(errors, 'IG-OBS-002', path, 'observation map must be an object');
      continue;
    }
    if (!hasString(observation, 'id')) {
      push(errors, 'IG-OBS-003', path, 'observation map must declare id');
    } else if (observationById.has(observation.id)) {
      push(errors, 'IG-OBS-004', observation.id, 'observation map ids must be unique');
    } else {
      observationById.set(observation.id, observation);
    }
    if (!hasString(observation, 'playerId')) {
      push(errors, 'IG-OBS-005', path, 'observation map must declare playerId');
    }
    validateAxes(errors, path, 'preservesAxes', observation.preservesAxes);
    validateAxes(errors, path, 'forgetsAxes', observation.forgetsAxes);
    for (const axis of observation.preservesAxes ?? []) {
      if ((observation.forgetsAxes ?? []).includes(axis)) {
        push(errors, 'IG-OBS-008', path, `axis ${axis} cannot be both preserved and forgotten`);
      }
    }
    if (!nonEmptyStringArray(observation.observableFrontier)) {
      push(errors, 'IG-OBS-009', path, 'observation map must declare observableFrontier');
    }
    if (!nonEmptyStringArray(observation.evidence)) {
      push(errors, 'IG-OBS-010', path, 'observation map must cite evidence');
    }
    const source = informationById.get(observation.sourceInformation);
    if (!source) {
      push(errors, 'IG-OBS-011', path, 'observation map must reference a known information object');
    } else {
      const settled = new Set(source.settledFrontier ?? []);
      for (const rowId of observation.observableFrontier ?? []) {
        if (!settled.has(rowId)) {
          push(errors, 'IG-OBS-012', path, `observable frontier row ${rowId} is not in source settledFrontier`);
        }
      }
    }
    if (!(observation.preservesAxes ?? []).includes('aboutness')) {
      push(errors, 'IG-OBS-013', path, 'observation maps must preserve aboutness for game derivation');
    }
    if (!(observation.preservesAxes ?? []).includes('frontier')) {
      push(errors, 'IG-OBS-014', path, 'observation maps must preserve frontier identity for game derivation');
    }
  }

  if (!isObject(profile.arenaBinding)) {
    push(errors, 'IG-ARENA-001', profilePath, 'arenaBinding must be an object');
  } else {
    if (!hasString(profile.arenaBinding, 'cgsProfile')) {
      push(errors, 'IG-ARENA-002', profilePath, 'arenaBinding must declare cgsProfile');
    }
    const mappedObservations = new Set();
    if (!Array.isArray(profile.arenaBinding.observeEvents) || profile.arenaBinding.observeEvents.length === 0) {
      push(errors, 'IG-ARENA-003', profilePath, 'arenaBinding must declare observeEvents');
    }
    for (const binding of Array.isArray(profile.arenaBinding.observeEvents) ? profile.arenaBinding.observeEvents : []) {
      const path = isObject(binding) && hasString(binding, 'observationMap') ? binding.observationMap : '<observe-event>';
      if (!isObject(binding) || !hasString(binding, 'observationMap') || !hasString(binding, 'event')) {
        push(errors, 'IG-ARENA-004', path, 'observe event binding must cite observationMap and event');
        continue;
      }
      if (!observationById.has(binding.observationMap)) {
        push(errors, 'IG-ARENA-005', path, 'observe event binding must reference a known observation map');
      }
      mappedObservations.add(binding.observationMap);
    }
    for (const observationId of observationById.keys()) {
      if (!mappedObservations.has(observationId)) {
        push(errors, 'IG-ARENA-006', observationId, 'each observation map must bind to at least one arena observation event');
      }
    }
    for (const binding of Array.isArray(profile.arenaBinding.settlementEvents) ? profile.arenaBinding.settlementEvents : []) {
      const path = isObject(binding) && hasString(binding, 'informationObject') ? binding.informationObject : '<settlement-event>';
      if (!isObject(binding) || !hasString(binding, 'informationObject') || !hasString(binding, 'event')) {
        push(errors, 'IG-ARENA-007', path, 'settlement event binding must cite informationObject and event');
        continue;
      }
      if (!informationById.has(binding.informationObject)) {
        push(errors, 'IG-ARENA-008', path, 'settlement event binding must reference a known information object');
      }
    }
  }

  if (!Array.isArray(profile.strategyBindings) || profile.strategyBindings.length === 0) {
    push(errors, 'IG-STRATEGY-001', profilePath, 'profile must declare strategyBindings');
  }
  for (const strategy of Array.isArray(profile.strategyBindings) ? profile.strategyBindings : []) {
    const path = isObject(strategy) && hasString(strategy, 'strategyId') ? strategy.strategyId : '<strategy-binding>';
    if (!isObject(strategy)) {
      push(errors, 'IG-STRATEGY-002', path, 'strategy binding must be an object');
      continue;
    }
    if (!hasString(strategy, 'playerId')) {
      push(errors, 'IG-STRATEGY-003', path, 'strategy binding must declare playerId');
    }
    if (!hasString(strategy, 'strategyId')) {
      push(errors, 'IG-STRATEGY-004', path, 'strategy binding must declare strategyId');
    }
    if (!nonEmptyStringArray(strategy.actionEvents)) {
      push(errors, 'IG-STRATEGY-005', path, 'strategy binding must declare actionEvents');
    }
    if (!nonEmptyStringArray(strategy.evidence)) {
      push(errors, 'IG-STRATEGY-006', path, 'strategy binding must cite evidence');
    }
    const observation = observationById.get(strategy.observationMap);
    if (!observation) {
      push(errors, 'IG-STRATEGY-007', path, 'strategy binding must reference a known observation map');
    } else if (strategy.playerId !== observation.playerId) {
      push(errors, 'IG-STRATEGY-008', path, 'strategy playerId must match the observation map playerId');
    }
  }

  if (!isObject(profile.federationComposition)) {
    push(errors, 'IG-FEDERATION-001', profilePath, 'federationComposition must be an object');
  } else {
    const federation = profile.federationComposition;
    if (!FEDERATION_MODES.has(federation.mode)) {
      push(errors, 'IG-FEDERATION-002', profilePath, 'federationComposition.mode must be parallel-composition or open');
    }
    if (!nonEmptyStringArray(federation.evidence)) {
      push(errors, 'IG-FEDERATION-003', profilePath, 'federationComposition must cite evidence');
    }
    if (federation.mode === 'parallel-composition') {
      if (!nonEmptyStringArray(federation.sharedEvidence)) {
        push(errors, 'IG-FEDERATION-004', profilePath, 'parallel composition must cite sharedEvidence');
      }
      if (!hasString(federation, 'symmetry')) {
        push(errors, 'IG-FEDERATION-005', profilePath, 'parallel composition must cite a symmetry rule');
      }
    }
  }

  return errors;
}

export const assertValidInformationGameProfile = createProfileAssertion(validateInformationGameProfile);
