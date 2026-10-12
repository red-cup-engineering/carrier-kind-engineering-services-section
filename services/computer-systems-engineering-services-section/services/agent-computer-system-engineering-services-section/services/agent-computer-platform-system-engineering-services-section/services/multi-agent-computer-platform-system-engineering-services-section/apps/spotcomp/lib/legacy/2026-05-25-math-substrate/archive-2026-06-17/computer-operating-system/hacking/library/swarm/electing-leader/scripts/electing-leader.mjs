// electing-leader — swarm × predicate → leader-assignment.
// Vote = a cell-trace (voter, recognition-predicate, candidate) whose
// projected value is 𝐭 (assertions exist; no denials or contestations)
// in any player's settling. Leader = arg-max votes (ties broken by entity slug).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) => JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#schema/electing-leader');
const ASSIGN_SCHEMA = loadSchema('#schema/leader-assignment');
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
for (const s of [ENTITY_SCHEMA, PREDICATE_SCHEMA, TID_SCHEMA, VALUE_SCHEMA, CELL_SCHEMA, ENTRY_SCHEMA, ASSERTION_SCHEMA, DENIAL_SCHEMA, CONTESTATION_SCHEMA, ABSTENTION_SCHEMA, TRACE_SCHEMA, SETTLING_SCHEMA, PLAYER_SCHEMA, SWARM_SCHEMA, ASSIGN_SCHEMA]) {
  ajv.addSchema(s);
}
const validateInput = ajv.compile(INPUT_SCHEMA);
const validateAssignment = ajv.getSchema(ASSIGN_SCHEMA.$id);

function isVerifiedProjection(trace) {
  // 𝐭 = pos true, neg false.
  const pos = trace.assertions.length > 0 || trace.contestations.length > 0;
  const neg = trace.denials.length > 0 || trace.contestations.length > 0;
  return pos && !neg;
}

export default function electingLeader(input) {
  if (!validateInput(input)) {
    throw new TypeError(`electing-leader: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { swarm, 'recognition-predicate': recPred } = input;
  const tallies = new Map();
  for (const player of swarm.players) {
    for (const trace of player.settling.traces) {
      if (trace.cell.p !== recPred) continue;
      if (!isVerifiedProjection(trace)) continue;
      const candidate = trace.cell.o;
      tallies.set(candidate, (tallies.get(candidate) ?? 0) + 1);
    }
  }
  const tally = [...tallies.entries()]
    .map(([candidate, votes]) => ({ candidate, votes }))
    .sort((a, b) => b.votes - a.votes || (a.candidate < b.candidate ? -1 : a.candidate > b.candidate ? 1 : 0));
  const leader = tally.length === 0 ? null : tally[0].candidate;
  const assignment = { 'recognition-predicate': recPred, leader, tally };
  if (!validateAssignment(assignment)) {
    throw new TypeError(`electing-leader: output invalid: ${ajv.errorsText(validateAssignment.errors)}`);
  }
  return Object.freeze(assignment);
}

export const schema = INPUT_SCHEMA;
