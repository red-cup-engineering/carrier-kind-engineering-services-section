// reindexing: a predication fiber algebra A_p = B^(E x E) -> the predication
// hyperdoctrine over it. Derives the reindexing functors and verifies, over the
// bilattice TRUTH order, the Galois adjunctions for the entity-projection
// generators and the laws of the converse generator:
//   subject projection pi_s* (pull unary -> binary, g(s,o)=g(s)):
//       exists_object -| pi_s* -| forall_object,
//       where exists_object/forall_object are truth-join/meet over the object;
//   object projection pi_o* symmetric (quantify over the subject);
//   converse f* (swap entity-pair) is an involution and commutes with negation.
// Adjunctions are checked by unit + counit over EVERY fiber. Value lattice general.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (a) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(a)), 'utf8'));
const PCS = '#predication-cell-set/library/predicate-set/library/predicate-category';
const bilatticeSchema = admitSchema({ schema: load(`${PCS}/library/variety/library/lattice/library/bilattice/bilattice.schema.json`) }).schema;
const entitySetSchema = admitSchema({ schema: load(`${PCS}/library/category/library/entity-set/entity-set.schema.json`) }).schema;
const fiberAlgebraSchema = admitSchema({ schema: load('#predication-fibration/library/predication-fiber-algebra/predication-fiber-algebra.schema.json') }).schema;
const REFERENCES = [bilatticeSchema, entitySetSchema, fiberAlgebraSchema];
const hyperdoctrineSchema = admitSchema({ schema: load('#predication-hyperdoctrine/predication-hyperdoctrine.schema.json') }).schema;
const validateHyp = (instance) => validateSchemaInstance({ instance, schema: hyperdoctrineSchema, schemas: REFERENCES });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');

const vid = ([p, n]) => p + '|' + n;
const ik = (s, o) => s + '@' + o;

function truthLattice(B) {
  const le = new Set(B['truth-leq'].map(([x, y]) => vid(x) + '#' + vid(y)));
  const leF = (x, y) => le.has(x + '#' + y);
  const vids = B.carrier.map(vid);
  const join = (xs) => { const ub = vids.filter((z) => xs.every((x) => leF(x, z))); const j = ub.find((z) => ub.every((w) => leF(z, w))); if (j === undefined) throw new Error('truth-join missing'); return j; };
  const meet = (xs) => { const lb = vids.filter((z) => xs.every((x) => leF(z, x))); const m = lb.find((z) => lb.every((w) => leF(w, z))); if (m === undefined) throw new Error('truth-meet missing'); return m; };
  return { leF, join, meet, vids };
}

function* allMaps(keys, vals) {
  const n = keys.length, idx = new Array(n).fill(0);
  for (;;) {
    const m = {}; for (let i = 0; i < n; i++) m[keys[i]] = vals[idx[i]]; yield m;
    let i = n - 1; for (; i >= 0; i--) { if (++idx[i] < vals.length) break; idx[i] = 0; } if (i < 0) break;
  }
}

export function operators(fiberAlgebra) {
  const B = fiberAlgebra['base-bilattice'];
  const E = fiberAlgebra.entities.entities;
  const { leF, join, meet } = truthLattice(B);
  const negVal = (id) => vid(B.negation[id]);
  const idxKeys = []; for (const s of E) for (const o of E) idxKeys.push(ik(s, o));
  return {
    E, leF, idxKeys,
    subjPull: (g) => { const f = {}; for (const s of E) for (const o of E) f[ik(s, o)] = g[s]; return f; },
    objPull: (g) => { const f = {}; for (const s of E) for (const o of E) f[ik(s, o)] = g[o]; return f; },
    existsObject: (f) => { const g = {}; for (const s of E) g[s] = join(E.map((o) => f[ik(s, o)])); return g; },
    forallObject: (f) => { const g = {}; for (const s of E) g[s] = meet(E.map((o) => f[ik(s, o)])); return g; },
    existsSubject: (f) => { const g = {}; for (const o of E) g[o] = join(E.map((s) => f[ik(s, o)])); return g; },
    forallSubject: (f) => { const g = {}; for (const o of E) g[o] = meet(E.map((s) => f[ik(s, o)])); return g; },
    converse: (f) => { const r = {}; for (const s of E) for (const o of E) r[ik(s, o)] = f[ik(o, s)]; return r; },
    negate: (f) => { const r = {}; for (const k of idxKeys) r[k] = negVal(f[k]); return r; },
  };
}

export default function reindex(fiberAlgebra) {
  const B = fiberAlgebra['base-bilattice'];
  const vids = B.carrier.map(vid);
  const op = operators(fiberAlgebra);
  const leBin = (f, h) => op.idxKeys.every((k) => op.leF(f[k], h[k]));
  const leUn = (g, h) => op.E.every((s) => op.leF(g[s], h[s]));
  const eqMap = (a, b) => Object.keys(a).every((k) => a[k] === b[k]) && Object.keys(b).every((k) => a[k] === b[k]);

  for (const f of allMaps(op.idxKeys, vids)) {
    if (!leBin(f, op.subjPull(op.existsObject(f)))) throw new Error('subject: exists-unit fails');     // f <= pi*(exists f)
    if (!leBin(op.subjPull(op.forallObject(f)), f)) throw new Error('subject: forall-counit fails');   // pi*(forall f) <= f
    if (!leBin(f, op.objPull(op.existsSubject(f)))) throw new Error('object: exists-unit fails');
    if (!leBin(op.objPull(op.forallSubject(f)), f)) throw new Error('object: forall-counit fails');
    if (!eqMap(op.converse(op.converse(f)), f)) throw new Error('converse not involutive');
    if (!eqMap(op.converse(op.negate(f)), op.negate(op.converse(f)))) throw new Error('converse not negation-natural');
  }
  for (const g of allMaps(op.E, vids)) {
    if (!leUn(op.existsObject(op.subjPull(g)), g)) throw new Error('subject: exists-counit fails');     // exists(pi* g) <= g
    if (!leUn(g, op.forallObject(op.subjPull(g)))) throw new Error('subject: forall-unit fails');       // g <= forall(pi* g)
    if (!leUn(op.existsSubject(op.objPull(g)), g)) throw new Error('object: exists-counit fails');
    if (!leUn(g, op.forallSubject(op.objPull(g)))) throw new Error('object: forall-unit fails');
  }

  const out = { 'fiber-algebra': fiberAlgebra, generators: ['converse', 'subject-projection', 'object-projection'] };
  const outCheck = validateHyp(out);
  if (!outCheck.ok) throw new Error(`reindex: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
