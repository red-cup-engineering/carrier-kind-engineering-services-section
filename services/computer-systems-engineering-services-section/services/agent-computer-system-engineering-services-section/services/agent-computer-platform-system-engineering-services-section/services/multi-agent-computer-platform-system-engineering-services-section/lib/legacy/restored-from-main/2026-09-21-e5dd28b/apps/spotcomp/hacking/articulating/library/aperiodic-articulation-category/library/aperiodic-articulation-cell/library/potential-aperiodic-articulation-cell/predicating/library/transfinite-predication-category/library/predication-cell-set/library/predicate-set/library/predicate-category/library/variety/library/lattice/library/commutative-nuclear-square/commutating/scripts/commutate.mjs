// commutating: a Heyting algebra A + two nuclei (sigma = saturating, delta =
// transferring) -> the commutative nuclear square, IFF sigma . delta = delta . sigma.
//
// First-principles derivation, enforced by computation:
//  - verifies sigma, delta are nuclei (extensive, monotone, idempotent, meet-preserving);
//  - CHECKS commutativity sigma.delta = delta.sigma -- NOT assumed, and NOT derivable from
//    the nuclei alone (the 4-chain counterexample in the test is rejected here);
//  - on success the composite pi = sigma.delta is a nucleus (proof: pi.pi = sigma delta sigma delta
//    = sigma sigma delta delta = sigma delta = pi, using commutativity then idempotence);
//  - Fix(pi) = Fix(sigma) cap Fix(delta) =: A* (proof: a = sigma(delta(a)) forces, via
//    extensivity a <= delta(a) <= sigma(delta(a)) = a, both delta(a)=a and sigma(a)=a);
//  - the four corners (A, Fix sigma, Fix delta, A*) are the cells potential/active/stable/absurd.
// Values live in a GENERAL Heyting algebra A -- not a fixed truth-set.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (a) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(a)), 'utf8'));
const SQUARE = '#predication-cell-set/library/predicate-set/library/predicate-category/library/variety/library/lattice/library/commutative-nuclear-square/commutative-nuclear-square.schema.json';
const latticeSchema = admitSchema({ schema: load('#predication-cell-set/library/predicate-set/library/predicate-category/library/variety/library/lattice/lattice.schema.json') }).schema;
const squareSchema = admitSchema({ schema: load(SQUARE) }).schema;
const validateSquare = (instance) => validateSchemaInstance({ instance, schema: squareSchema, schemas: [latticeSchema] });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');
const SEP = ' ';

export default function commutate(input) {
  const inCheck = validateSquare(input);
  if (!inCheck.ok) throw new TypeError(`commutate: input invalid: ${errorsText(inCheck.errors)}`);
  const { algebra, sigma, delta } = input;
  const { carrier, leq } = algebra;

  // order closure + meet
  const le = new Set(carrier.map((a) => a + SEP + a));
  for (const [a, b] of leq) le.add(a + SEP + b);
  for (let ch = true; ch; ) { ch = false; for (const a of carrier) for (const b of carrier) if (le.has(a + SEP + b)) for (const c of carrier) if (le.has(b + SEP + c) && !le.has(a + SEP + c)) { le.add(a + SEP + c); ch = true; } }
  const leF = (a, b) => le.has(a + SEP + b);
  const meet = (a, b) => { const m = carrier.filter((x) => leF(x, a) && leF(x, b)).find((x, _, S) => S.every((y) => leF(y, x))); if (m === undefined) throw new Error(`no meet ${a},${b}`); return m; };
  const ap = (j, a) => { const r = j[a]; if (!carrier.includes(r)) throw new Error(`nucleus value ${a} -> ${r} not in carrier`); return r; };

  const checkNucleus = (j, name) => {
    for (const a of carrier) {
      if (!leF(a, ap(j, a))) throw new Error(`${name} not extensive @${a}`);
      if (ap(j, ap(j, a)) !== ap(j, a)) throw new Error(`${name} not idempotent @${a}`);
    }
    for (const a of carrier) for (const b of carrier) {
      if (leF(a, b) && !leF(ap(j, a), ap(j, b))) throw new Error(`${name} not monotone @${a}<=${b}`);
      if (ap(j, meet(a, b)) !== meet(ap(j, a), ap(j, b))) throw new Error(`${name} not meet-preserving @${a},${b}`);
    }
  };
  checkNucleus(sigma, 'sigma');
  checkNucleus(delta, 'delta');

  // the irreducible axiom: commutativity (checked, never assumed)
  for (const a of carrier) if (ap(sigma, ap(delta, a)) !== ap(delta, ap(sigma, a)))
    throw new Error(`commutativity fails @${a}: sigma.delta=${ap(sigma, ap(delta, a))}, delta.sigma=${ap(delta, ap(sigma, a))}`);

  const pi = Object.fromEntries(carrier.map((a) => [a, ap(sigma, ap(delta, a))]));
  checkNucleus(pi, 'pi'); // holds because of commutativity

  const fix = (j) => carrier.filter((a) => ap(j, a) === a);
  const fsig = fix(sigma), fdel = fix(delta), fpi = fix(pi);
  const star = carrier.filter((a) => fsig.includes(a) && fdel.includes(a));
  const sameSet = (X, Y) => X.length === Y.length && X.every((x) => Y.includes(x));
  if (!sameSet(fpi, star)) throw new Error('Fix(pi) != Fix(sigma) cap Fix(delta)');

  const out = {
    algebra: { carrier, leq: [...le].map((s) => s.split(SEP)).filter(([a, b]) => a !== b) },
    sigma, delta, pi,
    corners: { potential: carrier, active: fsig, stable: fdel, absurd: star },
  };
  const outCheck = validateSquare(out);
  if (!outCheck.ok) throw new Error(`commutate: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
