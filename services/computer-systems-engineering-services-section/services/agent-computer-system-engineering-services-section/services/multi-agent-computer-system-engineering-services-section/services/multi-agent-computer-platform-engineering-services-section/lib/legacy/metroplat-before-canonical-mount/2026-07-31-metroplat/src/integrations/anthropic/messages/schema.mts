/** Literal Anthropic Messages API wire contracts (non-streaming core). */
import { schemaFrom } from "../../../lib/schema/contract.mts";
import type { JsonRecord, JsonValue } from "../../../lib/codecs/json/core.mts";

export type AnthropicTextBlock = Readonly<{ type: "text"; text: string; [key: string]: JsonValue }>;
export type AnthropicToolUseBlock = Readonly<{ type: "tool_use"; id: string; name: string; input: JsonValue; [key: string]: JsonValue }>;
export type AnthropicToolResultBlock = Readonly<{ type: "tool_result"; tool_use_id: string; content?: string | readonly AnthropicTextBlock[]; is_error?: boolean; [key: string]: JsonValue }>;
export type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock | AnthropicToolResultBlock | Readonly<{ type: string; [key: string]: JsonValue }>;
export interface AnthropicMessageInput { readonly role: "user" | "assistant"; readonly content: string | readonly AnthropicContentBlock[]; }
export interface AnthropicTool { readonly name: string; readonly description?: string; readonly input_schema: JsonRecord; readonly strict?: boolean; }
export interface AnthropicMessageRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly messages: readonly AnthropicMessageInput[];
  readonly system?: string | readonly AnthropicTextBlock[];
  readonly tools?: readonly AnthropicTool[];
  readonly temperature?: number;
  readonly top_p?: number;
  readonly stop_sequences?: readonly string[];
  readonly stream?: boolean;
}
export interface AnthropicUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
}
export interface AnthropicMessageResponse {
  readonly id: string;
  readonly type: "message";
  readonly role: "assistant";
  readonly content: readonly AnthropicContentBlock[];
  readonly model: string;
  readonly stop_reason?: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "pause_turn" | "refusal" | "model_context_window_exceeded" | null;
  readonly stop_sequence?: string | null;
  readonly usage: AnthropicUsage;
}

/** Forward-compatible SSE event; per-event interpretation remains in the pure inference reading. */
export type AnthropicMessageStreamEvent = JsonRecord & Readonly<{ type: string }>;

const contentBlockSchema = { type: "object", required: ["type"], properties: { type: { type: "string", minLength: 1 } }, additionalProperties: true } as const;
const messageSchema = { type: "object", required: ["role", "content"], properties: { role: { enum: ["user", "assistant"] }, content: { anyOf: [{ type: "string" }, { type: "array", items: contentBlockSchema }] } }, additionalProperties: true } as const;
const toolSchema = { type: "object", required: ["name", "input_schema"], properties: { name: { type: "string", minLength: 1 }, description: { type: "string" }, input_schema: { type: "object", additionalProperties: true }, strict: { type: "boolean" } }, additionalProperties: true } as const;
const usageSchema = { type: "object", required: ["input_tokens", "output_tokens"], properties: { input_tokens: { type: "integer", minimum: 0 }, output_tokens: { type: "integer", minimum: 0 }, cache_creation_input_tokens: { type: "integer", minimum: 0 }, cache_read_input_tokens: { type: "integer", minimum: 0 } }, additionalProperties: true } as const;

export const anthropicMessageRequestSchema = {
  $id: "metroplat/codecs/text/json/anthropic/messages/request",
  type: "object",
  required: ["model", "max_tokens", "messages"],
  properties: {
    model: { type: "string", minLength: 1 }, max_tokens: { type: "integer", minimum: 1 },
    messages: { type: "array", items: messageSchema },
    system: { anyOf: [{ type: "string" }, { type: "array", items: contentBlockSchema }] },
    tools: { type: "array", items: toolSchema }, temperature: { type: "number" }, top_p: { type: "number" },
    stop_sequences: { type: "array", items: { type: "string" } }, stream: { type: "boolean" },
  },
  additionalProperties: true,
} as const;

export const anthropicMessageResponseSchema = {
  $id: "metroplat/codecs/text/json/anthropic/messages/response",
  type: "object",
  required: ["id", "type", "role", "content", "model", "usage"],
  properties: {
    id: { type: "string", minLength: 1 }, type: { const: "message" }, role: { const: "assistant" },
    content: { type: "array", items: contentBlockSchema }, model: { type: "string", minLength: 1 },
    stop_reason: { anyOf: [{ enum: ["end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal", "model_context_window_exceeded"] }, { type: "null" }] },
    stop_sequence: { type: ["string", "null"] }, usage: usageSchema,
  },
  additionalProperties: true,
} as const;

export const anthropicMessageRequestContract = schemaFrom(anthropicMessageRequestSchema);
export const anthropicMessageResponseContract = schemaFrom(anthropicMessageResponseSchema);
