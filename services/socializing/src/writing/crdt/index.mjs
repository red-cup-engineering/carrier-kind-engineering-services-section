/**
 * writing/crdt — socializing's merge made into an interoperable state-CRDT.
 *
 * A CRDT is not a second ontology here. Its semilattice join is exactly the
 * knowledge-order join `knowledgeJoin` from relating, lifted from one evidence to
 * a replicated JSON state: cells with the same key accumulate evidence by
 * `∨_k`; distinct cells commute by map union. The multi-value register below is
 * the register-shaped projection of that state. Concurrent disagreement is not
 * resolved by a clock winner; both writes remain present and the register's
 * evidence rises to `stable` (⊤, told-both).
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { canonical } from "@red-cup-engineering/json-services-section";
import { evidenceSchema, knowledgeJoin, noEvidence } from "@red-cup-engineering/signchain/bilattice";
import { evidence, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const writeSchema = {
  type: "object",
  description: "one causally-addressed MV-register write, kept as a witness rather than collapsed by a clock",
  required: ["dot", "replica", "value", "standing", "witness"],
  properties: {
    dot: { type: "string", minLength: 1 },
    replica: { type: "string", minLength: 1 },
    value: {},
    standing: { enum: ["potential", "active", "stable", "absurd"] },
    witness: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

const stateCellSchema = {
  type: "object",
  description: "one join-semilattice cell: key-addressed knowledge standing plus optional register writes",
  required: ["key", "evidence"],
  properties: {
    key: { type: "string", minLength: 1 },
    evidence: evidenceSchema,
    writes: { type: "array", items: writeSchema },
  },
  additionalProperties: false,
};

export const StateCrdtSchema = {
  $id: "socializing/writing/crdt/state",
  title: "StateCrdt",
  description:
    "A state-based CRDT carrier whose merge is the pointwise <=_k join from relating. Cells are keyed replicated-state entries; their evidence is SignChain's evidence pair, so merge is knowledgeJoin and no parallel lattice is introduced.",
  type: "object",
  required: ["kind", "cells"],
  properties: {
    kind: { const: "socializing.crdt.state" },
    cells: { type: "array", items: stateCellSchema },
  },
  additionalProperties: false,
};

export const stateCrdtCarrier = schemaFrom(StateCrdtSchema);

export const MultiValueRegisterSchema = {
  $id: "socializing/writing/crdt/mv-register",
  title: "MultiValueRegister",
  description:
    "A multi-value register as a state-CRDT projection: concurrent writes are retained as witnesses, and the register's standing is the <=_k join of their standings. Conflicts therefore settle to stable/top instead of last-writer-wins.",
  type: "object",
  required: ["kind", "key", "evidence", "writes"],
  properties: {
    kind: { const: "socializing.crdt.mv-register" },
    key: { type: "string", minLength: 1 },
    evidence: evidenceSchema,
    writes: { type: "array", items: writeSchema },
  },
  additionalProperties: false,
};

export const multiValueRegisterCarrier = schemaFrom(MultiValueRegisterSchema);

/** The knowledge-order bottom for a fresh replicated state. */
export function emptyCrdtState() {
  return Object.freeze({ kind: "socializing.crdt.state", cells: Object.freeze([]) });
}

function evidenceOfStanding(standing, witness) {
  const w = witness;
  switch (standing) {
    case "potential": return evidence({ for: [w] });
    case "active": return evidence({ against: [w] });
    case "stable": return evidence({ for: [w], against: [w] });
    case "absurd": default: return noEvidence;
  }
}

function writesByDot(writes = []) {
  const byDot = new Map();
  for (const write of writes) byDot.set(write.dot, write);
  return Object.freeze([...byDot.values()].sort((left, right) => left.dot.localeCompare(right.dot)));
}

function joinedWriteEvidence(writes = []) {
  return writes.reduce(
    (standing, write) => knowledgeJoin(standing, evidenceOfStanding(write.standing, write.witness)),
    noEvidence,
  );
}

