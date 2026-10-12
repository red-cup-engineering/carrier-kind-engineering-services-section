/**
 * Literal Anthropic Messages API wire types (non-streaming core).
 *
 * The real Anthropic Messages request/response boundary (schema, validating
 * contracts, the codec, the streaming client) is owned by the published
 * `@red-cup-engineering/anthropic-inference-team` package (per the
 * 2026-09-05 ruling that a capability found inside MetroPlat is not
 * MetroPlat's to keep) — consumers reach it directly by that import
 * specifier. This file keeps only the zero-runtime-cost TypeScript types
 * MetroPlat's own inference orchestration (`./inference.mts`,
 * `../inference-client.mts`) needs; they compile away and are not
 * duplicated capability.
 */
import type { JsonRecord, JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

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
