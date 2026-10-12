// taking-consensus — swarm → consensus map (cellwise ⊗_k of players' projected values).
// Each player's settling has per-cell traces (with per-class arrays); the
// projected value is computed per-trace via the projecting-value math
// (pos := has assertion or contestation; neg := has denial or contestation).
// Consensus = cellwise ≤_k-meet over all players' projected values.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/taking-consensus');
const SWARM_SCHEMA = loadSchema('#schema/swarm');
const PLAYER_SCHEMA = loadSchema('#schema/player');
const SETTLING_SCHEMA = loadSchema('#schema/settling');
const TRACE_SCHEMA = loadSchema('#schema/cell-trace');
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

const ajv = new Ajv2020({ strict: false });
(addFormats.default ?? addFormats)(ajv);
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, VALUE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, TRACE_SCHEMA, SETTLING_SCHEMA, PLAYER_SCHEMA, SWARM_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);

const UNDECIDABLE = Object.freeze({ pos: false, neg: false });
const CONTRADICTORY = Object.freeze({ pos: true, neg: true });

function meetK(a, b) {
  return { pos: a.pos && b.pos, neg: a.neg && b.neg };
}

function cellKey(c) {
  return `${c.s}${c.p}${c.o}`;
}

function projectValue(trace) {
  if (!trace) return UNDECIDABLE;
  const pos = trace.assertions.length > 0 || trace.contestations.length > 0;
  const neg = trace.denials.length > 0 || trace.contestations.length > 0;
  return { pos, neg };
}

function traceAt(settling, cell) {
  for (const t of settling.traces) {
    if (t.cell.s === cell.s && t.cell.p === cell.p && t.cell.o === cell.o) return t;
  }
  return null;
}

export default function takingConsensus(input) {
  if (!validateInput(input)) {
    throw new TypeError(`taking-consensus: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { swarm } = input;
  if (swarm.players.length === 0) return [];
  const allCells = new Map();
  for (const player of swarm.players) {
    for (const trace of player.settling.traces) {
      allCells.set(cellKey(trace.cell), trace.cell);
    }
  }
  const result = [];
  for (const cell of allCells.values()) {
    let value = CONTRADICTORY;
    for (const player of swarm.players) {
      const v = projectValue(traceAt(player.settling, cell));
      value = meetK(value, v);
    }
    result.push({ cell, value });
  }
  return result;
}

export const schema = INPUT_SCHEMA;
