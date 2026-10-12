import { createProfileAssertion, push } from "./profile-admission.mjs";
import { nonEmptyStringArray } from "./primitive-admission.mjs";
const PAYLOAD_KINDS = new Set([
  'eavt-envelope',
  'eavt-trace-sequence',
  'problem-detail',
  'shp-packet',
  'regime-record',
  'federation-profile',
]);

const REPRESENTATIONS = new Set(['json', 'json-seq', 'html']);
const REGISTRATIONS = new Set(['existing-standard', 'candidate-unregistered', 'registered', 'not-applicable']);
const TRANSPORTS = new Set(['http', 'filesystem', 'both']);
const RFCS = new Set(['RFC6838', 'RFC6839', 'RFC7464', 'RFC8032', 'RFC8259', 'RFC8410', 'RFC8785', 'RFC9110', 'RFC9457']);
const SIGNATURE_INPUTS = new Set(['canonical-json', 'canonical-json-items', 'row-id-manifest', 'none']);

import { isObject } from "./object-record.mjs";

function hasString(value, key) {
  return typeof value[key] === 'string' && value[key].length > 0;
}


function hasRfc(profile, rfc) {
  return Array.isArray(profile.requiredRfc) && profile.requiredRfc.includes(rfc);
}

function isSpotcompMediaType(mediaType) {
  return typeof mediaType === 'string' && /^application\/spotcomp[-+.a-z0-9]*\+json$/.test(mediaType);
}

