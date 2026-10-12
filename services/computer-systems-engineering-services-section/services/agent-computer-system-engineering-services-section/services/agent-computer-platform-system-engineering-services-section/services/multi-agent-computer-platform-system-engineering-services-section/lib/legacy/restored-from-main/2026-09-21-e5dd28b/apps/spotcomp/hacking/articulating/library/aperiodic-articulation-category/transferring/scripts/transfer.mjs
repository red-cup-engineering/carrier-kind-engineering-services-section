// transferring: a Heyting algebra A with the extension-image sub-algebras of its
// independent one-step extensions -> the nuclear dyad (A, delta).  The forward-
// facing transfer nucleus reflects onto Fix(delta) = intersection of the images:
//   delta(a) = meet_A { b in Fix(delta) | b >= a }
// (delta = id when there are no independent extensions). The script computes delta
// and VERIFIES it is a nucleus. A is a general Heyting algebra.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (a) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(a)), 'utf8'));
const DYAD = '#articulating/library/aperiodic-articulation-category/library/nuclear-dyad/nuclear-dyad.schema.json';
const latticeSchema = admitSchema({ schema: load('#predication-cell-set/library/predicate-set/library/predicate-category/library/variety/library/lattice/lattice.schema.json') }).schema;
const dyadSchema = admitSchema({ schema: load(DYAD) }).schema;
const validateDyad = (instance) => validateSchemaInstance({ instance, schema: dyadSchema, schemas: [latticeSchema] });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');
const SEP = ' ';

export default function transfer(input) {
  const { algebra } = input;
  const images = input['extension-images'];
  const { carrier, leq } = algebra;

  const le = new Set(carrier.map((a) => a + SEP + a));
  for (const [a, b] of leq) le.add(a + SEP + b);
  for (let ch = true; ch; ) { ch = false; for (const a of carrier) for (const b of carrier) if (le.has(a + SEP + b)) for (const c of carrier) if (le.has(b + SEP + c) && !le.has(a + SEP + c)) { le.add(a + SEP + c); ch = true; } }
  const leF = (a, b) => le.has(a + SEP + b);
  const meet = (a, b) => carrier.filter((x) => leF(x, a) && leF(x, b)).find((x, _, S) => S.every((y) => leF(y, x)));

  // Fix(delta) = intersection of the extension images (or all of A if none)
  const fix = (images.length === 0) ? [...carrier] : carrier.filter((a) => images.every((img) => img.includes(a)));
  const top = carrier.find((x, _, S) => S.every((y) => leF(y, x)));
  if (top === undefined) throw new Error('transfer: A has no top');
  if (!fix.includes(top)) throw new Error('transfer: Fix(delta) must contain top (extension images are sub-algebras)');

  const delta = {};
  for (const a of carrier) {
    const above = fix.filter((b) => leF(a, b)); // { b in Fix | b >= a } -- non-empty (top is here)
    delta[a] = above.reduce((acc, b) => meet(acc, b));
  }

  const ap = (a) => delta[a];
  for (const a of carrier) {
    if (!leF(a, ap(a))) throw new Error(`delta not extensive @${a}`);
    if (ap(ap(a)) !== ap(a)) throw new Error(`delta not idempotent @${a}`);
  }
  for (const a of carrier) for (const b of carrier) {
    if (leF(a, b) && !leF(ap(a), ap(b))) throw new Error(`delta not monotone @${a}<=${b}`);
    if (ap(meet(a, b)) !== meet(ap(a), ap(b))) throw new Error(`delta not meet-preserving @${a},${b}`);
  }

  const out = { algebra, nucleus: delta };
  const outCheck = validateDyad(out);
  if (!outCheck.ok) throw new Error(`transfer: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
