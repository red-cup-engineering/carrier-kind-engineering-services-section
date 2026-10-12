// http.ts — HTTP transport mechanics: applying representations, CORS, SSE,
// body reading. Protocol representations live in atomic protocol packages.
import type { IncomingMessage, ServerResponse } from "node:http";
import { strongEtag } from "./internal/hash.mts";
import { setTrailerHeader, writeResponseTrailers } from "./internal/trailers.mts";
import {
  contentRange,
  multipartByterangesBody,
  multipartRangeBoundary,
  parseRanges,
} from "@red-cup-engineering/code-http-byte-range-service";
import { cacheControl, type CacheControl } from "@red-cup-engineering/code-http-cache-control-service";
import { httpDate } from "@red-cup-engineering/code-http-date-service";
import {
  ifMatch,
  ifModifiedSince,
  ifNoneMatch,
  ifRange,
  ifUnmodifiedSince,
} from "@red-cup-engineering/evaluate-http-conditional-request-service";
import { isCompressible } from "@red-cup-engineering/classify-http-media-type-service";
import { negotiateEncoding } from "@red-cup-engineering/negotiate-http-content-coding-service";
import { compress, supportedCompressionCodings } from "./compress.mts";
import type { Repr, Body, CorsOptions, SecurityHeaders, StrictTransportSecurity, ResponseTrailers } from "@red-cup-engineering/http-server-application-contract-service";
export { strongEtag };

export { ensureDateHeader, applyCacheControl, applySecurityHeaders, appendVary } from "./response-policy.mts";
import { ensureDateHeader, applyCacheControl, applySecurityHeaders, appendVary } from "./response-policy.mts";
import * as policy from "./response-policy.mts";
import { send } from "@red-cup-engineering/web-server-services-section/http";
export { send };
export type { CorsPreflightDecision } from "./response-policy.mts";
function headerCorsOptions(opts: CorsOptions): policy.HeaderCorsOptions {
  const origins = opts.origins;
  return { ...opts, ...(typeof origins === "function" ? { origins: (origin: string, { req }: { req: policy.HeaderRequest }) => origins(origin, { req: req as IncomingMessage }) } : {}) } as policy.HeaderCorsOptions;
}
export function corsOriginAllowed(req: IncomingMessage, opts: CorsOptions): boolean { return policy.corsOriginAllowed(req, headerCorsOptions(opts)); }
export function corsPreflightDecision(req: IncomingMessage, opts: CorsOptions): policy.CorsPreflightDecision { return policy.corsPreflightDecision(req, headerCorsOptions(opts)); }
export function applyCors(res: ServerResponse, req: IncomingMessage, opts: CorsOptions): void { policy.applyCors(res, req, headerCorsOptions(opts)); }
export function corsPreflight(req: IncomingMessage, res: ServerResponse, opts: CorsOptions, status = 204): void { policy.corsPreflight(req, res, headerCorsOptions(opts), status); }

// ── Send a Repr ───────────────────────────────────────────────────────────────────────────────



function endWithTrailers(
  res: ServerResponse,
  chunk: Buffer | string | Uint8Array | undefined,
  trailers: ResponseTrailers | undefined,
): void {
  writeResponseTrailers(res, trailers);
  res.end(chunk);
}

function pipeBody(body: Body, res: ServerResponse, trailers: ResponseTrailers | undefined): Promise<void> {
  const finish = () => {
    writeResponseTrailers(res, trailers);
    res.end();
  };
  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    return new Promise((resolve) => {
      const pump = (): void => {
        reader.read().then(({ done, value }) => {
          if (done) { finish(); resolve(); return; }
          res.write(value);
          pump();
        }).catch(() => { res.end(); resolve(); });
      };
      pump();
    });
  } else if (typeof (body as NodeJS.ReadableStream).pipe === "function") {
    return new Promise((resolve) => {
      const stream = body as NodeJS.ReadableStream;
      stream.on("error", () => { res.end(); resolve(); });
      stream.on("end", () => { finish(); resolve(); });
      stream.pipe(res, { end: false });
    });
  } else {
    // async iterable
    return (async () => {
      try {
        for await (const chunk of body as AsyncIterable<Uint8Array>) {
          res.write(chunk);
        }
        finish();
      } catch {
        res.end();
      }
    })();
  }
}
