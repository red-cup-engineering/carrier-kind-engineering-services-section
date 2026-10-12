// list — the listing morphism's implementation.
//
// Reads a directory's contents and categorizes by SPOTCOMP role. If input
// is a slug-fragment, resolves via finding first.
//
// Input:  per listing.schema.json input
// Output: per listing.schema.json output

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import find from '../../finding/scripts/find.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf8'));

const SCHEMA = load('../listing.schema.json');
const ajv = new Ajv2020({ strict: false });
const validateInput = ajv.compile(SCHEMA.properties.input);
const validateOutput = ajv.compile(SCHEMA.properties.output);

function resolvePath(slugOrPath) {
  if (slugOrPath.startsWith('/') && existsSync(slugOrPath)) {
    const s = statSync(slugOrPath);
    if (s.isDirectory()) return slugOrPath;
    return dirname(slugOrPath);
  }
  // Treat as slug-fragment. Find shallowest directory match.
  const r = find({ fragment: slugOrPath, kinds: ['directory'], limit: 1 });
  if (r.matches.length === 0) return null;
  return r.matches[0]['canonical-path'];
}

export default function list(input) {
  if (!validateInput(input)) {
    throw new TypeError(`list: ${ajv.errorsText(validateInput.errors)}`);
  }
  const resolvedPath = resolvePath(input['slug-or-path']);
  if (!resolvedPath) {
    throw new TypeError(`list: no directory found matching '${input['slug-or-path']}'`);
  }
  const thisSlug = basename(resolvedPath);
  const entries = readdirSync(resolvedPath, { withFileTypes: true });
  const out = {
    'resolved-path': resolvedPath,
    this: {},
    library: [],
    hacking: [],
    scripts: [],
    docs: [],
    other: []
  };
  for (const e of entries) {
    const full = join(resolvedPath, e.name);
    if (e.isFile()) {
      if (e.name === `${thisSlug}.schema.json`) out.this.schema = full;
      else if (e.name === `${thisSlug}.mjs`) out.this.script = full;
      else if (e.name === `${thisSlug}.jsonl`) out.this.jsonl = full;
      else if (e.name === `${thisSlug}.md`) out.this.document = full;
      else out.other.push(e.name);
    } else if (e.isDirectory()) {
      if (e.name === 'library') {
        try {
          out.library = readdirSync(full, { withFileTypes: true })
            .filter((x) => x.isDirectory())
            .map((x) => x.name);
        } catch {}
      } else if (e.name === 'hacking') {
        try {
          const hackingEntries = readdirSync(full, { withFileTypes: true });
          // hacking/ can contain a library/ child whose contents are the gap subjects,
          // OR direct named morphism dirs (hacking/aliasing/), OR a mix.
          for (const he of hackingEntries) {
            if (he.name === 'library') {
              try {
                for (const lib of readdirSync(join(full, 'library'), { withFileTypes: true })) {
                  if (lib.isDirectory()) out.hacking.push(`library/${lib.name}`);
                }
              } catch {}
            } else if (he.isDirectory()) {
              out.hacking.push(he.name);
            }
          }
        } catch {}
      } else if (e.name === 'scripts') {
        try {
          out.scripts = readdirSync(full, { withFileTypes: true })
            .filter((x) => x.isFile())
            .map((x) => x.name);
        } catch {}
      } else if (e.name === 'docs') {
        try {
          out.docs = readdirSync(full, { withFileTypes: true })
            .map((x) => x.name);
        } catch {}
      } else {
        out.other.push(e.name + '/');
      }
    }
  }
  const frozen = Object.freeze({
    'resolved-path': out['resolved-path'],
    this: Object.freeze(out.this),
    library: Object.freeze(out.library),
    hacking: Object.freeze(out.hacking),
    scripts: Object.freeze(out.scripts),
    docs: Object.freeze(out.docs),
    other: Object.freeze(out.other)
  });
  if (!validateOutput(frozen)) {
    throw new TypeError(`list: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return frozen;
}
