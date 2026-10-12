// compute-view — the view-computation morphism.
//
// A view of an entity in the manifold is a fiber-projection: the sub-valuation
// produced by specialization-at-entity along the inclusion {e} × Π × E ↪ Φ
// (as-subject view), the symmetric inclusion E × Π × {e} (as-object view), or
// their bilattice ≤_k-join (two-position view), or the diagonal-collapse
// restriction (reflexive view). See umwelt-as-fiber-projection-with-coherence
// for the structural-coherence proof.
//
// Phase 1 implementation: reads the supplied manifold files (JSONL), filters
// rows by shape against the target entity, and aggregates into cells with
// positive-evidence raised to 1 wherever any row mentions the cell (the
// bilattice charge accumulator is Phase 3; here every present row counts as
// one positive-evidence raise, and negative-evidence remains 0).
//
// Input:  { of-entity: string, shape: enum, manifold-files: [string] }
// Output: { of-entity, shape, cells: [...], computed-at: ISO-8601 }

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf8'));

const VIEW_SCHEMA = load('../view.schema.json');

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validateOutput = ajv.compile(VIEW_SCHEMA);

function matchesShape(row, ofEntity, shape) {
  const isSubject = row.e === ofEntity;
  const isObject = row.v === ofEntity;
  switch (shape) {
    case 'as-subject': return isSubject;
    case 'as-object': return isObject;
    case 'two-position': return isSubject || isObject;
    case 'reflexive': return isSubject && isObject;
    default: return false;
  }
}

export default function computeView(input) {
  const ofEntity = input?.['of-entity'];
  const shape = input?.shape ?? 'two-position';
  const manifestFiles = input?.['manifold-files'] ?? [];
  if (typeof ofEntity !== 'string' || !ofEntity) {
    throw new TypeError(`compute-view: missing or invalid 'of-entity' (got ${JSON.stringify(ofEntity)})`);
  }
  if (!['as-subject', 'as-object', 'two-position', 'reflexive'].includes(shape)) {
    throw new TypeError(`compute-view: invalid 'shape' (got ${JSON.stringify(shape)})`);
  }
  const cellMap = new Map();
  for (const file of manifestFiles) {
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, 'utf8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      if (!row || typeof row !== 'object') continue;
      if (!matchesShape(row, ofEntity, shape)) continue;
      const key = `${row.e}|${row.a}|${JSON.stringify(row.v)}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          subject: row.e,
          predicate: row.a,
          object: row.v,
          'positive-evidence': 1,
          'negative-evidence': 0
        });
      }
    }
  }
  const view = Object.freeze({
    'of-entity': ofEntity,
    shape,
    cells: Object.freeze([...cellMap.values()].map(Object.freeze)),
    'computed-at': new Date().toISOString()
  });
  if (!validateOutput(view)) {
    throw new TypeError(`compute-view: output failed validation: ${ajv.errorsText(validateOutput.errors)}`);
  }
  return view;
}
