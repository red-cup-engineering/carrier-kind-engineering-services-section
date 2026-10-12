// ingesting — verified-envelope × spotcomp → spotcomp'.
// Inbound federation: union the envelope's per-class entries into the local
// state's per-class entries (CRDT-G-Set union semantics — append-only per class,
// idempotent in the projected value), then re-iterate closure.
//
// The CRDT merge IS the union of class JSONLs — no per-row "merge" needed.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import settling from '#script/settling';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/ingesting');
const VERIFIED_SCHEMA = loadSchema('#schema/verified-envelope');
const SIGNED_SCHEMA = loadSchema('#schema/signed-envelope');
const ENVELOPE_SCHEMA = loadSchema('#schema/envelope');
const SPOTCOMP_SCHEMA = loadSchema('#schema/spotcomp');
const ENTRY_SCHEMA = loadSchema('#schema/positing-entry');
const ASSERTION_SCHEMA = loadSchema('#schema/assertion');
const DENIAL_SCHEMA = loadSchema('#schema/denial');
const CONTESTATION_SCHEMA = loadSchema('#schema/contestation');
const ABSTENTION_SCHEMA = loadSchema('#schema/abstention');
const CELL_SCHEMA = loadSchema('#schema/cell');
const VALUE_SCHEMA = loadSchema('#schema/bilattice-value');
const ENTITY_SCHEMA = loadSchema('#schema/entity');
const PREDICATE_SCHEMA = loadSchema('#schema/predicate');
const TID_SCHEMA = loadSchema('#schema/transaction-id');
const BILATTICE_SCHEMA = loadSchema('#schema/bilattice');
const RULE_SCHEMA = loadSchema('#schema/closure-rule');
const TRACE_SCHEMA = loadSchema('#schema/cell-trace');
const SETTLING_SCHEMA = loadSchema('#schema/settling');
const PLAYER_SCHEMA = loadSchema('#schema/player');

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, VALUE_SCHEMA, BILATTICE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, RULE_SCHEMA, TRACE_SCHEMA, SETTLING_SCHEMA, PLAYER_SCHEMA, ENVELOPE_SCHEMA, SIGNED_SCHEMA, VERIFIED_SCHEMA, SPOTCOMP_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);

const CLASS_TO_DATUM = {
  assertions: { pos: true, neg: false },
  denials: { pos: false, neg: true },
  contestations: { pos: true, neg: true },
  abstentions: { pos: false, neg: false },
};

export default function ingesting(input) {
  if (!validateInput(input)) {
    throw new TypeError(`ingesting: ${ajv.errorsText(validateInput.errors)}`);
  }
  const verified = input['verified-envelope'];
  let s = input.system;
  if (!s.entries) {
    s = { ...s, entries: { assertions: [], denials: [], contestations: [], abstentions: [] } };
  }
  const rules = input.rules ?? (s.rules ?? []).filter((r) => typeof r.fire === 'function');

  // For each class log in the envelope, route every entry through settling.
  // settling handles dedup + closure-firing. Each entry is EAVT {e, a, v, t};
  // reconstruct the predication-cell {s, p, o} from those coordinates to feed
  // settling.
  for (const cls of ['assertions', 'denials', 'contestations', 'abstentions']) {
    const datum = CLASS_TO_DATUM[cls];
    for (const entry of verified.envelope.body[cls] ?? []) {
      const cell = { s: entry.e, p: entry.a, o: entry.v };
      s = settling({ system: s, cell, datum, rules });
    }
  }
  return s;
}

export const schema = INPUT_SCHEMA;
