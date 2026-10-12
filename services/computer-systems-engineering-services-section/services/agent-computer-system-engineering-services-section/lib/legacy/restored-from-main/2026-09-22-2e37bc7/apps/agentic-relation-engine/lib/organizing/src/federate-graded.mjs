/**
 * federate-graded - contradiction-aware federation over coherent RWIL readings.
 *
 * Sources contribute protocol-local collections. Each cell is admitted as a
 * Reading over one RWIL witness; agreement is shared, explicit assertion and
 * denial are retained as a bilattice top, and same-polarity divergence requires
 * admission.
 */
import { carrierFrom } from "@red-cup-engineering/relating";
import { canonical } from "@red-cup-engineering/json-services-section";
import { charge, chargeValue, joinKnowledge, negate } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { mark } from "@red-cup-engineering/sign-cell/utterance";
import { valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { cell } from "@red-cup-engineering/relating/ledger/cells";
import { cohere } from "@red-cup-engineering/relating/ledger/reading";

import { ACTIVITYSTREAMS_CONTEXT, federateActivities, mergeActivities } from "./writing/activitypub/index.mjs";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 };

const federatedCellSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cell", "value", "witness"],
  properties: {
    cell: { type: "string", minLength: 1 },
    value: {},
    witness: { type: "string", minLength: 1 },
    polarity: { enum: ["assert", "deny"] },
  },
};

export const federateGradedSourceSchema = {
  $id: "organizing/federate-graded/source",
  title: "FederateGradedSource",
  description:
    "One protocol source admitted into contradiction-aware federation. Its cells are protocol-local readings of RWIL witnesses.",
  type: "object",
  additionalProperties: false,
  required: ["id", "protocol", "collection"],
  properties: {
    id: { type: "string", minLength: 1 },
    protocol: { type: "string", minLength: 1 },
    collection: { type: "array", items: federatedCellSchema },
  },
};

export const federateGradedSourceCarrier = carrierFrom(federateGradedSourceSchema);

const sourceStatementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["source", "protocol", "cell", "value", "polarity", "witness"],
  properties: {
    source: { type: "string", minLength: 1 },
    protocol: { type: "string", minLength: 1 },
    cell: { type: "string", minLength: 1 },
    value: {},
    polarity: { enum: ["assert", "deny"] },
    witness: { type: "string", minLength: 1 },
  },
};

const sharedCellSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cell", "value", "witnesses", "statements"],
  properties: {
    cell: { type: "string", minLength: 1 },
    value: {},
    witnesses: { type: "array", items: { type: "string", minLength: 1 } },
    statements: { type: "array", items: sourceStatementSchema },
  },
};

const contestedCellSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cell", "standing", "topCharge", "truthWitnesses", "falsityWitnesses", "statements"],
  properties: {
    cell: { type: "string", minLength: 1 },
    standing: { const: "stable" },
    topCharge: {},
    truthWitnesses: { type: "array", items: { type: "string", minLength: 1 } },
    falsityWitnesses: { type: "array", items: { type: "string", minLength: 1 } },
    statements: { type: "array", items: sourceStatementSchema },
  },
};

const requiresAdmissionCellSchema = {
  type: "object", additionalProperties: false, required: ["cell", "reason", "statements"],
  properties: { cell: { type: "string", minLength: 1 }, reason: { enum: ["multiple-asserted-values", "multiple-denied-values", "multiple-values-with-mixed-polarity"] }, statements: { type: "array", items: sourceStatementSchema } },
};

export const gradedConsensusSchema = {
  $id: "organizing/federate-graded/consensus",
  title: "GradedConsensus",
  description:
    "Witness-preserving federation: shared evidence, explicit-polarity contradictions, and semantic variance requiring admission.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "sources",
    "federation",
    "mergedActivities",
    "coherence",
    "shared",
    "contested",
    "requiresAdmission",
    "decomposition",
  ],
  properties: {
    kind: { const: "organizing.federate-graded.consensus" },
    sources: { type: "array", items: { type: "string", minLength: 1 } },
    federation: {},
    mergedActivities: nonnegativeIntegerSchema,
    coherence: { type: "array", items: {} },
    shared: { type: "array", items: sharedCellSchema },
    contested: { type: "array", items: contestedCellSchema },
    requiresAdmission: { type: "array", items: requiresAdmissionCellSchema },
    decomposition: {
      type: "object",
      additionalProperties: false,
      required: ["exhaustive", "disjoint", "shared", "contested", "requiresAdmission"],
      properties: {
        exhaustive: { type: "boolean" },
        disjoint: { type: "boolean" },
        shared: nonnegativeIntegerSchema,
        contested: nonnegativeIntegerSchema,
        requiresAdmission: nonnegativeIntegerSchema,
      },
    },
  },
};

