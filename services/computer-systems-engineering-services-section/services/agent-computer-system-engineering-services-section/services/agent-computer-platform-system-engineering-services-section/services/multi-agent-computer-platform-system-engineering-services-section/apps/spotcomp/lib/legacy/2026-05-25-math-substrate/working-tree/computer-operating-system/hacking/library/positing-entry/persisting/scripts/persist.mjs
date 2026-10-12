// persisting — positing-entry × typed-resource-catalog → file paths.
// Dual filing: append the canonical EAVT row to the per-thing log of its
// subject anchor (e) and of its predicate anchor (a), each resolved under the
// catalog-root. The same row is appended to both anchor logs.

import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/persisting');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const TRC_SCHEMA = loadSchema('#schema/typed-resource-catalog');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const TID_SCHEMA = loadSchema('#schema/transaction-id');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, TID_SCHEMA, ENTRY_SCHEMA, TRC_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);

// Stable canonical serialization (lexicographically-ordered keys).
function canon(x) {
  if (Array.isArray(x)) return `[${x.map(canon).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`;
  }
  return JSON.stringify(x);
}

// A thing's per-thing log path under the catalog root. The catalog resolves a
// thing's POSIX path from its anchor coordinate by Yoneda (path = identity);
// the substrate realization keys the log directory by the coordinate's slug
// (a bare string slug when the coordinate is one, else a stable content key).
function slugOf(coordinate) {
  if (typeof coordinate === 'string') return coordinate;
  return createHash('sha256').update(canon(coordinate)).digest('hex').slice(0, 16);
}

export default function persisting(input) {
  if (!validateInput(input)) {
    throw new TypeError(`persisting: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { entry } = input;
  const root = resolve(input['typed-resource-catalog']['catalog-root']);
  const line = canon({ e: entry.e, a: entry.a, v: entry.v, t: entry.t }) + '\n';
  const paths = [];
  for (const anchor of [entry.e, entry.a]) { // dual filing: subject and predicate
    const slug = slugOf(anchor);
    const dir = join(root, slug);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${slug}.jsonl`);
    appendFileSync(path, line, 'utf8');
    paths.push(path);
  }
  return paths;
}

export const schema = INPUT_SCHEMA;
