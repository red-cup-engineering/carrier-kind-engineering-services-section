import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { schemaFrom } from "@red-cup-engineering/feltos/schema/contract";
import type { ContractValue } from "../../lib/contracts/index.mts";

const jsonValueSchema = {};

export const agentsDocReadRequestSchema = {
  $id: "metroplat/services/agents-doc/read-request",
  title: "AgentsDocReadRequest",
  description: "A filesystem-bounded request to admit one AGENTS.md/CLAUDE.md host mark as a recorded boundary read.",
  type: "object",
  required: ["kind", "root", "relative"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.agents-doc.read-request" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    at: jsonValueSchema,
    caller: jsonValueSchema,
  },
} as const;

export type AgentsDocReadRequest = FromJsonSchema<typeof agentsDocReadRequestSchema>;
export const agentsDocReadRequestContract = schemaFrom(agentsDocReadRequestSchema);

export const agentsDocReadSchema = {
  $id: "metroplat/services/agents-doc/read",
  title: "AgentsDocRead",
  description: "An AGENTS.md/CLAUDE.md document admitted as raw text with filesystem provenance and service exposure evidence — the read is recorded as a boundary admission, not a silent context-window side effect.",
  type: "object",
  required: ["kind", "operation", "root", "relative", "source", "bytes", "content"],
  additionalProperties: false,
  properties: {
    kind: { const: "metroplat.agents-doc.read" },
    operation: { const: "read-agents-doc" },
    root: { type: "string", minLength: 1 },
    relative: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    bytes: { type: "integer", minimum: 0 },
    content: { type: "string" },
  },
} as const;

export type AgentsDocRead = FromJsonSchema<typeof agentsDocReadSchema>;
export const agentsDocReadContract = schemaFrom(agentsDocReadSchema);

export interface AgentsDocReadOptions {
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
}
