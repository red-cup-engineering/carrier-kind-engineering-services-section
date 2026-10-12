// saturating: a Heyting algebra A with restriction homomorphisms {rho_i: A -> H_i}
// -> the nuclear dyad (A, sigma), where the backward-facing saturation nucleus is
//   sigma(a) = join_A { b in A | rho_i(b) <=_{H_i} rho_i(a) for all i }
// (the largest element with a's restriction profile). The script computes sigma
// and VERIFIES it is a nucleus and profile-preserving. A is a general Heyting algebra.
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

const orderOf = (carrier, leq) => {
  const le = new Set(carrier.map((a) => a + SEP + a));
  for (const [a, b] of leq) le.add(a + SEP + b);
  for (let ch = true; ch; ) { ch = false; for (const a of carrier) for (const b of carrier) if (le.has(a + SEP + b)) for (const c of carrier) if (le.has(b + SEP + c) && !le.has(a + SEP + c)) { le.add(a + SEP + c); ch = true; } }
  return (a, b) => le.has(a + SEP + b);
};

export default function saturate({ algebra, restrictions }) {
  const { carrier, leq } = algebra;
  const leF = orderOf(carrier, leq);
  const meet = (a, b) => carrier.filter((x) => leF(x, a) && leF(x, b)).find((x, _, S) => S.every((y) => leF(y, x)));
  const join = (a, b) => carrier.filter((x) => leF(a, x) && leF(b, x)).find((x, _, S) => S.every((y) => leF(x, y)));
  const bottom = carrier.find((x, _, S) => S.every((y) => leF(x, y)));
  if (bottom === undefined) throw new Error('saturate: A has no bottom');
  const bigJoin = (S) => S.reduce((acc, x) => join(acc, x), bottom);

  const rs = restrictions.map((r) => ({ map: r.map, leF: orderOf(r.carrier, r.leq) }));
  const profileLe = (b, a) => rs.every((r) => r.leF(r.map[b], r.map[a])); // rho_i(b) <= rho_i(a) for all i

  const sigma = {};
  for (const a of carrier) sigma[a] = bigJoin(carrier.filter((b) => profileLe(b, a)));

  // verify nucleus
  const ap = (a) => sigma[a];
  for (const a of carrier) {
    if (!leF(a, ap(a))) throw new Error(`sigma not extensive @${a}`);
    if (ap(ap(a)) !== ap(a)) throw new Error(`sigma not idempotent @${a}`);
  }
  for (const a of carrier) for (const b of carrier) {
    if (leF(a, b) && !leF(ap(a), ap(b))) throw new Error(`sigma not monotone @${a}<=${b}`);
    if (ap(meet(a, b)) !== meet(ap(a), ap(b))) throw new Error(`sigma not meet-preserving @${a},${b}`);
  }
  // profile preservation: rho_i(sigma(a)) = rho_i(a)
  for (const a of carrier) for (const r of rs) if (r.map[ap(a)] !== r.map[a]) throw new Error(`sigma not profile-preserving @${a}`);

  const out = { algebra, nucleus: sigma };
  const outCheck = validateDyad(out);
  if (!outCheck.ok) throw new Error(`saturate: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
