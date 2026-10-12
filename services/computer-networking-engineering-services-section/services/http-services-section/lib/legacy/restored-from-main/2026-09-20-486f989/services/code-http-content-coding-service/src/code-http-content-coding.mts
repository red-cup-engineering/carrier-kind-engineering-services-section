// HTTP content-coding computation: zstd (Node >=22.15), br, gzip, deflate.

import { PassThrough, type Transform } from "node:stream";
import * as zlib from "node:zlib";
export type Coding = "zstd" | "br" | "gzip" | "deflate" | "identity";

export type CompressionCoding = Exclude<Coding, "identity">;
/** True when a token is a content-coding named by this HTTP codec branch. */
export function isCoding(value: string): value is Coding {
  return value === "zstd" || value === "br" || value === "gzip" || value === "deflate" || value === "identity";
}

/** True when a token names a non-identity compression coding. */
export function isCompressionCoding(value: string): value is Exclude<Coding, "identity"> {
  return value === "zstd" || value === "br" || value === "gzip" || value === "deflate";
}

/** Parse a Content-Encoding header value into ordered non-identity content codings. */
export function parseContentEncoding(value: string | readonly string[] | undefined | null): readonly Exclude<Coding, "identity">[] {
  const raw: string | undefined = typeof value === "string"
    ? value
    : Array.isArray(value)
      ? value.join(",")
      : undefined;
  if (!raw) return Object.freeze([]);
  const codings: Exclude<Coding, "identity">[] = [];
  for (const part of raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)) {
    if (part === "identity") continue;
    if (isCompressionCoding(part)) codings.push(part);
    else throw new TypeError(`unsupported request content-encoding: ${part}`);
  }
  return Object.freeze(codings);
}

type ZlibWithZstd = typeof zlib & {
  createZstdCompress?: () => Transform;
  createZstdDecompress?: () => Transform;
};

const zstd = zlib as ZlibWithZstd;
const BASE_CODINGS = ["br", "gzip", "deflate"] as const satisfies readonly CompressionCoding[];

export function zstdSupported(): boolean {
  return typeof zstd.createZstdCompress === "function" && typeof zstd.createZstdDecompress === "function";
}

export function supportedCompressionCodings(): readonly CompressionCoding[] {
  return zstdSupported() ? ["zstd", ...BASE_CODINGS] : BASE_CODINGS;
}

export async function compress(body: Buffer, coding: Coding): Promise<Buffer> {
  if (coding === "identity") return body;
  return new Promise((resolve, reject) => {
    const stream = compressStream(coding);
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    stream.end(body);
  });
}

export async function decompress(body: Buffer, coding: Coding | "identity"): Promise<Buffer> {
  if (coding === "identity") return body;
  return new Promise((resolve, reject) => {
    const stream = decompressStream(coding);
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    stream.end(body);
  });
}

export function compressStream(coding: Coding | "identity"): Transform {
  if (coding === "br") return zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } });
  if (coding === "gzip") return zlib.createGzip({ level: 6 });
  if (coding === "deflate") return zlib.createDeflate({ level: 6 });
  if (coding === "zstd" && zstd.createZstdCompress) return zstd.createZstdCompress();
  if (coding === "identity") return new PassThrough();
  throw new RangeError(`unsupported content coding: ${coding}`);
}

export function decompressStream(coding: Coding | "identity"): Transform {
  if (coding === "br") return zlib.createBrotliDecompress();
  if (coding === "gzip") return zlib.createGunzip();
  if (coding === "deflate") return zlib.createInflate();
  if (coding === "zstd" && zstd.createZstdDecompress) return zstd.createZstdDecompress();
  if (coding === "identity") return new PassThrough();
  throw new RangeError(`unsupported content coding: ${coding}`);
}

export const CODINGS: readonly string[] = supportedCompressionCodings();
