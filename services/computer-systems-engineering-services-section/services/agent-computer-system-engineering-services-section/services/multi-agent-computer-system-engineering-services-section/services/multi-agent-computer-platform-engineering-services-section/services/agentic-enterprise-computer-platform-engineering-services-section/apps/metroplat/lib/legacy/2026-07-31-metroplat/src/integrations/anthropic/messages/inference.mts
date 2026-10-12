/** Pure Anthropic Messages reading of provider-neutral inference material. */
import { isJsonRecord, requireJsonValue, type JsonRecord, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { inferenceCall, inferenceMessage, inferenceResult, inferenceTool, inferenceToolMove, type InferenceCall, type InferenceMessage, type InferenceResult } from "../../../../../../../src/agents/inference/model.mts";
import { inferenceStreamMove, type InferenceStreamMove } from "../../../../../../../src/agents/inference/source.mts";
import { anthropicMessageRequest, anthropicMessageResponse } from "./codec.mts";
import type { AnthropicContentBlock, AnthropicMessageInput, AnthropicMessageRequest, AnthropicMessageResponse, AnthropicMessageStreamEvent, AnthropicTextBlock } from "./schema.mts";

export interface AnthropicMessageCallContext { readonly request: string; readonly subject: string; readonly observedAt: string; readonly caller?: JsonRecord; readonly causes?: readonly string[]; }

export interface AnthropicMessageStreamAccumulator {
  readonly push: (event: AnthropicMessageStreamEvent) => void;
  readonly read: () => AnthropicMessageResponse;
}

type MutableBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; inputText: string; initialInput: JsonValue };

function record(value: JsonValue | undefined): JsonRecord | undefined {
  return isJsonRecord(value) ? value : undefined;
}

/** Fold stream events with memory proportional to the resulting message. */
export function anthropicMessageStreamAccumulator(): AnthropicMessageStreamAccumulator {
  let id: string | undefined;
  let model: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationInputTokens = 0;
  let cacheReadInputTokens = 0;
  let stopReason: AnthropicMessageResponse["stop_reason"] = null;
  let stopSequence: string | null = null;
  const blocks = new Map<number, MutableBlock>();
  const push = (event: AnthropicMessageStreamEvent): void => {
    if (event.type === "message_start") {
      const message = record(event.message);
      const usage = record(message?.usage);
      if (typeof message?.id === "string") id = message.id;
      if (typeof message?.model === "string") model = message.model;
      if (typeof usage?.input_tokens === "number") inputTokens = usage.input_tokens;
      if (typeof usage?.output_tokens === "number") outputTokens = usage.output_tokens;
      if (typeof usage?.cache_creation_input_tokens === "number") cacheCreationInputTokens = usage.cache_creation_input_tokens;
      if (typeof usage?.cache_read_input_tokens === "number") cacheReadInputTokens = usage.cache_read_input_tokens;
      return;
    }
    if (event.type === "content_block_start" && typeof event.index === "number") {
      const block = record(event.content_block);
      if (block?.type === "text") blocks.set(event.index, { type: "text", text: typeof block.text === "string" ? block.text : "" });
      if (block?.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string") {
        blocks.set(event.index, { type: "tool_use", id: block.id, name: block.name, inputText: "", initialInput: requireJsonValue(block.input ?? {}, "Anthropic streamed tool input") });
      }
      return;
    }
    if (event.type === "content_block_delta" && typeof event.index === "number") {
      const delta = record(event.delta);
      const block = blocks.get(event.index);
      if (delta?.type === "text_delta" && typeof delta.text === "string" && block?.type === "text") block.text += delta.text;
      if (delta?.type === "input_json_delta" && typeof delta.partial_json === "string" && block?.type === "tool_use") block.inputText += delta.partial_json;
      return;
    }
    if (event.type === "message_delta") {
      const delta = record(event.delta);
      const usage = record(event.usage);
      if (typeof delta?.stop_reason === "string" || delta?.stop_reason === null) stopReason = delta.stop_reason as AnthropicMessageResponse["stop_reason"];
      if (typeof delta?.stop_sequence === "string" || delta?.stop_sequence === null) stopSequence = delta.stop_sequence as string | null;
      if (typeof usage?.output_tokens === "number") outputTokens = usage.output_tokens;
    }
  };
  const read = (): AnthropicMessageResponse => {
    if (id === undefined || model === undefined) throw new TypeError("Anthropic stream has no message_start identity");
    const content = [...blocks.entries()].sort(([left], [right]) => left - right).map(([, block]): AnthropicContentBlock => {
      if (block.type === "text") return Object.freeze({ type: "text" as const, text: block.text });
      let input = block.initialInput;
      if (block.inputText.length > 0) {
        try { input = requireJsonValue(JSON.parse(block.inputText), "Anthropic streamed tool input"); }
        catch { input = block.inputText; }
      }
      return Object.freeze({ type: "tool_use" as const, id: block.id, name: block.name, input });
    });
    return anthropicMessageResponse({
      id,
      type: "message",
      role: "assistant",
      content: Object.freeze(content),
      model,
      stop_reason: stopReason,
      stop_sequence: stopSequence,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        ...(cacheCreationInputTokens === 0 ? {} : { cache_creation_input_tokens: cacheCreationInputTokens }),
        ...(cacheReadInputTokens === 0 ? {} : { cache_read_input_tokens: cacheReadInputTokens }),
      },
    });
  };
  return Object.freeze({ push, read });
}

