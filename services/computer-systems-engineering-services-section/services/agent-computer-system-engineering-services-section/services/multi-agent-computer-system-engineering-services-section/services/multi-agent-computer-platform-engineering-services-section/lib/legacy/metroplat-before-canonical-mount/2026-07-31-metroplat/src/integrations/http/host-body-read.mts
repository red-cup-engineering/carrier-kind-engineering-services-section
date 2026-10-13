
import type { IncomingMessage } from "node:http";

/**
 * Node request-body stream binding for pure HTTP request-content observations.
 */

import {
  parseContentType,
  parseContentEncoding,
} from "./codec/index.mts";
import { parse as parseJson } from "../../lib/codecs/json/core.mts";
import { parseMultipartForm, type MultipartForm } from "./codec/multipart/index.mts";
import { decompress } from "./compression.mts";
import {
  httpRequestContentBoundary,
  observeBodyRead,
  type BodyReadObservation,
  type HttpRequestContentBoundaryExtra,
} from "./body-read.mts";

export type BodyParseOptions = Readonly<{
  maxBytes?: number;
  maxEncodedBytes?: number;
  contentType?: string;
  contentEncoding?: string | readonly string[];
  decodeContentEncoding?: boolean;
}>;

export type JsonBodyOptions<T = unknown> = BodyParseOptions & Readonly<{
  empty?: T;
}>;

export type BufferBodyRead = BodyReadObservation<Buffer> & { readonly operation: "read-body" };
export type TextBodyRead = BodyReadObservation<string> & { readonly operation: "read-text-body" };
export type JsonBodyRead<T = unknown> = BodyReadObservation<T> & { readonly operation: "read-json-body" };
export type FormBodyRead = BodyReadObservation<URLSearchParams> & { readonly operation: "read-form-body" };
export type MultipartBodyRead = BodyReadObservation<MultipartForm> & { readonly operation: "read-multipart-body" };

async function readBodyBuffer(req: IncomingMessage, options: number | BodyParseOptions = {}): Promise<Buffer> {
  const opts = typeof options === "number" ? { maxBytes: options, maxEncodedBytes: options } : options;
  const maxBytes = opts.maxBytes ?? Infinity;
  const maxEncodedBytes = opts.maxEncodedBytes ?? maxBytes;
  const raw = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let overLimit = false;
    req.on("data", (chunk: Buffer | string) => {
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

async function decodeContentEncodedBody(
  body: Buffer,
  contentEncoding: string | readonly string[] | undefined,
  maxBytes: number,
): Promise<Buffer> {
  let decoded = body;
  const codings = parseContentEncoding(contentEncoding);
  for (const coding of [...codings].reverse()) {
    decoded = await decompress(decoded, coding);
    if (decoded.length > maxBytes) throw new RangeError(`decoded request body exceeded ${maxBytes} bytes`);
  }
  return decoded;
}

async function readTextBodyValue(req: IncomingMessage, options: BodyParseOptions = {}): Promise<string> {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  const charset = contentType?.params["charset"] ?? "utf-8";
  return decodeBody(await readBodyBuffer(req, options), charset);
}

function requestContentBoundary(
  req: IncomingMessage,
  options: BodyParseOptions,
  extra: HttpRequestContentBoundaryExtra = Object.freeze({}),
): ReturnType<typeof httpRequestContentBoundary> {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  return httpRequestContentBoundary({
    contentType: contentType?.type ?? null,
    charset: contentType?.params["charset"] ?? null,
    contentEncoding: options.contentEncoding ?? (typeof req.headers["content-encoding"] === "string" ? req.headers["content-encoding"] : null),
    maxBytes: options.maxBytes ?? null,
    maxEncodedBytes: options.maxEncodedBytes ?? null,
    extra,
  });
}

export async function readBody(
  req: IncomingMessage,
  options: number | (BodyParseOptions) = {},
): Promise<BufferBodyRead> {
  const parseOptions = typeof options === "number" ? { maxBytes: options, maxEncodedBytes: options } : options;
  const value = await readBodyBuffer(req, parseOptions);
  return observeBodyRead("read-body", value) as BufferBodyRead;
}

export async function readTextBody(
  req: IncomingMessage,
  options: BodyParseOptions = {},
): Promise<TextBodyRead> {
  const value = await readTextBodyValue(req, options);
  return observeBodyRead("read-text-body", value) as TextBodyRead;
}

export async function readJsonBody<T = unknown>(
  req: IncomingMessage,
  options: JsonBodyOptions<T> = {},
): Promise<JsonBodyRead<T>> {
  const text = await readTextBodyValue(req, options);
  const empty = !text.trim();
  const value = empty ? options.empty as T : parseJson(text) as T;
  return observeBodyRead("read-json-body", value) as JsonBodyRead<T>;
}

export async function readFormBody(
  req: IncomingMessage,
  options: BodyParseOptions = {},
): Promise<FormBodyRead> {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  if (contentType !== null && contentType.type !== "application/x-www-form-urlencoded") {
    throw new TypeError(`expected application/x-www-form-urlencoded body, got ${contentType.type}`);
  }
  const value = new URLSearchParams(await readTextBodyValue(req, options));
  return observeBodyRead("read-form-body", value) as FormBodyRead;
}

export async function readMultipartBody(
  req: IncomingMessage,
  options: BodyParseOptions = {},
): Promise<MultipartBodyRead> {
  const contentType = parseContentType(options.contentType ?? req.headers["content-type"]);
  if (contentType?.type !== "multipart/form-data") {
    throw new TypeError(`expected multipart/form-data body, got ${contentType?.type ?? "missing content-type"}`);
  }
  const boundary = contentType.params["boundary"];
  if (!boundary) throw new TypeError("multipart/form-data boundary is required");
  const value = parseMultipartForm(await readBodyBuffer(req, options), boundary);
  return observeBodyRead("read-multipart-body", value) as MultipartBodyRead;
}

function decodeBody(body: Buffer, charset: string): string {
  const normalized = charset.toLowerCase();
  if (normalized === "utf-8" || normalized === "utf8") return body.toString("utf8");
  if (normalized === "us-ascii" || normalized === "ascii") return body.toString("ascii");
  if (normalized === "iso-8859-1" || normalized === "latin1") return body.toString("latin1");
  throw new TypeError(`unsupported request charset: ${charset}`);
}
