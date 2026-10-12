// projecting-value — cell-trace → bilattice-value.
// The math-faithful projection T → FOUR: walk the trace's four class arrays
// and compute (pos, neg) where pos = ∃ assertion or contestation at the
// cell; neg = ∃ denial or contestation at the cell. Abstentions don't
// contribute (the ⊥ class is the identity in ≤_k). The bilattice value
// at a cell is NEVER stored; this morphism is how you read it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/projecting-value');
const TRACE_SCHEMA = loadSchema('#schema/cell-trace');
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

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, VALUE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, TRACE_SCHEMA]) {
  ajv.addSchema(s);
}
const validate = ajv.compile(INPUT_SCHEMA);

export default function projectingValue(input) {
  if (!validate(input)) {
    throw new TypeError(`projecting-value: ${ajv.errorsText(validate.errors)}`);
  }
  const { trace } = input;
  const pos = trace.assertions.length > 0 || trace.contestations.length > 0;
  const neg = trace.denials.length > 0 || trace.contestations.length > 0;
  return Object.freeze({ pos, neg });
}

export const schema = INPUT_SCHEMA;
