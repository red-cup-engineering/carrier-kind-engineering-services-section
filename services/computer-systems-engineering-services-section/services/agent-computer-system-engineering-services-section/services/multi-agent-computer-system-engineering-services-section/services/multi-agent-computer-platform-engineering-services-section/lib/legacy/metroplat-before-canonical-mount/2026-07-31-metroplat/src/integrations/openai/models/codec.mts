/**
 * integrations/openai/codec/models — the literal `/models` and `/models/{id}`
 * wire codec: admits and emits the exact JSON a real OpenAI-compatible host
 * sends for model listings, mirroring
 * `integrations/openai/codec/chat-completions`'s wire-fidelity role.
 *
 * @packageDocumentation
 */
import { parse } from "../../../lib/codecs/json/core.mts";
import {
  openaiModelWireContract,
  openaiModelsListResponseContract,
  type OpenAIModelWire,
  type OpenAIModelsListWireResponse,
} from "./schema.mts";

export {
  openaiModelWireContract,
  openaiModelsListResponseContract,
} from "./schema.mts";
export type {
  OpenAIModelWire,
  OpenAIModelsListWireResponse,
} from "./schema.mts";

/** Admit one `/models/{id}` model listing. */
export function openaiModelWire(input: unknown): OpenAIModelWire {
  return openaiModelWireContract.assert(input, "OpenAI model") as OpenAIModelWire;
}

/** Admit a full `/models` list response body. */
export function openaiModelsListResponse(input: unknown): OpenAIModelsListWireResponse {
  return openaiModelsListResponseContract.assert(input, "OpenAI models list response") as OpenAIModelsListWireResponse;
}

/** Parse and admit one model listing from wire JSON text. */
export function modelWireOfWireJson(text: string): OpenAIModelWire {
  return openaiModelWire(parse(text));
}

/** Parse and admit a `/models` list response from wire JSON text. */
export function modelsListResponseOfWireJson(text: string): OpenAIModelsListWireResponse {
  return openaiModelsListResponse(parse(text));
}
