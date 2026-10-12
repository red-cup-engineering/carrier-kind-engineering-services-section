

/**
 * @packageDocumentation
 * services/http/app: the small HTTP app object language below the action
 * apex — representation objects, resource descriptors, body readers,
 * `.well-known` resources, and an SSE writer over relating's own frame
 * codecs. Owns none of listener lifecycle, deployment policy, durable
 * sessions, middleware, a web framework contract, or a projected-event hub
 * (that multi-subscriber concern lives above relating, in the servers layer).
 */

import { parseContentType } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-type";
import { parseMultipartForm } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/multipart-form-data";
import { decompress, parseContentEncoding } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-coding";
import { sse } from "@red-cup-engineering/http-services-section/sse";
import { wellKnown } from "@red-cup-engineering/http-services-section/well-known";
export { sse, wellKnown };

/** Representation data a handler returns before it is written to `node:http`. */

/** Shared metadata options for constructing a response representation. */

/** Options for `jsonRepr`, including media type and pretty-print controls. */

/** Options for text-like response representations. */

/** A handler result: representation data, a Web `Response`, or no response. */

/** Resource handler over a fully matched request context. */

/** Middleware can append trace rows, continue routing, or return a response. */

/** Route-shaped resource descriptor for the small HTTP app object language. */

/** Per-request carrier passed to middleware and handlers after route matching. */

/** Data description of a small HTTP app: resources, middleware, upgrades, and
 *  boundary policy, but not listener lifecycle ownership. */

export function jsonRepr(body, options = {}) {
  const opts = typeof options === "number" ? { status: options } : options;
  const indent = opts.pretty === true ? 2 : typeof opts.pretty === "number" ? opts.pretty : undefined;
  const serialized = JSON.stringify(body, null, indent) ?? "null";
  return repr({
    ...opts,
    type: opts.type ?? "application/json; charset=utf-8",
    body: opts.newline === false ? serialized : `${serialized}\n`,
  });
}

export function textRepr(body, options = {}) {
  const opts = typeof options === "number" ? { status: options } : options;
  return repr({
    ...opts,
    type: opts.type ?? "text/plain; charset=utf-8",
    body,
  });
}

export function htmlRepr(body, options = {}) {
  const opts = typeof options === "number" ? { status: options } : options;
  return repr({
    ...opts,
    type: opts.type ?? "text/html; charset=utf-8",
    body,
  });
}

export function emptyRepr(status = 204, options = {}) {
  return repr({ ...options, status });
}

export async function readBody(req, options = {}) {
  const opts = typeof options === "number" ? { maxBytes: options, maxEncodedBytes: options } : options;
  const maxBytes = opts.maxBytes ?? Infinity;
  const maxEncodedBytes = opts.maxEncodedBytes ?? maxBytes;
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let overLimit = false;
    req.on("data", (chunk) => {
      if (overLimit) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxEncodedBytes) {
        overLimit = true;
        reject(new RangeError(`request body exceeded ${maxEncodedBytes} bytes`));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (!overLimit) resolve(Buffer.concat(chunks, size));
    });
    req.on("error", reject);
  });
  if (opts.decodeContentEncoding === false) return raw;
  return decodeContentEncodedBody(raw, opts.contentEncoding ?? req.headers?.["content-encoding"], maxBytes);
}

export async function decodeContentEncodedBody(
  body,
  contentEncoding,
  maxBytes,
) {
  let decoded = body;
  const codings = parseContentEncoding(contentEncoding);
  for (const coding of [...codings].reverse()) {
    decoded = await decompress(decoded, coding);
    if (decoded.length > maxBytes) throw new RangeError(`decoded request body exceeded ${maxBytes} bytes`);
  }
  return decoded;
}

export async function readTextBody(req, options = {}) {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  const charset = contentType?.params["charset"] ?? "utf-8";
  return decodeBody(await readBody(req, options), charset);
}

export async function readJsonBody(req, options = {}) {
  const text = await readTextBody(req, options);
  if (!text.trim()) return options.empty;
  return JSON.parse(text);
}

export async function readFormBody(req, options = {}) {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  if (contentType !== null && contentType.type !== "application/x-www-form-urlencoded") {
    throw new TypeError(`expected application/x-www-form-urlencoded body, got ${contentType.type}`);
  }
  return new URLSearchParams(await readTextBody(req, options));
}

export async function readMultipartBody(req, options = {}) {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  if (contentType?.type !== "multipart/form-data") {
    throw new TypeError(`expected multipart/form-data body, got ${contentType?.type ?? "missing content-type"}`);
  }
  const boundary = contentType.params["boundary"];
  if (!boundary) throw new TypeError("multipart/form-data boundary is required");
  return parseMultipartForm(await readBody(req, options), boundary);
}

function decodeBody(body, charset) {
  const normalized = charset.toLowerCase();
  if (normalized === "utf-8" || normalized === "utf8") return body.toString("utf8");
  if (normalized === "us-ascii" || normalized === "ascii") return body.toString("ascii");
  if (normalized === "iso-8859-1" || normalized === "latin1") return body.toString("latin1");
  throw new TypeError(`unsupported request charset: ${charset}`);
}

function repr(options) {
  const out = {};
  if (options.status !== undefined) out.status = options.status;
  if (options.headers !== undefined) out.headers = options.headers;
  if (options.trailers !== undefined) out.trailers = options.trailers;
  if (options.type !== undefined) out.type = options.type;
  if (options.body !== undefined) out.body = options.body;
  if (options.cacheControl !== undefined) out.cacheControl = options.cacheControl;
  if (options.security !== undefined) out.security = options.security;
  if (options.etag !== undefined) out.etag = options.etag;
  if (options.lastModified !== undefined) out.lastModified = options.lastModified;
  return out;
}
