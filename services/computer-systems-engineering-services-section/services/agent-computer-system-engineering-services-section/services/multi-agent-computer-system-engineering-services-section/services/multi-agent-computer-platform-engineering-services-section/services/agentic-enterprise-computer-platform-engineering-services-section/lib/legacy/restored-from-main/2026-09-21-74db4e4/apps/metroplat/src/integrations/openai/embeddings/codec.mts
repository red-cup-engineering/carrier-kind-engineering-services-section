/**
 * integrations/openai/codec/embeddings — the literal `/embeddings` wire codec:
 * admits and emits the exact JSON a real OpenAI-compatible host sends and
 * receives for embedding requests, mirroring
 * `integrations/openai/codec/chat-completions`'s wire-fidelity role.
 *
 * @packageDocumentation
 */
import { parse } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  openaiEmbeddingContract,
  openaiEmbeddingsRequestContract,
  openaiEmbeddingsResponseContract,
  type OpenAIEmbeddingWire,
  type OpenAIEmbeddingsWireRequest,
  type OpenAIEmbeddingsWireResponse,
} from "./schema.mts";

export {
  openaiEmbeddingContract,
  openaiEmbeddingsRequestContract,
  openaiEmbeddingsResponseContract,
} from "./schema.mts";
export type {
  OpenAIEmbeddingWire,
  OpenAIEmbeddingsWireRequest,
  OpenAIEmbeddingsWireResponse,
} from "./schema.mts";

/** Admit a full `/embeddings` request body. */
export function openaiEmbeddingsRequest(input: unknown): OpenAIEmbeddingsWireRequest {
  return openaiEmbeddingsRequestContract.assert(input, "OpenAI embeddings request") as OpenAIEmbeddingsWireRequest;
}

/** Admit one embedding result. */
export function openaiEmbedding(input: unknown): OpenAIEmbeddingWire {
  return openaiEmbeddingContract.assert(input, "OpenAI embedding") as OpenAIEmbeddingWire;
}

/** Admit a full `/embeddings` response body. */
export function openaiEmbeddingsResponse(input: unknown): OpenAIEmbeddingsWireResponse {
  return openaiEmbeddingsResponseContract.assert(input, "OpenAI embeddings response") as OpenAIEmbeddingsWireResponse;
}

/** Serialize an admitted request to its wire JSON text. */
export function embeddingsRequestToWireJson(request: OpenAIEmbeddingsWireRequest): string {
  return JSON.stringify(openaiEmbeddingsRequestContract.assert(request, "OpenAI embeddings request"));
}

/** Parse and admit a request from wire JSON text. */
export function embeddingsRequestOfWireJson(text: string): OpenAIEmbeddingsWireRequest {
  return openaiEmbeddingsRequest(parse(text));
}

/** Parse and admit a response from wire JSON text. */
export function embeddingsResponseOfWireJson(text: string): OpenAIEmbeddingsWireResponse {
  return openaiEmbeddingsResponse(parse(text));
}
