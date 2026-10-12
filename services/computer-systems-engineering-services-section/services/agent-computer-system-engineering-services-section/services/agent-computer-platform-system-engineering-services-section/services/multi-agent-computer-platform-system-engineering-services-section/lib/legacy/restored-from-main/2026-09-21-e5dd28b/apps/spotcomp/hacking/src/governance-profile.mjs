import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const EFFECT_CLASSES = new Set(['read-only', 'trace-append', 'tool-actuation', 'federation', 'governance']);
const SIDE_EFFECTING = new Set(['trace-append', 'tool-actuation', 'federation', 'governance']);
const REQUIRED_SURFACES = new Set([
  'governance',
  'trust-boundary',
  'federation',
  'capability',
  'authentication',
  'agent-self-queueing',
]);
const AUTH_VALUES = new Set(['grant', 'deny', 'bottom', 'contest']);
const GATE_KINDS = new Set(['modal-authorization-restriction', 'capability-check', 'proposal-validator']);
const DENY_BEHAVIORS = new Set(['restrict-to-bottom', 'no-cell', 'no-state-advance', 'surface-error']);
const SETTLEMENT_OUTPUTS = new Set(['allow', 'deny', 'restricted', 'contest']);

import { isObject } from "./object-record.mjs";

function exactEavtRow(row) {
  if (!isObject(row)) return false;
  const keys = Object.keys(row).sort();
  return keys.length === 4 && keys[0] === 'a' && keys[1] === 'e' && keys[2] === 't' && keys[3] === 'v';
}

function indexById(errors, items, path, codePrefix) {
  const index = new Map();
  if (!Array.isArray(items)) {
    push(errors, `${codePrefix}-001`, path, 'must be an array');
    return index;
  }
  for (const item of items) {
    const itemPath = isObject(item) && hasString(item, 'id') ? item.id : `<${path}>`;
    if (!isObject(item)) {
      push(errors, `${codePrefix}-002`, itemPath, 'item must be an object');
      continue;
    }
    if (!hasString(item, 'id')) {
      push(errors, `${codePrefix}-003`, itemPath, 'id must be a non-empty string');
    } else if (index.has(item.id)) {
      push(errors, `${codePrefix}-004`, item.id, 'ids must be unique');
    } else {
      index.set(item.id, item);
    }
  }
  return index;
}

