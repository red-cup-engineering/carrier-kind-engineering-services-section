// check-placement — the checking-placement morphism's implementation.
//
// The cone-apex matcher for the path-category Yoneda cone. Reads a schema's
// on-disk path and its $id; computes the named-chain of each (ancestor
// segments minus library/hacking/scripts/docs/ wrappers); compares.
//
// - properly-placed                        named-chains match exactly
// - properly-placed-with-admitted-gaps     on-disk chain extends the $id chain only
//                                            by segments introduced inside hacking/ wrappers
// - id-mismatch                            chains differ in a way hacking/ wrappers cannot bridge
// - no-id-in-schema                        schema has no $id (cannot check)
// - schema-unreadable                      file cannot be read or parsed
//
// Input:  per checking-placement.schema.json input
// Output: per checking-placement.schema.json output

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf8'));

const SCHEMA = load('../checking-placement.schema.json');
const ajv = new Ajv2020({ strict: false });
const validateInput = ajv.compile(SCHEMA.properties.input);
const validateOutput = ajv.compile(SCHEMA.properties.output);

const ACTIVE_ROOT = '/home/emsenn/561-group/development/claude/active';
const ID_ROOT_PREFIX = 'https://voidmath.active.development.561.group/';
const WRAPPERS = new Set(['library', 'hacking', 'scripts', 'docs']);

function pathToNamedChain(absPath) {
  // Strip ACTIVE_ROOT prefix; split; drop wrapper segments; drop the
  // trailing .schema.json basename (the slug is the named-thing — its
  // schema file is one of the named-thing's typed presentations).
  if (!absPath.startsWith(ACTIVE_ROOT)) return null;
  const rel = absPath.slice(ACTIVE_ROOT.length).replace(/^\/+/, '');
  const parts = rel.split('/');
  // The last segment is the file basename. If it's <slug>.schema.json,
  // strip and check that <slug> matches the parent dir name (so the named-
  // thing isn't double-counted). If it doesn't match, keep the slug as the
  // apex segment.
  const last = parts.pop();
  const named = parts.filter((p) => !WRAPPERS.has(p));
  if (last && last.endsWith('.schema.json')) {
    const slug = last.slice(0, -'.schema.json'.length);
    if (named[named.length - 1] !== slug) named.push(slug);
  }
  return named;
}

function idToNamedChain(id) {
  if (typeof id !== 'string' || !id.startsWith(ID_ROOT_PREFIX)) return null;
  const rel = id.slice(ID_ROOT_PREFIX.length);
  const parts = rel.split('/');
  const last = parts.pop();
  const named = parts.filter((p) => !WRAPPERS.has(p));
  if (last && last.endsWith('.schema.json')) {
    const slug = last.slice(0, -'.schema.json'.length);
    if (named[named.length - 1] !== slug) named.push(slug);
  }
  return named;
}

// Walk the on-disk segment list (NOT named-chain — the raw segments with
// wrappers) and the $id's segment list together. Mark each on-disk segment
// as "matches-id" if it appears in the $id chain at the same named-position,
// or "wrapper" if it's a wrapper, or "admitted-gap" if it appeared INSIDE
// the most recent hacking/ wrapper.
function classifyOnDiskExtras(onDiskSegs, idNamed) {
  // onDiskSegs is the raw path segments (incl wrappers).
  // We walk on-disk segments; named ones must appear in idNamed in order;
  // extras inside a hacking/ scope are admitted gaps; extras outside are
  // id-mismatch evidence.
  const result = { gaps: [], idMismatches: [] };
  let idIdx = 0;
  let inHacking = false;
  for (const seg of onDiskSegs) {
    if (seg === 'hacking') { inHacking = true; continue; }
    if (seg === 'library' || seg === 'scripts' || seg === 'docs') continue;
    // Named segment.
    if (idIdx < idNamed.length && seg === idNamed[idIdx]) {
      idIdx++;
      // Reset hacking scope: encountering an $id-chain segment means we're
      // back on the canonical path past the gap.
      inHacking = false;
      continue;
    }
    // This named segment is not the next $id-chain segment.
    if (inHacking) {
      result.gaps.push(seg);
    } else {
      result.idMismatches.push(seg);
    }
  }
  result.idChainConsumed = idIdx === idNamed.length;
  return result;
}

