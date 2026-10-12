/**
 * integrations/openai/codec/responses — the literal `/responses` wire codec:
 * OpenAI's current primary inference surface, admitted and emitted
 * byte-for-byte. Sibling of `integrations/openai/codec/chat-completions`, same
 * wire-fidelity role, distinct wire shape: flat tool descriptors, an
 * `output[]` array of typed items instead of `choices[].message`, and
 * `input_tokens`/`output_tokens` instead of `prompt_tokens`/`completion_tokens`.
 *
 * Streaming is deliberately not modeled here: NVIDIA NIM and other
 * OpenAI-compatible hosts this package's client actually targets speak
 * `/chat/completions`, not `/responses`; add it the same way
 * chat-completions does (reusing codecs/text/http/sse) if a live `/responses`
 * host is ever wired.
 *
 * @packageDocumentation
 */
import { isJsonRecord, parse } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  openaiResponseFunctionToolContract,
  openaiResponseRequestWireContract,
  openaiResponseWireContract,
  type OpenAIResponseFunctionTool,
  type OpenAIResponseOutputItem,
  type OpenAIResponseWire,
  type OpenAIResponseWireRequest,
  type OpenAIResponseStreamEvent,
} from "./schema.mts";

export {
  openaiResponseFunctionCallOutputContract,
  openaiResponseFunctionCallOutputItemContract,
  openaiResponseFunctionToolContract,
  openaiResponseInputMessageContract,
  openaiResponseInputTextPartContract,
  openaiResponseMessageOutputContract,
  openaiResponseRequestWireContract,
  openaiResponseTextFormatContract,
  openaiResponseUsageContract,
  openaiResponseWireContract,
} from "./schema.mts";
export type {
  OpenAIResponseFunctionCallOutput,
  OpenAIResponseFunctionCallOutputItem,
  OpenAIResponseFunctionTool,
  OpenAIResponseInputItem,
  OpenAIResponseInputMessage,
  OpenAIResponseInputTextPart,
  OpenAIResponseMessageOutput,
  OpenAIResponseOutputItem,
  OpenAIResponseOutputTextPart,
  OpenAIResponseTextFormat,
  OpenAIResponseUsage,
  OpenAIResponseWire,
  OpenAIResponseWireRequest,
  OpenAIResponseStreamEvent,
} from "./schema.mts";
export { openaiResponseTokenUsage } from "./token-usage.mts";

/** Admit a full `/responses` request body. */
export function openaiResponseRequest(input: unknown): OpenAIResponseWireRequest {
  return openaiResponseRequestWireContract.assert(input, "OpenAI responses request") as OpenAIResponseWireRequest;
}

/** Admit one flat `/responses` function-tool descriptor. */
export function openaiResponseFunctionTool(input: unknown): OpenAIResponseFunctionTool {
  return openaiResponseFunctionToolContract.assert(input, "OpenAI responses function tool") as OpenAIResponseFunctionTool;
}

/** Admit a full non-streaming `/responses` response body. */
export function openaiResponse(input: unknown): OpenAIResponseWire {
  return openaiResponseWireContract.assert(input, "OpenAI responses response") as OpenAIResponseWire;
}

export function openaiResponseStreamEvent(input: unknown): OpenAIResponseStreamEvent {
  if (!isJsonRecord(input) || typeof input.type !== "string" || input.type.length === 0) {
    throw new TypeError("OpenAI Responses stream event requires a non-empty type");
  }
  return Object.freeze({ ...input }) as OpenAIResponseStreamEvent;
}

/** Serialize an admitted request to its wire JSON text. */
export function responseRequestToWireJson(request: OpenAIResponseWireRequest): string {
  return JSON.stringify(openaiResponseRequestWireContract.assert(request, "OpenAI responses request"));
}

/** Parse and admit a request from wire JSON text. */
export function responseRequestOfWireJson(text: string): OpenAIResponseWireRequest {
  return openaiResponseRequest(parse(text));
}

/** Parse and admit a response from wire JSON text. */
export function responseOfWireJson(text: string): OpenAIResponseWire {
  return openaiResponse(parse(text));
}

/** The function-call output items of a response, in order (the model's emitted tool calls for this turn). */
export function responseFunctionCalls(response: OpenAIResponseWire): readonly Extract<OpenAIResponseOutputItem, { type: "function_call" }>[] {
  return Object.freeze(response.output.filter((item): item is Extract<OpenAIResponseOutputItem, { type: "function_call" }> => item.type === "function_call"));
}

/** The concatenated output_text of a response's message items (empty string when the turn is tool-calls only). */
export function responseOutputText(response: OpenAIResponseWire): string {
  return response.output
    .filter((item): item is Extract<OpenAIResponseOutputItem, { type: "message" }> => item.type === "message")
    .flatMap((item) => item.content)
    .filter((part) => part.type === "output_text")
    .map((part) => part.text)
    .join("");
}
