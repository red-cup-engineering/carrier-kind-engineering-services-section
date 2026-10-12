
/**
 * HTTP codecs for metroplat's text boundary.
 *
 * This module collects the pure representation vocabulary that an HTTP adapter
 * needs before it touches sockets or framework request objects: header values,
 * `Content-Type`, IMF-fixdate, entity tags and precondition evaluators,
 * byte ranges, `Cache-Control`, bearer authorization, cookies, negotiation,
 * content-coding names, multipart forms, SSE frames, WebSocket frames, and MCP
 * JSON-RPC envelopes.
 *
 * Everything here is representation. Functions receive header values, bytes,
 * frame text, and semantic records. Binding those values to a live request or
 * response belongs to a server adapter.
 *
 * @packageDocumentation
 */

export {
  firstHeader,
  joinedHeader,
  parseDirectiveSequence,
  quoteHeaderValue,
  splitHeaderParameters,
  unquoteHeaderValue,
} from "./header-value.mts";
export type { HeaderValue } from "./header-value.mts";

export { parseContentType, serializeContentType } from "./content-type.mts";
export type { ContentType } from "./content-type.mts";

export { httpDate, parseHttpDate } from "./date.mts";

export {
  etagList,
  ifMatch,
  ifModifiedSince,
  ifNoneMatch,
  ifRange,
  ifUnmodifiedSince,
  strongEtagMatch,
  weakEtagMatch,
} from "./conditional.mts";

export {
  byterangesCloseDelimiter,
  byterangesPartHeader,
  contentRange,
  multipartByterangesBody,
  multipartRangeBoundary,
  parseRange,
  parseRanges,
} from "./range.mts";
export type { ByteRange } from "./range.mts";

export { cacheControl, parseCacheControl } from "./cache-control.mts";
export type { CacheControl } from "./cache-control.mts";

export { linkHeader, parseLinkHeader } from "./link.mts";
export type { LinkValue } from "./link.mts";

export { bearerChallenge, bearerToken } from "./auth.mts";
export type { BearerChallengeOptions } from "./auth.mts";

export {
  negotiateType,
  parseAccept,
  negotiateEncoding,
  parseAcceptEncoding,
  parseContentEncoding,
  isCoding,
  negotiateLanguage,
  parseAcceptLanguage,
  extensionType,
  isCompressible,
  mediaTypeCorner,
  negotiateRepresentation,
  representationFits,
} from "./negotiation/index.mts";
export type {
  AcceptEntry,
  Coding,
  AcceptLanguageEntry,
} from "./negotiation/index.mts";

export {
  parseMultipartForm,
  serializeMultipartForm,
} from "./multipart/index.mts";
export type {
  MultipartForm,
  MultipartPart,
  MultipartPartInit,
} from "./multipart/index.mts";

export {
  acceptKey,
  encodeFrame,
  FrameDecoder,
} from "./ws/index.mts";
export type { WsFrame } from "./ws/index.mts";

export {
  assertCookieName,
  isCookieName,
  parseCookieHeader,
  parseSetCookie,
  serializeCookieHeader,
  serializeSetCookie,
  signCookieValue,
  unsignCookieValue,
} from "./cookie/index.mts";
export type {
  CookieOptions,
  CookiePriority,
  SameSite,
  SetCookie,
} from "./cookie/index.mts";

export {
  parseSseStream,
  sseCommentFrame,
  sseEventFrame,
  sseFrame,
  isEventStream,
  sseHeaders,
} from "./sse/index.mts";
export type { SseEvent } from "./sse/index.mts";

export {
  DEFAULT_MCP_PROTOCOL_VERSION,
  MCP_JSON_TYPE,
  mcpInitializeResult,
  mcpOk,
  mcpRpcError,
  mcpReachability,
  mcpToolCatalogTransport,
  mcpToolStructuredResult,
  mcpToolTextError,
  mcpToolTextResult,
  mcpToolsListResult,
  projectMcpToolCatalog,
} from "../../mcp/index.mts";
export type {
  Json,
  JsonObject,
  JsonRpcEnvelope,
  JsonRpcFailure,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcSuccess,
  McpCapabilities,
  McpCatalogToolBinding,
  McpCatalogToolDefinition,
  McpInitializeResult,
  McpReachability,
  McpServerInfo,
  McpTool,
  McpToolAnnotations,
  McpToolCallResult,
  McpToolCatalogProjection,
  McpToolCatalogTransport,
  McpToolsCapability,
  McpToolsListResult,
} from "../../mcp/index.mts";

export * as negotiation from "./negotiation/index.mts";
export * as cookie from "./cookie/index.mts";
export * as multipart from "./multipart/index.mts";
export * as sse from "./sse/index.mts";
export * as ws from "./ws/index.mts";
export * as mcp from "../../mcp/index.mts";