function registerEvidence(writes = []) {
  const joined = joinedWriteEvidence(writes);
  const byValue = new Map();
  for (const write of writes) {
    const key = canonical(write.value);
    byValue.set(key, Object.freeze([...(byValue.get(key) ?? []), write]));
  }
  if (byValue.size < 2 || knowledgeReading(joined) !== "potential") return joined;

  // A plain MV-register conflict is different concurrent values for the same
  // register. Read the canonical first value as the truth-side representative
  // and every other value as the falsity-side representative; the choice is
  // deterministic and only witnesses that the register is now told-both.
  const entries = [...byValue.entries()].sort(([left], [right]) => left.localeCompare(right));
  const truth = entries[0][1].map((write) => write.witness);
  const falsity = entries.slice(1).flatMap(([, conflicting]) => conflicting.map((write) => write.witness));
  return evidence({ for: truth, against: falsity });
}

function normalizeCell(cell) {
  const writes = writesByDot(cell.writes);
  const evidenceFromWrites = registerEvidence(writes);
  const joined = writes.length === 0 ? cell.evidence : evidenceFromWrites;
  return Object.freeze({
    key: cell.key,
    evidence: joined,
    ...(writes.length === 0 ? {} : { writes }),
  });
}

/** Build a state-CRDT cell, admitting the evidence carrier through relating's own surface. */
export function crdtCell(key, standing, witness) {
  return Object.freeze({ key, evidence: evidenceOfStanding(standing, witness) });
}

/** Build a state-CRDT snapshot from cells; equal keys are immediately joined. */
export function crdtState(cells = []) {
  return mergeCrdtStates(emptyCrdtState(), Object.freeze({ kind: "socializing.crdt.state", cells }));
}

/**
 * Merge two state-CRDT snapshots by pointwise `knowledgeJoin`.
 *
 * The returned normal form is sorted by key. Because each key folds with
 * relating's idempotent/commutative/associative knowledge join, the state merge
 * inherits those semilattice laws.
 */
export function mergeCrdtStates(left, right) {
  const cells = new Map();
  for (const raw of [...left.cells, ...right.cells]) {
    const cell = normalizeCell(raw);
    const prior = cells.get(cell.key);
    if (prior === undefined) {
      cells.set(cell.key, cell);
      continue;
    }
    cells.set(cell.key, Object.freeze({
      key: cell.key,
      evidence: knowledgeJoin(prior.evidence, cell.evidence),
      writes: writesByDot([...(prior.writes ?? []), ...(cell.writes ?? [])]),
    }));
  }
  return Object.freeze({
    kind: "socializing.crdt.state",
    cells: Object.freeze([...cells.values()].map(normalizeCell).sort((leftCell, rightCell) => leftCell.key.localeCompare(rightCell.key))),
  });
}

function dot(replica, value, witness) {
  return `${replica}:${witness}:${canonical(value)}`;
}

/** A one-write MV-register replica. The write standing is explicit so callers can
 *  represent opposing concurrent claims without encoding that opposition as time. */
export function mvRegister(
  key,
  replica,
  value,
  options = {},
) {
  const standing = options.standing ?? "potential";
  const witness = options.witness ?? `${replica}:${canonical(value)}`;
  const write = Object.freeze({
    dot: dot(replica, value, witness),
    replica,
    value,
    standing,
    witness,
  });
  return Object.freeze({
    kind: "socializing.crdt.mv-register",
    key,
    evidence: evidenceOfStanding(standing, witness),
    writes: Object.freeze([write]),
  });
}

function stateOfRegister(register) {
  return Object.freeze({
    kind: "socializing.crdt.state",
    cells: Object.freeze([{
      key: register.key,
      evidence: register.evidence,
      writes: register.writes,
    }]),
  });
}

/** Merge MV-register replicas by lifting them into the state-CRDT join. */
export function mergeMultiValueRegisters(left, right) {
  if (left.key !== right.key) throw new TypeError(`mergeMultiValueRegisters: key mismatch ${left.key} !== ${right.key}`);
  const state = mergeCrdtStates(stateOfRegister(left), stateOfRegister(right));
  const cell = state.cells.find((candidate) => candidate.key === left.key);
  if (cell === undefined) throw new TypeError(`mergeMultiValueRegisters: missing merged cell ${left.key}`);
  return Object.freeze({
    kind: "socializing.crdt.mv-register",
    key: left.key,
    evidence: cell.evidence,
    writes: writesByDot(cell.writes),
  });
}

/** The register's current bilattice standing name. */
export function multiValueRegisterStanding(register) {
  return knowledgeReading(register.evidence);
}

/** The value-level join, exposed for callers/tests that need the algebra witness. */
export function joinCrdtStanding(left, right) {
  return knowledgeJoinReading(left, right);
}
