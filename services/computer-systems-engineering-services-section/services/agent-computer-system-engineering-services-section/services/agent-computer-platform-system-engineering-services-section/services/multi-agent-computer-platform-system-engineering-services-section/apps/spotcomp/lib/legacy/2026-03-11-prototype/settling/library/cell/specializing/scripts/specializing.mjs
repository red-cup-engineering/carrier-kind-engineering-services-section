// specializing — cell × specialization-pair → cell ∪ {null}.
// Applies a predicate-category specialization morphism to a cell:
// if cell.p === pair.source, produce (cell.s, pair.target, cell.o).
// Returns null if cell.p does not match — the morphism is partial.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/specializing');
const CELL_SCHEMA = loadSchema('#schema/cell');
const PAIR_SCHEMA = loadSchema('#schema/specialization-pair');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');

const ajv = new Ajv2020({ strict: false });
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, CELL_SCHEMA, PAIR_SCHEMA]) {
  ajv.addSchema(s);
}
const validate = ajv.compile(INPUT_SCHEMA);

export default function specializing(input) {
  if (!validate(input)) {
    throw new TypeError(`specializing: ${ajv.errorsText(validate.errors)}`);
  }
  const { cell, 'specialization-pair': pair } = input;
  if (cell.p !== pair.source) return null;
  return Object.freeze({ s: cell.s, p: pair.target, o: cell.o });
}

export const schema = INPUT_SCHEMA;
