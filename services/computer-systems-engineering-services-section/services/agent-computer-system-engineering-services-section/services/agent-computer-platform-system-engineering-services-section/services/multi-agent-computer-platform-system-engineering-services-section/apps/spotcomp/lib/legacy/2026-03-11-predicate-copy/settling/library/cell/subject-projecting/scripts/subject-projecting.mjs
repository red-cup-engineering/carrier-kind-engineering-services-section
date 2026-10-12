// subject-projecting — cell × projection → cell ∪ {null}.
// (cell.s, binary, cell.o) ↦ (cell.s, unary, cell.s)  when kind === 's'

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/subject-projecting');
const CELL_SCHEMA = loadSchema('#schema/cell');
const PROJ_SCHEMA = loadSchema('#schema/projection');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');

const ajv = new Ajv2020({ strict: false });
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, CELL_SCHEMA, PROJ_SCHEMA]) {
  ajv.addSchema(s);
}
const validate = ajv.compile(INPUT_SCHEMA);

export default function subjectProjecting(input) {
  if (!validate(input)) {
    throw new TypeError(`subject-projecting: ${ajv.errorsText(validate.errors)}`);
  }
  const { cell, projection } = input;
  if (projection.kind !== 's') return null;
  if (cell.p !== projection.binary) return null;
  return Object.freeze({ s: cell.s, p: projection.unary, o: cell.s });
}

export const schema = INPUT_SCHEMA;
