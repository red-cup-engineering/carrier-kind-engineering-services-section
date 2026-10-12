
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { eavtTupleSchema } from "@red-cup-engineering/computer-networking-engineering-services-section/otlp-schema";

import { dataArtifactSchemaContractSchema } from "../../data-artifact-schema.mjs";

const nonemptyStringSchema = { type: "string", minLength: 1 };
const nonnegativeIntegerSchema = { type: "integer", minimum: 0 };

export const journalOperationKindSchema = {
  enum: [
    "write-statement-rows",
    "read-statement-rows",
    "project-feed-state",
    "project-memento-state",
    "project-log-memento-timemap",
    "project-log-credential",
    "project-log-x402-receipt",
    "project-log-accountability-report",
    "project-log-raft-safety-judgment",
    "project-content-jupyter-record",
    "project-record-jupyter-notebook",
    "commit-record",
    "project-log-record",
    "project-record-content",
  ],
};

export const journalObservationSchema = {
  $id: "metroplat/projections/boundaries/witness-store/observation",
  title: "JournalObservation",
  description: "Common contract exposure carried by every filesystem-journal move. The $id and kind are frozen legacy wire values.",
  type: "object",
  required: ["kind", "operation", "feed"],
  properties: {
    kind: { const: "metroplat.witness-store-observation" },
    operation: journalOperationKindSchema,
    feed: nonemptyStringSchema,
  },
  additionalProperties: true,
};

export const journalObservationContract = schemaFrom(journalObservationSchema);

const journalObservationBaseProperties = {
  kind: { const: "metroplat.witness-store-observation" },
  feed: nonemptyStringSchema,
};

const journalObservationBaseRequired = ["kind", "operation", "feed"];

export const statementWriteResultSchema = {
  $id: "metroplat/projections/boundaries/witness-store/statement-write-result",
  title: "EventWriteResult",
  description: "Receipt for admitting normalized EAVT rows as content-addressed statements under data/journals. The $id is a frozen legacy wire address.",
  type: "object",
  required: [...journalObservationBaseRequired, "artifact", "rows", "appended"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "write-statement-rows" },
    artifact: dataArtifactSchemaContractSchema,
    rows: nonnegativeIntegerSchema,
    appended: nonnegativeIntegerSchema,
    statements: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "path", "written"],
        properties: {
          id: nonemptyStringSchema,
          path: nonemptyStringSchema,
          written: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

const malformedStatementLineSchema = {
  type: "object",
  required: ["line", "text", "reason"],
  properties: {
    line: nonnegativeIntegerSchema,
    text: { type: "string" },
    reason: nonemptyStringSchema,
  },
  additionalProperties: false,
};

export const statementLogReadSchema = {
  $id: "metroplat/projections/boundaries/witness-store/statement-row-read",
  title: "StatementLogRead",
  description: "Receipt for reading normalized EAVT statement rows from content-addressed statements under data/journals. The $id is a frozen legacy wire address.",
  type: "object",
  required: [...journalObservationBaseRequired, "artifact", "rows"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "read-statement-rows" },
    artifact: dataArtifactSchemaContractSchema,
    rows: { type: "array", items: eavtTupleSchema },
    /** Lines that failed to parse as JSON, carried as evidence instead of
     *  silently dropped or crashing the whole feed read. Absent when every
     *  line parsed (the common case), never present-but-empty. */
    malformed: { type: "array", items: malformedStatementLineSchema, minItems: 1 },
    /** Present exactly when the whole-file read refused a log over the stated
     *  size bound: names the byte size, the bound, and the streaming
     *  alternative. `rows` is `[]` in this case — an honest refusal, never a
     *  runtime string-length crash and never a silent truncation. */
    obstruction: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const feedStateProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/feed-state-projection",
  title: "FeedStateProjection",
  description: "Receipt for projecting one statement feed into a data/state artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-feed-state" },
    sourceArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
  },
  additionalProperties: false,
};

export const mementoStateProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/memento-state-projection",
  title: "MementoStateProjection",
  description: "Receipt for projecting a selected Memento prefix into a data/state artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "requestedDatetime", "selectedDatetime", "sourceArtifact", "artifact"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-memento-state" },
    requestedDatetime: nonemptyStringSchema,
    selectedDatetime: nonemptyStringSchema,
    sourceArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
  },
  additionalProperties: false,
};

export const mementoTimeMapProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/memento-timemap-projection",
  title: "MementoTimeMapProjection",
  description: "Receipt for projecting one statement feed into a Memento TimeMap data/content artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "original", "sourceArtifact", "artifact"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-log-memento-timemap" },
    original: { type: "string" },
    sourceArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
  },
  additionalProperties: false,
};

const logContentProjectionProperties = {
  sourceArtifact: dataArtifactSchemaContractSchema,
  artifact: dataArtifactSchemaContractSchema,
};

