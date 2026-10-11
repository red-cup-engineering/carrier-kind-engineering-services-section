import { cacheControl as serializeCacheControl } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cache-control";
import { httpDate } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/date";

function representation(options) {
  const result = {};
  for (const key of [
    "status",
    "headers",
    "trailers",
    "type",
    "body",
    "cacheControl",
    "security",
    "etag",
    "lastModified",
  ]) {
    if (options[key] !== undefined) result[key] = options[key];
  }
  return result;
}

export function jsonRepr(body, options = {}) {
  const normalized = typeof options === "number" ? { status: options } : options;
  const indent = normalized.pretty === true
    ? 2
    : typeof normalized.pretty === "number"
      ? normalized.pretty
      : undefined;
  const serialized = JSON.stringify(body, null, indent) ?? "null";
  return representation({
    ...normalized,
    type: normalized.type ?? "application/json; charset=utf-8",
    body: normalized.newline === false ? serialized : `${serialized}\n`,
  });
}

export function textRepr(body, options = {}) {
  const normalized = typeof options === "number" ? { status: options } : options;
  return representation({
    ...normalized,
    type: normalized.type ?? "text/plain; charset=utf-8",
    body,
  });
}

export function htmlRepr(body, options = {}) {
  const normalized = typeof options === "number" ? { status: options } : options;
  return representation({
    ...normalized,
    type: normalized.type ?? "text/html; charset=utf-8",
    body,
  });
}

export function emptyRepr(status = 204, options = {}) {
  return representation({ ...options, status });
}

function isReadableStreamBody(body) {
  return typeof (body).getReader === "function";
}

async function readableStreamChunks(stream) {
  const chunks = [];
  const reader = stream.getReader();
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Object.freeze(chunks);
}

function decodeBodyChunks(chunks) {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

/** Read a representation body into the text codomain used by served responses. */
export async function reprBodyText(body) {
  if (body === undefined) return "";
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  if (isReadableStreamBody(body)) return decodeBodyChunks(await readableStreamChunks(body));
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return decodeBodyChunks(chunks);
}

/** Project a response representation into the finite served-response shape. */
export async function servedResponseFromRepr(repr, method) {
  const headers = {};
  let typeHeader;
  for (const [key, value] of Object.entries(repr.headers ?? {})) {
    if (key.toLowerCase() === "content-type") {
      if (typeof value === "string") typeHeader = value;
      continue;
    }
    if (typeof value === "string") headers[key] = value;
  }
  if (repr.cacheControl !== undefined) headers["cache-control"] = serializeCacheControl(repr.cacheControl);
  if (repr.etag !== undefined) headers.etag = repr.etag;
  if (repr.lastModified !== undefined) headers["last-modified"] = httpDate(repr.lastModified);
  return Object.freeze({
    status: repr.status ?? 200,
    type: repr.type ?? (typeof typeHeader === "string" ? typeHeader : "application/octet-stream"),
    headers,
    body: method === "HEAD" ? "" : await reprBodyText(repr.body),
  });
}

