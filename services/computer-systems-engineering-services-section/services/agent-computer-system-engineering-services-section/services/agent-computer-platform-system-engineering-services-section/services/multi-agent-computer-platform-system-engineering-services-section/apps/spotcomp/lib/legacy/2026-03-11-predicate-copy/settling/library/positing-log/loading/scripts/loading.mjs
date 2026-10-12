// loading — positing-log → entries-by-class.
// Walks <root>/{assertion,denial,contestation,abstention}/<class>.jsonl,
// returns a per-class object with arrays of pure-EAVT positing-entries.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
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

function loadClassLog(root, cls) {
  const path = join(root, cls, `${cls}.jsonl`);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf8');
  const entries = [];
  for (const line of content.split('\n')) {
    if (line.trim().length === 0) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (!validateEntry(entry)) continue;
    entries.push(entry);
  }
  return entries;
}

export default function loading(input) {
  if (!validateInput(input)) {
    throw new TypeError(`loading: ${ajv.errorsText(validateInput.errors)}`);
  }
  const root = resolve(input['positing-log']['root-dir']);
  return {
    assertions:    loadClassLog(root, 'assertion'),
    denials:       loadClassLog(root, 'denial'),
    contestations: loadClassLog(root, 'contestation'),
    abstentions:   loadClassLog(root, 'abstention'),
  };
}

export const schema = INPUT_SCHEMA;
