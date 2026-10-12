import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const REQUIRED_AXES = new Set([
  'event-record',
  'temporal-causal-precedence',
  'evidence-trajectory',
  'recognition-fiber',
  'categorical-refinement',
  'constitutive-provenance',
]);

const EVENT_KINDS = new Set(['originating-articulating-act', 'positing-entry', 'closure-firing-entry']);
const PROJECTION_KINDS = new Set([
  'finite-row-presentation',
  'trace-monoid-summary',
  'semantic-hypertext-packet',
  'settlement-artifact',
]);

const FINITE_ROW_FORGOTTEN_AXES = [
  'recognition-fiber',
  'categorical-refinement',
  'constitutive-provenance',
];

import { isObject } from "./object-record.mjs";

function checkExactEavtRow(errors, row, path) {
  if (!isObject(row)) {
    push(errors, 'TA-ROW-001', path, 'row must be an object');
    return;
  }
  const keys = Object.keys(row).sort();
  if (keys.join(',') !== 'a,e,t,v') {
    push(errors, 'TA-ROW-002', path, 'EAVT row must have exactly e, a, v, and t');
  }
  for (const key of ['e', 'a', 'v', 't']) {
    if (!hasString(row, key)) {
      push(errors, 'TA-ROW-003', path, `${key} must be a non-empty string`);
    }
  }
}

function hasPath(edges, start, end) {
  const stack = [start];
  const seen = new Set();
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === end) {
      return true;
    }
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const next of edges.get(current) ?? []) {
      stack.push(next);
    }
  }
  return false;
}

