// settling — THE SPOTCOMP top-level composite morphism.
//
// (system, cell, datum, rules?) → system'
//
// Per the Austin-Searle realizable factorization:
//   1. Locution: select cell.
//   2. Illocution: positing(cell, datum) → {class, entry}; append to system.entries[class].
//   3. Perlocution: σ-pass closure-firing — each rule produces {cell, datum} tuples;
//      route each through positing → append entries to right class log; iterate until
//      no rule produces a novel (cell, class) pair.
//
// Append-only on per-class lists; monotonicity is automatic (each class only ever
// adds to its component of the projected ≤_k value).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import positing from '#script/positing';
import firing from '#script/firing';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/settling-morphism');
const SPOTCOMP_SCHEMA = loadSchema('#schema/spotcomp');
const CELL_SCHEMA = loadSchema('#schema/cell');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const ASSERTION_SCHEMA = loadSchema('#schema/assertion');
const DENIAL_SCHEMA = loadSchema('#schema/denial');
const CONTESTATION_SCHEMA = loadSchema('#schema/contestation');
const ABSTENTION_SCHEMA = loadSchema('#schema/abstention');
const VALUE_SCHEMA = loadSchema('#schema/bilattice-value');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');
const BILATTICE_SCHEMA = loadSchema('#schema/bilattice');
const RULE_SCHEMA = loadSchema('#schema/closure-rule');
const PLAYER_SCHEMA = loadSchema('#schema/player');
const SETTLING_SCHEMA = loadSchema('#schema/settling');
const TRACE_SCHEMA = loadSchema('#schema/cell-trace');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, VALUE_SCHEMA, BILATTICE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, RULE_SCHEMA, TRACE_SCHEMA, SETTLING_SCHEMA, PLAYER_SCHEMA, SPOTCOMP_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateSpotcomp = ajv.getSchema(SPOTCOMP_SCHEMA.$id);

const CLASS_TO_BUCKET = {
  assertion: 'assertions',
  denial: 'denials',
  contestation: 'contestations',
  abstention: 'abstentions',
};

function entryKey(entry) {
  return `${entry.e}\x1f${entry.a}\x1f${entry.v}`;
}

function hasEntryAt(bucket, key) {
  for (const e of bucket) {
    if (entryKey(e) === key) return true;
  }
  return false;
}

function appendEntry(system, cls, entry) {
  const bucket = CLASS_TO_BUCKET[cls];
  const key = entryKey(entry);
  if (hasEntryAt(system.entries[bucket], key)) {
    // Already have an entry at this (cell, class). No append needed.
    return { system, novel: false };
  }
  return {
    system: {
      ...system,
      entries: {
        ...system.entries,
        [bucket]: [...system.entries[bucket], entry],
      },
    },
    novel: true,
  };
}

function makeTGen() {
  let last = '';
  let counter = 0;
  return () => {
    const now = new Date().toISOString();
    if (now > last) { last = now; counter = 0; return now; }
    counter += 1;
    const next = last.replace(/Z$/, `${String(counter).padStart(6, '0')}Z`);
    last = next;
    return next;
  };
}

export default function settling(input) {
  if (!validateInput(input)) {
    throw new TypeError(`settling: input invalid: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { system, cell, datum } = input;
  const rules = input.rules ?? (system.rules ?? []).filter((r) => typeof r.fire === 'function');
  const maxSteps = input.maxSteps ?? 1024;
  const nextT = makeTGen();

  // Illocution: posit the input datum at the cell.
  let s = system;
  if (!s.entries) {
    s = { ...s, entries: { assertions: [], denials: [], contestations: [], abstentions: [] } };
  }
  const initial = positing({ cell, datum, t: nextT() });
  ({ system: s } = appendEntry(s, initial.class, initial.entry));

  // Perlocution: σ-pass to lfp.
  for (let i = 0; i < maxSteps; i++) {
    let novelThisStep = 0;
    for (const rule of rules) {
      const proposed = firing({ rule, system: s });
      for (const p of proposed) {
        if (!p || typeof p !== 'object') continue;
        if (!p.cell || !p.datum) continue;
        const posit = positing({ cell: p.cell, datum: p.datum, t: nextT() });
        const result = appendEntry(s, posit.class, posit.entry);
        s = result.system;
        if (result.novel) novelThisStep += 1;
      }
    }
    if (novelThisStep === 0) break;
    if (i === maxSteps - 1) throw new Error(`settling: did not converge after ${maxSteps} steps`);
  }

  if (!validateSpotcomp(s)) {
    throw new TypeError(`settling: output invalid: ${ajv.errorsText(validateSpotcomp.errors)}`);
  }
  return s;
}

export const schema = INPUT_SCHEMA;
