// persisting — positing-entry × class × positing-log → file-path.
// Appends a pure-EAVT JSON line to <root>/<class>/<class>.jsonl.
// Class encodes via path; the row stores no class field.

import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/persisting');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const POSITING_LOG_SCHEMA = loadSchema('#schema/positing-log');
const CELL_SCHEMA = loadSchema('#schema/cell');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, POSITING_LOG_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);

export default function persisting(input) {
  if (!validateInput(input)) {
    throw new TypeError(`persisting: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { entry, class: cls } = input;
  const log = input['positing-log'];
  const dir = resolve(log['root-dir'], cls);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${cls}.jsonl`);
  appendFileSync(path, JSON.stringify(entry) + '\n', 'utf8');
  return path;
}

export const schema = INPUT_SCHEMA;
