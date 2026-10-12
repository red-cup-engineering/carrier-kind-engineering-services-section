import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import { schemaFrom } from "@red-cup-engineering/feltos/schema/contract";

export * from "../../../anthropic/claude-session/schema.mts";
export * from "../../../agents-doc/schema.mts";
export * from "../../../openai/codex/codex-session/schema.mts";
export {
  vaultWebsitePublishRequestSchema,
  vaultWebsitePublishReceiptSchema,
  vaultWebsitePublishRequestContract,
  vaultWebsitePublishReceiptContract,
} from "@red-cup-engineering/vault-note-schema/vault-website-publish";
export type {
  VaultWebsitePublishRequest,
  VaultWebsitePublishReceipt,
} from "@red-cup-engineering/vault-note-schema";
export * as httpServiceSchemas from "../../../http/policy-schema.mts";

const idSchema = { type: "string", minLength: 1 } as const;
const nonemptyStringSequenceSchema = { type: "array", minItems: 1, items: idSchema } as const;
const jsonValueSchema = {};

export const serviceLifecycleEventSchema = {
  $id: "metroplat/services/lifecycle-event",
  title: "ServiceLifecycleEvent",
  description: "A uniform service-side event for a concrete Node process, protocol, stream, socket, listener, or child-process lifecycle transition.",
  type: "object",
  required: ["kind", "service", "boundary", "event", "at", "ok", "evidence"],
  properties: {
    kind: { const: "metroplat.services.lifecycle-event" },
    service: idSchema,
    boundary: { enum: ["child-process", "http-listener", "mcp-stdio", "process-main", "stream", "websocket-upgrade"] },
    event: { enum: ["backpressure", "close", "drain", "error", "exit", "listening", "ready", "spawn", "start", "stream-close", "stream-open", "upgrade"] },
    at: { type: "string", minLength: 1 },
    ok: { type: "boolean" },
    code: { type: "integer" },
    signal: { type: ["string", "null"] },
    detail: jsonValueSchema,
    evidence: nonemptyStringSequenceSchema,
  },
  additionalProperties: false,
} as const;

export const serviceLifecycleRecordSchema = {
  $id: "metroplat/services/lifecycle-record",
  title: "ServiceLifecycleRecord",
  description: "A finite service lifecycle record collecting schema-checked events for one service boundary.",
  type: "object",
  required: ["kind", "service", "boundary", "events", "ok"],
  properties: {
    kind: { const: "metroplat.services.lifecycle-record" },
    service: idSchema,
    boundary: { enum: ["child-process", "http-listener", "mcp-stdio", "process-main", "stream", "websocket-upgrade"] },
    events: { type: "array", minItems: 1, items: serviceLifecycleEventSchema },
    ok: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export type ServiceLifecycleEvent = FromJsonSchema<typeof serviceLifecycleEventSchema>;
export type ServiceLifecycleRecord = FromJsonSchema<typeof serviceLifecycleRecordSchema>;

export const serviceLifecycleEventContract = schemaFrom(serviceLifecycleEventSchema);
export const serviceLifecycleRecordContract = schemaFrom(serviceLifecycleRecordSchema);
