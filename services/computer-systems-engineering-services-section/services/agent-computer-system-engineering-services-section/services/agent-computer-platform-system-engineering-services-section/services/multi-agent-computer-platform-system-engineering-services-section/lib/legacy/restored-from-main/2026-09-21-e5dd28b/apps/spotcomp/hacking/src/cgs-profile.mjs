import { createProfileAssertion, push } from "./profile-admission.mjs";
import { nonEmptyStringArray, stringArray } from "./primitive-admission.mjs";
const EVENT_KINDS = new Set([
  'trace-append',
  'observe-frontier',
  'settle-frontier',
  'federate-delivery',
  'governance-check',
  'actuate-tool',
  'open',
]);

const POLARITIES = new Set(['player', 'opponent']);
const STATUSES = new Set(['candidate', 'open', 'proved']);
const STRATEGY_CLASSES = new Set(['concurrent', 'deterministic-concurrent', 'sequential-innocent', 'open']);
const SYMMETRY_PRESERVES = new Set(['causality', 'conflict', 'polarity', 'trace-identity', 'governance']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}



function pairKey(left, right) {
  return [left, right].sort().join('\u0000');
}

function findCycle(eventsById) {
  const visiting = new Set();
  const visited = new Set();

  function visit(id, trail) {
    if (visiting.has(id)) {
      return [...trail, id];
    }
    if (visited.has(id)) {
      return null;
    }
    visiting.add(id);
    const event = eventsById.get(id);
    for (const cause of event.causes ?? []) {
      const cycle = visit(cause, [...trail, id]);
      if (cycle) {
        return cycle;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  for (const id of eventsById.keys()) {
    const cycle = visit(id, []);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

export function validateCgsProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'CGS-PROFILE-001', path: '<profile>', message: 'CGS profile must be an object' }];
  }
  if (!hasString(profile, 'profileId')) {
    push(errors, 'CGS-PROFILE-002', '<profile>', 'profileId must be a non-empty string');
  }
  if (!STATUSES.has(profile.status)) {
    push(errors, 'CGS-PROFILE-003', profile.profileId ?? '<profile>', 'status must be candidate, open, or proved');
  }
  if (!nonEmptyStringArray(profile.evidence)) {
    push(errors, 'CGS-PROFILE-004', profile.profileId ?? '<profile>', 'profile must cite evidence');
  }
  if (!isObject(profile.arena) || !Array.isArray(profile.arena.events)) {
    push(errors, 'CGS-ARENA-001', profile.profileId ?? '<profile>', 'arena.events must be an array');
    return errors;
  }

  const eventsById = new Map();
  const symmetryClasses = new Set();
  if (profile.arena.symmetryClasses !== undefined && !Array.isArray(profile.arena.symmetryClasses)) {
    push(errors, 'CGS-SYMMETRY-001', profile.profileId ?? '<profile>', 'symmetryClasses must be an array');
  }
  for (const symmetryClass of profile.arena.symmetryClasses ?? []) {
    const path = isObject(symmetryClass) && hasString(symmetryClass, 'id') ? symmetryClass.id : '<symmetry-class>';
    if (!isObject(symmetryClass)) {
      push(errors, 'CGS-SYMMETRY-002', path, 'symmetry class must be an object');
      continue;
    }
    if (!hasString(symmetryClass, 'id')) {
      push(errors, 'CGS-SYMMETRY-003', path, 'symmetry class must declare id');
    } else if (symmetryClasses.has(symmetryClass.id)) {
      push(errors, 'CGS-SYMMETRY-004', symmetryClass.id, 'symmetry class ids must be unique');
    } else {
      symmetryClasses.add(symmetryClass.id);
    }
    if (!nonEmptyStringArray(symmetryClass.preserves) || symmetryClass.preserves.some((item) => !SYMMETRY_PRESERVES.has(item))) {
      push(errors, 'CGS-SYMMETRY-005', path, 'symmetry class must declare preserved causality/conflict/polarity/trace/governance structure');
    }
    if (!nonEmptyStringArray(symmetryClass.evidence)) {
      push(errors, 'CGS-SYMMETRY-006', path, 'symmetry class must cite evidence');
    }
  }

  for (const event of profile.arena.events) {
    const path = isObject(event) && hasString(event, 'id') ? event.id : '<event>';
    if (!isObject(event)) {
      push(errors, 'CGS-EVENT-001', path, 'event must be an object');
      continue;
    }
    if (!hasString(event, 'id')) {
      push(errors, 'CGS-EVENT-002', path, 'event id must be a non-empty string');
    } else if (eventsById.has(event.id)) {
      push(errors, 'CGS-EVENT-003', event.id, 'event ids must be unique');
    } else {
      eventsById.set(event.id, event);
    }
    if (!EVENT_KINDS.has(event.kind)) {
      push(errors, 'CGS-EVENT-004', path, 'event kind is not declared in the CGS profile surface');
    }
    if (!POLARITIES.has(event.polarity)) {
      push(errors, 'CGS-EVENT-005', path, 'event polarity must be player or opponent');
    }
    if (event.causes !== undefined && !stringArray(event.causes)) {
      push(errors, 'CGS-EVENT-006', path, 'causes must be an array of event ids');
    }
    if (!nonEmptyStringArray(event.evidence)) {
      push(errors, 'CGS-EVENT-007', path, 'event must cite evidence');
    }
    if (event.symmetryClass !== undefined && !symmetryClasses.has(event.symmetryClass)) {
      push(errors, 'CGS-EVENT-008', path, 'event symmetryClass must name a declared symmetry class');
    }
  }

  for (const event of eventsById.values()) {
    for (const cause of event.causes ?? []) {
      if (!eventsById.has(cause)) {
        push(errors, 'CGS-CAUSE-001', event.id, `cause ${cause} does not name an event`);
      }
      if (cause === event.id) {
        push(errors, 'CGS-CAUSE-002', event.id, 'event cannot cause itself');
      }
    }
  }

  if (!errors.some((error) => error.code.startsWith('CGS-CAUSE'))) {
    const cycle = findCycle(eventsById);
    if (cycle) {
      push(errors, 'CGS-CAUSE-003', cycle[0], `causality must be acyclic: ${cycle.join(' -> ')}`);
    }
  }

  if (profile.arena.minimalConflicts !== undefined && !Array.isArray(profile.arena.minimalConflicts)) {
    push(errors, 'CGS-CONFLICT-000', profile.profileId ?? '<profile>', 'minimalConflicts must be an array');
  }
  const seenConflicts = new Set();
  for (const pair of Array.isArray(profile.arena.minimalConflicts) ? profile.arena.minimalConflicts : []) {
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some((id) => typeof id !== 'string' || id.length === 0)) {
      push(errors, 'CGS-CONFLICT-001', '<conflict>', 'minimal conflict must be a pair of event ids');
      continue;
    }
    const [left, right] = pair;
    if (!eventsById.has(left) || !eventsById.has(right)) {
      push(errors, 'CGS-CONFLICT-002', `${left} # ${right}`, 'minimal conflict references must name declared events');
    }
    if (left === right) {
      push(errors, 'CGS-CONFLICT-003', left, 'minimal conflict must be irreflexive');
    }
    const key = pairKey(left, right);
    if (seenConflicts.has(key)) {
      push(errors, 'CGS-CONFLICT-004', `${left} # ${right}`, 'minimal conflict pairs are unordered and must not repeat');
    }
    seenConflicts.add(key);
  }

  if (!Array.isArray(profile.strategies) || profile.strategies.length === 0) {
    push(errors, 'CGS-STRATEGY-001', profile.profileId ?? '<profile>', 'profile must declare at least one strategy');
    return errors;
  }

  for (const strategy of profile.strategies) {
    const path = isObject(strategy) && hasString(strategy, 'playerId') ? strategy.playerId : '<strategy>';
    if (!isObject(strategy)) {
      push(errors, 'CGS-STRATEGY-002', path, 'strategy must be an object');
      continue;
    }
    if (!hasString(strategy, 'playerId')) {
      push(errors, 'CGS-STRATEGY-003', path, 'strategy must declare playerId');
    }
    if (!STRATEGY_CLASSES.has(strategy.strategyClass)) {
      push(errors, 'CGS-STRATEGY-004', path, 'strategyClass must be concurrent, deterministic-concurrent, sequential-innocent, or open');
    }
    if (!nonEmptyStringArray(strategy.observes)) {
      push(errors, 'CGS-STRATEGY-005', path, 'strategy must declare observed events');
    }
    if (!nonEmptyStringArray(strategy.acts)) {
      push(errors, 'CGS-STRATEGY-006', path, 'strategy must declare action events');
    }
    if (!hasString(strategy, 'governance')) {
      push(errors, 'CGS-STRATEGY-007', path, 'strategy must declare governance');
    }
    if (!hasString(strategy, 'localSettling')) {
      push(errors, 'CGS-STRATEGY-008', path, 'strategy must declare localSettling');
    }
    if (!nonEmptyStringArray(strategy.evidence)) {
      push(errors, 'CGS-STRATEGY-009', path, 'strategy must cite evidence');
    }
    if (!isObject(strategy.handedness)) {
      push(errors, 'CGS-STRATEGY-013', path, 'strategy must declare handedness');
    } else {
      for (const key of ['recv', 'send', 'actuate', 'observe']) {
        if (!hasString(strategy.handedness, key)) {
          push(errors, 'CGS-STRATEGY-014', path, `handedness.${key} must be a non-empty string`);
        }
      }
    }

    for (const eventId of [...(strategy.observes ?? []), ...(strategy.acts ?? [])]) {
      if (!eventsById.has(eventId)) {
        push(errors, 'CGS-STRATEGY-010', path, `strategy references unknown event ${eventId}`);
      }
    }
    for (const eventId of strategy.acts ?? []) {
      const event = eventsById.get(eventId);
      if (event && event.polarity !== 'player') {
        push(errors, 'CGS-STRATEGY-011', path, `strategy action ${eventId} must have player polarity`);
      }
    }
    if (strategy.strategyClass === 'sequential-innocent' && strategy.maxConcurrentPlayerMoves !== undefined && strategy.maxConcurrentPlayerMoves > 1) {
      push(errors, 'CGS-STRATEGY-012', path, 'sequential-innocent strategy cannot declare more than one concurrent player move');
    }
  }

  return errors;
}

export const assertValidCgsProfile = createProfileAssertion(validateCgsProfile);
