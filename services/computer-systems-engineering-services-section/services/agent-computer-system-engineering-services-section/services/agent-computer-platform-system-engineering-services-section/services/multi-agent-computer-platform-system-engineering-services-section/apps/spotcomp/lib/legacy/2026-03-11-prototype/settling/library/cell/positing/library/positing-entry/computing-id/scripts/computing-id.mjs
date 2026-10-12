// computing-id — positing-entry × class → cell-id.
// SHA-256 over (cell, class, t), truncated to 16 hex chars.
// The class is in the hash because the same (cell, t) in different
// class logs is a different positing-entry (the class is its provenance).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/computing-id');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const CELL_SCHEMA = loadSchema('#schema/cell');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');
const CELLID_SCHEMA = loadSchema('#schema/cell-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, CELLID_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);

const US = String.fromCharCode(0x1f);

export default function computingId(input) {
  if (!validateInput(input)) {
    throw new TypeError(`computing-id: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { entry, class: cls } = input;
  const canonical = entry.e + US + entry.a + US + entry.v + US + cls + US + entry.t;
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

export const schema = INPUT_SCHEMA;
