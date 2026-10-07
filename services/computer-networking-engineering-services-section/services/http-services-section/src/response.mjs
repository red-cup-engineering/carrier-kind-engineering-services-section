import { createHash } from "node:crypto";
import { setTrailerHeader, writeResponseTrailers } from "./trailers.mjs";
import { contentRange, multipartByterangesBody, multipartRangeBoundary, parseRanges } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/byte-range";
import { cacheControl } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/cache-control";
import { httpDate } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/date";
import { ifMatch, ifModifiedSince, ifNoneMatch, ifRange, ifUnmodifiedSince } from "./conditional-request.mjs";
import { isCompressible } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/media-type";
import { negotiateEncoding } from "./negotiation.mjs";
import { compress, supportedCompressionCodings } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-coding";
function strongEtag(data) {
    return `"${createHash("sha1").update(data).digest("hex")}"`;
}
export { strongEtag };
export { ensureDateHeader, applyCacheControl, applySecurityHeaders, appendVary } from "./response-policy.mjs";
import { ensureDateHeader, applyCacheControl, applySecurityHeaders, appendVary } from "./response-policy.mjs";
import * as policy from "./response-policy.mjs";
function headerCorsOptions(opts) {
    const origins = opts.origins;
    return {
        ...opts,
        ...typeof origins === "function" ? {
            origins: (origin, { req })=>origins(origin, {
                    req: req
                })
        } : {}
    };
}
export function corsOriginAllowed(req, opts) {
    return policy.corsOriginAllowed(req, headerCorsOptions(opts));
}
export function corsPreflightDecision(req, opts) {
    return policy.corsPreflightDecision(req, headerCorsOptions(opts));
}
export function applyCors(res, req, opts) {
    policy.applyCors(res, req, headerCorsOptions(opts));
}
export function corsPreflight(req, res, opts, status = 204) {
    policy.corsPreflight(req, res, headerCorsOptions(opts), status);
}
export async function send(req, res, repr, now) {
    if (now === undefined) throw new TypeError("send: now (a Date, or milliseconds since the epoch) is required");
    const { status = 200, headers = {}, body, type = "application/octet-stream" } = repr;
    ensureDateHeader(res, now);
    applyCacheControl(res, repr.cacheControl);
    applySecurityHeaders(res, repr.security);
    if (repr.etag) {
        res.setHeader("ETag", repr.etag);
        if (!ifMatch(req.headers["if-match"], repr.etag)) {
            res.writeHead(412).end();
            return;
        }
    }
    if (repr.lastModified) {
        res.setHeader("Last-Modified", httpDate(repr.lastModified));
        if (!ifUnmodifiedSince(req.headers["if-unmodified-since"], repr.lastModified)) {
            res.writeHead(412).end();
            return;
        }
    }
    if (repr.etag && ifNoneMatch(req.headers["if-none-match"], repr.etag)) {
        res.writeHead(req.method === "GET" || req.method === "HEAD" ? 304 : 412).end();
        return;
    }
    if (!repr.etag && repr.lastModified && ifModifiedSince(req.headers["if-modified-since"], repr.lastModified)) {
        res.writeHead(req.method === "GET" || req.method === "HEAD" ? 304 : 412).end();
        return;
    }
    for (const [k, v] of Object.entries(headers))res.setHeader(k, v);
    res.setHeader("Content-Type", type);
    if (!body) {
        res.writeHead(status).end();
        return;
    }
    if (typeof body === "string" || Buffer.isBuffer(body)) {
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
        const ranges = ifRange(req.headers["if-range"], {
            ...repr.etag !== undefined ? {
                etag: repr.etag
            } : {},
            ...repr.lastModified !== undefined ? {
                lastModified: repr.lastModified
            } : {}
        }) ? parseRanges(req.headers["range"], buf.length) : null;
        if (ranges === 416) {
            res.setHeader("Content-Range", contentRange(null, buf.length));
            res.writeHead(416).end();
            return;
        }
        if (ranges) {
            const coding = negotiateEncoding(req.headers["accept-encoding"], [
                "identity"
            ]);
            if (coding === null) {
                appendVary(res, "Accept-Encoding");
                res.writeHead(406, {
                    "Content-Type": "text/plain; charset=utf-8"
                }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
                return;
            }
            if (ranges.length > 1) {
                const boundary = multipartRangeBoundary(buf.length, ranges);
                const body = multipartByterangesBody(buf, ranges, type, boundary);
                res.setHeader("Content-Type", `multipart/byteranges; boundary=${boundary}`);
                res.setHeader("Accept-Ranges", "bytes");
                res.setHeader("Content-Length", body.length);
                res.writeHead(206).end(req.method === "HEAD" ? undefined : body);
                return;
            }
            const range = ranges[0];
            const slice = buf.slice(range.start, range.end + 1);
            res.setHeader("Content-Range", contentRange(range, buf.length));
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Content-Length", slice.length);
            res.writeHead(206).end(req.method === "HEAD" ? undefined : slice);
            return;
        }
        // A body that already carries a content-coding (a cached gzip answer) is sent as it is:
        // coding it again would make the client's one decoding hand back the inner coding.
        const alreadyCoded = Object.keys(headers).some((name) => name.toLowerCase() === "content-encoding" && String(headers[name]).trim() !== "" && String(headers[name]).trim().toLowerCase() !== "identity");
        const compressible = isCompressible(type) && !alreadyCoded;
        const coding = negotiateEncoding(req.headers["accept-encoding"], compressible ? [
            ...supportedCompressionCodings(),
            "identity"
        ] : [
            "identity"
        ]);
        if (coding === null) {
            appendVary(res, "Accept-Encoding");
            res.writeHead(406, {
                "Content-Type": "text/plain; charset=utf-8"
            }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
            return;
        }
        if (compressible) {
            appendVary(res, "Accept-Encoding");
            if (coding !== "identity") {
                const out = await compress(buf, coding);
                const trailers = req.method === "HEAD" ? undefined : repr.trailers;
                const hasTrailers = setTrailerHeader(res, trailers);
                res.setHeader("Content-Encoding", coding);
                if (!hasTrailers) res.setHeader("Content-Length", out.length);
                res.writeHead(status);
                endWithTrailers(res, req.method === "HEAD" ? undefined : out, trailers);
                return;
            }
        }
        const trailers = req.method === "HEAD" ? undefined : repr.trailers;
        const hasTrailers = setTrailerHeader(res, trailers);
        if (!hasTrailers) res.setHeader("Content-Length", buf.length);
        res.setHeader("Accept-Ranges", "bytes");
        res.writeHead(status);
        endWithTrailers(res, req.method === "HEAD" ? undefined : buf, trailers);
    } else {
        if (req.method === "HEAD") {
            res.writeHead(status).end();
            return;
        }
        setTrailerHeader(res, repr.trailers);
        res.writeHead(status);
        await pipeBody(body, res, repr.trailers);
    }
}
function endWithTrailers(res, chunk, trailers) {
    writeResponseTrailers(res, trailers);
    res.end(chunk);
}
function pipeBody(body, res, trailers) {
    const finish = ()=>{
        writeResponseTrailers(res, trailers);
        res.end();
    };
    if (body instanceof ReadableStream) {
        const reader = body.getReader();
        return new Promise((resolve)=>{
            const pump = ()=>{
                reader.read().then(({ done, value })=>{
                    if (done) {
                        finish();
                        resolve();
                        return;
                    }
                    res.write(value);
                    pump();
                }).catch(()=>{
                    res.end();
                    resolve();
                });
            };
            pump();
        });
    } else if (typeof body.pipe === "function") {
        return new Promise((resolve)=>{
            const stream = body;
            stream.on("error", ()=>{
                res.end();
                resolve();
            });
            stream.on("end", ()=>{
                finish();
                resolve();
            });
            stream.pipe(res, {
                end: false
            });
        });
    } else {
        return (async ()=>{
            try {
                for await (const chunk of body){
                    res.write(chunk);
                }
                finish();
            } catch  {
                res.end();
            }
        })();
    }
}
