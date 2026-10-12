import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import {
  agentReadinessReportSchema,
} from "../../../presentation/readiness.mts";
import type { ContractValue } from "../../../lib/contracts/index.mts";
import type { ClaudeCodeTranscriptRecord } from "../codec.mts";
import type { AgentReadinessReport } from "../../../presentation/index.mts";

const jsonValueSchema = {};
const stringSequenceSchema = { type: "array", items: { type: "string", minLength: 1 } } as const;

export const claudeSessionTranscriptReadRequestSchema = {
  $id: "metroplat/services/claude-session/transcript-read-request",
  title: "ClaudeSessionTranscriptReadRequest",
  description: "A filesystem-bounded request to admit one Claude Code transcript host mark.",
  type: "object",
  required: ["kind", "root", "relative"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.claude-session.transcript-read-request" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
} as const;

export type ClaudeSessionTranscriptReadRequest = FromJsonSchema<typeof claudeSessionTranscriptReadRequestSchema>;
export const claudeSessionTranscriptReadRequestContract = schemaFrom(claudeSessionTranscriptReadRequestSchema);

export const claudeSessionStatusReadRequestSchema = {
  $id: "metroplat/services/claude-session/status-settlement-request",
  title: "ClaudeSessionStatusReadRequest",
  description: "A filesystem-bounded request to read one Claude Code session transcript host mark through continuation into agent status-settlement material.",
  type: "object",
  required: ["kind", "root", "relative"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.claude-session.status-settlement-request" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    readiness: agentReadinessReportSchema,
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
} as const;

export type ClaudeSessionStatusReadRequest = FromJsonSchema<typeof claudeSessionStatusReadRequestSchema>;
export const claudeSessionStatusReadRequestContract = schemaFrom(claudeSessionStatusReadRequestSchema);

export const claudeSessionTranscriptDiscoveryRequestSchema = {
  $id: "metroplat/services/claude-session/transcript-discovery-request",
  title: "ClaudeSessionTranscriptDiscoveryRequest",
  description: "A filesystem-bounded request to discover Claude Code session transcript host marks by session id prefix.",
  type: "object",
  required: ["kind", "root"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.claude-session.transcript-discovery-request" },
    root: { type: "string", minLength: 1 },
    sessionIds: stringSequenceSchema,
    maxDepth: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1 },
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
} as const;

export type ClaudeSessionTranscriptDiscoveryRequest = FromJsonSchema<typeof claudeSessionTranscriptDiscoveryRequestSchema>;
export const claudeSessionTranscriptDiscoveryRequestContract = schemaFrom(claudeSessionTranscriptDiscoveryRequestSchema);

export const claudeSessionTranscriptDiscoveryMatchSchema = {
  type: "object",
  required: ["root", "relative", "source", "sessionId", "bytes", "events"],
  additionalProperties: false,
  properties: {
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    bytes: { type: "integer", minimum: 0 },
    events: { type: "integer", minimum: 0 },
  },
} as const;

export type ClaudeSessionTranscriptDiscoveryMatch = FromJsonSchema<typeof claudeSessionTranscriptDiscoveryMatchSchema>;

export const claudeSessionTranscriptDiscoverySchema = {
  $id: "metroplat/services/claude-session/transcript-discovery",
  title: "ClaudeSessionTranscriptDiscovery",
  description: "Discovered Claude Code session transcript host marks admitted enough to expose session id, path, and event count.",
  type: "object",
  required: ["kind", "operation", "root", "matches"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.claude-session.transcript-discovery" },
    operation: { const: "discover-claude-session-transcripts" },
    root: { type: "string", minLength: 1 },
    sessionIds: stringSequenceSchema,
    matches: { type: "array", items: claudeSessionTranscriptDiscoveryMatchSchema },
  },
} as const;

export type ClaudeSessionTranscriptDiscovery = FromJsonSchema<typeof claudeSessionTranscriptDiscoverySchema>;
export const claudeSessionTranscriptDiscoveryContract = schemaFrom(claudeSessionTranscriptDiscoverySchema);

export const claudeSessionTranscriptRecordSchema = {
  type: "object",
  required: ["kind", "source", "relative", "parentDirectory", "parentDirectoryName", "recordIndex", "payload"],
  additionalProperties: false,
  properties: {
    kind: { const: "anthropic.claude-code.transcript-record" },
    source: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    parentDirectory: { type: "string", minLength: 1 },
    parentDirectoryName: { type: "string", minLength: 1 },
    recordIndex: { type: "integer", minimum: 0 },
    type: { type: "string", minLength: 1 },
    role: { type: "string", minLength: 1 },
    payload: jsonValueSchema,
  },
} as const;

export type ClaudeSessionTranscriptRecord = Omit<FromJsonSchema<typeof claudeSessionTranscriptRecordSchema>, "payload"> & {
  readonly payload: ClaudeCodeTranscriptRecord["payload"];
};

export const claudeSessionTranscriptReadSchema = {
  $id: "metroplat/services/claude-session/transcript-read",
  title: "ClaudeSessionTranscriptRead",
  description: "A Claude Code transcript admitted as opaque JSON records with filesystem provenance and service exposure evidence.",
  type: "object",
  required: ["kind", "operation", "root", "relative", "source", "parentDirectory", "parentDirectoryName", "bytes", "recordCount", "records"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.claude-session.transcript-read" },
    operation: { const: "read-claude-session-transcript" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    parentDirectory: { type: "string", minLength: 1 },
    parentDirectoryName: { type: "string", minLength: 1 },
    bytes: { type: "integer", minimum: 0 },
    recordCount: { type: "integer", minimum: 0 },
    records: { type: "array", items: claudeSessionTranscriptRecordSchema },
  },
} as const;

export type ClaudeSessionTranscriptRead = Omit<FromJsonSchema<typeof claudeSessionTranscriptReadSchema>, "records"> & {
  readonly records: readonly ClaudeSessionTranscriptRecord[];
};
export const claudeSessionTranscriptReadContract = schemaFrom(claudeSessionTranscriptReadSchema);

export interface ClaudeSessionTranscriptReadOptions {
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
  readonly sessionId?: string;
}

export interface ClaudeSessionWorkClaimsReadOptions extends ClaudeSessionTranscriptReadOptions {
  readonly claimSessionId?: string;
}

export interface ClaudeSessionStatusReadOptions extends ClaudeSessionWorkClaimsReadOptions {
  readonly readiness?: AgentReadinessReport;
}

export interface ClaudeSessionTranscriptDiscoveryOptions {
  readonly sessionIds?: readonly string[];
  readonly maxDepth?: number;
  readonly limit?: number;
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
}
