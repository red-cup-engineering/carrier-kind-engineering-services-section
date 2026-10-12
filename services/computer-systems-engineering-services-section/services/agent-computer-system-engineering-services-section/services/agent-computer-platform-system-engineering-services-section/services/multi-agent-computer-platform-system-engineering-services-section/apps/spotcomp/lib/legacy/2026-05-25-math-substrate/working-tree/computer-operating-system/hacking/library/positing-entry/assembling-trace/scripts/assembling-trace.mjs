// assembling-trace — cell × array of positing-entry → cell-trace.
// Filters a thing's trace to the rows at the given cell (row e, a, v equal the
// cell's subject, predicate, object) and sorts them by t into a single
// t-ordered sequence.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/assembling-trace');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const CELL_SCHEMA = loadSchema('#schema/predication-cell');
const TRACE_SCHEMA = loadSchema('#schema/cell-trace');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const TID_SCHEMA = loadSchema('#schema/transaction-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, TID_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, TRACE_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateTrace = ajv.getSchema(TRACE_SCHEMA.$id);

// Stable canonical form for structural equality / ordering of rich coordinates.
function canon(x) {
  if (Array.isArray(x)) return `[${x.map(canon).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`;
  }
  return JSON.stringify(x);
}
const eq = (a, b) => canon(a) === canon(b);

function entryAtCell(entry, cell) {
  return eq(entry.e, cell.subject) && eq(entry.a, cell.predicate) && eq(entry.v, cell.object);
}

function byT(a, b) { return canon(a.t) < canon(b.t) ? -1 : canon(a.t) > canon(b.t) ? 1 : 0; }

export default function assemblingTrace(input) {
  if (!validateInput(input)) {
    throw new TypeError(`assembling-trace: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { cell, entries } = input;
  const at = [...entries].filter((e) => entryAtCell(e, cell)).sort(byT);
  const trace = { cell, entries: at };
  if (validateTrace && !validateTrace(trace)) {
    throw new TypeError(`assembling-trace: output invalid: ${ajv.errorsText(validateTrace.errors)}`);
  }
  return Object.freeze({ cell, entries: Object.freeze(at) });
}

export const schema = INPUT_SCHEMA;
