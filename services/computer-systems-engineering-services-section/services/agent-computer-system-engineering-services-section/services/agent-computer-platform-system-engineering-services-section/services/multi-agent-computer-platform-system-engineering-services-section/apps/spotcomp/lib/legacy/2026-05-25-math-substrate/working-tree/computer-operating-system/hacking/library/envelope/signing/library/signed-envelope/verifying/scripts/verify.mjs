// verifying — signed-envelope → verified-envelope.
// Cryptographic verification of Ed25519 signature on canonical envelope JSON.
// Throws SignatureError if verification fails.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPublicKey, verify as cryptoVerify } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/verifying');
const VERIFIED_SCHEMA = loadSchema('#schema/verified-envelope');
const SIGNED_SCHEMA = loadSchema('#schema/signed-envelope');
const ENVELOPE_SCHEMA = loadSchema('#schema/envelope');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const ASSERTION_SCHEMA = loadSchema('#schema/assertion');
const DENIAL_SCHEMA = loadSchema('#schema/denial');
const CONTESTATION_SCHEMA = loadSchema('#schema/contestation');
const ABSTENTION_SCHEMA = loadSchema('#schema/abstention');
const CELL_SCHEMA = loadSchema('#schema/cell');
const VALUE_SCHEMA = loadSchema('#schema/bilattice-value');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');
const CELLID_SCHEMA = loadSchema('#schema/cell-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, CELLID_SCHEMA, VALUE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, ENVELOPE_SCHEMA, SIGNED_SCHEMA, VERIFIED_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateVerified = ajv.getSchema(VERIFIED_SCHEMA.$id);

function canonicalize(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
}

export class SignatureError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SignatureError';
  }
}

export default function verifying(input) {
  if (!validateInput(input)) {
    throw new TypeError(`verifying: ${ajv.errorsText(validateInput.errors)}`);
  }
  const signed = input['signed-envelope'];
  const expectedKey = input['expected-public-key'] ?? signed['signer-public-key'];
  if (input['expected-public-key'] && input['expected-public-key'] !== signed['signer-public-key']) {
    throw new SignatureError(
      'verifying: expected-public-key does not match signed-envelope.signer-public-key — possible identity-substitution attack'
    );
  }
  const message = Buffer.from(canonicalize(signed.envelope), 'utf8');
  const signatureBytes = Buffer.from(signed.signature, 'base64');
  const publicKey = createPublicKey(expectedKey);
  const ok = cryptoVerify(null, message, publicKey, signatureBytes);
  if (!ok) {
    throw new SignatureError(
      `verifying: Ed25519 signature verification failed for envelope from ${signed.envelope.sender}`
    );
  }
  const verified = {
    envelope: signed.envelope,
    signature: signed.signature,
    'signer-public-key': signed['signer-public-key'],
    'verified-by': expectedKey,
    'verified-at': new Date().toISOString(),
  };
  if (!validateVerified(verified)) {
    throw new TypeError(`verifying: output invalid: ${ajv.errorsText(validateVerified.errors)}`);
  }
  return Object.freeze(verified);
}

export const schema = INPUT_SCHEMA;
