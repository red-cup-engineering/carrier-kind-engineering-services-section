// conversing — cell × converse-pair → cell ∪ {null}.
// Applies the predicate-category converse morphism to a cell.
// (cell.s, forward, cell.o) ↦ (cell.o, reverse, cell.s)
// (cell.s, reverse, cell.o) ↦ (cell.o, forward, cell.s)  (involutive)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/conversing');
const CELL_SCHEMA = loadSchema('#schema/cell');
const PAIR_SCHEMA = loadSchema('#schema/converse-pair');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');

const ajv = new Ajv2020({ strict: false });
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, CELL_SCHEMA, PAIR_SCHEMA]) {
  ajv.addSchema(s);
}
const validate = ajv.compile(INPUT_SCHEMA);

export default function conversing(input) {
  if (!validate(input)) {
    throw new TypeError(`conversing: ${ajv.errorsText(validate.errors)}`);
  }
  const { cell, 'converse-pair': pair } = input;
  if (cell.p === pair.forward) {
    return Object.freeze({ s: cell.o, p: pair.reverse, o: cell.s });
  }
  if (cell.p === pair.reverse) {
    return Object.freeze({ s: cell.o, p: pair.forward, o: cell.s });
  }
  return null;
}

export const schema = INPUT_SCHEMA;
