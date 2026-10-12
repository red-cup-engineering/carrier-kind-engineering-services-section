// expanding: a predication-cell-set (generators E = entity-set, Pi = predicate-set)
// -> its predication-cell-family = the Cartesian product Phi = E x Pi x E. Generates
// every (subject, predicate, object) position and verifies the derived count
// |E|*|Pi|*|E| and component membership. The cell-set is presented by its two
// upstream generators; the cell family is generated, not stored as out-of-band data.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (a) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(a)), 'utf8'));
const PCS = '#predication-cell-set';
const entitySetSchema = admitSchema({ schema: load(`${PCS}/library/predicate-set/library/predicate-category/library/category/library/entity-set/entity-set.schema.json`) }).schema;
const predicateSetSchema = admitSchema({ schema: load(`${PCS}/library/predicate-set/predicate-set.schema.json`) }).schema;
const predicationCellSchema = admitSchema({ schema: load(`${PCS}/library/predication-cell/predication-cell.schema.json`) }).schema;
const REFERENCES = [entitySetSchema, predicateSetSchema, predicationCellSchema];
const cellSetSchema = admitSchema({ schema: load(`${PCS}/predication-cell-set.schema.json`) }).schema;
const cellFamilySchema = admitSchema({ schema: load(`${PCS}/library/predication-cell-family/predication-cell-family.schema.json`) }).schema;
const validateIn = (instance) => validateSchemaInstance({ instance, schema: cellSetSchema, schemas: REFERENCES });
const validateOut = (instance) => validateSchemaInstance({ instance, schema: cellFamilySchema, schemas: REFERENCES });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');

export default function expand(cellSet) {
  const inCheck = validateIn(cellSet);
  if (!inCheck.ok) throw new TypeError(`expand: input not a predication-cell-set: ${errorsText(inCheck.errors)}`);
  const E = cellSet['entity-set'].entities;
  const Pi = cellSet['predicate-set'].predicates;

  const cells = [];
  for (const subject of E) for (const predicate of Pi) for (const object of E) cells.push({ subject, predicate, object });

  if (cells.length !== E.length * Pi.length * E.length) throw new Error('expand: cell count is not |E|*|Pi|*|E|');
  for (const c of cells) {
    if (!E.includes(c.subject)) throw new Error(`expand: subject ${c.subject} not in E`);
    if (!Pi.includes(c.predicate)) throw new Error(`expand: predicate ${c.predicate} not in Pi`);
    if (!E.includes(c.object)) throw new Error(`expand: object ${c.object} not in E`);
  }

  const out = { cells };
  const outCheck = validateOut(out);
  if (!outCheck.ok) throw new Error(`expand: output not a predication-cell-family: ${errorsText(outCheck.errors)}`);
  return out;
}
