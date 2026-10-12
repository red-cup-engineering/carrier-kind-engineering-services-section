import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";

export const timeAnchorSchema = {
  $id: "metroplat/codecs/text/json/time-anchor/anchor",
  title: "Statement Time Anchor",
  description: "A structural OpenTimestamps/RFC-3161-style time attestation over one statement hash.",
  type: "object",
  required: ["kind", "standard", "calendar", "authority", "statementHash", "statementCoordinate", "attestedTime", "commitment", "digest"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.time-anchor.anchor" },
    standard: { const: "opentimestamps/rfc3161.structural" },
    calendar: { type: "string", minLength: 1 },
    authority: { type: "string", minLength: 1 },
    statementHash: { type: "string", minLength: 1 },
    statementCoordinate: {},
    attestedTime: { type: "string", minLength: 1 },
    commitment: { type: "string", minLength: 1 },
    digest: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const timeAnchorContract = schemaFrom(timeAnchorSchema);

export const timestampedStatementSchema = {
  $id: "metroplat/codecs/text/json/time-anchor/timestamped-witness",
  title: "Timestamped Statement",
  description: "One EAVT statement paired with its external time anchor. The $id and kind retain frozen legacy wire names.",
  type: "object",
  required: ["kind", "statement", "anchor"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.time-anchor.timestamped-witness" },
    statement: {},
    anchor: { $ref: "anchor" },
  },
  additionalProperties: false,
} as const;

export const timestampedStatementContract = schemaFrom(timestampedStatementSchema, [timeAnchorContract]);

export const timeAnchorVerificationSchema = {
  $id: "metroplat/codecs/text/json/time-anchor/verification",
  title: "Statement Time Anchor Verification",
  description: "The fifth Datom slot for an externally anchored T judgement.",
  type: "object",
  required: ["kind", "standard", "anchor", "verified"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.time-anchor.verification" },
    standard: { const: "opentimestamps/rfc3161.structural" },
    anchor: { $ref: "anchor" },
    verified: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const timeAnchorVerificationContract = schemaFrom(timeAnchorVerificationSchema, [timeAnchorContract]);
