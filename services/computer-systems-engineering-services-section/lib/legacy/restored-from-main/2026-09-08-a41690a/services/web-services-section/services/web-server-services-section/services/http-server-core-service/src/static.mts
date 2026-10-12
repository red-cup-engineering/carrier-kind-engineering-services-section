// static.ts — static file serving via posix-holography projectors.
//
// Files are recognized and typed by the posix-holography catalog (path → file → regular-file
// → flatfile → json → …). ETags derive from file size + mtime. Range and conditional requests
// are handled. Directory index resolution. Path-traversal protection.

import { stat, readFile } from "node:fs/promises";
import * as nodeFs from "node:fs";
import type { Stats } from "node:fs";
import { join, resolve, normalize } from "node:path";
import { sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extensionType, isCompressible } from "@red-cup-engineering/classify-http-media-type-service";
import { negotiateEncoding, type Coding } from "@red-cup-engineering/negotiate-http-content-coding-service";
import {
  byterangesCloseDelimiter,
  byterangesPartHeader,
  contentRange,
  multipartRangeBoundary,
  parseRanges,
  type ByteRange,
} from "@red-cup-engineering/code-http-byte-range-service";
import type { CacheControl } from "@red-cup-engineering/code-http-cache-control-service";
import { httpDate } from "@red-cup-engineering/code-http-date-service";
import {
  ifMatch,
  ifModifiedSince,
  ifNoneMatch,
  ifRange,
  ifUnmodifiedSince,
} from "@red-cup-engineering/evaluate-http-conditional-request-service";
import { appendVary, ensureDateHeader, applyCacheControl, applySecurityHeaders } from "./http.mts";
import { compress, supportedCompressionCodings } from "./compress.mts";
import type { Handler, SecurityHeaders } from "@red-cup-engineering/http-server-application-contract-service";
import { staticFiles } from "@red-cup-engineering/web-server-services-section/static";
export { staticFiles };

export const DEFAULT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".ttl": "text/turtle; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

export type StaticOptions = {
  root: string;
  index?: string[];
  maxBuffer?: number;
  etag?: boolean;
  lastModified?: boolean;
  dotFiles?: "deny" | "ignore" | "allow";
  extensions?: string[];
  precompressed?: boolean | readonly Coding[];
  cacheControl?: CacheControl | string;
  security?: SecurityHeaders | true;
};

const DEFAULT_INDEX = ["index.html", "index.htm"];
const MAX_BUFFER = 2 * 1024 * 1024; // 2 MB
const PRECOMPRESSED_EXTENSIONS: Readonly<Record<string, string>> = {
  br: ".br",
  gzip: ".gz",
  zstd: ".zst",
};

function safePath(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const clean = normalize(decoded).replace(/^(\.\.\/|\/)+/, "");
  if (clean.split(/[\\/]/).includes("..")) return null;
  const full = resolve(join(root, clean));
  const rootPath = resolve(root);
  return full === rootPath || full.startsWith(rootPath + sep) ? full : null;
}



function pipeFileRange(res: ServerResponse, path: string, range: ByteRange): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = nodeFs.createReadStream(path, { start: range.start, end: range.end });
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(res, { end: false });
  });
}

async function writeMultipartFileRanges(
  res: ServerResponse,
  path: string,
  ranges: readonly ByteRange[],
  total: number,
  type: string,
  boundary: string,
): Promise<void> {
  try {
    for (const range of ranges) {
      res.write(byterangesPartHeader(boundary, type, range, total));
      await pipeFileRange(res, path, range);
      res.write("\r\n");
    }
    res.end(byterangesCloseDelimiter(boundary));
  } catch {
    res.destroy();
  }
}

async function precompressedVariants(
  filePath: string,
  option: true | readonly Coding[],
): Promise<Array<{ coding: Exclude<Coding, "identity" | "deflate">; path: string; stat: Stats }>> {
  const allowed = option === true ? ["br", "gzip", "zstd"] : option.filter((coding) => coding !== "identity" && coding !== "deflate");
  const variants: Array<{ coding: Exclude<Coding, "identity" | "deflate">; path: string; stat: Stats }> = [];
  for (const coding of allowed) {
    if (coding !== "br" && coding !== "gzip" && coding !== "zstd") continue;
    const suffix = PRECOMPRESSED_EXTENSIONS[coding];
    if (!suffix) continue;
    const path = `${filePath}${suffix}`;
    try {
      const st = await stat(path);
      if (st.isFile()) variants.push({ coding, path, stat: st });
    } catch {
      // Missing precompressed variants are normal.
    }
  }
  return variants;
}
