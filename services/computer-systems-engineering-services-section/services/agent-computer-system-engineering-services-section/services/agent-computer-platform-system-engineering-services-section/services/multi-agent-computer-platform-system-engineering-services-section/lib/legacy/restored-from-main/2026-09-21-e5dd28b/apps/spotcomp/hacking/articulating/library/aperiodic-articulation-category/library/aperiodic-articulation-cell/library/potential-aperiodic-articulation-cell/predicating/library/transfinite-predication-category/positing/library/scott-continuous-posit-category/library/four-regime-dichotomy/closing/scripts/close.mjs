// closing: a finite lattice + monotone inflationary operator F -> the
// four-regime-dichotomy witness for that closure orbit. Iterates F from the
// bottom to the least fixed point (Knaster-Tarski), counting the closure ordinal
// kappa. Finite lattice => kappa < omega => strict-finite regime (base finite,
// closure Scott-continuous, H1 vanishes). Verifies F monotone + inflationary.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (a) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(a)), 'utf8'));
const DICHOTOMY = '#scott-continuous-posit-category/library/four-regime-dichotomy/four-regime-dichotomy.schema.json';
const dichotomySchema = admitSchema({ schema: load(DICHOTOMY) }).schema;
const validateOut = (instance) => validateSchemaInstance({ instance, schema: dichotomySchema });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');
const SEP = ' ';

export default function close({ lattice, operator }) {
  const { carrier, leq } = lattice;
  const le = new Set(carrier.map((a) => a + SEP + a));
  for (const [a, b] of leq) le.add(a + SEP + b);
  for (let ch = true; ch; ) { ch = false; for (const a of carrier) for (const b of carrier) if (le.has(a + SEP + b)) for (const c of carrier) if (le.has(b + SEP + c) && !le.has(a + SEP + c)) { le.add(a + SEP + c); ch = true; } }
  const leF = (a, b) => le.has(a + SEP + b);
  const F = (a) => { const r = operator[a]; if (!carrier.includes(r)) throw new Error(`operator(${a}) = ${r} not in carrier`); return r; };

  // F must be inflationary (a <= F(a)) and monotone (a <= b => F(a) <= F(b))
  for (const a of carrier) if (!leF(a, F(a))) throw new Error(`operator not inflationary @${a}`);
  for (const a of carrier) for (const b of carrier) if (leF(a, b) && !leF(F(a), F(b))) throw new Error(`operator not monotone @${a}<=${b}`);

  const bottom = carrier.find((x, _, S) => S.every((y) => leF(x, y)));
  if (bottom === undefined) throw new Error('close: lattice has no bottom');

  // iterate from bottom to the least fixed point, counting kappa
  let x = bottom, kappa = 0;
  for (;;) { const nx = F(x); if (nx === x) break; x = nx; kappa += 1; if (kappa > carrier.length) throw new Error('close: did not converge within |L| steps'); }

  const out = {
    'kappa-class': 'finite',
    regime: 'strict-finite',
    'base-finite': true,
    'scott-continuous': true,
    'h1-vanishes': true,
    kappa,
    'least-fixed-point': x,
  };
  const outCheck = validateOut(out);
  if (!outCheck.ok) throw new Error(`close: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
