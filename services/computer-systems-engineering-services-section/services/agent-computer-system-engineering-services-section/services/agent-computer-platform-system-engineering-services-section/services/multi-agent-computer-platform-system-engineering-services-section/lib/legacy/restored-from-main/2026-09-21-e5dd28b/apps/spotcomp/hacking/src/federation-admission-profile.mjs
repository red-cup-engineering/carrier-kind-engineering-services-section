import { nonEmptyStringArray } from "./primitive-admission.mjs";
import { createProfileAssertion, checkEvidence, hasString, push } from "./profile-admission.mjs";
const PAYLOAD_KINDS = new Set([
  'trace-increment',
  'endpoint-state',
  'trajectory-prefix',
  'cohomology-audit',
  'projection-artifact',
  'typed-resource',
  'problem-detail',
]);

const DECISIONS = new Set(['admitted', 'rejected', 'downgraded', 'quarantined']);
const APPEND_MODES = new Set(['trace-rows', 'typed-resource', 'audit-only', 'none']);
const SIGNATURE_ALGORITHMS = new Set(['Ed25519', 'none']);
const CANONICALIZATION = new Set(['rfc8785', 'rfc7464-item-identities', 'row-id-manifest', 'none']);
const DOWNGRADE_BEHAVIORS = new Set(['reject', 'accept-as-trace-only', 'accept-as-informative-projection', 'quarantine']);
const GATE_ORDER = [
  'representation-kind',
  'rfc-parse',
  'canonical-identity',
  'signature-verification',
  'identifier-binding',
  'recognition',
  'governance',
  'capability',
  'observation-action-bounds',
  'regime-compatibility',
];

import { isObject } from "./object-record.mjs";

function indexById(errors, items, path, codePrefix) {
  const index = new Map();
  if (!Array.isArray(items) || items.length === 0) {
    push(errors, `${codePrefix}-001`, path, 'must be a non-empty array');
    return index;
  }
  for (const item of items) {
    const itemPath = isObject(item) && hasString(item, 'id') ? item.id : `<${path}>`;
    if (!isObject(item)) {
      push(errors, `${codePrefix}-002`, itemPath, 'item must be an object');
      continue;
    }
    if (!hasString(item, 'id')) {
      push(errors, `${codePrefix}-003`, itemPath, 'id must be declared');
    } else if (index.has(item.id)) {
      push(errors, `${codePrefix}-004`, item.id, 'ids must be unique');
    } else {
      index.set(item.id, item);
    }
  }
  return index;
}

function checkReference(errors, index, id, path, code, label) {
  if (typeof id !== 'string' || id.length === 0) {
    push(errors, code, path, `${label} reference must be declared`);
  } else if (!index.has(id)) {
    push(errors, code, path, `unknown ${label} ${id}`);
  }
}

function checkGateOrder(errors, gates, path) {
  if (!Array.isArray(gates) || gates.length !== GATE_ORDER.length) {
    push(errors, 'FAD-GATE-005', path, 'gateOrder must list the full admission gate order');
    return;
  }
  for (const [index, gate] of GATE_ORDER.entries()) {
    if (gates[index] !== gate) {
      push(errors, 'FAD-GATE-006', `${path}[${index}]`, `gate ${index} must be ${gate}`);
    }
  }
}

