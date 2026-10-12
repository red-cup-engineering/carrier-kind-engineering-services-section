// positing — the math primitive of the predication category at the cell level.
// (cell, datum) → { class, entry } where entry is pure EAVT (cell, t).
// The class is computed from the datum's truth-class by the Belnap partition:
//   datum.pos &&  !datum.neg   →  'assertion'
//   !datum.pos &&  datum.neg   →  'denial'
//    datum.pos &&  datum.neg   →  'contestation'
//   !datum.pos && !datum.neg   →  'abstention'
// The datum is the input; the row is the output. Class encodes the datum
// on disk via per-class JSONL paths. Positing = asserting = predicating
// at the math primitive level (this is the same morphism by different
// historical names).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/positing');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const CELL_SCHEMA = loadSchema('#schema/cell');
const VALUE_SCHEMA = loadSchema('#schema/bilattice-value');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, VALUE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateEntry = ajv.getSchema(ENTRY_SCHEMA.$id);

export function classifyDatum(datum) {
  if (datum.pos && !datum.neg) return 'assertion';
  if (!datum.pos && datum.neg) return 'denial';
  if (datum.pos && datum.neg) return 'contestation';
  return 'abstention';
}

export default function positing(input) {
  if (!validateInput(input)) {
    throw new TypeError(`positing: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { cell, datum } = input;
  const t = input.t ?? new Date().toISOString();
  const entry = Object.freeze({ e: cell.s, a: cell.p, v: cell.o, t });
  if (!validateEntry(entry)) {
    throw new TypeError(`positing: entry invalid: ${ajv.errorsText(validateEntry.errors)}`);
  }
  const cls = classifyDatum(datum);
  return Object.freeze({ class: cls, entry });
}

export const schema = INPUT_SCHEMA;
