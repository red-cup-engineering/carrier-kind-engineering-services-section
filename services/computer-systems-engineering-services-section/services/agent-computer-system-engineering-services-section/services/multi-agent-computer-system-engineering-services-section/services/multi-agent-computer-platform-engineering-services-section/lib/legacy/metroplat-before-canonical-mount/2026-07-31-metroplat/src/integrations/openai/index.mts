/**
 * integrations/openai — every piece of this package's OpenAI
 * integration, in one directory: `src/` (JSON schemas, codec/protocol
 * logic — no host I/O) and `services/` (the outbound HTTP client). Codex,
 * an OpenAI protocol specialization, lives at the sibling `./codex`
 * directory rather than duplicated here.
 *
 * @packageDocumentation
 */
export * from "./service.mts";
export * from "./inference-client.mts";
export * as schema from "./schemas.mts";
export * as codec from "./codecs.mts";
export * as pricing from "./pricing/index.mts";
export * as codex from "./codex/index.mts";
