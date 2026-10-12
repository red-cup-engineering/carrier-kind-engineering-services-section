import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";

const jsonValueSchema = {};

export const openaiCodexExecEventSchema = {
  $id: "metroplat/codecs/text/json/openai/codex/exec-event",
  title: "OpenAICodexExecEvent",
  description: "One Codex exec JSON event admitted under the OpenAI/Codex protocol boundary.",
  type: "object",
  required: ["kind", "type", "raw"],
  properties: {
    kind: { const: "openai.codex-exec-event" },
    type: { type: "string", minLength: 1 },
    raw: jsonValueSchema,
  },
  additionalProperties: false,
} as const;

export const openaiCodexSessionJsonlRequestSchema = {
  $id: "metroplat/codecs/text/json/openai/codex/session-jsonl-request",
  title: "OpenAICodexSessionJsonlRequest",
  description: "Codex session JSONL transcript content admitted for OpenAI/Codex boundary chronicle reading.",
  type: "object",
  required: ["kind", "content"],
  properties: {
    kind: { const: "openai.codex-session-jsonl-request" },
    content: { type: "string" },
    sessionId: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    caller: jsonValueSchema,
  },
  additionalProperties: false,
} as const;

// The session-work-item/session-work-read records that used to live here
// moved to metroplat/executing/chronicle-work-item and
// metroplat/executing/chronicle-work-read (src/presentation/schema.mts):
// the read is chronicle-generic (Codex and Claude Code both present the same
// recorded-boundary shape), not a Codex wire form.

export const codexPluginAffordanceSchema = {
  $id: "metroplat/codecs/text/json/capability/authority/codex-plugin-affordance",
  title: "CodexPluginAffordance",
  description: "A Codex plugin manifest read as finite environment affordance material.",
  type: "object",
  required: ["kind", "plugin", "manifest", "affordances", "enabled"],
  properties: {
    kind: { const: "authority.codex-plugin-affordance" },
    plugin: { type: "string", minLength: 1 },
    manifest: { type: "string", minLength: 1 },
    affordances: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    enabled: { type: "boolean" },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export type OpenAICodexSessionJsonlRequest = FromJsonSchema<typeof openaiCodexSessionJsonlRequestSchema>;

export const openaiCodexExecEventContract = schemaFrom(openaiCodexExecEventSchema);
export const openaiCodexSessionJsonlRequestContract = schemaFrom(openaiCodexSessionJsonlRequestSchema);
export const codexPluginAffordanceContract = schemaFrom(codexPluginAffordanceSchema);