export default function checkPlacement(input) {
  if (!validateInput(input)) {
    throw new TypeError(`check-placement: ${ajv.errorsText(validateInput.errors)}`);
  }
  const schemaPath = input['schema-path'];

  let raw, schema;
  try { raw = readFileSync(schemaPath, 'utf8'); } catch (err) {
    return finalize({
      'schema-path': schemaPath,
      verdict: 'schema-unreadable',
      'on-disk-named-chain': [],
      'id-named-chain': [],
      message: `cannot read schema file: ${err.message}`
    });
  }
  try { schema = JSON.parse(raw); } catch (err) {
    return finalize({
      'schema-path': schemaPath,
      verdict: 'schema-unreadable',
      'on-disk-named-chain': [],
      'id-named-chain': [],
      message: `cannot parse schema JSON: ${err.message}`
    });
  }

  const onDiskNamed = pathToNamedChain(schemaPath) ?? [];
  const id = schema?.$id;
  if (!id) {
    return finalize({
      'schema-path': schemaPath,
      verdict: 'no-id-in-schema',
      'on-disk-named-chain': onDiskNamed,
      'id-named-chain': [],
      message: 'schema has no $id; cannot match cone apex against claim'
    });
  }
  const idNamed = idToNamedChain(id) ?? [];

  // Raw on-disk segments (incl wrappers) for the gap-classification walk.
  const rel = schemaPath.startsWith(ACTIVE_ROOT)
    ? schemaPath.slice(ACTIVE_ROOT.length).replace(/^\/+/, '').split('/')
    : [];
  // Drop the trailing .schema.json basename segment; handle the basename's
  // slug as the apex segment if it differs from the immediate parent dir.
  const rawSegs = rel.slice(0, -1);
  const lastBase = rel[rel.length - 1] ?? '';
  if (lastBase.endsWith('.schema.json')) {
    const lastSlug = lastBase.slice(0, -'.schema.json'.length);
    if (rawSegs[rawSegs.length - 1] !== lastSlug) rawSegs.push(lastSlug);
  }

  const cls = classifyOnDiskExtras(rawSegs, idNamed);

  // Apex check: the apex is the last named segment. on-disk and $id chains
  // must end with the same apex.
  const onDiskApex = onDiskNamed[onDiskNamed.length - 1];
  const idApex = idNamed[idNamed.length - 1];

  if (onDiskApex !== idApex) {
    return finalize({
      'schema-path': schemaPath,
      verdict: 'id-mismatch',
      'on-disk-named-chain': onDiskNamed,
      'id-named-chain': idNamed,
      'suggested-canonical-path': suggestCanonical(idNamed),
      message: `apex differs: on-disk path's apex is '${onDiskApex}', $id claims '${idApex}'`
    });
  }

  if (cls.idMismatches.length > 0 || !cls.idChainConsumed) {
    return finalize({
      'schema-path': schemaPath,
      verdict: 'id-mismatch',
      'on-disk-named-chain': onDiskNamed,
      'id-named-chain': idNamed,
      'suggested-canonical-path': suggestCanonical(idNamed),
      message: `chains diverge outside hacking/ wrappers: on-disk chain has unexpected segments [${cls.idMismatches.join(', ')}]${cls.idChainConsumed ? '' : `; $id chain not fully matched (stopped at index ${idNamed.length - 1 - cls.idMismatches.length})`}`
    });
  }

  if (cls.gaps.length > 0) {
    return finalize({
      'schema-path': schemaPath,
      verdict: 'properly-placed-with-admitted-gaps',
      'on-disk-named-chain': onDiskNamed,
      'id-named-chain': idNamed,
      'admitted-gap-segments': cls.gaps,
      message: `cone apex matches $id; cone-base has ${cls.gaps.length} admitted-gap segment(s) inside hacking/ wrappers: [${cls.gaps.join(', ')}]`
    });
  }

  return finalize({
    'schema-path': schemaPath,
    verdict: 'properly-placed',
    'on-disk-named-chain': onDiskNamed,
    'id-named-chain': idNamed,
    message: 'cone apex matches $id and cone-base has no admitted gaps'
  });
}

function suggestCanonical(idNamed) {
  // Naive: just join under ACTIVE_ROOT with library/ wrappers between named segments.
  if (idNamed.length === 0) return ACTIVE_ROOT;
  const apex = idNamed[idNamed.length - 1];
  const ancestors = idNamed.slice(0, -1);
  const parts = [];
  for (const seg of ancestors) parts.push(seg, 'library');
  parts.push(apex, `${apex}.schema.json`);
  return `${ACTIVE_ROOT}/${parts.join('/')}`;
}

function finalize(out) {
  const frozen = Object.freeze(out);
  if (!validateOutput(frozen)) {
    throw new TypeError(`check-placement: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return frozen;
}