export function validateWireProfile(profile) {
  const errors = [];
  if (!isObject(profile)) {
    return [{ code: 'WIRE-PROFILE-001', path: '<profile>', message: 'wire profile must be an object' }];
  }

  const path = hasString(profile, 'profileId') ? profile.profileId : '<profile>';
  if (!hasString(profile, 'profileId')) {
    push(errors, 'WIRE-PROFILE-002', path, 'profileId must be a non-empty string');
  }
  if (!PAYLOAD_KINDS.has(profile.payloadKind)) {
    push(errors, 'WIRE-PROFILE-003', path, 'payloadKind is not recognized');
  }
  if (!REPRESENTATIONS.has(profile.representation)) {
    push(errors, 'WIRE-PROFILE-004', path, 'representation must be json, json-seq, or html');
  }
  if (!hasString(profile, 'mediaType')) {
    push(errors, 'WIRE-PROFILE-005', path, 'mediaType must be a non-empty string');
  }
  if (!REGISTRATIONS.has(profile.registration)) {
    push(errors, 'WIRE-PROFILE-006', path, 'registration must be existing-standard, candidate-unregistered, registered, or not-applicable');
  }
  if (!TRANSPORTS.has(profile.transport)) {
    push(errors, 'WIRE-PROFILE-007', path, 'transport must be http, filesystem, or both');
  }
  if (!Array.isArray(profile.requiredRfc) || profile.requiredRfc.some((rfc) => !RFCS.has(rfc))) {
    push(errors, 'WIRE-PROFILE-008', path, 'requiredRfc must list known RFC identifiers');
  }
  if (!nonEmptyStringArray(profile.evidence)) {
    push(errors, 'WIRE-PROFILE-009', path, 'profile must cite evidence');
  }
  if (profile.signatureInput !== undefined && !SIGNATURE_INPUTS.has(profile.signatureInput)) {
    push(errors, 'WIRE-PROFILE-010', path, 'signatureInput is not recognized');
  }

  if (profile.representation === 'json') {
    if (!hasRfc(profile, 'RFC8259')) {
      push(errors, 'WIRE-JSON-001', path, 'JSON representation requires RFC8259');
    }
    if (profile.mediaType?.endsWith('+json') && !hasRfc(profile, 'RFC6839')) {
      push(errors, 'WIRE-JSON-002', path, '+json media types require RFC6839');
    }
  }

  if (profile.representation === 'json-seq') {
    if (profile.mediaType !== 'application/json-seq') {
      push(errors, 'WIRE-JSONSEQ-001', path, 'json-seq representation must use application/json-seq');
    }
    if (!hasRfc(profile, 'RFC7464')) {
      push(errors, 'WIRE-JSONSEQ-002', path, 'json-seq representation requires RFC7464');
    }
    if (profile.signature !== 'none' && profile.signatureInput !== 'canonical-json-items' && profile.signatureInput !== 'row-id-manifest') {
      push(errors, 'WIRE-JSONSEQ-003', path, 'signed json-seq profiles must sign canonical items or a row-id manifest');
    }
  }

  if (profile.payloadKind === 'problem-detail') {
    if (profile.mediaType !== 'application/problem+json') {
      push(errors, 'WIRE-PROBLEM-001', path, 'problem details require application/problem+json');
    }
    if (!hasRfc(profile, 'RFC9457')) {
      push(errors, 'WIRE-PROBLEM-002', path, 'problem details require RFC9457');
    }
    if (!hasString(profile, 'problemTypeBase')) {
      push(errors, 'WIRE-PROBLEM-003', path, 'problem details should declare problemTypeBase');
    }
  }

  if (profile.signature === 'ed25519') {
    if (profile.canonicalization !== 'rfc8785') {
      push(errors, 'WIRE-SIG-001', path, 'signed JSON profiles require RFC8785 canonicalization');
    }
    if (!hasRfc(profile, 'RFC8032')) {
      push(errors, 'WIRE-SIG-002', path, 'Ed25519 signature profiles require RFC8032');
    }
    if (profile.signatureInput !== 'canonical-json' && profile.signatureInput !== 'canonical-json-items' && profile.signatureInput !== 'row-id-manifest') {
      push(errors, 'WIRE-SIG-003', path, 'signed profiles must declare canonical signatureInput');
    }
  }

  if (profile.canonicalization === 'rfc8785' && !hasRfc(profile, 'RFC8785')) {
    push(errors, 'WIRE-CANON-001', path, 'rfc8785 canonicalization requires RFC8785');
  }

  if (profile.keyEncoding === 'x509-spki' && !hasRfc(profile, 'RFC8410')) {
    push(errors, 'WIRE-KEY-001', path, 'X.509/SPKI Ed25519 key profiles require RFC8410');
  }

  if ((profile.transport === 'http' || profile.transport === 'both')) {
    if (!hasRfc(profile, 'RFC9110')) {
      push(errors, 'WIRE-HTTP-001', path, 'HTTP transport requires RFC9110');
    }
    if (profile.contentTypeRequired !== true) {
      push(errors, 'WIRE-HTTP-002', path, 'HTTP profiles must require Content-Type');
    }
  }

  if (isSpotcompMediaType(profile.mediaType)) {
    if (profile.registration !== 'candidate-unregistered' && profile.registration !== 'registered') {
      push(errors, 'WIRE-MEDIA-001', path, 'SPOTCOMP-specific media types must be candidate-unregistered until registered');
    }
    if (!hasRfc(profile, 'RFC6838')) {
      push(errors, 'WIRE-MEDIA-002', path, 'candidate media types require RFC6838');
    }
    if (profile.registration === 'candidate-unregistered' && (!Array.isArray(profile.openObligations) || profile.openObligations.length === 0)) {
      push(errors, 'WIRE-MEDIA-003', path, 'candidate-unregistered media types require open registration obligations');
    }
  }

  return errors;
}

export function validateWireProfiles(profiles) {
  if (!Array.isArray(profiles)) {
    return [{ code: 'WIRE-PROFILES-001', path: '<profiles>', message: 'wire profiles document must be an array' }];
  }
  const errors = profiles.flatMap((profile) => validateWireProfile(profile));
  const ids = new Set();
  for (const profile of profiles) {
    if (!isObject(profile) || typeof profile.profileId !== 'string') {
      continue;
    }
    if (ids.has(profile.profileId)) {
      push(errors, 'WIRE-PROFILES-002', profile.profileId, 'profileId values must be unique');
    }
    ids.add(profile.profileId);
  }
  return errors;
}

export const assertValidWireProfiles = createProfileAssertion(validateWireProfiles);