function stopFromAnthropic(value: unknown): string {
  if (value === "tool_use") return "tool-moves";
  if (value === "max_tokens" || value === "model_context_window_exceeded") return "length";
  if (value === "refusal") return "refused";
  if (value === "pause_turn") return "incomplete";
  return "completed";
}

/** Project one Anthropic event into canonical moves; ping and future unknown events are ignored. */
export function inferenceMovesFromAnthropicEvent(event: AnthropicMessageStreamEvent, firstSequence: number, observedAt: string): readonly InferenceStreamMove[] {
  let sequence = firstSequence;
  const moves: InferenceStreamMove[] = [];
  if (event.type === "message_start") {
    const message = record(event.message);
    if (typeof message?.model === "string") moves.push(inferenceStreamMove({ type: "inference.response-start", channel: "response", sequence: sequence++, body: { model: message.model }, observedAt }));
  }
  if (event.type === "content_block_start" && typeof event.index === "number") {
    const block = record(event.content_block);
    if (block?.type === "text" && typeof block.text === "string" && block.text.length > 0) moves.push(inferenceStreamMove({ type: "inference.text-delta", channel: `block:${event.index}`, sequence: sequence++, body: { choice: 0, text: block.text }, observedAt }));
    if (block?.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string") moves.push(inferenceStreamMove({ type: "inference.tool-call-delta", channel: `block:${event.index}`, sequence: sequence++, body: { choice: 0, index: event.index, request: block.id, name: block.name }, observedAt }));
  }
  if (event.type === "content_block_delta" && typeof event.index === "number") {
    const delta = record(event.delta);
    if (delta?.type === "text_delta" && typeof delta.text === "string" && delta.text.length > 0) moves.push(inferenceStreamMove({ type: "inference.text-delta", channel: `block:${event.index}`, sequence: sequence++, body: { choice: 0, text: delta.text }, observedAt }));
    if (delta?.type === "input_json_delta" && typeof delta.partial_json === "string") moves.push(inferenceStreamMove({ type: "inference.tool-call-delta", channel: `block:${event.index}`, sequence: sequence++, body: { choice: 0, index: event.index, arguments: delta.partial_json }, observedAt }));
  }
  if (event.type === "message_delta") {
    const delta = record(event.delta);
    if (delta?.stop_reason !== undefined && delta.stop_reason !== null) moves.push(inferenceStreamMove({ type: "inference.finish", channel: "response", sequence: sequence++, body: { choice: 0, stop: stopFromAnthropic(delta.stop_reason) }, observedAt }));
  }
  return Object.freeze(moves);
}

function textOf(blocks: readonly AnthropicContentBlock[]): string {
  return blocks.filter((block): block is AnthropicTextBlock => block.type === "text" && typeof block.text === "string").map((block) => block.text).join("");
}
function messagesOf(message: AnthropicMessageInput): readonly InferenceMessage[] {
  if (typeof message.content === "string") return [inferenceMessage({ role: message.role, content: message.content })];
  const tools = message.content.filter((block) => block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string").map((block) => inferenceToolMove({ request: String(block.id), name: String(block.name), input: requireJsonValue(block.input ?? {}, "Anthropic tool input") }));
  const results = message.content.filter((block) => block.type === "tool_result" && typeof block.tool_use_id === "string").map((block) => inferenceMessage({ role: "tool", toolRequest: String(block.tool_use_id), content: typeof block.content === "string" ? block.content : Array.isArray(block.content) ? textOf(block.content) : "" }));
  const text = textOf(message.content);
  return Object.freeze([...results, ...(text.length === 0 && tools.length === 0 ? [] : [inferenceMessage({ role: message.role, content: tools.length > 0 ? null : text, ...(tools.length === 0 ? {} : { toolMoves: tools }) })])]);
}

export function inferenceCallFromAnthropicMessage(input: AnthropicMessageRequest, context: AnthropicMessageCallContext): InferenceCall {
  const wire = anthropicMessageRequest(input);
  const system = typeof wire.system === "string" ? wire.system : wire.system === undefined ? undefined : textOf(wire.system);
  return inferenceCall({
    request: context.request, subject: context.subject, model: wire.model,
    messages: Object.freeze([...(system === undefined ? [] : [inferenceMessage({ role: "system", content: system })]), ...wire.messages.flatMap(messagesOf)]),
    tools: (wire.tools ?? []).map((tool) => inferenceTool({ name: tool.name, ...(tool.description === undefined ? {} : { description: tool.description }), inputSchema: tool.input_schema, ...(tool.strict === undefined ? {} : { strict: tool.strict }) })),
    generation: { maxOutputTokens: wire.max_tokens, ...(wire.temperature === undefined ? {} : { temperature: wire.temperature }), ...(wire.top_p === undefined ? {} : { topP: wire.top_p }), ...(wire.stop_sequences === undefined ? {} : { stopSequences: wire.stop_sequences }) },
    extensions: Object.freeze({ "anthropic.messages.request": requireJsonValue(wire, "Anthropic Messages request") }),
    caller: context.caller ?? Object.freeze({ protocol: "anthropic.messages" }), observedAt: context.observedAt, causes: context.causes ?? [],
  });
}

function blockMessages(message: InferenceMessage): AnthropicMessageInput {
  if (message.role === "tool") return Object.freeze({ role: "user", content: Object.freeze([Object.freeze({ type: "tool_result" as const, tool_use_id: message.toolRequest ?? "unresolved", content: message.content ?? "" })]) });
  const role = message.role === "assistant" ? "assistant" as const : "user" as const;
  const blocks = Object.freeze([
    ...(message.content === null || message.content.length === 0 ? [] : [Object.freeze({ type: "text" as const, text: message.content })]),
    ...(message.toolMoves ?? []).map((move) => Object.freeze({ type: "tool_use" as const, id: move.request, name: move.name, input: move.input })),
  ]);
  return Object.freeze({ role, content: blocks });
}

export function inferenceCallToAnthropicMessage(call: InferenceCall): AnthropicMessageRequest {
  const preserved = call.extensions?.["anthropic.messages.request"];
  if (preserved !== null && typeof preserved === "object" && !Array.isArray(preserved)) return anthropicMessageRequest(preserved);
  const system = call.messages.filter((message) => message.role === "system" || message.role === "developer").map((message) => message.content ?? "").join("\n");
  return anthropicMessageRequest({
    model: call.model, max_tokens: call.generation?.maxOutputTokens ?? 1024,
    messages: call.messages.filter((message) => message.role !== "system" && message.role !== "developer").map(blockMessages),
    ...(system.length === 0 ? {} : { system }),
    ...(call.tools.length === 0 ? {} : { tools: call.tools.map((tool) => Object.freeze({ name: tool.name, ...(tool.description === undefined ? {} : { description: tool.description }), input_schema: tool.inputSchema, ...(tool.strict === undefined ? {} : { strict: tool.strict }) })) }),
    ...(call.generation?.temperature === undefined ? {} : { temperature: call.generation.temperature }), ...(call.generation?.topP === undefined ? {} : { top_p: call.generation.topP }), ...(call.generation?.stopSequences === undefined ? {} : { stop_sequences: call.generation.stopSequences }),
  });
}

export function inferenceResultFromAnthropicMessage(input: AnthropicMessageResponse, call: InferenceCall, observedAt: string, causes: readonly string[] = []): InferenceResult {
  const wire = anthropicMessageResponse(input);
  const moves = wire.content.filter((block) => block.type === "tool_use" && typeof block.id === "string" && typeof block.name === "string").map((block) => inferenceToolMove({ request: String(block.id), name: String(block.name), input: requireJsonValue(block.input ?? {}, "Anthropic tool input") }));
  const text = textOf(wire.content);
  const stop = moves.length > 0 || wire.stop_reason === "tool_use" ? "tool-moves" : wire.stop_reason === "max_tokens" || wire.stop_reason === "model_context_window_exceeded" ? "length" : wire.stop_reason === "refusal" ? "refused" : wire.stop_reason === "pause_turn" ? "incomplete" : "completed";
  return inferenceResult({ call: call.id, model: wire.model, stop, message: inferenceMessage({ role: "assistant", content: moves.length > 0 ? null : text, ...(moves.length === 0 ? {} : { toolMoves: moves }) }), toolMoves: moves,
    usage: { inputTokens: wire.usage.input_tokens, cachedInputTokens: wire.usage.cache_read_input_tokens ?? 0, outputTokens: wire.usage.output_tokens, reasoningOutputTokens: 0, totalTokens: wire.usage.input_tokens + wire.usage.output_tokens, extensions: Object.freeze({ "anthropic.messages.usage": requireJsonValue(wire.usage, "Anthropic usage") }) },
    extensions: Object.freeze({ "anthropic.messages.response": requireJsonValue(wire, "Anthropic response") }), observedAt, causes });
}

export function inferenceResultToAnthropicMessage(result: InferenceResult): AnthropicMessageResponse {
  const preserved = result.extensions?.["anthropic.messages.response"];
  if (preserved !== null && typeof preserved === "object" && !Array.isArray(preserved)) return anthropicMessageResponse(preserved);
  return anthropicMessageResponse({ id: result.id, type: "message", role: "assistant", model: result.model,
    content: Object.freeze([...(result.message?.content === null || result.message?.content === undefined ? [] : [Object.freeze({ type: "text" as const, text: result.message.content })]), ...result.toolMoves.map((move) => Object.freeze({ type: "tool_use" as const, id: move.request, name: move.name, input: move.input }))]),
    stop_reason: result.stop === "tool-moves" ? "tool_use" : result.stop === "length" ? "max_tokens" : result.stop === "refused" ? "refusal" : result.stop === "incomplete" ? "pause_turn" : "end_turn", stop_sequence: null,
    usage: { input_tokens: result.usage?.inputTokens ?? 0, output_tokens: result.usage?.outputTokens ?? 0, ...(result.usage?.cachedInputTokens === undefined ? {} : { cache_read_input_tokens: result.usage.cachedInputTokens }) } });
}
