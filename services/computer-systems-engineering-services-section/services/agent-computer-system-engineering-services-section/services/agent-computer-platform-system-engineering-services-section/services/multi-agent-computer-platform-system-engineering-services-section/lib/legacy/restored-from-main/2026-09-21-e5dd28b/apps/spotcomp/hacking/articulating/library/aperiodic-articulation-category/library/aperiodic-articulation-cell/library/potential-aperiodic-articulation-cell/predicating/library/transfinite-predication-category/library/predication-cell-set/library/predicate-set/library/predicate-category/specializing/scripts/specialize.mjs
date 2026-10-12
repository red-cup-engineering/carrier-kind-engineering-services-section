// specializing: a predicate-category -> the same with specialization-pairs derived.
// Closes the declared specialization relation reflexively + transitively, verifies
// it is a PARTIAL ORDER (antisymmetric), and checks converse is specialization-
// monotone (p <= q => p^op <= q^op). Emits the order as specialization-pairs.
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
const SEP = ' ';

export default function specialize(predicateCategory) {
  const inCheck = validate(predicateCategory);
  if (!inCheck.ok) throw new TypeError(`specialize: input not a predicate-category: ${errorsText(inCheck.errors)}`);
  const Pi = predicateCategory['predicate-set'].predicates;
  const conv = predicateCategory.converse;

  // reflexive-transitive closure of declared specialization
  const le = new Set(Pi.map((p) => p + SEP + p));
  for (const [p, q] of predicateCategory.specialization) {
    if (!Pi.includes(p) || !Pi.includes(q)) throw new Error(`specialize: pair outside Pi: ${p},${q}`);
    le.add(p + SEP + q);
  }
  for (let ch = true; ch; ) { ch = false; for (const a of Pi) for (const b of Pi) if (le.has(a + SEP + b)) for (const c of Pi) if (le.has(b + SEP + c) && !le.has(a + SEP + c)) { le.add(a + SEP + c); ch = true; } }
  const leF = (a, b) => le.has(a + SEP + b);

  // antisymmetry (partial order)
  for (const a of Pi) for (const b of Pi) if (a !== b && leF(a, b) && leF(b, a)) throw new Error(`specialize: not antisymmetric (${a} <-> ${b}) -- a cycle, not a partial order`);

  // converse is specialization-monotone: p <= q => p^op <= q^op
  if (conv) for (const a of Pi) for (const b of Pi) if (leF(a, b) && conv[a] && conv[b] && !leF(conv[a], conv[b]))
    throw new Error(`specialize: converse not specialization-monotone @(${a}<=${b})`);

  const pairs = [...le].map((s) => s.split(SEP));
  const out = { ...predicateCategory, 'specialization-pairs': pairs };
  const outCheck = validate(out);
  if (!outCheck.ok) throw new Error(`specialize: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
