// assembling-trace — entries-by-class × cell → cell-trace.
// Filters each per-class entry list to entries at the given cell, sorts by t,
// returns a cell-trace (categorical product of the four sorted arrays).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/assembling-trace');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const ASSERTION_SCHEMA = loadSchema('#schema/assertion');
const DENIAL_SCHEMA = loadSchema('#schema/denial');
const CONTESTATION_SCHEMA = loadSchema('#schema/contestation');
const ABSTENTION_SCHEMA = loadSchema('#schema/abstention');
const CELL_SCHEMA = loadSchema('#schema/cell');
const TRACE_SCHEMA = loadSchema('#schema/cell-trace');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, TRACE_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateTrace = ajv.getSchema(TRACE_SCHEMA.$id);

function entryMatchesCell(entry, cell) {
  return entry.e === cell.s && entry.a === cell.p && entry.v === cell.o;
}

function byT(a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; }

export default function assemblingTrace(input) {
  if (!validateInput(input)) {
    throw new TypeError(`assembling-trace: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { cell, entries } = input;
  const at = (list) => [...list].filter((e) => entryMatchesCell(e, cell)).sort(byT);
  const trace = {
    cell,
    assertions:    at(entries.assertions),
    denials:       at(entries.denials),
    contestations: at(entries.contestations),
    abstentions:   at(entries.abstentions),
  };
  if (!validateTrace(trace)) {
    throw new TypeError(`assembling-trace: output invalid: ${ajv.errorsText(validateTrace.errors)}`);
  }
  return Object.freeze({
    cell,
    assertions: Object.freeze(trace.assertions),
    denials: Object.freeze(trace.denials),
    contestations: Object.freeze(trace.contestations),
    abstentions: Object.freeze(trace.abstentions),
  });
}

export const schema = INPUT_SCHEMA;