function hasCycle(edges, ids) {
  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visiting.has(id)) {
      return true;
    }
    if (visited.has(id)) {
      return false;
    }
    visiting.add(id);
    for (const next of edges.get(id) ?? []) {
      if (visit(next)) {
        return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return [...ids].some((id) => visit(id));
}

export function validateTraceAxisProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'TA-PROFILE-001', path: '<profile>', message: 'trace axis profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'TA-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'TA-PROFILE-003');

  if (!isObject(profile.traceObject)) {
    push(errors, 'TA-TRACE-001', path, 'traceObject must be declared');
  } else {
    for (const key of ['id', 'cell', 'sourceTrace']) {
      if (!hasString(profile.traceObject, key)) {
        push(errors, 'TA-TRACE-002', 'traceObject', `${key} must be declared`);
      }
    }
    if (profile.traceObject.carrierPresentation !== 'eavt-jsonl') {
      push(errors, 'TA-TRACE-003', 'traceObject', 'carrierPresentation must be eavt-jsonl');
    }
    if (profile.traceObject.exactEavtRows !== true) {
      push(errors, 'TA-TRACE-004', 'traceObject', 'exactEavtRows must be true');
    }
    checkEvidence(errors, profile.traceObject.evidence, 'traceObject', 'TA-TRACE-005');
  }

  const axes = new Set();
  if (!Array.isArray(profile.axes) || profile.axes.length === 0) {
    push(errors, 'TA-AXIS-001', path, 'axes must be a non-empty array');
  } else {
    for (const axis of profile.axes) {
      const axisPath = isObject(axis) && hasString(axis, 'name') ? axis.name : '<axis>';
      if (!isObject(axis)) {
        push(errors, 'TA-AXIS-002', axisPath, 'axis must be an object');
        continue;
      }
      if (!REQUIRED_AXES.has(axis.name)) {
        push(errors, 'TA-AXIS-003', axisPath, 'axis name is not recognized');
      } else if (axes.has(axis.name)) {
        push(errors, 'TA-AXIS-004', axisPath, 'axis names must be unique');
      } else {
        axes.add(axis.name);
      }
      if (!hasString(axis, 'meaning')) {
        push(errors, 'TA-AXIS-005', axisPath, 'axis meaning must be declared');
      }
      checkEvidence(errors, axis.preservedBy, axisPath, 'TA-AXIS-006');
      checkEvidence(errors, axis.evidence, axisPath, 'TA-AXIS-007');
    }
    for (const required of REQUIRED_AXES) {
      if (!axes.has(required)) {
        push(errors, 'TA-AXIS-008', path, `missing required trace axis ${required}`);
      }
    }
  }

  const eventIds = new Set();
  const provenanceByEvent = new Map();
  if (!Array.isArray(profile.events) || profile.events.length === 0) {
    push(errors, 'TA-EVENT-001', path, 'events must be a non-empty array');
  } else {
    for (const event of profile.events) {
      const eventPath = isObject(event) && hasString(event, 'id') ? event.id : '<event>';
      if (!isObject(event)) {
        push(errors, 'TA-EVENT-002', eventPath, 'event must be an object');
        continue;
      }
      if (!hasString(event, 'id')) {
        push(errors, 'TA-EVENT-003', eventPath, 'event id must be declared');
      } else if (eventIds.has(event.id)) {
        push(errors, 'TA-EVENT-004', eventPath, 'event ids must be unique');
      } else {
        eventIds.add(event.id);
      }
      if (!EVENT_KINDS.has(event.kind)) {
        push(errors, 'TA-EVENT-005', eventPath, 'event kind is not recognized');
      }
      checkExactEavtRow(errors, event.row, `${eventPath}.row`);
      if (!Array.isArray(event.provenance)) {
        push(errors, 'TA-EVENT-006', eventPath, 'provenance must be an array');
      } else {
        provenanceByEvent.set(event.id, event.provenance);
      }
      checkEvidence(errors, event.evidence, eventPath, 'TA-EVENT-007');
    }
  }

  const edges = new Map();
  const directEdges = new Set();
  if (!Array.isArray(profile.causalPrecedence)) {
    push(errors, 'TA-CAUSE-001', path, 'causalPrecedence must be an array');
  } else {
    for (const edge of profile.causalPrecedence) {
      const edgePath = isObject(edge) ? `${String(edge.before)} -> ${String(edge.after)}` : '<causal-edge>';
      if (!isObject(edge)) {
        push(errors, 'TA-CAUSE-002', edgePath, 'causal edge must be an object');
        continue;
      }
      if (!eventIds.has(edge.before)) {
        push(errors, 'TA-CAUSE-003', edgePath, 'before must reference a known event');
      }
      if (!eventIds.has(edge.after)) {
        push(errors, 'TA-CAUSE-004', edgePath, 'after must reference a known event');
      }
      if (edge.before === edge.after) {
        push(errors, 'TA-CAUSE-005', edgePath, 'causal edge must be irreflexive');
      }
      if (!hasString(edge, 'reason')) {
        push(errors, 'TA-CAUSE-006', edgePath, 'causal edge reason must be declared');
      }
      checkEvidence(errors, edge.evidence, edgePath, 'TA-CAUSE-007');
      if (eventIds.has(edge.before) && eventIds.has(edge.after) && edge.before !== edge.after) {
        if (!edges.has(edge.before)) {
          edges.set(edge.before, new Set());
        }
        edges.get(edge.before).add(edge.after);
        directEdges.add(`${edge.before}\u0000${edge.after}`);
      }
    }
    if (hasCycle(edges, eventIds)) {
      push(errors, 'TA-CAUSE-008', 'causalPrecedence', 'causal graph must be acyclic');
    }
  }

  for (const [eventId, provenance] of provenanceByEvent.entries()) {
    for (const sourceId of provenance) {
      if (!eventIds.has(sourceId)) {
        push(errors, 'TA-PROV-001', eventId, 'provenance must reference known events');
      } else if (sourceId === eventId) {
        push(errors, 'TA-PROV-002', eventId, 'event cannot cite itself as provenance');
      } else if (!directEdges.has(`${sourceId}\u0000${eventId}`)) {
        push(errors, 'TA-PROV-003', eventId, 'each provenance reference must have a direct causal edge');
      }
    }
  }

  if (!isObject(profile.independence)) {
    push(errors, 'TA-IND-001', path, 'independence must be declared');
  } else {
    const stepSet = new Set(Array.isArray(profile.independence.stepSet) ? profile.independence.stepSet : []);
    if (stepSet.size === 0) {
      push(errors, 'TA-IND-002', 'independence', 'stepSet must be non-empty');
    }
    for (const step of stepSet) {
      if (!eventIds.has(step)) {
        push(errors, 'TA-IND-003', 'independence', 'stepSet entries must reference known events');
      }
    }
    if (profile.independence.symmetricClosureDeclared !== true) {
      push(errors, 'TA-IND-004', 'independence', 'symmetricClosureDeclared must be true');
    }
    if (!Array.isArray(profile.independence.independentPairs)) {
      push(errors, 'TA-IND-005', 'independence', 'independentPairs must be an array');
    } else {
      const pairs = new Set();
      for (const pair of profile.independence.independentPairs) {
        const pairPath = isObject(pair) ? `${String(pair.left)} || ${String(pair.right)}` : '<independent-pair>';
        if (!isObject(pair)) {
          push(errors, 'TA-IND-006', pairPath, 'independent pair must be an object');
          continue;
        }
        if (!stepSet.has(pair.left) || !stepSet.has(pair.right)) {
          push(errors, 'TA-IND-007', pairPath, 'independent pairs must cite declared steps');
        }
        if (pair.left === pair.right) {
          push(errors, 'TA-IND-008', pairPath, 'independence relation must be irreflexive');
        }
        const ordered = [pair.left, pair.right].sort().join('\u0000');
        if (pairs.has(ordered)) {
          push(errors, 'TA-IND-009', pairPath, 'independent pairs must not duplicate symmetric pairs');
        }
        pairs.add(ordered);
        if (hasPath(edges, pair.left, pair.right) || hasPath(edges, pair.right, pair.left)) {
          push(errors, 'TA-IND-010', pairPath, 'causally ordered events cannot be declared independent');
        }
        checkEvidence(errors, pair.evidence, pairPath, 'TA-IND-011');
      }
    }
    checkEvidence(errors, profile.independence.evidence, 'independence', 'TA-IND-012');
  }

  if (!isObject(profile.directedJoin)) {
    push(errors, 'TA-JOIN-001', path, 'directedJoin must be declared');
  } else {
    if (profile.directedJoin.operation !== 'event-union') {
      push(errors, 'TA-JOIN-002', 'directedJoin', 'operation must be event-union');
    }
    for (const key of ['monotone', 'idempotent', 'commutative', 'associative']) {
      if (profile.directedJoin[key] !== true) {
        push(errors, 'TA-JOIN-003', 'directedJoin', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.directedJoin.evidence, 'directedJoin', 'TA-JOIN-004');
  }

  if (!Array.isArray(profile.projections) || profile.projections.length === 0) {
    push(errors, 'TA-PROJ-001', path, 'projections must be a non-empty array');
  } else {
    const projectionIds = new Set();
    for (const projection of profile.projections) {
      const projectionPath = isObject(projection) && hasString(projection, 'id') ? projection.id : '<projection>';
      if (!isObject(projection)) {
        push(errors, 'TA-PROJ-002', projectionPath, 'projection must be an object');
        continue;
      }
      if (!hasString(projection, 'id')) {
        push(errors, 'TA-PROJ-003', projectionPath, 'projection id must be declared');
      } else if (projectionIds.has(projection.id)) {
        push(errors, 'TA-PROJ-004', projectionPath, 'projection ids must be unique');
      } else {
        projectionIds.add(projection.id);
      }
      if (!PROJECTION_KINDS.has(projection.kind)) {
        push(errors, 'TA-PROJ-005', projectionPath, 'projection kind is not recognized');
      }
      const preserved = new Set(Array.isArray(projection.preservedAxes) ? projection.preservedAxes : []);
      const forgotten = new Set(Array.isArray(projection.forgottenAxes) ? projection.forgottenAxes : []);
      if (preserved.size === 0) {
        push(errors, 'TA-PROJ-006', projectionPath, 'projection must preserve at least one axis');
      }
      for (const axis of [...preserved, ...forgotten]) {
        if (!REQUIRED_AXES.has(axis)) {
          push(errors, 'TA-PROJ-007', projectionPath, 'projection references an unknown axis');
        }
      }
      for (const axis of preserved) {
        if (forgotten.has(axis)) {
          push(errors, 'TA-PROJ-008', projectionPath, 'preserved and forgotten axes must be disjoint');
        }
      }
      if (projection.kind === 'finite-row-presentation') {
        for (const axis of FINITE_ROW_FORGOTTEN_AXES) {
          if (!forgotten.has(axis)) {
            push(errors, 'TA-PROJ-009', projectionPath, `finite row presentation must declare that it forgets ${axis}`);
          }
        }
      }
      for (const key of ['sourceFrontier', 'outputKind']) {
        if (!hasString(projection, key)) {
          push(errors, 'TA-PROJ-010', projectionPath, `${key} must be declared`);
        }
      }
      checkEvidence(errors, projection.evidence, projectionPath, 'TA-PROJ-011');
    }
  }

  if (!isObject(profile.presentationBoundary)) {
    push(errors, 'TA-BOUNDARY-001', path, 'presentationBoundary must be declared');
  } else {
    for (const key of ['eavtRowsAreFinitePresentation', 'axesNotRowFields', 'projectedArtifactsSeparate']) {
      if (profile.presentationBoundary[key] !== true) {
        push(errors, 'TA-BOUNDARY-002', 'presentationBoundary', `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.presentationBoundary.evidence, 'presentationBoundary', 'TA-BOUNDARY-003');
  }

  return errors;
}

export const assertValidTraceAxisProfile = createProfileAssertion(validateTraceAxisProfile);
