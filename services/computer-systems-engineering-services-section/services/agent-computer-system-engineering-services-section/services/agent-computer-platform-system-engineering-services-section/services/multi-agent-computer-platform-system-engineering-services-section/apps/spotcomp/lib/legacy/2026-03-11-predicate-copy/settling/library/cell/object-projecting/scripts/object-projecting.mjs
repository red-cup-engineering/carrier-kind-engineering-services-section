// object-projecting — cell × projection → cell ∪ {null}.
// (cell.s, binary, cell.o) ↦ (cell.o, unary, cell.o)  when kind === 'o'

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/object-projecting');
const CELL_SCHEMA = loadSchema('#schema/cell');
const PROJ_SCHEMA = loadSchema('#schema/projection');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');

const ajv = new Ajv2020({ strict: false });
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, CELL_SCHEMA, PROJ_SCHEMA]) {
  ajv.addSchema(s);
}
const validate = ajv.compile(INPUT_SCHEMA);

export default function objectProjecting(input) {
  if (!validate(input)) {
    throw new TypeError(`object-projecting: ${ajv.errorsText(validate.errors)}`);
  }
  const { cell, projection } = input;
  if (projection.kind !== 'o') return null;
  if (cell.p !== projection.binary) return null;
  return Object.freeze({ s: cell.o, p: projection.unary, o: cell.o });
}

export const schema = INPUT_SCHEMA;
