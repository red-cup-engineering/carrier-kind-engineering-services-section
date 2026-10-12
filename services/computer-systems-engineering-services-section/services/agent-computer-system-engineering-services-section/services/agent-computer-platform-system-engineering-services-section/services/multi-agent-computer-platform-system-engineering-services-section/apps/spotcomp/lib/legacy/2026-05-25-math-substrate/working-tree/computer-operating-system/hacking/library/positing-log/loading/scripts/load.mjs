// loading — positing-log → the thing's trace as a flat array of positing-entry rows.
// Reads one per-thing JSONL log at its log-path, in append (file) order;
// returns that one thing's rows.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/loading');
const POSITING_LOG_SCHEMA = loadSchema('#schema/positing-log');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
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
const validateEntry = ajv.getSchema(ENTRY_SCHEMA.$id);

export default function loading(input) {
  if (!validateInput(input)) {
    throw new TypeError(`loading: ${ajv.errorsText(validateInput.errors)}`);
  }
  const path = resolve(input['positing-log']['log-path']);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf8');
  const entries = [];
  for (const line of content.split('\n')) {
    if (line.trim().length === 0) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (validateEntry && !validateEntry(entry)) continue;
    entries.push(entry);
  }
  return entries;
}

export const schema = INPUT_SCHEMA;
