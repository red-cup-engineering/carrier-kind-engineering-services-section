import { nonEmptyStringArray } from "./primitive-admission.mjs";
const REGIMES = new Set(['strict', 'scott-continuous', 'transfinite-bounded', 'aperiodic']);
const PAYLOAD_KINDS = new Set(['trace-increment', 'endpoint-state', 'trajectory-prefix', 'cohomology-audit', 'projection-artifact']);
const DOWNGRADES = new Set(['reject', 'accept-as-trace-only', 'accept-as-informative-projection']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}


function push(errors, code, message) {
  errors.push({ code, message });
}

export function validateRegimeRecord(record) {
  const errors = [];
  if (!isObject(record)) {
    return [{ code: 'RF-REGIME-001', message: 'regime record must be an object' }];
  }
  if (!REGIMES.has(record.regime)) {
    push(errors, 'RF-REGIME-002', 'regime must be strict, scott-continuous, transfinite-bounded, or aperiodic');
  }
  if (!hasString(record, 'ruleSystemId')) {
    push(errors, 'RF-REGIME-003', 'regime record must declare ruleSystemId');
  }
  if (!hasString(record, 'closureOrdinalClaim')) {
    push(errors, 'RF-REGIME-004', 'regime record must declare closureOrdinalClaim');
  }
  if (!nonEmptyStringArray(record.evidence)) {
    push(errors, 'RF-REGIME-005', 'regime record must cite evidence');
  }

  if (record.regime === 'strict' && record.closureOrdinalClaim !== 'finite') {
    push(errors, 'RF-REGIME-006', 'strict regime requires finite closureOrdinalClaim');
  }
  if (record.regime === 'scott-continuous' && record.closureOrdinalClaim !== 'omega') {
    push(errors, 'RF-REGIME-007', 'scott-continuous regime requires omega closureOrdinalClaim');
  }
  if (record.regime === 'transfinite-bounded' && record.closureOrdinalClaim !== 'countable-transfinite') {
    push(errors, 'RF-REGIME-008', 'transfinite-bounded regime requires countable-transfinite closureOrdinalClaim');
  }
  if (record.regime === 'aperiodic' && record.closureOrdinalClaim !== 'omega1-or-above') {
    push(errors, 'RF-REGIME-009', 'aperiodic regime requires omega1-or-above closureOrdinalClaim');
  }

  if ((record.regime === 'transfinite-bounded' || record.regime === 'aperiodic') && record.endpointStateSufficient === true) {
    push(errors, 'RF-REGIME-010', 'transfinite-bounded and aperiodic regimes cannot declare endpointStateSufficient');
  }

  return errors;
}

export function validateFederationProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'RF-PROFILE-001', message: 'federation profile must be an object' }];
  }
  if (!hasString(profile, 'profileId')) {
    push(errors, 'RF-PROFILE-002', 'profile must declare profileId');
  }
  if (!PAYLOAD_KINDS.has(profile.payloadKind)) {
    push(errors, 'RF-PROFILE-003', 'profile must declare a valid payloadKind');
  }
  if (!DOWNGRADES.has(profile.downgradeBehavior)) {
    push(errors, 'RF-PROFILE-004', 'profile must declare downgradeBehavior');
  }
  if (!nonEmptyStringArray(profile.evidence)) {
    push(errors, 'RF-PROFILE-005', 'profile must cite evidence');
  }

  errors.push(...validateRegimeRecord(profile.regime));
  if (!isObject(profile.regime) || !REGIMES.has(profile.regime.regime)) {
    return errors;
  }

  const regime = profile.regime.regime;
  if (profile.payloadKind === 'endpoint-state') {
    if (regime === 'transfinite-bounded' || regime === 'aperiodic') {
      push(errors, 'RF-PAYLOAD-001', 'endpoint-state cannot be the primary payload for transfinite-bounded or aperiodic regimes');
    }
    if (regime === 'scott-continuous' && !nonEmptyStringArray(profile.continuityEvidence)) {
      push(errors, 'RF-PAYLOAD-002', 'scott-continuous endpoint-state requires continuityEvidence');
    }
  }

  if ((regime === 'transfinite-bounded' || regime === 'aperiodic') && profile.payloadKind !== 'trace-increment') {
    const hasTrajectory = nonEmptyStringArray(profile.trajectory);
    const hasAudit = isObject(profile.cohomologyAudit) && nonEmptyStringArray(profile.cohomologyAudit.claims);
    if (!hasTrajectory && !hasAudit) {
      push(errors, 'RF-PAYLOAD-003', 'transfinite-bounded and aperiodic non-trace payloads require trajectory or cohomology audit evidence');
    }
  }

  if (profile.payloadKind === 'projection-artifact' && !nonEmptyStringArray(profile.frontier)) {
    push(errors, 'RF-PAYLOAD-004', 'projection-artifact requires source frontier evidence');
  }

  return errors;
}

export function assertValidFederationProfile(profile) {
  const errors = validateFederationProfile(profile);
  if (errors.length > 0) {
    throw new TypeError(errors.map((error) => `${error.code}: ${error.message}`).join('\n'));
  }
  return profile;
}
