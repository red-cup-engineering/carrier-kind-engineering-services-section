// conversing: a predicate-category -> the same with its converse-pairs derived.
// Converse swaps a predicate's subject/object roles (p -> p^op). Its defining law
// is that it is an INVOLUTION (p^op^op = p); the script verifies converse is a
// total bijection on Pi and an involution, then emits the generated pairs [p, p^op].
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (a) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(a)), 'utf8'));
const PRED_CAT = '#predication-cell-set/library/predicate-set/library/predicate-category/predicate-category.schema.json';
const PRED_SET = '#predication-cell-set/library/predicate-set/predicate-set.schema.json';
const predicateSetSchema = admitSchema({ schema: load(PRED_SET) }).schema;
const predicateCategorySchema = admitSchema({ schema: load(PRED_CAT) }).schema;
const validate = (instance) => validateSchemaInstance({ instance, schema: predicateCategorySchema, schemas: [predicateSetSchema] });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');

export default function converse(predicateCategory) {
  const inCheck = validate(predicateCategory);
  if (!inCheck.ok) throw new TypeError(`converse: input not a predicate-category: ${errorsText(inCheck.errors)}`);
  const Pi = predicateCategory['predicate-set'].predicates;
  const conv = predicateCategory.converse;

  // total function Pi -> Pi
  for (const p of Pi) { if (!(p in conv)) throw new Error(`converse: undefined on ${p}`); if (!Pi.includes(conv[p])) throw new Error(`converse: ${p} -> ${conv[p]} not in Pi`); }
  // bijection (injective on a finite set => surjective)
  const image = new Set(Pi.map((p) => conv[p]));
  if (image.size !== Pi.length) throw new Error('converse: not a bijection on Pi');
  // involution: conv(conv(p)) = p
  for (const p of Pi) if (conv[conv[p]] !== p) throw new Error(`converse: not an involution @${p} (p^op^op = ${conv[conv[p]]})`);

  const out = { ...predicateCategory, 'converse-pairs': Pi.map((p) => [p, conv[p]]) };
  const outCheck = validate(out);
  if (!outCheck.ok) throw new Error(`converse: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
