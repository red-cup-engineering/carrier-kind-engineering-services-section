import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const readingDescriptorSchema = {
  $id: "metroplat/relational/reading",
  title: "Statement Reading",
  description: "A named isomorphism between one statement row and one wire form.",
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const readingDescriptorContract = schemaFrom(readingDescriptorSchema);

export const logReadingDescriptorSchema = {
  $id: "metroplat/relational/log-reading",
  title: "Statement Log Reading",
  description: "A named isomorphism between an ordered statement log and one wire form.",
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const logReadingDescriptorContract = schemaFrom(logReadingDescriptorSchema);

export const coherenceReportSchema = {
  $id: "metroplat/relational/coherence-report",
  title: "Statement Coherence Report",
  description: "The law report for two statement readings checked against one statement pivot.",
  type: "object",
  required: ["kind", "left", "right", "pivot", "leftIso", "rightIso", "leftToRight", "rightToLeft", "ok"],
  properties: {
    kind: { const: "metroplat.relational.coherence" },
    left: { type: "string", minLength: 1 },
    right: { type: "string", minLength: 1 },
    pivot: {},
    leftIso: { type: "boolean" },
    rightIso: { type: "boolean" },
    leftToRight: { type: "boolean" },
    rightToLeft: { type: "boolean" },
    ok: { type: "boolean" },
  },
  additionalProperties: false,
};

export const coherenceReportContract = schemaFrom(coherenceReportSchema);

export const logCoherenceReportSchema = {
  $id: "metroplat/relational/log-coherence-report",
  title: "Statement Log Coherence Report",
  description: "The law report for two statement-log readings checked against one ordered pivot. The statementLog property is a frozen legacy wire field.",
  type: "object",
  required: ["kind", "left", "right", "statementLog", "leftIso", "rightIso", "leftToRight", "rightToLeft", "ok"],
  properties: {
    kind: { const: "metroplat.relational.log-coherence" },
    left: { type: "string", minLength: 1 },
    right: { type: "string", minLength: 1 },
    statementLog: { type: "array", items: { type: "object" } },
    leftIso: { type: "boolean" },
    rightIso: { type: "boolean" },
    leftToRight: { type: "boolean" },
    rightToLeft: { type: "boolean" },
    ok: { type: "boolean" },
  },
  additionalProperties: false,
};

export const logCoherenceReportContract = schemaFrom(logCoherenceReportSchema);
