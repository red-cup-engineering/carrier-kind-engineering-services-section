/**
 * integrations/openai/codec/chat-completions — the literal `/chat/completions`
 * wire codec: admits and emits the exact snake_case JSON a real OpenAI-compatible
 * host (OpenAI itself, NVIDIA NIM, vLLM, …) sends and receives. This is what a
 * live client encodes requests with and decodes responses through; the
 * abstracted camelCase material in `codecs/text/json/openai` stays the
 * package-internal protocol-boundary reading and does not round-trip the wire
 * byte-for-byte.
 *
 * Streaming decode reuses the package SSE codec: a `stream: true` reply is a
 * `text/event-stream` body of `chat.completion.chunk` JSON payloads terminated
 * by a literal `data: [DONE]` frame.
 *
 * @packageDocumentation
 */
import { requireJsonValue, parse, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { parseSseStream, type SseEvent } from "../../http/codec/sse/index.mts";
import {
  openaiChatCompletionContract,
  openaiChatCompletionChunkContract,
  openaiChatCompletionRequestContract,
  openaiChatFunctionToolContract,
  openaiChatMessageContract,
  openaiChatToolCallContract,
  openaiResponseFormatContract,
  openaiUsageWireContract,
  type OpenAIChatWireCompletion,
  type OpenAIChatWireCompletionChunk,
  type OpenAIChatWireCompletionRequest,
  type OpenAIChatWireFunctionTool,
  type OpenAIChatWireMessage,
  type OpenAIChatWireResponseFormat,
  type OpenAIChatWireToolCall,
  type OpenAIChatWireUsage,
} from "./schema.mts";

export {
  openaiChatCompletionContract,
  openaiChatCompletionChunkContract,
  openaiChatCompletionRequestContract,
  openaiChatFunctionToolContract,
  openaiChatMessageContract,
  openaiChatToolCallContract,
  openaiResponseFormatContract,
  openaiUsageWireContract,
} from "./schema.mts";
export type {
  OpenAIChatWireCompletion,
  OpenAIChatWireCompletionChunk,
  OpenAIChatWireCompletionChunkDelta,
  OpenAIChatWireCompletionRequest,
  OpenAIChatWireFunctionTool,
  OpenAIChatWireMessage,
  OpenAIChatWireResponseFormat,
  OpenAIChatWireToolCall,
  OpenAIChatWireUsage,
} from "./schema.mts";

/** Admit one wire message. */
export function openaiChatMessage(input: unknown): OpenAIChatWireMessage {
  return openaiChatMessageContract.assert(input, "OpenAI chat-completions message") as OpenAIChatWireMessage;
}

/** Admit one wire tool call (`function.arguments` stays the raw JSON-encoded string; parse it yourself). */
export function openaiChatToolCall(input: unknown): OpenAIChatWireToolCall {
  return openaiChatToolCallContract.assert(input, "OpenAI chat-completions tool call") as OpenAIChatWireToolCall;
}

/** Parse a tool call's `function.arguments` string as JSON, falling back to the raw string on parse failure. */
export function openaiChatToolCallArguments(call: OpenAIChatWireToolCall): JsonValue {
  try {
    return requireJsonValue(JSON.parse(call.function.arguments), "OpenAI chat-completions tool call arguments");
  } catch {
    return call.function.arguments;
  }
}

/** Admit one wire function-tool descriptor. */
export function openaiChatFunctionTool(input: unknown): OpenAIChatWireFunctionTool {
  return openaiChatFunctionToolContract.assert(input, "OpenAI chat-completions function tool") as OpenAIChatWireFunctionTool;
}


/** Admit a `response_format` field. */
export function openaiResponseFormat(input: unknown): OpenAIChatWireResponseFormat {
  return openaiResponseFormatContract.assert(input, "OpenAI chat-completions response format") as OpenAIChatWireResponseFormat;
}

/** Admit a `usage` object. */
export function openaiUsageWire(input: unknown): OpenAIChatWireUsage {
  return openaiUsageWireContract.assert(input, "OpenAI chat-completions usage") as OpenAIChatWireUsage;
}


/** Admit a full `/chat/completions` request body. */
export function openaiChatCompletionRequest(input: unknown): OpenAIChatWireCompletionRequest {
  return openaiChatCompletionRequestContract.assert(input, "OpenAI chat-completions request") as OpenAIChatWireCompletionRequest;
}

/** Admit a full non-streaming `/chat/completions` response body. */
export function openaiChatCompletion(input: unknown): OpenAIChatWireCompletion {
  return openaiChatCompletionContract.assert(input, "OpenAI chat-completions response") as OpenAIChatWireCompletion;
}

/** Admit one streamed `chat.completion.chunk` payload. */
export function openaiChatCompletionChunk(input: unknown): OpenAIChatWireCompletionChunk {
  return openaiChatCompletionChunkContract.assert(input, "OpenAI chat-completions chunk") as OpenAIChatWireCompletionChunk;
}

/** Serialize an admitted request to its wire JSON text. */
export function chatCompletionRequestToWireJson(request: OpenAIChatWireCompletionRequest): string {
  return JSON.stringify(openaiChatCompletionRequestContract.assert(request, "OpenAI chat-completions request"));
}

/** Parse and admit a request from wire JSON text. */
export function chatCompletionRequestOfWireJson(text: string): OpenAIChatWireCompletionRequest {
  return openaiChatCompletionRequest(parse(text));
}

/** Parse and admit a non-streaming response from wire JSON text. */
export function chatCompletionOfWireJson(text: string): OpenAIChatWireCompletion {
  return openaiChatCompletion(parse(text));
}

/** Decode a `text/event-stream` body into its admitted `chat.completion.chunk` payloads,
 *  dropping the terminal literal `data: [DONE]` frame and any comment/keep-alive frames. */
export function chatCompletionStreamOfSse(text: string): readonly OpenAIChatWireCompletionChunk[] {
  return Object.freeze(
    parseSseStream(text)
      .filter((event: SseEvent) => event.data.trim().length > 0 && event.data.trim() !== "[DONE]")
      .map((event: SseEvent) => openaiChatCompletionChunk(JSON.parse(event.data))),
  );
}

/** Fold a chunk stream into one completion: concatenates `delta.content` per choice index,
 *  accumulates `delta.tool_calls` by their stream index (arguments concatenate as text, since a
 *  tool call's JSON argument string itself streams token-by-token), takes id/model/created from
 *  the first chunk, the last non-null finish_reason per choice, and the last carried `usage`
 *  (present only when the request set `stream_options.include_usage`). */
export interface ChatCompletionChunkAccumulator {
  readonly push: (chunk: OpenAIChatWireCompletionChunk) => void;
  readonly read: () => OpenAIChatWireCompletion;
}

/** Bounded-overhead fold: memory grows with the resulting message, not the number of chunks. */
export function chatCompletionChunkAccumulator(): ChatCompletionChunkAccumulator {
  let first: OpenAIChatWireCompletionChunk | undefined;
  const choices = new Map<number, {
    content: string | null;
    toolCalls: Map<number, { id?: string; name?: string; arguments: string; extraContent?: Record<string, unknown> }>;
    finishReason: OpenAIChatWireCompletion["choices"][number]["finish_reason"];
  }>();
  let usage: OpenAIChatWireUsage | undefined;
  const push = (chunk: OpenAIChatWireCompletionChunk): void => {
    first ??= chunk;
    if (chunk.usage !== undefined && chunk.usage !== null) usage = chunk.usage;
    for (const choice of chunk.choices) {
      const entry = choices.get(choice.index) ?? { content: null, toolCalls: new Map(), finishReason: null };
      if (choice.delta.content !== undefined && choice.delta.content !== null) {
        entry.content = (entry.content ?? "") + choice.delta.content;
      }
      for (const call of choice.delta.tool_calls ?? []) {
        const existing = entry.toolCalls.get(call.index) ?? { arguments: "" };
        entry.toolCalls.set(call.index, {
          id: call.id ?? existing.id,
          name: call.function?.name ?? existing.name,
          arguments: existing.arguments + (call.function?.arguments ?? ""),
          extraContent: call.extra_content ?? existing.extraContent,
        });
      }
      if (choice.finish_reason !== undefined && choice.finish_reason !== null) entry.finishReason = choice.finish_reason;
      choices.set(choice.index, entry);
    }
  };
  const read = (): OpenAIChatWireCompletion => {
    if (first === undefined) throw new TypeError("chatCompletionChunkAccumulator: expected at least one chunk");
    return openaiChatCompletion({
      id: first.id,
      object: "chat.completion" as const,
      created: first.created,
      model: first.model,
      choices: [...choices.entries()]
        .sort(([left], [right]) => left - right)
        .map(([index, entry]) => {
          const toolCalls = [...entry.toolCalls.values()]
            .filter((call): call is { id: string; name: string; arguments: string; extraContent?: Record<string, unknown> } => call.id !== undefined && call.name !== undefined)
            .map((call) => ({
              id: call.id,
              type: "function" as const,
              function: { name: call.name, arguments: call.arguments },
              ...(call.extraContent === undefined ? {} : { extra_content: call.extraContent }),
            }));
          return {
            index,
            message: {
              role: "assistant" as const,
              content: toolCalls.length > 0 ? null : entry.content,
              ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
            },
            finish_reason: entry.finishReason,
          };
        }),
      ...(usage === undefined ? {} : { usage }),
    });
  };
  return Object.freeze({ push, read });
}

export function foldChatCompletionChunks(chunks: readonly OpenAIChatWireCompletionChunk[]): OpenAIChatWireCompletion {
  const accumulator = chatCompletionChunkAccumulator();
  for (const chunk of chunks) accumulator.push(chunk);
  return accumulator.read();
}
