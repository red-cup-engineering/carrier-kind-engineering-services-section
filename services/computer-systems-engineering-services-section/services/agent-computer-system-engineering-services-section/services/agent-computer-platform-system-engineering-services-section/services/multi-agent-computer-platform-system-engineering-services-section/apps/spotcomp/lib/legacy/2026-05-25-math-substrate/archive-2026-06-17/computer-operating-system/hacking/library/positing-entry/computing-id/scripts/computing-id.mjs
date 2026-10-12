// computing-id — positing-entry → cell-id.
// SHA-256 over the row's canonical serialization {e, a, v, t}, truncated to
// 16 hex chars. The whole row {e, a, v, t} is the hash input; identical rows
// content-address identically.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/computing-id');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const TID_SCHEMA = loadSchema('#schema/transaction-id');
const CELLID_SCHEMA = loadSchema('#schema/cell-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, TID_SCHEMA, CELLID_SCHEMA, ENTRY_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);

// Stable canonical serialization (lexicographically-ordered keys) of the row.
function canon(x) {
  if (Array.isArray(x)) return `[${x.map(canon).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`;
  }
  return JSON.stringify(x);
}

export default function computingId(input) {
  if (!validateInput(input)) {
    throw new TypeError(`computing-id: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { entry } = input;
  const canonical = canon({ e: entry.e, a: entry.a, v: entry.v, t: entry.t });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

export const schema = INPUT_SCHEMA;
