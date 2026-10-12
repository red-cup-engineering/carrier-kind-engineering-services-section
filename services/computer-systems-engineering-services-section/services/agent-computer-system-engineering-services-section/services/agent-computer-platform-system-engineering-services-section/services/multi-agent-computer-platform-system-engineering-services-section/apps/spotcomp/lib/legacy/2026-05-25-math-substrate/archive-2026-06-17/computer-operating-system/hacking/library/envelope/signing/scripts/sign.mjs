// signing — envelope × key-pair → signed-envelope.
// Computes an Ed25519 signature over the canonical JSON serialization of
// the envelope. The signed-envelope is what crosses the wire to other
// SPOTCOMP instances.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/signing');
const SIGNED_SCHEMA = loadSchema('#schema/signed-envelope');
const ENVELOPE_SCHEMA = loadSchema('#schema/envelope');
const KEYPAIR_SCHEMA = loadSchema('#schema/key-pair');
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
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, CELLID_SCHEMA, VALUE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, ENVELOPE_SCHEMA, KEYPAIR_SCHEMA, SIGNED_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateSigned = ajv.getSchema(SIGNED_SCHEMA.$id);

// Canonical JSON serialization: sort keys recursively for stable signing.
function canonicalize(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
}

// Derive PEM public key from a PEM private key. Node's createPrivateKey
// gives a KeyObject; calling export with spki/pem yields the matching public.
import { createPublicKey } from 'node:crypto';
function publicKeyFromPrivate(privatePem) {
  const priv = createPrivateKey(privatePem);
  const pub = createPublicKey(priv);
  return pub.export({ format: 'pem', type: 'spki' });
}

export default function signing(input) {
  if (!validateInput(input)) {
    throw new TypeError(`signing: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { envelope, 'key-pair': keyPair } = input;
  const message = Buffer.from(canonicalize(envelope), 'utf8');
  const privateKey = createPrivateKey(keyPair.privateKey);
  // Ed25519: pass null for algorithm — the key object encodes it.
  const sig = cryptoSign(null, message, privateKey);
  const signed = {
    envelope,
    signature: sig.toString('base64'),
    'signer-public-key': keyPair.publicKey,
  };
  if (!validateSigned(signed)) {
    throw new TypeError(`signing: output invalid: ${ajv.errorsText(validateSigned.errors)}`);
  }
  return Object.freeze(signed);
}

export const schema = INPUT_SCHEMA;
export { canonicalize, publicKeyFromPrivate };
