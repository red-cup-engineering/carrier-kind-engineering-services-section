import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const mementoSnapshotSchema = {
  $id: "metroplat/projections/memento/snapshot",
  title: "Journal Memento Snapshot",
  description: "A ledger state projection as of one datetime.",
  type: "object",
  required: ["kind", "datetime", "state"],
  properties: {
    kind: { const: "metroplat.projections.memento.snapshot" },
    datetime: { type: "string", minLength: 1 },
    state: {},
  },
  additionalProperties: false,
};

export const mementoSnapshotContract = schemaFrom(mementoSnapshotSchema);

export const timeMapSchema = {
  $id: "metroplat/projections/memento/timemap",
  title: "Journal Memento TimeMap",
  description: "The available record snapshots for one ledger projection.",
  type: "object",
  required: ["kind", "original", "snapshots"],
  properties: {
    kind: { const: "metroplat.projections.memento.timemap" },
    original: { type: "string" },
    snapshots: {
      type: "array",
      items: {
        type: "object",
        required: ["datetime", "statements"],
        properties: {
          datetime: { type: "string", minLength: 1 },
          statements: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const timeMapContract = schemaFrom(timeMapSchema);
