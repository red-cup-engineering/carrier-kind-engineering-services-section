
/**
 * HTTP codecs for metroplat's text boundary.
 *
 * This module collects the pure representation vocabulary that an HTTP adapter
 * needs before it touches sockets or framework request objects: header values,
 * `Content-Type`, IMF-fixdate, entity tags and precondition evaluators,
 * byte ranges, `Cache-Control`, bearer authorization, cookies, negotiation,
 * content-coding names, multipart forms, SSE frames, and WebSocket frames.
 *
 * Everything here is representation. Functions receive header values, bytes,
 * frame text, and semantic records. Binding those values to a live request or
 * response belongs to a server adapter.
 *
 * @packageDocumentation
 */

export { firstHeader, joinedHeader, parseDirectiveList, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/header-value.mjs";
export type { HeaderValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/header-value.mjs";

export { parseContentType, serializeContentType } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/content-type.mjs";
export type { ContentType } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/content-type.mjs";

export { httpDate, parseHttpDate } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/date.mjs";

export { etagList, ifMatch, ifModifiedSince, ifNoneMatch, ifRange, ifUnmodifiedSince, strongEtagMatch, weakEtagMatch } from "../../../../../../../../../../../../../../../computer-networking-engineering-services-section/services/http-services-section/src/conditional-request.mjs";

export { byterangesCloseDelimiter, byterangesPartHeader, contentRange, multipartByterangesBody, multipartRangeBoundary, parseRange, parseRanges } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/byte-range.mjs";
export type { ByteRange } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/byte-range.mjs";

export { cacheControl, parseCacheControl } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/cache-control.mjs";
export type { CacheControl } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/cache-control.mjs";

export { linkHeader, parseLinkHeader } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/link.mjs";
export type { LinkValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/link.mjs";

export { bearerChallenge, bearerToken } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/bearer-authentication.mjs";
export type { BearerChallengeOptions } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/bearer-authentication.mjs";

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


export * as negotiation from "./negotiation/index.mts";
export * as cookie from "./cookie/index.mts";
export * as multipart from "./multipart/index.mts";
export * as sse from "./sse/index.mts";
export * as ws from "./ws/index.mts";
