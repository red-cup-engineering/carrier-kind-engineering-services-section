// classifying-regime: a four-regime-dichotomy witness (kappa-class + flags) -> the
// same with regime assigned, after enforcing the four-regime-dichotomy equivalences:
//   kappa-class -> regime:  finite->strict-finite, omega->scott-continuous,
//                           between-omega-and-omega1->transfinite-bounded, geq-omega1->aperiodic;
//   base-finite           <=> kappa-class = finite;
//   Scott-continuous      <=> kappa-class in {finite, omega};
//   H1 of the sheaf vanishes <=> kappa-class in {finite, omega}.
// Rejects inconsistent witnesses -- the theorem's logic is checked, not assumed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { admitSchema, validateSchemaInstance } from '@red-cup-engineering/json-schema-services-section';

const load = (a) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(a)), 'utf8'));
const DICHOTOMY = '#scott-continuous-posit-category/library/four-regime-dichotomy/four-regime-dichotomy.schema.json';
const dichotomySchema = admitSchema({ schema: load(DICHOTOMY) }).schema;
const validate = (instance) => validateSchemaInstance({ instance, schema: dichotomySchema });
const errorsText = (errors) => errors.map((e) => `${e.pointer || '#'} ${e.keyword}: ${e.message}`).join('; ');

const REGIME_OF = { 'finite': 'strict-finite', 'omega': 'scott-continuous', 'between-omega-and-omega1': 'transfinite-bounded', 'geq-omega1': 'aperiodic' };
const LOW = new Set(['finite', 'omega']); // kappa <= omega : H1 vanishes, closure Scott-continuous

export default function classify(witness) {
  const inCheck = validate(witness);
  if (!inCheck.ok) throw new TypeError(`classify: input invalid: ${errorsText(inCheck.errors)}`);
  const k = witness['kappa-class'];

  if ('base-finite' in witness && witness['base-finite'] !== (k === 'finite'))
    throw new Error(`classify: base-finite must hold iff kappa-class = finite (got base-finite=${witness['base-finite']}, kappa-class=${k})`);
  if ('scott-continuous' in witness && witness['scott-continuous'] !== LOW.has(k))
    throw new Error(`classify: Scott-continuous closure holds iff kappa-class in {finite, omega} (got scott-continuous=${witness['scott-continuous']}, kappa-class=${k})`);
  if ('h1-vanishes' in witness && witness['h1-vanishes'] !== LOW.has(k))
    throw new Error(`classify: H1 vanishes iff kappa-class in {finite, omega} (cohomology lives in transfinite/aperiodic); got h1-vanishes=${witness['h1-vanishes']}, kappa-class=${k}`);

  const regime = REGIME_OF[k];
  if (witness.regime && witness.regime !== regime) throw new Error(`classify: declared regime ${witness.regime} contradicts kappa-class ${k} (=> ${regime})`);

  const out = { ...witness, regime };
  const outCheck = validate(out);
  if (!outCheck.ok) throw new Error(`classify: output invalid: ${errorsText(outCheck.errors)}`);
  return out;
}
