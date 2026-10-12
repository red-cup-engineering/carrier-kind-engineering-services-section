
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { gluedClaimSessionsSchema } from "@red-cup-engineering/relating/running/session-schema";
import { calmClassificationSchema } from "../../../claims/calm.mjs";

const jsonValueSchema = {};
const stringSequenceSchema = { type: "array", items: { type: "string", minLength: 1 } };

export const claudeSessionFleetReadRequestSchema = {
  $id: "metroplat/services/claude-session/fleet-settlement-request",
  title: "ClaudeSessionFleetReadRequest",
  description: "A filesystem-bounded request to read many Claude Code session transcripts under one root and glue their claim-session bundles into one shared fleet settlement.",
  type: "object",
  required: ["kind", "root"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.claude-session.fleet-settlement-request" },
    root: { type: "string", minLength: 1 },
    sessionIds: stringSequenceSchema,
    maxDepth: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1 },
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
};

export const claudeSessionFleetReadRequestContract = schemaFrom(claudeSessionFleetReadRequestSchema);

const claudeSessionFleetSessionSchema = {
  type: "object",
  required: ["sessionId", "relative", "bytes", "events", "statusline", "goals", "obligations", "claims", "regime"],
  additionalProperties: false,
  properties: {
    sessionId: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    bytes: { type: "integer", minimum: 0 },
    events: { type: "integer", minimum: 0 },
    statusline: { type: "string", minLength: 1 },
    goals: { type: "integer", minimum: 0 },
    obligations: { type: "integer", minimum: 0 },
    claims: { type: "integer", minimum: 0 },
    regime: { enum: ["scott", "transfinite"] },
    latestGoal: { type: "string", minLength: 1 },
  },
};

export const claudeSessionFleetReadoutSchema = {
  $id: "metroplat/services/claude-session/fleet-settlement",
  title: "ClaudeSessionFleetReadout",
  description: "The fleet settlement: per-session claim-session digests plus the glued cross-session judgement, whose stable cells are the standing contradictions between sessions, and the CALM reading of that judgement (coordination-free iff monotone).",
  type: "object",
  required: ["kind", "operation", "root", "sessions", "glued", "calm", "evidence"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.claude-session.fleet-settlement" },
    operation: { const: "read-claude-session-fleet-settlement" },
    root: { type: "string", minLength: 1 },
    sessions: { type: "array", items: claudeSessionFleetSessionSchema },
    glued: gluedClaimSessionsSchema,
    calm: calmClassificationSchema,
    evidence: stringSequenceSchema,
  },
};

export const claudeSessionFleetReadoutContract = schemaFrom(claudeSessionFleetReadoutSchema);
