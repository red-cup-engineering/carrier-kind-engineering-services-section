import { address, coincides, hasTriple } from "@red-cup-engineering/signcell/cell";
import {
  configurationJudgment,
  event,
  eventStructure,
} from "@red-cup-engineering/playing/structuring/event/structure";
import { positive } from "@red-cup-engineering/playing/structuring/polarity";

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const fields = ["subject", "predicate", "object"];
const freeze = (value) => Object.freeze(value);
const footprintKey = (kind, value) => address({ subject: "proposal-footprint", predicate: kind, object: value });
// Footprints in canonical order: by content address, each address computed once.
const canonicalOrder = (kind, values) => values.map((value) => [footprintKey(kind, value), value])
  .sort((a, b) => compareText(a[0], b[0])).map(([, value]) => value);

function fail(message) {
  throw new TypeError(`admitProposals: ${message}`);
}

function normalize(proposals) {
  if (!Array.isArray(proposals)) fail("proposals must be an array");
  const byId = new Map();
  for (const proposal of proposals) {
    if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) fail("each proposal must be a record");
    const { id, reads, writes, after = [] } = proposal;
    if (typeof id !== "string" || id.length === 0) fail("proposal id must be non-empty text");
    if (byId.has(id)) fail(`duplicate proposal id ${JSON.stringify(id)}`);
    if (!Array.isArray(reads) || !Array.isArray(writes) || !Array.isArray(after)) fail(`${id}: reads, writes, and after must be arrays`);
    for (const pattern of reads) {
      if (!pattern || typeof pattern !== "object" || Array.isArray(pattern)) fail(`${id}: read pattern must be a record`);
      for (const key of Object.keys(pattern)) if (!fields.includes(key)) fail(`${id}: unknown read field ${JSON.stringify(key)}`);
    }
    for (const write of writes) if (!hasTriple(write)) fail(`${id}: each write must be a SignCell triple`);
    const dependencies = [...after];
    for (const dependency of dependencies) if (typeof dependency !== "string" || dependency.length === 0) fail(`${id}: dependency ids must be non-empty text`);
    if (new Set(dependencies).size !== dependencies.length) fail(`${id}: duplicate dependency`);
    byId.set(id, freeze({
      id,
      reads: freeze(canonicalOrder("read", reads.map((pattern) => freeze({ ...pattern })))),
      writes: freeze(canonicalOrder("write", writes)),
      after: freeze(dependencies),
    }));
  }
  for (const proposal of byId.values()) {
    for (const dependency of proposal.after) {
      if (!byId.has(dependency)) fail(`${proposal.id}: unknown dependency ${JSON.stringify(dependency)}`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail(`cyclic dependency involving ${JSON.stringify(id)}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).after) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return byId;
}

const sameAddress = (left, right) => coincides(left.subject, right.subject)
  && coincides(left.predicate, right.predicate);
const matchesPattern = (pattern, triple) => fields.every((field) => !Object.hasOwn(pattern, field)
  || coincides(pattern[field], triple[field]));

function directWitnesses(left, right) {
  const witnesses = [];
  for (const a of left.writes) for (const b of right.writes) {
    if (sameAddress(a, b)) witnesses.push(freeze({ kind: "write-write", left: a, right: b }));
  }
  // Reads observe the shared pre-tick boundary. A read-only proposal (look)
  // commits no effect and therefore cannot exclude a mutating proposal.
  if (left.writes.length > 0 && right.writes.length > 0) {
    for (const write of left.writes) for (const read of right.reads) {
      if (matchesPattern(read, write)) witnesses.push(freeze({ kind: "write-read", writer: left.id, write, reader: right.id, read }));
    }
    for (const write of right.writes) for (const read of left.reads) {
      if (matchesPattern(read, write)) witnesses.push(freeze({ kind: "write-read", writer: right.id, write, reader: left.id, read }));
    }
  }
  return witnesses;
}

/** Admit a permutation-independent, conflict-free batch as a prime-event configuration. */
export function admitProposals(input) {
  const proposals = normalize(input);
  const ids = [...proposals.keys()].sort(compareText);
  const descendants = new Map(ids.map((id) => [id, new Set([id])]));
  const causality = [];
  for (const id of ids) {
    for (const dependency of proposals.get(id).after) causality.push([dependency, id]);
  }
  causality.sort((a, b) => compareText(a[0], b[0]) || compareText(a[1], b[1]));
  // The dependency graph is acyclic; repeated propagation computes its transitive closure.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [before, after] of causality) {
      for (const descendant of descendants.get(after)) {
        if (!descendants.get(before).has(descendant)) {
          descendants.get(before).add(descendant);
          changed = true;
        }
      }
    }
  }

  const baseConflicts = [];
  for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
    // Causally ordered writes are successive effects, not competing proposals.
    if (descendants.get(ids[i]).has(ids[j]) || descendants.get(ids[j]).has(ids[i])) continue;
    const witnesses = directWitnesses(proposals.get(ids[i]), proposals.get(ids[j]));
    if (witnesses.length) baseConflicts.push({ ids: [ids[i], ids[j]], witnesses });
  }
  const conflictWitnesses = new Map();
  const addConflict = (left, right, origin) => {
    if (left === right) return;
    const pair = [left, right].sort(compareText);
    const key = JSON.stringify(pair);
    const current = conflictWitnesses.get(key) ?? { ids: pair, witnesses: [] };
    for (const witness of origin.witnesses) {
      current.witnesses.push(freeze({ ...witness, inherited: origin.ids[0] !== left || origin.ids[1] !== right,
        ...(origin.ids[0] === left && origin.ids[1] === right ? {} : { from: origin.ids }) }));
    }
    conflictWitnesses.set(key, current);
  };
  for (const origin of baseConflicts) {
    for (const left of descendants.get(origin.ids[0])) {
      for (const right of descendants.get(origin.ids[1])) addConflict(left, right, origin);
    }
  }
  const contested = [...conflictWitnesses.values()]
    .sort((a, b) => compareText(a.ids[0], b.ids[0]) || compareText(a.ids[1], b.ids[1]))
    .map(({ ids: pair, witnesses }) => freeze({
      ids: freeze(pair),
      witnesses: freeze(witnesses),
    }));
  const conflicts = contested.map(({ ids: pair }) => pair);
  const structure = eventStructure(ids.map((id) => event(id, positive)), causality, conflicts);
  const excluded = new Set(conflicts.flat());
  const admitted = [];
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const id of ids) {
      if (excluded.has(id)) continue;
      if (proposals.get(id).after.some((dependency) => excluded.has(dependency))) {
        excluded.add(id);
        pruned = true;
      }
    }
  }
  for (const id of ids) if (!excluded.has(id)) admitted.push(id);
  const judgment = configurationJudgment(structure, admitted);
  return freeze({ structure, admitted: freeze(admitted), contested: freeze(contested), judgment });
}
