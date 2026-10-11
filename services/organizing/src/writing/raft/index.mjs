/**
 * writing/raft - coordinated consensus exactly at the CALM frontier.
 *
 * Raft is not organizing's default merge. CALM keeps monotone operations
 * coordination-free; Raft appears only where the CALM reading reports a
 * non-monotone obstruction. The log below is a functorial RWIL view: each
 * leader-elected entry maps to append-only EAVT witnesses whose functional
 * projection has one command per log index.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { canonical } from "@red-cup-engineering/json-services-section";
import { cell } from "@red-cup-engineering/eavt-services-section/ledger/cells";
import { projectStateView } from "@red-cup-engineering/eavt-services-section/ledger/state";

const positiveIntegerSchema = { type: "integer", minimum: 1 };
const nonnegativeIntegerSchema = { type: "integer", minimum: 0 };
const jsonSlotSchema = {
  description: "caller-owned JSON command/value carried by the coordinated log",
};

export const raftLeadershipSchema = {
  $id: "organizing/writing/raft/leadership",
  title: "RaftLeadership",
  description:
    "The elected Raft authority for one term. This is the T that orders non-monotone writes: one leader imposes a total order on log indexes for the term.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "cluster", "term", "leader"],
  properties: {
    kind: { const: "organizing.writing.raft.leadership" },
    cluster: { type: "string", minLength: 1 },
    term: positiveIntegerSchema,
    leader: { type: "string", minLength: 1 },
  },
};

export const raftLeadershipCarrier = schemaFrom(raftLeadershipSchema);

export const raftLogEntrySchema = {
  $id: "organizing/writing/raft/log-entry",
  title: "RaftLogEntry",
  description:
    "One totally ordered RWIL log entry. The index is the log address, term+leader are the elected order witness, and command is the single value admitted at that index.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "cluster", "index", "term", "leader", "command", "witness"],
  properties: {
    kind: { const: "organizing.writing.raft.log-entry" },
    cluster: { type: "string", minLength: 1 },
    index: positiveIntegerSchema,
    term: positiveIntegerSchema,
    leader: { type: "string", minLength: 1 },
    command: jsonSlotSchema,
    witness: { type: "string", minLength: 1 },
  },
};

export const raftLogEntryCarrier = schemaFrom(raftLogEntrySchema);

export const raftLogSchema = {
  $id: "organizing/writing/raft/log",
  title: "RaftLog",
  description:
    "A Raft log as a sorted sequence of elected RWIL entries. Safety requires that each index carry exactly one command.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "cluster", "entries"],
  properties: {
    kind: { const: "organizing.writing.raft.log" },
    cluster: { type: "string", minLength: 1 },
    entries: { type: "array", items: { $ref: "organizing/writing/raft/log-entry" } },
  },
};

export const raftLogCarrier = schemaFrom(raftLogSchema);

export const raftAppendResultSchema = {
  $id: "organizing/writing/raft/append-result",
  title: "RaftAppendResult",
  description:
    "The result of admitting concurrent proposals through a single elected leader term. Accepted entries preserve one-value-per-index; rejected entries are the coordinated dual of a CRDT retaining both writes.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "log", "accepted", "rejected"],
  properties: {
    kind: { const: "organizing.writing.raft.append-result" },
    log: { $ref: "organizing/writing/raft/log" },
    accepted: { type: "array", items: { $ref: "organizing/writing/raft/log-entry" } },
    rejected: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["entry", "reason"],
        properties: {
          entry: { $ref: "organizing/writing/raft/log-entry" },
          reason: {
            enum: [
              "not-current-leader",
              "index-already-set",
              "leader-conflict",
            ],
          },
        },
      },
    },
  },
};

export const raftAppendResultCarrier = schemaFrom(raftAppendResultSchema);

export const calmRaftFrontierSchema = {
  $id: "organizing/writing/raft/calm-frontier",
  title: "CalmRaftFrontier",
  description:
    "The mechanized CALM/Raft boundary: monotone operations lift coordination-free with no Raft round; non-monotone operations require the leader's total order.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "theorem", "operation", "monotone", "raftRound", "reason", "witness"],
  properties: {
    kind: { const: "organizing.writing.raft.calm-frontier" },
    theorem: { const: "CALM/Raft" },
    operation: { type: "string", minLength: 1 },
    monotone: { type: "boolean" },
    raftRound: { enum: ["not-required", "required"] },
    reason: {
      enum: [
        "CALM monotone lift",
        "non-monotone CALM obstruction",
      ],
    },
    witness: {
      type: "object",
      additionalProperties: false,
      required: ["shared", "contested", "federationOnly"],
      properties: {
        shared: nonnegativeIntegerSchema,
        contested: nonnegativeIntegerSchema,
        federationOnly: nonnegativeIntegerSchema,
      },
    },
  },
};

export const calmRaftFrontierCarrier = schemaFrom(calmRaftFrontierSchema);

const entryKey = (entry) =>
  `${entry.cluster}\u0000${entry.index}`;

const entryOrder = (left, right) =>
  left.index - right.index
  || left.term - right.term
  || left.leader.localeCompare(right.leader)
  || canonical(left.command).localeCompare(canonical(right.command))
  || left.witness.localeCompare(right.witness);

function freezeEntries(entries) {
  return Object.freeze([...entries].sort(entryOrder).map((entry) => Object.freeze(entry)));
}

function normalizeLog(log) {
  const entries = freezeEntries(log.entries);
  const seen = new Map();
  for (const entry of entries) {
    const key = entryKey(entry);
    const value = canonical(entry.command);
    const prior = seen.get(key);
    if (prior !== undefined && prior !== value) {
      throw new TypeError(`normalizeRaftLog: index ${entry.cluster}/${entry.index} has multiple commands`);
    }
    seen.set(key, value);
  }
  return Object.freeze({
    kind: "organizing.writing.raft.log",
    cluster: log.cluster,
    entries,
  });
}

export function emptyRaftLog(cluster) {
  if (cluster.trim() === "") throw new TypeError("emptyRaftLog: cluster is required");
  return Object.freeze({
    kind: "organizing.writing.raft.log",
    cluster,
    entries: Object.freeze([]),
  });
}

export function raftEntry(proposal) {
  if (!Number.isInteger(proposal.index) || proposal.index < 1) throw new TypeError("raftEntry: index must be a positive integer");
  if (!Number.isInteger(proposal.term) || proposal.term < 1) throw new TypeError("raftEntry: term must be a positive integer");
  if (proposal.cluster.trim() === "") throw new TypeError("raftEntry: cluster is required");
  if (proposal.leader.trim() === "") throw new TypeError("raftEntry: leader is required");
  if (proposal.witness.trim() === "") throw new TypeError("raftEntry: witness is required");
  return Object.freeze({
    kind: "organizing.writing.raft.log-entry",
    cluster: proposal.cluster,
    index: proposal.index,
    term: proposal.term,
    leader: proposal.leader,
    command: proposal.command,
    witness: proposal.witness,
  });
}

export function raftEntryRows(entry) {
  const entity = ["organizing", "raft", entry.cluster, entry.index];
  const at = { term: entry.term, leader: entry.leader, witness: entry.witness };
  return Object.freeze([
    cell(entity, "term", entry.term, at),
    cell(entity, "leader", entry.leader, at),
    cell(entity, "command", entry.command, at),
    cell(entity, "witness", entry.witness, at),
  ]);
}

export function raftLogRows(log) {
  return Object.freeze(normalizeLog(log).entries.flatMap((entry) => [...raftEntryRows(entry)]));
}

export function projectRaftState(log) {
  return projectStateView(raftLogRows(log), new Set(["term", "leader", "command", "witness"]));
}

export function oneValuePerIndex(log) {
  const commands = new Map();
  for (const entry of log.entries) {
    const key = entryKey(entry);
    const value = canonical(entry.command);
    const prior = commands.get(key);
    if (prior !== undefined && prior !== value) return false;
    commands.set(key, value);
  }
  return true;
}

export function appendRaftProposals(
  log,
  leadership,
  proposals,
) {
  const base = normalizeLog(log);
  if (base.cluster !== leadership.cluster) {
    throw new TypeError(`appendRaftProposals: log cluster ${base.cluster} does not match leadership cluster ${leadership.cluster}`);
  }
  const byIndex = new Map();
  for (const entry of base.entries) byIndex.set(entryKey(entry), entry);

  const accepted = [];
  const rejected = [];
  const leaderSeen = new Map();
  const entries = proposals.map(raftEntry).sort(entryOrder);
  for (const entry of entries) {
    if (entry.cluster !== leadership.cluster || entry.term !== leadership.term || entry.leader !== leadership.leader) {
      rejected.push(Object.freeze({ entry, reason: "not-current-leader" }));
      continue;
    }
    const key = entryKey(entry);
    const value = canonical(entry.command);
    const priorLeaderValue = leaderSeen.get(key);
    if (priorLeaderValue !== undefined && priorLeaderValue !== value) {
      rejected.push(Object.freeze({ entry, reason: "leader-conflict" }));
      continue;
    }
    leaderSeen.set(key, value);
    const prior = byIndex.get(key);
    if (prior !== undefined) {
      if (canonical(prior.command) === value) continue;
      rejected.push(Object.freeze({ entry, reason: "index-already-set" }));
      continue;
    }
    byIndex.set(key, entry);
    accepted.push(entry);
  }

  return Object.freeze({
    kind: "organizing.writing.raft.append-result",
    log: normalizeLog({
      kind: "organizing.writing.raft.log",
      cluster: base.cluster,
      entries: Object.freeze([...byIndex.values()]),
    }),
    accepted: Object.freeze(accepted),
    rejected: Object.freeze(rejected),
  });
}

export function readCalmRaftFrontier(reading, operation = reading.operation) {
  return Object.freeze({
    kind: "organizing.writing.raft.calm-frontier",
    theorem: "CALM/Raft",
    operation,
    monotone: reading.monotone,
    raftRound: reading.monotone ? "not-required" : "required",
    reason: reading.monotone ? "CALM monotone lift" : "non-monotone CALM obstruction",
    witness: {
      shared: reading.witness.shared,
      contested: reading.witness.contested,
      federationOnly: reading.witness.federationOnly,
    },
  });
}

export function coordinateByCalmOrRaft(
  reading,
  options = {},
) {
  const frontier = readCalmRaftFrontier(reading, options.operation);
  const log = options.log ?? emptyRaftLog(options.leadership?.cluster ?? "organizing");
  if (frontier.raftRound === "not-required") {
    return Object.freeze({ frontier, log: normalizeLog(log) });
  }
  if (options.leadership === undefined) throw new TypeError("coordinateByCalmOrRaft: non-monotone operation requires leadership");
  const append = appendRaftProposals(log, options.leadership, options.proposals ?? []);
  return Object.freeze({ frontier, log: append.log, append });
}