export const logCredentialProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/log-credential-projection",
  title: "LogCredentialProjection",
  description: "Receipt for projecting a durable statement log into a Verifiable Credential content artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-log-credential" },
    ...logContentProjectionProperties,
  },
  additionalProperties: false,
};

export const logX402ReceiptProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/log-x402-receipt-projection",
  title: "LogX402ReceiptProjection",
  description: "Receipt for projecting a durable statement log into an x402 receipt content artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-log-x402-receipt" },
    ...logContentProjectionProperties,
  },
  additionalProperties: false,
};

export const logAccountabilityReportProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/log-accountability-report-projection",
  title: "LogAccountabilityReportProjection",
  description: "Receipt for projecting a durable statement log into an accountable transaction report content artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-log-accountability-report" },
    ...logContentProjectionProperties,
  },
  additionalProperties: false,
};

export const logRaftSafetyJudgmentProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/log-raft-safety-judgment-projection",
  title: "LogRaftSafetyJudgmentProjection",
  description: "Receipt for projecting a durable statement log into a Raft safety judgment content artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-log-raft-safety-judgment" },
    ...logContentProjectionProperties,
  },
  additionalProperties: false,
};

export const jupyterRecordProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/jupyter-record-projection",
  title: "JupyterRecordProjection",
  description: "Receipt for projecting a Jupyter notebook content artifact into data/records material.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact", "records"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-content-jupyter-record" },
    sourceArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
    records: nonnegativeIntegerSchema,
  },
  additionalProperties: false,
};

export const jupyterNotebookProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/jupyter-notebook-projection",
  title: "JupyterNotebookProjection",
  description: "Receipt for projecting Jupyter record-tier material back into a notebook content artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact", "cells"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-record-jupyter-notebook" },
    sourceArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
    cells: nonnegativeIntegerSchema,
  },
  additionalProperties: false,
};

export const recordCommitResultSchema = {
  $id: "metroplat/projections/boundaries/witness-store/record-commit-result",
  title: "RecordCommitResult",
  description: "Receipt for committing settled datoms to data/records without modifying the source data/journals artifact.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact", "sourceRows", "datoms"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "commit-record" },
    sourceArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
    sourceRows: nonnegativeIntegerSchema,
    datoms: nonnegativeIntegerSchema,
  },
  additionalProperties: false,
};

export const recordProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/record-settlement-projection",
  title: "RecordArtifactProjection",
  description: "Receipt for the idempotent, re-derivable state->record leg: settled datoms recomputed fresh from the log and the current state view without modifying the source log.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "stateArtifact", "artifact", "datoms"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-log-record" },
    sourceArtifact: dataArtifactSchemaContractSchema,
    stateArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
    datoms: nonnegativeIntegerSchema,
  },
  additionalProperties: false,
};

export const contentProjectionSchema = {
  $id: "metroplat/projections/boundaries/witness-store/content-settlement-projection",
  title: "ContentArtifactProjection",
  description: "Receipt for the idempotent, re-derivable record->content leg: a manifest of per-entity content documents recomputed fresh from the record tier's settled datoms.",
  type: "object",
  required: [...journalObservationBaseRequired, "sourceArtifact", "artifact", "documents"],
  properties: {
    ...journalObservationBaseProperties,
    operation: { const: "project-record-content" },
    sourceArtifact: dataArtifactSchemaContractSchema,
    artifact: dataArtifactSchemaContractSchema,
    documents: nonnegativeIntegerSchema,
  },
  additionalProperties: false,
};

export const statementWriteResultContract = schemaFrom(statementWriteResultSchema);

export const statementLogReadContract = schemaFrom(statementLogReadSchema);

export const feedStateProjectionContract = schemaFrom(feedStateProjectionSchema);

export const mementoStateProjectionContract = schemaFrom(mementoStateProjectionSchema);

export const mementoTimeMapProjectionContract = schemaFrom(mementoTimeMapProjectionSchema);

export const logCredentialProjectionContract = schemaFrom(logCredentialProjectionSchema);

export const logX402ReceiptProjectionContract = schemaFrom(logX402ReceiptProjectionSchema);

export const logAccountabilityReportProjectionContract = schemaFrom(logAccountabilityReportProjectionSchema);

export const logRaftSafetyJudgmentProjectionContract = schemaFrom(logRaftSafetyJudgmentProjectionSchema);

export const jupyterRecordProjectionContract = schemaFrom(jupyterRecordProjectionSchema);

export const jupyterNotebookProjectionContract = schemaFrom(jupyterNotebookProjectionSchema);

export const recordCommitResultContract = schemaFrom(recordCommitResultSchema);

export const recordProjectionContract = schemaFrom(recordProjectionSchema);

export const contentProjectionContract = schemaFrom(contentProjectionSchema);