export function validateFederationAdmissionProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'FAD-PROFILE-001', path: '<profile>', message: 'federation admission profile must be an object' }];
  }

  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'FAD-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  checkEvidence(errors, profile.evidence, path, 'FAD-PROFILE-003');

  const representations = indexById(errors, profile.representations, 'representations', 'FAD-REP');
  const identityChecks = indexById(errors, profile.identityChecks, 'identityChecks', 'FAD-IDENTITY');
  const signatureChecks = indexById(errors, profile.signatureChecks, 'signatureChecks', 'FAD-SIGNATURE');
  const admissionGates = indexById(errors, profile.admissionGates, 'admissionGates', 'FAD-GATE');
  const regimeBindings = indexById(errors, profile.regimeBindings, 'regimeBindings', 'FAD-REGIME');
  const outcomes = indexById(errors, profile.outcomes, 'outcomes', 'FAD-OUTCOME');

  for (const representation of representations.values()) {
    for (const key of ['wireProfileId', 'mediaType', 'transport', 'representationRef']) {
      if (!hasString(representation, key)) {
        push(errors, 'FAD-REP-005', representation.id, `${key} must be declared`);
      }
    }
    if (!PAYLOAD_KINDS.has(representation.payloadKind)) {
      push(errors, 'FAD-REP-006', representation.id, 'payloadKind is not recognized');
    }
    if (representation.receivedBeforeAdmission !== true) {
      push(errors, 'FAD-REP-007', representation.id, 'representation must be received before admission');
    }
    if (representation.transport === 'http' && !hasString(representation, 'contentType')) {
      push(errors, 'FAD-REP-008', representation.id, 'HTTP representations require Content-Type');
    }
    if (representation.transport === 'jsonl-wire') {
      push(errors, 'FAD-REP-009', representation.id, 'JSONL is not an Internet wire transport profile');
    }
    checkEvidence(errors, representation.evidence, representation.id, 'FAD-REP-010');
  }

  const identityByRepresentation = new Set();
  for (const identity of identityChecks.values()) {
    checkReference(errors, representations, identity.representation, `${identity.id}.representation`, 'FAD-IDENTITY-005', 'representation');
    identityByRepresentation.add(identity.representation);
    if (!CANONICALIZATION.has(identity.canonicalization)) {
      push(errors, 'FAD-IDENTITY-006', identity.id, 'canonicalization is not recognized');
    }
    if (identity.duplicateNamePolicy !== 'reject-or-downgrade') {
      push(errors, 'FAD-IDENTITY-007', identity.id, 'duplicate names must reject or downgrade');
    }
    if (identity.canonicalIdentityBeforeMerge !== true) {
      push(errors, 'FAD-IDENTITY-008', identity.id, 'canonical identity must be established before merge');
    }
    if (identity.rowIdsUseSha256Jcs !== true && identity.canonicalization === 'rfc8785') {
      push(errors, 'FAD-IDENTITY-009', identity.id, 'RFC8785 EAVT identity requires sha256(jcs(row)) row IDs');
    }
    checkEvidence(errors, identity.evidence, identity.id, 'FAD-IDENTITY-010');
  }

  const signaturesByRepresentation = new Set();
  for (const signature of signatureChecks.values()) {
    checkReference(errors, representations, signature.representation, `${signature.id}.representation`, 'FAD-SIGNATURE-005', 'representation');
    signaturesByRepresentation.add(signature.representation);
    if (!SIGNATURE_ALGORITHMS.has(signature.algorithm)) {
      push(errors, 'FAD-SIGNATURE-006', signature.id, 'signature algorithm is not recognized');
    }
    if (signature.algorithm === 'Ed25519' && signature.required !== true) {
      push(errors, 'FAD-SIGNATURE-007', signature.id, 'Ed25519 signature check must be required when declared');
    }
    if (signature.algorithm === 'Ed25519' && !hasString(signature, 'keyBindingRef')) {
      push(errors, 'FAD-SIGNATURE-008', signature.id, 'Ed25519 checks require keyBindingRef');
    }
    if (signature.signatureVerifiedBeforeAdmission !== true) {
      push(errors, 'FAD-SIGNATURE-009', signature.id, 'signature verification must happen before admission');
    }
    if (signature.signatureValidityIsAdmission !== false) {
      push(errors, 'FAD-SIGNATURE-010', signature.id, 'signature validity is not admission');
    }
    checkEvidence(errors, signature.evidence, signature.id, 'FAD-SIGNATURE-011');
  }

  const gatesByRepresentation = new Map();
  for (const gate of admissionGates.values()) {
    checkReference(errors, representations, gate.representation, `${gate.id}.representation`, 'FAD-GATE-007', 'representation');
    gatesByRepresentation.set(gate.representation, gate);
    checkGateOrder(errors, gate.gateOrder, `${gate.id}.gateOrder`);
    if (gate.allGatesBeforeAppend !== true) {
      push(errors, 'FAD-GATE-008', gate.id, 'all gates must run before append');
    }
    if (gate.recognitionReceiverRelative !== true) {
      push(errors, 'FAD-GATE-009', gate.id, 'recognition must be receiver-relative');
    }
    if (gate.governanceAndCapabilityApplied !== true) {
      push(errors, 'FAD-GATE-010', gate.id, 'governance and capability gates must be applied');
    }
    if (gate.playerLocalBoundsApplied !== true) {
      push(errors, 'FAD-GATE-011', gate.id, 'player-local observation/action bounds must be applied');
    }
    if (gate.failedGateRecordsAuditOrDowngrade !== true) {
      push(errors, 'FAD-GATE-012', gate.id, 'failed gates must record audit or downgrade evidence');
    }
    checkEvidence(errors, gate.evidence, gate.id, 'FAD-GATE-013');
  }

  const regimeByRepresentation = new Map();
  for (const regime of regimeBindings.values()) {
    checkReference(errors, representations, regime.representation, `${regime.id}.representation`, 'FAD-REGIME-005', 'representation');
    regimeByRepresentation.set(regime.representation, regime);
    if (!PAYLOAD_KINDS.has(regime.payloadKind)) {
      push(errors, 'FAD-REGIME-006', regime.id, 'payloadKind is not recognized');
    }
    if (!hasString(regime, 'regimeProfileRef')) {
      push(errors, 'FAD-REGIME-007', regime.id, 'regimeProfileRef must be declared');
    }
    if (!hasString(regime, 'replayOrSettlePolicy')) {
      push(errors, 'FAD-REGIME-008', regime.id, 'replayOrSettlePolicy must be declared');
    }
    if (!DOWNGRADE_BEHAVIORS.has(regime.downgradeBehavior)) {
      push(errors, 'FAD-REGIME-009', regime.id, 'downgradeBehavior is not recognized');
    }
    if ((regime.payloadKind === 'endpoint-state' || regime.payloadKind === 'projection-artifact') && regime.endpointAloneIsFinalEvidence !== false) {
      push(errors, 'FAD-REGIME-010', regime.id, 'endpoint or projection payloads must not be final evidence alone');
    }
    checkEvidence(errors, regime.evidence, regime.id, 'FAD-REGIME-011');
  }

  for (const representation of representations.values()) {
    if (!identityByRepresentation.has(representation.id)) {
      push(errors, 'FAD-COVERAGE-001', representation.id, 'representation requires identity check');
    }
    if (!signaturesByRepresentation.has(representation.id)) {
      push(errors, 'FAD-COVERAGE-002', representation.id, 'representation requires signature check declaration');
    }
    if (!gatesByRepresentation.has(representation.id)) {
      push(errors, 'FAD-COVERAGE-003', representation.id, 'representation requires admission gates');
    }
    if (!regimeByRepresentation.has(representation.id)) {
      push(errors, 'FAD-COVERAGE-004', representation.id, 'representation requires regime binding');
    }
  }

  for (const outcome of outcomes.values()) {
    checkReference(errors, representations, outcome.representation, `${outcome.id}.representation`, 'FAD-OUTCOME-005', 'representation');
    if (!DECISIONS.has(outcome.decision)) {
      push(errors, 'FAD-OUTCOME-006', outcome.id, 'decision is not recognized');
    }
    if (!APPEND_MODES.has(outcome.appendMode)) {
      push(errors, 'FAD-OUTCOME-007', outcome.id, 'appendMode is not recognized');
    }
    if (outcome.decision === 'admitted' && outcome.appendMode !== 'trace-rows' && outcome.appendMode !== 'typed-resource') {
      push(errors, 'FAD-OUTCOME-008', outcome.id, 'admitted evidence must append trace rows or typed resources');
    }
    if (outcome.decision !== 'admitted' && outcome.appendMode !== 'audit-only' && outcome.appendMode !== 'none') {
      push(errors, 'FAD-OUTCOME-009', outcome.id, 'failed admission must not append trusted evidence');
    }
    if (outcome.decision !== 'admitted' && !hasString(outcome, 'auditEvidenceRef')) {
      push(errors, 'FAD-OUTCOME-010', outcome.id, 'failed admission requires auditEvidenceRef');
    }
    if (outcome.httpProblem === true) {
      if (!isObject(outcome.problemDetail)) {
        push(errors, 'FAD-PROBLEM-001', outcome.id, 'httpProblem requires problemDetail');
      } else {
        for (const key of ['type', 'title', 'status']) {
          if (outcome.problemDetail[key] === undefined || outcome.problemDetail[key] === '') {
            push(errors, 'FAD-PROBLEM-002', `${outcome.id}.problemDetail`, `${key} must be declared`);
          }
        }
        if (typeof outcome.problemDetail.type === 'string' && !/^https?:\/\//.test(outcome.problemDetail.type)) {
          push(errors, 'FAD-PROBLEM-003', `${outcome.id}.problemDetail.type`, 'problem type must be a stable URI');
        }
      }
    }
    checkEvidence(errors, outcome.evidence, outcome.id, 'FAD-OUTCOME-011');
  }

  if (!isObject(profile.nonConformanceBoundary)) {
    push(errors, 'FAD-BOUNDARY-001', path, 'nonConformanceBoundary must be declared');
  } else {
    for (const key of [
      'noTransportReceiptAsAdmission',
      'noSignatureAsAdmission',
      'noJsonlAsInternetWireProfile',
      'noEndpointStateAsAperiodicProof',
      'noProblemDetailAsAuditReplacement',
      'noAdmissionWithoutLocalRecognitionGovernanceAndBounds',
    ]) {
      if (profile.nonConformanceBoundary[key] !== true) {
        push(errors, 'FAD-BOUNDARY-002', `nonConformanceBoundary.${key}`, `${key} must be true`);
      }
    }
    checkEvidence(errors, profile.nonConformanceBoundary.evidence, 'nonConformanceBoundary', 'FAD-BOUNDARY-003');
  }

  return errors;
}

export const assertValidFederationAdmissionProfile = createProfileAssertion(validateFederationAdmissionProfile);
