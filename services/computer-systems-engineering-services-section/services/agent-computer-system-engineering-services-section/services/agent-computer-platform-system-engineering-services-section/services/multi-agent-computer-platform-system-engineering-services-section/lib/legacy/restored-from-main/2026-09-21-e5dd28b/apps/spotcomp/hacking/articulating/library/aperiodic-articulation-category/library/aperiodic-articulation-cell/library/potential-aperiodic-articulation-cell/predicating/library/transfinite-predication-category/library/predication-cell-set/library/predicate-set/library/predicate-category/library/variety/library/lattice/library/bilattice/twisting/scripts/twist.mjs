// twisting: a completed (commutative) residuated lattice L -> its twist-product
// bilattice L|><|L.  Lifts L's Lambek residual (-> = left-residual) to a
// residuated bilattice and VERIFIES: both orders are lattices, negation is a De
// Morgan involution on the truth order, and the truth-order residuation law
//   x (x) y <=_t z   iff   y <=_t (x => z)
// holds.  L is an arbitrary residuated lattice -- the value space is as rich as L.  Value ids are 'p|n'.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));
const RL = '#predication-cell-set/library/predicate-set/library/predicate-category/library/variety/library/lattice/library/residuated-lattice/residuated-lattice.schema.json';
const BL = '#predication-cell-set/library/predicate-set/library/predicate-category/library/variety/library/lattice/library/bilattice/bilattice.schema.json';
const latticeSchema = admitSchema({ schema: load('#predication-cell-set/library/predicate-set/library/predicate-category/library/variety/library/lattice/lattice.schema.json') }).schema;
const residuatedLatticeSchema = admitSchema({ schema: load(RL) }).schema;
const bilatticeSchema = admitSchema({ schema: load(BL) }).schema;
const validateRL = (instance) => validateSchemaInstance({ instance, schema: residuatedLatticeSchema, schemas: [latticeSchema] });
const validateBL = (instance) => validateSchemaInstance({ instance, schema: bilatticeSchema, schemas: [latticeSchema] });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');
const SEP = ' ';

export default function twist(residuatedLattice) {
  const inCheck = validateRL(residuatedLattice);
  if (!inCheck.ok) throw new TypeError(`twist: input not a residuated-lattice: ${errorsText(inCheck.errors)}`);
  const { carrier: L, leq, fusion } = residuatedLattice;
  const left = residuatedLattice['left-residual'];
  if (!left) throw new TypeError('twist: input residuated-lattice has no derived residuals (run residuating first)');

  // L order + lattice ops
  const le = new Set(L.map((a) => a + SEP + a));
  for (const [a, b] of leq) le.add(a + SEP + b);
  for (let ch = true; ch; ) { ch = false; for (const a of L) for (const b of L) if (le.has(a+SEP+b)) for (const c of L) if (le.has(b+SEP+c) && !le.has(a+SEP+c)) { le.add(a+SEP+c); ch = true; } }
  const leL = (a, b) => le.has(a + SEP + b);
  const meetL = (a, b) => L.filter((x) => leL(x, a) && leL(x, b)).find((x, _, S) => S.every((y) => leL(y, x)));
  const joinL = (a, b) => L.filter((x) => leL(a, x) && leL(b, x)).find((x, _, S) => S.every((y) => leL(x, y)));
  const imp = (a, b) => left[a][b];          // a -> b  (commutative: left = right)
  const star = (a, b) => fusion[a][b];        // a * b

  // bilattice carrier B = L x L
  const B = [];
  for (const p of L) for (const n of L) B.push([p, n]);
  const key = ([p, n]) => p + '|' + n;
  const eq = (x, y) => x[0] === y[0] && x[1] === y[1];

  // orders
  const leK = ([p, n], [q, m]) => leL(p, q) && leL(n, m);            // knowledge: both grow
  const leT = ([p, n], [q, m]) => leL(p, q) && leL(m, n);            // truth: p grows, n shrinks
  // negation (truth-order De Morgan involution)
  const neg = ([p, n]) => [n, p];
  // truth meet/join
  const meetT = ([p, n], [q, m]) => [meetL(p, q), joinL(n, m)];
  const joinT = ([p, n], [q, m]) => [joinL(p, q), meetL(n, m)];
  // twist fusion / residual (commutative residuated case)
  const fuse = ([p, n], [q, m]) => [star(p, q), meetL(imp(p, m), imp(q, n))];
  const resid = ([p, n], [q, m]) => [meetL(imp(p, q), imp(m, n)), star(p, m)];

  // verify both orders are lattices (meet/join total) under leK and leT
  const isLattice = (leR) => {
    const glb = (x, y) => B.filter((z) => leR(z, x) && leR(z, y)).find((z, _, S) => S.every((w) => leR(w, z)));
    const lub = (x, y) => B.filter((z) => leR(x, z) && leR(y, z)).find((z, _, S) => S.every((w) => leR(z, w)));
    for (const x of B) for (const y of B) { if (!glb(x, y) || !lub(x, y)) return false; }
    return true;
  };
  if (!isLattice(leK)) throw new Error('twist: knowledge order is not a lattice');
  if (!isLattice(leT)) throw new Error('twist: truth order is not a lattice');

  // negation: involution + De Morgan on truth order
  for (const x of B) if (!eq(neg(neg(x)), x)) throw new Error(`twist: negation not involutive @${key(x)}`);
  for (const x of B) for (const y of B) {
    if (!eq(neg(meetT(x, y)), joinT(neg(x), neg(y)))) throw new Error('twist: negation fails De Morgan (meet)');
    if (!eq(neg(joinT(x, y)), meetT(neg(x), neg(y)))) throw new Error('twist: negation fails De Morgan (join)');
  }
  // truth-order residuation:  x*y <=_t z  iff  y <=_t (x=>z)
  for (const x of B) for (const y of B) for (const z of B) {
    const lhs = leT(fuse(x, y), z);
    const rhs = leT(y, resid(x, z));
    if (lhs !== rhs) throw new Error(`twist: residuation law fails @(${key(x)},${key(y)},${key(z)}): ${lhs} vs ${rhs}`);
  }

  // emit
  const relK = [], relT = [];
  for (const x of B) for (const y of B) { if (leK(x, y)) relK.push([x, y]); if (leT(x, y)) relT.push([x, y]); }
  const negTbl = {}, fuseTbl = {}, residTbl = {};
  for (const x of B) negTbl[key(x)] = neg(x);
  for (const x of B) { fuseTbl[key(x)] = {}; residTbl[key(x)] = {}; for (const y of B) { fuseTbl[key(x)][key(y)] = fuse(x, y); residTbl[key(x)][key(y)] = resid(x, y); } }
  const out = { carrier: B, 'knowledge-leq': relK, 'truth-leq': relT, negation: negTbl, fusion: fuseTbl, residual: residTbl };
  const outCheck = validateBL(out);
  if (!outCheck.ok) throw new Error(`twist: output not a bilattice: ${errorsText(outCheck.errors)}`);
  return out;
}