export const gradedConsensusCarrier = carrierFrom(gradedConsensusSchema);

function polarityOf(cellInput) {
  return cellInput.polarity ?? "assert";
}

function statementOf(source, cellInput) {
  return Object.freeze({
    source: source.id,
    protocol: source.protocol,
    cell: cellInput.cell,
    value: cellInput.value,
    polarity: polarityOf(cellInput),
    witness: cellInput.witness,
  });
}

function witnessOf(statement) {
  return cell(
    Object.freeze({
      bridge: "organizing.federate-graded",
      source: statement.source,
    protocol: statement.protocol,
    cell: statement.cell,
  }),
  Object.freeze({
      polarity: statement.polarity,
    }),
    statement.value,
    Object.freeze({
      source: statement.source,
      protocol: statement.protocol,
      witness: statement.witness,
    }),
  );
}

function sourceWireFromWitness(row) {
  if (row.e === null || typeof row.e !== "object" || Array.isArray(row.e)) throw new TypeError("federateGraded reading: witness entity is not a record");
  if (row.a === null || typeof row.a !== "object" || Array.isArray(row.a)) throw new TypeError("federateGraded reading: witness attribute is not a record");
  if (row.t === null || typeof row.t !== "object" || Array.isArray(row.t)) throw new TypeError("federateGraded reading: witness time is not a record");
  const entity = row.e;
  const attribute = row.a;
  const time = row.t;
  const id = entity.source;
  const protocol = entity.protocol;
  const cellName = entity.cell;
  const polarity = attribute.polarity;
  const witness = time.witness;
  if (typeof id !== "string" || typeof protocol !== "string" || typeof cellName !== "string") throw new TypeError("federateGraded reading: malformed entity");
  if (polarity !== "assert" && polarity !== "deny") throw new TypeError("federateGraded reading: malformed polarity");
  if (typeof witness !== "string") throw new TypeError("federateGraded reading: malformed witness");
  return Object.freeze({
    id,
    protocol,
    collection: Object.freeze([Object.freeze({
      cell: cellName,
      value: row.v,
      polarity,
      witness,
    })]),
  });
}

function sourceReading(source) {
  return Object.freeze({
    id: `organizing.federate-graded.${source.protocol}.${source.id}`,
    toWire: sourceWireFromWitness,
    fromWire: (wire) => {
      if (wire.collection.length !== 1) throw new TypeError("federateGraded reading: expected one witnessed cell");
      return witnessOf(statementOf({ id: wire.id, protocol: wire.protocol, collection: wire.collection }, wire.collection[0]));
    },
  });
}

const canonicalReading = Object.freeze({
  id: "organizing.federate-graded.canonical",
  toWire: sourceWireFromWitness,
  fromWire: (wire) => {
    if (wire.collection.length !== 1) throw new TypeError("federateGraded canonical reading: expected one witnessed cell");
    return witnessOf(statementOf({ id: wire.id, protocol: wire.protocol, collection: wire.collection }, wire.collection[0]));
  },
});

function activityOf(statement) {
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: `urn:organizing:federate-graded:${encodeURIComponent(statement.source)}:${encodeURIComponent(statement.witness)}`,
    type: statement.polarity === "deny" ? "Undo" : "Create",
    actor: statement.cell,
    object: {
      type: "Note",
      content: `${statement.cell}|${canonical(statement.value)}`,
    },
  });
}

function stanceKey(statement) {
  return `${statement.polarity}:${canonical(statement.value)}`;
}

function statementOrder(left, right) {
  return left.cell.localeCompare(right.cell)
    || stanceKey(left).localeCompare(stanceKey(right))
    || left.source.localeCompare(right.source)
    || left.witness.localeCompare(right.witness);
}

function affirmed(witnesses) {
  return charge(chargeValue("potential"), [witnesses.map((witness) => mark(witness)), []]);
}

