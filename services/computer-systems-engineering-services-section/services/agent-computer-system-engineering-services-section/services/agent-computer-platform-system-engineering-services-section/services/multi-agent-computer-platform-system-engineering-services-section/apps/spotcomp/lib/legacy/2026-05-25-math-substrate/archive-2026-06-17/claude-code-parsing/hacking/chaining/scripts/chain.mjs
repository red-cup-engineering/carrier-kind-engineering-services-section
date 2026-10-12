// chain — the chaining morphism's implementation.
//
// Walks the ancestor segments from active/ down to the resolved path,
// labels each by its SPOTCOMP role, and emits both the full segment list
// and a wrappers-collapsed named-chain.
//
// Input:  per chaining.schema.json input
// Output: per chaining.schema.json output

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import find from '../../finding/scripts/find.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf8'));

const SCHEMA = load('../chaining.schema.json');
const ajv = new Ajv2020({ strict: false });
const validateInput = ajv.compile(SCHEMA.properties.input);
const validateOutput = ajv.compile(SCHEMA.properties.output);

const ACTIVE_ROOT = '/home/emsenn/561-group/development/claude/active';

function resolvePath(slugOrPath) {
  if (slugOrPath.startsWith('/') && existsSync(slugOrPath)) return slugOrPath;
  const r = find({ fragment: slugOrPath, kinds: ['directory'], limit: 1 });
  if (r.matches.length === 0) return null;
  return r.matches[0]['canonical-path'];
}

function roleFor(name) {
  if (name === 'library') return 'library-wrapper';
  if (name === 'hacking') return 'hacking-wrapper';
  if (name === 'scripts') return 'scripts-wrapper';
  if (name === 'docs') return 'docs-wrapper';
  return 'named-thing';
}

export default function chain(input) {
  if (!validateInput(input)) {
    throw new TypeError(`chain: ${ajv.errorsText(validateInput.errors)}`);
  }
  const resolved = resolvePath(input['slug-or-path']);
  if (!resolved) {
    throw new TypeError(`chain: no path resolved for '${input['slug-or-path']}'`);
  }
  if (!resolved.startsWith(ACTIVE_ROOT)) {
    throw new TypeError(`chain: resolved path is not under active/: ${resolved}`);
  }
  const rel = resolved.slice(ACTIVE_ROOT.length).replace(/^\/+/, '');
  const parts = rel.length === 0 ? [] : rel.split('/');
  const segments = [{ name: 'active', role: 'root' }];
  for (const part of parts) {
    segments.push({ name: part, role: roleFor(part) });
  }
  const namedChain = segments.filter((s) => s.role === 'named-thing').map((s) => s.name);

  const output = Object.freeze({
    'resolved-path': resolved,
    segments: Object.freeze(segments.map(Object.freeze)),
    'named-chain': Object.freeze(namedChain)
  });
  if (!validateOutput(output)) {
    throw new TypeError(`chain: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return output;
}
