import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { agentEventChronicleSchema } from "../../../../lib/codecs/json/otlp-schema.mts";
import { agentReadinessReportSchema } from "../../../../presentation/readiness.mts";
import { agentStatusReadoutContract } from "../../../../claims/schema.mts";
import type { ContractValue } from "../../../../lib/contracts/index.mts";
import type { AgentEventChronicle } from "../../../../lib/codecs/json/otlp.mts";
import type { AgentReadinessReport } from "../../../../presentation/index.mts";

const jsonValueSchema = {};
const stringSequenceSchema = { type: "array", items: { type: "string", minLength: 1 } } as const;

export const codexSessionTranscriptReadRequestSchema = {
  $id: "metroplat/services/codex-session/transcript-read-request",
  title: "CodexSessionTranscriptReadRequest",
  description: "A filesystem-bounded request to read one Codex session transcript host mark.",
  type: "object",
  required: ["kind", "root", "relative"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.codex-session.transcript-read-request" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
} as const;

export type CodexSessionTranscriptReadRequest = FromJsonSchema<typeof codexSessionTranscriptReadRequestSchema>;
export const codexSessionTranscriptReadRequestContract = schemaFrom(codexSessionTranscriptReadRequestSchema);

export const codexSessionStatusReadRequestSchema = {
  $id: "metroplat/services/codex-session/status-settlement-request",
  title: "CodexSessionStatusReadRequest",
  description: "A filesystem-bounded request to read one Codex session transcript host mark through continuation into agent status-settlement material.",
  type: "object",
  required: ["kind", "root", "relative"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.codex-session.status-settlement-request" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    readiness: agentReadinessReportSchema,
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
} as const;

export type CodexSessionStatusReadRequest = FromJsonSchema<typeof codexSessionStatusReadRequestSchema>;
export const codexSessionStatusReadRequestContract = schemaFrom(codexSessionStatusReadRequestSchema);

export const codexSessionTranscriptReadSchema = {
  $id: "metroplat/services/codex-session/transcript-read",
  title: "CodexSessionTranscriptRead",
  description: "A Codex session transcript read as OpenAI boundary chronicle material with service exposure evidence.",
  type: "object",
  required: ["kind", "operation", "root", "relative", "source", "bytes", "events", "chronicle"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.codex-session.transcript-read" },
    operation: { const: "read-codex-session-transcript" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    bytes: { type: "integer", minimum: 0 },
    events: { type: "integer", minimum: 0 },
    chronicle: agentEventChronicleSchema,
  },
} as const;

export type CodexSessionTranscriptRead = Omit<FromJsonSchema<typeof codexSessionTranscriptReadSchema>, "chronicle"> & {
  readonly chronicle: AgentEventChronicle;
};
export const codexSessionTranscriptReadContract = schemaFrom(codexSessionTranscriptReadSchema);

export const codexSessionTranscriptDiscoveryRequestSchema = {
  $id: "metroplat/services/codex-session/transcript-discovery-request",
  title: "CodexSessionTranscriptDiscoveryRequest",
  description: "A filesystem-bounded request to discover Codex session transcript host marks by date and session id prefix.",
  type: "object",
  required: ["kind", "root"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.codex-session.transcript-discovery-request" },
    root: { type: "string", minLength: 1 },
    sessionIds: stringSequenceSchema,
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    maxDepth: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1 },
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
} as const;

export type CodexSessionTranscriptDiscoveryRequest = FromJsonSchema<typeof codexSessionTranscriptDiscoveryRequestSchema>;
export const codexSessionTranscriptDiscoveryRequestContract = schemaFrom(codexSessionTranscriptDiscoveryRequestSchema);

export const codexSessionTranscriptDiscoveryMatchSchema = {
  type: "object",
  required: ["root", "relative", "source", "sessionId", "bytes", "modifiedAt", "discoveryBytes"],
  additionalProperties: false,
  properties: {
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    bytes: { type: "integer", minimum: 0 },
    modifiedAt: { type: "string", minLength: 1 },
    discoveryBytes: { type: "integer", minimum: 0 },
  },
} as const;

export type CodexSessionTranscriptDiscoveryMatch = FromJsonSchema<typeof codexSessionTranscriptDiscoveryMatchSchema>;

export const codexSessionTranscriptDiscoverySchema = {
  $id: "metroplat/services/codex-session/transcript-discovery",
  title: "CodexSessionTranscriptDiscovery",
  description: "Discovered Codex session transcript host marks exposed as bounded file handles and stat facts.",
  type: "object",
  required: ["kind", "operation", "root", "matches"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.codex-session.transcript-discovery" },
    operation: { const: "discover-codex-session-transcripts" },
    root: { type: "string", minLength: 1 },
    sessionIds: stringSequenceSchema,
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    matches: { type: "array", items: codexSessionTranscriptDiscoveryMatchSchema },
  },
} as const;

export type CodexSessionTranscriptDiscovery = FromJsonSchema<typeof codexSessionTranscriptDiscoverySchema>;
export const codexSessionTranscriptDiscoveryContract = schemaFrom(codexSessionTranscriptDiscoverySchema);

export interface CodexSessionTranscriptReadOptions {
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
  readonly sessionId?: string;
}

export interface CodexSessionWorkClaimsReadOptions extends CodexSessionTranscriptReadOptions {
  readonly claimSessionId?: string;
}

export interface CodexSessionStatusReadOptions extends CodexSessionWorkClaimsReadOptions {
  readonly readiness?: AgentReadinessReport;
}

export interface CodexSessionTranscriptDiscoveryOptions {
  readonly sessionIds?: readonly string[];
  readonly date?: string;
  readonly maxDepth?: number;
  readonly limit?: number;
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
}

export {
  agentStatusReadoutContract,
};