function heldTop(statements)

 {
  const truthWitnesses = statements
    .filter((statement) => statement.polarity === "assert")
    .map((statement) => statement.witness)
    .sort();
  const falsityWitnesses = statements
    .filter((statement) => statement.polarity === "deny")
    .map((statement) => statement.witness)
    .sort();
  const topCharge = joinKnowledge(affirmed(truthWitnesses), negate(affirmed(falsityWitnesses)));
  const standing = valueOf(topCharge).name;
  if (standing !== "stable") throw new TypeError(`federateGraded: expected held top, got ${standing}`);
  return Object.freeze({
    topCharge,
    truthWitnesses: Object.freeze(truthWitnesses),
    falsityWitnesses: Object.freeze(falsityWitnesses),
  });
}

function hasExplicitContradiction(statements) {
  return statements.some((statement) => statement.polarity === "assert")
    && statements.some((statement) => statement.polarity === "deny");
}

function hasSemanticVariance(statements) {
  return new Set(statements.map((statement) => canonical(statement.value))).size > 1;
}

function decompositionIsDisjoint(shared, contested, requiresAdmission) {
  const all = [...shared.map((entry) => entry.cell), ...contested.map((entry) => entry.cell), ...requiresAdmission.map((entry) => entry.cell)];
  return new Set(all).size === all.length;
}

/**
 * federateGraded - hold cross-source contradiction and expose admission needs.
 *
 * Agreement enters `shared`; opposite-polarity evidence for the same value enters `contested` as a
 * bilattice top with both witness sides retained; distinct values
 * enter `requiresAdmission` with their original evidence intact.
 */
export function federateGraded(
  sources,
) {
  if (sources.length === 0) throw new TypeError("federateGraded: at least one source is required");
  const admitted = sources.map((source) => federateGradedSourceCarrier.assert(source, `source ${source.id}`));
  const statements = admitted.flatMap((source) => source.collection.map((entry) => statementOf(source, entry)));
  if (statements.length === 0) throw new TypeError("federateGraded: source collections are empty");

  const coherence = admitted.flatMap((source) => {
    const reading = sourceReading(source);
    return source.collection.map((entry) => cohere(reading, canonicalReading, witnessOf(statementOf(source, entry))));
  });

  const activitiesBySource = admitted.map((source) => source.collection.map((entry) => activityOf(statementOf(source, entry))));
  const federation = federateActivities(activitiesBySource);
  const merged = mergeActivities(...activitiesBySource);

  const byCell = new Map();
  for (const statement of statements) byCell.set(statement.cell, [...(byCell.get(statement.cell) ?? []), statement]);
  const shared = []; const contested = []; const requiresAdmission = [];
  for (const [cellName, group] of [...byCell.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const sorted = Object.freeze([...group].sort(statementOrder));
    if (hasSemanticVariance(sorted)) {
      const mixedPolarity = new Set(sorted.map((statement) => statement.polarity)).size > 1;
      const reason = mixedPolarity ? "multiple-values-with-mixed-polarity"
        : sorted[0].polarity === "assert" ? "multiple-asserted-values" : "multiple-denied-values";
      requiresAdmission.push(Object.freeze({ cell: cellName, reason, statements: sorted }));
    } else if (hasExplicitContradiction(sorted)) {
      const top = heldTop(sorted);
      contested.push(Object.freeze({ cell: cellName, standing: "stable", topCharge: top.topCharge, truthWitnesses: top.truthWitnesses, falsityWitnesses: top.falsityWitnesses, statements: sorted }));
    } else {
      shared.push(Object.freeze({ cell: cellName, value: sorted[0].value, witnesses: Object.freeze(sorted.map((statement) => statement.witness).sort()), statements: sorted }));
    }
  }
  const decomposition = { exhaustive: shared.length + contested.length + requiresAdmission.length === byCell.size, disjoint: decompositionIsDisjoint(shared, contested, requiresAdmission), shared: shared.length, contested: contested.length, requiresAdmission: requiresAdmission.length };
  return gradedConsensusCarrier.assert(Object.freeze({
    kind: "organizing.federate-graded.consensus",
    sources: Object.freeze(admitted.map((source) => source.id)),
    federation,
    mergedActivities: merged.totalItems,
    coherence: Object.freeze(coherence),
    shared: Object.freeze(shared),
    contested: Object.freeze(contested),
    requiresAdmission: Object.freeze(requiresAdmission),
    decomposition,
  }), "graded consensus");
}