export function validateGovernanceProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'GOV-PROFILE-001', path: '<profile>', message: 'governance profile must be an object' }];
  }
  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'GOV-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'GOV-PROFILE-003');

  if (!isObject(profile.modalRestriction)) {
    push(errors, 'GOV-MODAL-001', path, 'modalRestriction must be declared');
  } else {
    const modal = profile.modalRestriction;
    if (modal.oneEvaluator !== true) {
      push(errors, 'GOV-MODAL-002', 'modalRestriction', 'oneEvaluator must be true');
    }
    if (!Array.isArray(modal.surfaces)) {
      push(errors, 'GOV-MODAL-003', 'modalRestriction', 'surfaces must be an array');
    } else {
      const surfaces = new Set(modal.surfaces);
      for (const surface of REQUIRED_SURFACES) {
        if (!surfaces.has(surface)) {
          push(errors, 'GOV-MODAL-004', 'modalRestriction', `missing modal surface ${surface}`);
        }
      }
    }
    if (!['restrict-to-bottom', 'no-cell', 'no-state-advance'].includes(modal.denialBehavior)) {
      push(errors, 'GOV-MODAL-005', 'modalRestriction', 'denialBehavior must preserve no unauthorized effect');
    }
    checkEvidence(errors, modal.evidence, 'modalRestriction', 'GOV-MODAL-006');
  }

  const principals = indexById(errors, profile.principals, 'principals', 'GOV-PRINCIPAL');
  for (const principal of principals.values()) {
    if (!['player', 'character', 'swarm', 'system', 'operator'].includes(principal.kind)) {
      push(errors, 'GOV-PRINCIPAL-005', principal.id, 'principal kind is not recognized');
    }
    checkEvidence(errors, principal.evidence, principal.id, 'GOV-PRINCIPAL-006');
  }

  const capabilities = indexById(errors, profile.capabilities, 'capabilities', 'GOV-CAP');
  for (const capability of capabilities.values()) {
    for (const key of ['surface', 'action']) {
      if (!hasString(capability, key)) {
        push(errors, 'GOV-CAP-005', capability.id, `${key} must be declared`);
      }
    }
    if (!EFFECT_CLASSES.has(capability.effectClass)) {
      push(errors, 'GOV-CAP-006', capability.id, 'effectClass is not recognized');
    }
    checkEvidence(errors, capability.evidence, capability.id, 'GOV-CAP-007');
  }

  const authorizationRows = indexById(errors, profile.authorizationRows, 'authorizationRows', 'GOV-AUTHROW');
  for (const auth of authorizationRows.values()) {
    if (!principals.has(auth.subject)) {
      push(errors, 'GOV-AUTHROW-005', auth.id, `unknown subject ${auth.subject}`);
    }
    if (!capabilities.has(auth.capability)) {
      push(errors, 'GOV-AUTHROW-006', auth.id, `unknown capability ${auth.capability}`);
    }
    if (!AUTH_VALUES.has(auth.value)) {
      push(errors, 'GOV-AUTHROW-007', auth.id, 'authorization value is not recognized');
    }
    if (!exactEavtRow(auth.row)) {
      push(errors, 'GOV-AUTHROW-008', auth.id, 'authorization row must be exact EAVT');
    } else {
      if (auth.row.e !== auth.subject) {
        push(errors, 'GOV-AUTHROW-009', auth.id, 'row.e must match subject');
      }
      if (!isObject(auth.row.v) || auth.row.v.capability !== auth.capability || auth.row.v.value !== auth.value) {
        push(errors, 'GOV-AUTHROW-010', auth.id, 'row.v must carry matching capability and value');
      }
    }
    checkEvidence(errors, auth.evidence, auth.id, 'GOV-AUTHROW-011');
  }

  const delegations = indexById(errors, profile.delegations ?? [], 'delegations', 'GOV-DELEGATION');
  for (const delegation of delegations.values()) {
    if (!principals.has(delegation.from)) {
      push(errors, 'GOV-DELEGATION-005', delegation.id, `unknown delegator ${delegation.from}`);
    }
    if (!principals.has(delegation.to)) {
      push(errors, 'GOV-DELEGATION-006', delegation.id, `unknown delegate ${delegation.to}`);
    }
    const capability = capabilities.get(delegation.capability);
    if (!capability) {
      push(errors, 'GOV-DELEGATION-007', delegation.id, `unknown capability ${delegation.capability}`);
    }
    if (delegation.nonAmplifying !== true) {
      push(errors, 'GOV-DELEGATION-008', delegation.id, 'delegation must be declared non-amplifying');
    }
    if (!nonEmptyStringArray(delegation.attenuation)) {
      push(errors, 'GOV-DELEGATION-009', delegation.id, 'delegation must carry attenuation evidence');
    }
    if (capability && SIDE_EFFECTING.has(capability.effectClass) && !nonEmptyStringArray(delegation.attenuation)) {
      push(errors, 'GOV-DELEGATION-010', delegation.id, 'side-effecting delegation must be attenuated');
    }
    checkEvidence(errors, delegation.evidence, delegation.id, 'GOV-DELEGATION-011');
  }

  const revocations = indexById(errors, profile.revocations ?? [], 'revocations', 'GOV-REVOCATION');
  for (const revocation of revocations.values()) {
    if (!['authorization-row', 'delegation'].includes(revocation.targetKind)) {
      push(errors, 'GOV-REVOCATION-005', revocation.id, 'targetKind is not recognized');
    } else if (revocation.targetKind === 'authorization-row' && !authorizationRows.has(revocation.target)) {
      push(errors, 'GOV-REVOCATION-006', revocation.id, `unknown authorization row ${revocation.target}`);
    } else if (revocation.targetKind === 'delegation' && !delegations.has(revocation.target)) {
      push(errors, 'GOV-REVOCATION-007', revocation.id, `unknown delegation ${revocation.target}`);
    }
    if (revocation.destructiveEdit !== false) {
      push(errors, 'GOV-REVOCATION-008', revocation.id, 'revocation must not be a destructive edit');
    }
    if (!exactEavtRow(revocation.row)) {
      push(errors, 'GOV-REVOCATION-009', revocation.id, 'revocation row must be exact EAVT');
    } else if (!isObject(revocation.row.v) || revocation.row.v.target !== revocation.target) {
      push(errors, 'GOV-REVOCATION-010', revocation.id, 'row.v.target must match revocation target');
    }
    checkEvidence(errors, revocation.evidence, revocation.id, 'GOV-REVOCATION-011');
  }

  const actionBounds = indexById(errors, profile.actionBounds ?? [], 'actionBounds', 'GOV-BOUND');
  const boundedCapabilities = new Set();
  for (const bound of actionBounds.values()) {
    if (!capabilities.has(bound.capability)) {
      push(errors, 'GOV-BOUND-005', bound.id, `unknown capability ${bound.capability}`);
    } else {
      boundedCapabilities.add(bound.capability);
    }
    if (!hasString(bound, 'maxScope')) {
      push(errors, 'GOV-BOUND-006', bound.id, 'maxScope must be declared');
    }
    checkEvidence(errors, bound.evidence, bound.id, 'GOV-BOUND-007');
  }

  const gates = indexById(errors, profile.gates ?? [], 'gates', 'GOV-GATE');
  const gatedCapabilities = new Set();
  for (const gate of gates.values()) {
    if (!GATE_KINDS.has(gate.kind)) {
      push(errors, 'GOV-GATE-005', gate.id, 'gate kind is not recognized');
    }
    if (!principals.has(gate.subject)) {
      push(errors, 'GOV-GATE-006', gate.id, `unknown gate subject ${gate.subject}`);
    }
    if (!capabilities.has(gate.requiredCapability)) {
      push(errors, 'GOV-GATE-007', gate.id, `unknown required capability ${gate.requiredCapability}`);
    } else {
      gatedCapabilities.add(gate.requiredCapability);
    }
    if (gate.checkedBeforeEffect !== true) {
      push(errors, 'GOV-GATE-008', gate.id, 'gate must be checked before effect');
    }
    if (!DENY_BEHAVIORS.has(gate.denyBehavior)) {
      push(errors, 'GOV-GATE-009', gate.id, 'denyBehavior is not recognized');
    }
    if (gate.kind === 'modal-authorization-restriction' && gate.denyBehavior !== 'restrict-to-bottom') {
      push(errors, 'GOV-GATE-010', gate.id, 'modal restriction gate must deny by bottom/no-cell restriction');
    }
    checkEvidence(errors, gate.evidence, gate.id, 'GOV-GATE-011');
  }

  for (const capability of capabilities.values()) {
    if (SIDE_EFFECTING.has(capability.effectClass)) {
      if (!boundedCapabilities.has(capability.id)) {
        push(errors, 'GOV-SIDE-EFFECT-001', capability.id, 'side-effecting capability must have an action bound');
      }
      if (!gatedCapabilities.has(capability.id)) {
        push(errors, 'GOV-SIDE-EFFECT-002', capability.id, 'side-effecting capability must have a pre-effect gate');
      }
    }
  }

  if (!isObject(profile.settlementProjection)) {
    push(errors, 'GOV-SETTLEMENT-001', path, 'settlementProjection must be declared');
  } else {
    const settlement = profile.settlementProjection;
    const settlementPath = hasString(settlement, 'id') ? settlement.id : 'settlementProjection';
    for (const key of ['id', 'frontier', 'ruleSystem']) {
      if (!hasString(settlement, key)) {
        push(errors, 'GOV-SETTLEMENT-002', settlementPath, `${key} must be declared`);
      }
    }
    if (settlement.finite !== true) {
      push(errors, 'GOV-SETTLEMENT-003', settlementPath, 'settlement projection must be finite');
    }
    if (!Array.isArray(settlement.inputs) || settlement.inputs.length === 0) {
      push(errors, 'GOV-SETTLEMENT-004', settlementPath, 'settlement inputs must be non-empty');
    } else {
      for (const input of settlement.inputs) {
        if (!authorizationRows.has(input) && !delegations.has(input) && !revocations.has(input)) {
          push(errors, 'GOV-SETTLEMENT-005', settlementPath, `unknown settlement input ${input}`);
        }
      }
    }
    if (!SETTLEMENT_OUTPUTS.has(settlement.output)) {
      push(errors, 'GOV-SETTLEMENT-006', settlementPath, 'settlement output is not recognized');
    }
    checkEvidence(errors, settlement.evidence, settlementPath, 'GOV-SETTLEMENT-007');
  }

  return errors;
}

export const assertValidGovernanceProfile = createProfileAssertion(validateGovernanceProfile);
