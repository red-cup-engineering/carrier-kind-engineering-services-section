// firing — closure-rule × spotcomp → cell-records.
// Applies one closure rule to the system once; the rule's 'fire' function
// (a JS closure attached to the rule object) receives the system state
// and returns proposed cell-records. Novelty + monotonicity filtering
// happens in the iteration loop, not here.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const INPUT_SCHEMA = JSON.parse(readFileSync(resolve(__dirname, '../firing.schema.json'), 'utf8'));

export default function firing(input) {
  const { rule, system } = input;
  if (typeof rule?.fire !== 'function') {
    throw new TypeError(`firing: rule.fire must be a function (rule name: ${rule?.name})`);
  }
  if (rule.monotone !== true) {
    throw new TypeError(`firing: rule '${rule?.name}' lacks monotone:true covenant — inadmissible in SPOTCOMP`);
  }
  const proposed = rule.fire(system);
  if (!Array.isArray(proposed)) {
    throw new TypeError(`firing: rule '${rule.name}' returned non-array`);
  }
  return proposed;
}

export const schema = INPUT_SCHEMA;
