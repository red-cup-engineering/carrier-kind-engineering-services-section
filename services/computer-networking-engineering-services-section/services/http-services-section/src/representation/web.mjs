import { contentRange, multipartByterangesBody, multipartRangeBoundary, parseRanges } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/byte-range";
import { ifMatch, ifModifiedSince, ifNoneMatch, ifRange, ifUnmodifiedSince } from "../conditional-request.mjs";
import { httpDate } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/date";
import { isCompressible } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/media-type";
import { negotiateEncoding } from "../negotiation.mjs";

/** Strong validator over known representation bytes; stream producers supply their own validator. */
export async function strongEntityTag(body) {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `"${Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
}
function vary(headers, name) {
  const values = (headers.get("vary") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!values.some((value) => value.toLowerCase() === name.toLowerCase()) && !values.includes("*")) headers.set("vary", [...values, name].join(", "));
}
const forbiddenBody = (status) => status < 200 || status === 204 || status === 205 || status === 304;
async function discard(body) { if (body instanceof ReadableStream) await body.cancel(); }

/** Realize one HTTP representation through portable conditional, range and coding semantics. */
export async function formResponse(request, representation = {}) {
  let status = representation.status ?? 200;
  const headers = new Headers(representation.headers);
  const type = representation.type ?? headers.get("content-type") ?? "application/octet-stream";
  headers.set("content-type", type);
  if (representation.cacheControl !== undefined) headers.set("cache-control", representation.cacheControl);
  let body = typeof representation.body === "string" ? new TextEncoder().encode(representation.body) : representation.body ?? null;
  const known = body instanceof Uint8Array;
  const rangeRequested = request.method === "GET" && status === 200 && known && request.headers.has("range");
  const codings = [];
  const transform = representation.compress !== false && !/(?:^|,)\s*no-transform\s*(?:,|$)/i.test(headers.get("cache-control") ?? "") && !headers.has("content-encoding") && !forbiddenBody(status) && body !== null && isCompressible(type);
  if (transform) {
    vary(headers, "Accept-Encoding");
    for (const coding of ["gzip", "deflate"]) { try { new CompressionStream(coding); codings.push(coding); } catch {} }
  }
  const coding = forbiddenBody(status) ? "identity" : negotiateEncoding(request.headers.get("accept-encoding") ?? undefined, headers.has("content-encoding") ? [headers.get("content-encoding")] : rangeRequested ? ["identity"] : [...codings, "identity"]);
  if (coding === null) {
    await discard(body); vary(headers, "Accept-Encoding");
    return new Response(request.method === "HEAD" ? null : "Not Acceptable", { status: 406, headers: { vary: headers.get("vary"), "content-type": "text/plain; charset=utf-8" } });
  }
  if (representation.etag === false) headers.delete("etag");
  let etag = typeof representation.etag === "string" ? representation.etag : headers.get("etag");
  if (representation.etag === true && known) etag = await strongEntityTag(body);
  if (transform && coding !== "identity") {
    body = (known ? new Blob([body]).stream() : body).pipeThrough(new CompressionStream(coding));
    headers.set("content-encoding", coding); headers.delete("content-length");
    // Strong validators identify the selected coding, not just its decoded bytes.
    if (etag) etag = etag.endsWith('"') ? `${etag.slice(0, -1)}-${coding}"` : undefined;
  }
  if (etag) headers.set("etag", etag);
  if (representation.lastModified !== undefined) headers.set("last-modified", httpDate(representation.lastModified));
  const field = (name) => request.headers.get(name) ?? undefined;
  const current = { ...(etag ? { etag } : {}), ...(representation.lastModified !== undefined ? { lastModified: representation.lastModified } : {}) };
  const safe = request.method === "GET" || request.method === "HEAD";
  if (status >= 200 && status < 300) {
    if (request.headers.has("if-match") && !ifMatch(field("if-match"), etag ?? "")) status = 412;
    else if (!request.headers.has("if-match") && representation.lastModified !== undefined && !ifUnmodifiedSince(field("if-unmodified-since"), representation.lastModified)) status = 412;
    else if (request.headers.has("if-none-match") && ifNoneMatch(field("if-none-match"), etag ?? "")) status = safe ? 304 : 412;
    else if (!request.headers.has("if-none-match") && safe && representation.lastModified !== undefined && ifModifiedSince(field("if-modified-since"), representation.lastModified)) status = 304;
  }
  if (status === 304 || status === 412 || forbiddenBody(status)) {
    await discard(body); headers.delete("content-length");
    return new Response(null, { status, headers });
  }
  if (known && coding === "identity") {
    headers.set("accept-ranges", "bytes");
    if (rangeRequested && ifRange(field("if-range"), current)) {
      const ranges = parseRanges(field("range"), body.byteLength);
      if (ranges === 416) {
        headers.set("content-range", contentRange(null, body.byteLength)); headers.delete("content-length");
        return new Response(null, { status: 416, headers });
      }
      if (ranges) {
        status = 206;
        if (ranges.length === 1) {
          const range = ranges[0]; headers.set("content-range", contentRange(range, body.byteLength)); body = body.slice(range.start, range.end + 1);
        } else {
          const boundary = multipartRangeBoundary(body.byteLength, ranges);
          body = multipartByterangesBody(body, ranges, type, boundary); headers.set("content-type", `multipart/byteranges; boundary=${boundary}`);
        }
      }
    }
    headers.set("content-length", String(body.byteLength));
  }
  if (request.method === "HEAD") { await discard(body); body = null; }
  return new Response(body, { status, headers });
}
