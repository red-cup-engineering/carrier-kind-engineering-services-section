
import {
  cacheControl as serializeCacheControl,
  httpDate,
  type CacheControl,
} from "./codec/index.mts";

export type Body = string | Uint8Array | ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;

/** Representation data a handler returns before it is written to `node:http`. */
export type Repr = {
  status?: number;
  headers?: Record<string, string | readonly string[]>;
  body?: Body;
  type?: string;
  etag?: string;
  lastModified?: Date;
  cacheControl?: CacheControl | string;
};

/** Shared metadata options for constructing a response representation. */
export type ReprOptions = Readonly<{
  status?: number;
  headers?: Record<string, string>;
  cacheControl?: CacheControl | string;
  etag?: string;
  lastModified?: Date;
}>;

/** Options for `jsonRepr`, including media type and pretty-print controls. */
export type JsonReprOptions = ReprOptions & Readonly<{
  type?: string;
  pretty?: boolean | number;
  newline?: boolean;
}>;

/** Options for text-like response representations. */
export type TextReprOptions = ReprOptions & Readonly<{
  type?: string;
}>;

/** A handler result: representation data, a Web `Response`, or no response. */
export type HandlerResult = Repr | Response | null | undefined | void;

/** Response shape consumed by the running action router and Node HTTP binding. */
export interface ServedReprResponse {
  readonly status: number;
  readonly type: string;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export function jsonRepr(body: unknown, options: number | JsonReprOptions = {}): Repr {
  const opts = typeof options === "number" ? { status: options } : options;
  const indent = opts.pretty === true ? 2 : typeof opts.pretty === "number" ? opts.pretty : undefined;
  const serialized = JSON.stringify(body, null, indent) ?? "null";
  return repr({
    ...opts,
    type: opts.type ?? "application/json; charset=utf-8",
    body: opts.newline === false ? serialized : `${serialized}\n`,
  });
}

export function textRepr(body: string, options: number | TextReprOptions = {}): Repr {
  const opts = typeof options === "number" ? { status: options } : options;
  return repr({
    ...opts,
    type: opts.type ?? "text/plain; charset=utf-8",
    body,
  });
}

export function htmlRepr(body: string, options: number | TextReprOptions = {}): Repr {
  const opts = typeof options === "number" ? { status: options } : options;
  return repr({
    ...opts,
    type: opts.type ?? "text/html; charset=utf-8",
    body,
  });
}

export function emptyRepr(status = 204, options: ReprOptions = {}): Repr {
  return repr({ ...options, status });
}

function isReadableStreamBody(body: Body): body is ReadableStream<Uint8Array> {
  return typeof (body as { readonly getReader?: unknown }).getReader === "function";
}

async function readableStreamChunks(stream: ReadableStream<Uint8Array>): Promise<readonly Uint8Array[]> {
  const chunks: Uint8Array[] = [];
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

function decodeBodyChunks(chunks: readonly Uint8Array[]): string {
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
export async function reprBodyText(body: Repr["body"]): Promise<string> {
  if (body === undefined) return "";
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return new TextDecoder().decode(body);
  if (isReadableStreamBody(body)) return decodeBodyChunks(await readableStreamChunks(body));
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) chunks.push(chunk);
  return decodeBodyChunks(chunks);
}

/** Project a response representation into the finite served-response shape. */
export async function servedResponseFromRepr(repr: Repr, method: string): Promise<ServedReprResponse> {
  const headers: Record<string, string> = {};
  let typeHeader: string | undefined;
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

function repr(options: ReprOptions & Readonly<{ type?: string; body?: Body }>): Repr {
  const out: Repr = {};
  if (options.status !== undefined) out.status = options.status;
  if (options.headers !== undefined) out.headers = options.headers;
  if (options.type !== undefined) out.type = options.type;
  if (options.body !== undefined) out.body = options.body;
  if (options.cacheControl !== undefined) out.cacheControl = options.cacheControl;
  if (options.etag !== undefined) out.etag = options.etag;
  if (options.lastModified !== undefined) out.lastModified = options.lastModified;
  return out;
}
