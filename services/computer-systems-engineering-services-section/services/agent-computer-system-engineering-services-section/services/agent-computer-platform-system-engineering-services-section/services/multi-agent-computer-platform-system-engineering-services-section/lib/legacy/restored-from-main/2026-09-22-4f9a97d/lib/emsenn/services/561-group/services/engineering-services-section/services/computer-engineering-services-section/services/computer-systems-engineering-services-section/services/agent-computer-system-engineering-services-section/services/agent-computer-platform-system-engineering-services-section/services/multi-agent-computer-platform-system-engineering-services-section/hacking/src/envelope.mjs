import { sign, verify } from 'node:crypto';

import { assertEavtRow, canonicalJson } from './trace.mjs';

export const ENVELOPE_PROFILE = 'spotcomp-eavt-envelope-v1';

export function signingPayload(envelope) {
  const { signature: _signature, ...unsigned } = envelope;
  return Buffer.from(canonicalJson(unsigned), 'utf8');
}

export function createUnsignedEnvelope({ sender, keyId, created, nonce, rows }) {
  if (!sender || !keyId || !created || !nonce) {
    throw new TypeError('Envelope sender, keyId, created, and nonce are required');
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError('Envelope rows must be a non-empty array');
  }
  return {
    profile: ENVELOPE_PROFILE,
    sender,
    keyId,
    created,
    nonce,
    rows: rows.map(assertEavtRow),
  };
}

export function signEnvelope(unsignedEnvelope, privateKey) {
  const envelope = {
    ...unsignedEnvelope,
    signature: {
      alg: 'Ed25519',
      value: '',
    },
  };
  envelope.signature.value = sign(null, signingPayload(envelope), privateKey).toString('base64');
  return envelope;
}

export function verifyEnvelope(envelope, publicKey) {
  if (envelope?.profile !== ENVELOPE_PROFILE) {
    return false;
  }
  if (envelope?.signature?.alg !== 'Ed25519' || typeof envelope.signature.value !== 'string') {
    return false;
  }
  if (!Array.isArray(envelope.rows) || envelope.rows.length === 0) {
    return false;
  }
  for (const row of envelope.rows) {
    assertEavtRow(row);
  }
  return verify(
    null,
    signingPayload(envelope),
    publicKey,
    Buffer.from(envelope.signature.value, 'base64'),
  );
}

