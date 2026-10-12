// find — the finding morphism's implementation.
//
// Takes a slug-fragment and returns canonical paths under active/ whose
// basename contains the fragment. Walks the directory tree depth-first;
// case-insensitive substring match on basenames (or directory names);
// categorizes each match by file-kind (schema / script / jsonl / document /
// directory). Sort: shallowest canonical placement first (ascending path
// length), then alphabetical.
//
// Pure function on the filesystem state at call time. The MCP tool wrapping
// this morphism appends one positing-entry row per call to the finding/
// per-morphism positing-log so lookups are traced in the manifold.
//
// Input:  per finding.schema.json input
// Output: per finding.schema.json output

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname, basename } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf8'));

const SCHEMA = load('../finding.schema.json');
const ajv = new Ajv2020({ strict: false });
const validateInput = ajv.compile(SCHEMA.properties.input);
const validateOutput = ajv.compile(SCHEMA.properties.output);

const ACTIVE_ROOT = '/home/emsenn/561-group/development/claude/active';

const SKIP_DIRS = new Set(['node_modules', '.git', '.spotcomp']);

function classifyFile(name) {
  if (name.endsWith('.schema.json')) return { kind: 'schema', slug: name.slice(0, -'.schema.json'.length) };
  if (name.endsWith('.mjs')) return { kind: 'script', slug: name.slice(0, -'.mjs'.length) };
  if (name.endsWith('.jsonl')) return { kind: 'jsonl', slug: name.slice(0, -'.jsonl'.length) };
  if (name.endsWith('.md')) return { kind: 'document', slug: name.slice(0, -'.md'.length) };
  return null;
}

export default function find(input) {
  if (!validateInput(input)) {
    throw new TypeError(`find: ${ajv.errorsText(validateInput.errors)}`);
  }
  const fragment = input.fragment.toLowerCase();
  const kinds = new Set(input.kinds ?? ['schema', 'script', 'jsonl', 'document', 'directory']);
  const limit = input.limit ?? 50;
  const matches = [];

  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (kinds.has('directory') && entry.name.toLowerCase().includes(fragment)) {
          matches.push({ name: entry.name, kind: 'directory', 'canonical-path': full });
        }
        walk(full);
      } else if (entry.isFile()) {
        const c = classifyFile(entry.name);
        if (!c) continue;
        if (!kinds.has(c.kind)) continue;
        if (c.slug.toLowerCase().includes(fragment)) {
          matches.push({ name: c.slug, kind: c.kind, 'canonical-path': full });
        }
      }
    }
  }

  walk(ACTIVE_ROOT);

  // Sort: exact-name matches first, then alphabetical by path.
  // (Canonical-placement preference belongs to a separate checking-placement
  // morphism that reads each match's schema $id and verifies by-yoneda
  // whether the on-disk path matches; it is composed downstream of find,
  // not baked into find itself.)
  const fragmentLower = fragment;
  matches.sort((a, b) => {
    const ax = a.name.toLowerCase() === fragmentLower ? 0 : 1;
    const bx = b.name.toLowerCase() === fragmentLower ? 0 : 1;
    if (ax !== bx) return ax - bx;
    return a['canonical-path'].localeCompare(b['canonical-path']);
  });

  const truncated = matches.slice(0, limit);
  const output = Object.freeze({
    matches: Object.freeze(truncated.map(Object.freeze)),
    'match-count': matches.length
  });
  if (!validateOutput(output)) {
    throw new TypeError(`find: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return output;
}
