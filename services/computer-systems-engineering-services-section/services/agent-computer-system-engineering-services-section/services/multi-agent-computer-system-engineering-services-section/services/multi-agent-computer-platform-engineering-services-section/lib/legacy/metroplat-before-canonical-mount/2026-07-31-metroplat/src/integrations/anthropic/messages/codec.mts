/** Pure literal JSON codec for Anthropic Messages. */
import { isJsonRecord, parse } from "../../../lib/codecs/json/core.mts";
import { anthropicMessageRequestContract, anthropicMessageResponseContract, type AnthropicMessageRequest, type AnthropicMessageResponse, type AnthropicMessageStreamEvent } from "./schema.mts";

export * from "./schema.mts";

export function anthropicMessageRequest(input: unknown): AnthropicMessageRequest {
  return anthropicMessageRequestContract.assert(input, "Anthropic Messages request") as unknown as AnthropicMessageRequest;
}
export function anthropicMessageResponse(input: unknown): AnthropicMessageResponse {
  return anthropicMessageResponseContract.assert(input, "Anthropic Messages response") as unknown as AnthropicMessageResponse;
}
export function anthropicMessageStreamEvent(input: unknown): AnthropicMessageStreamEvent {
  if (!isJsonRecord(input) || typeof input.type !== "string" || input.type.length === 0) {
    throw new TypeError("Anthropic Messages stream event requires a non-empty type");
  }
  return Object.freeze({ ...input }) as AnthropicMessageStreamEvent;
}
export function anthropicMessageRequestToWireJson(input: AnthropicMessageRequest): string { return JSON.stringify(anthropicMessageRequest(input)); }
export function anthropicMessageRequestOfWireJson(text: string): AnthropicMessageRequest { return anthropicMessageRequest(parse(text)); }
export function anthropicMessageResponseOfWireJson(text: string): AnthropicMessageResponse { return anthropicMessageResponse(parse(text)); }
