import { compressStream, supportedCompressionCodings } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding";
import { isCompressible } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/media-type";
import { negotiateEncoding } from "./negotiation.mjs";
import "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding";
import { isEventStream } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";
export function bodyForbidden(status) {
    return status === 204 || status === 304 || status >= 100 && status < 200;
}
export function planWebResponseCompression(status, headers, options = {}) {
    if (bodyForbidden(status)) return {
        kind: "identity"
    };
    const existingContentEncoding = knownCoding(headerValue(headers, "content-encoding"));
    if (existingContentEncoding) return accepted(existingContentEncoding, options);
    if (options.range !== undefined) return accepted("identity", options);
    if (headerValue(headers, "content-range") !== undefined) return accepted("identity", options);
    if (cacheControlHasNoTransform(headerValue(headers, "cache-control"))) return accepted("identity", options);
    const contentType = headerValue(headers, "content-type");
    if (!contentType || isEventStream(contentType) || !isCompressible(contentType)) return accepted("identity", options);
    const offered = offeredCodings(options.codings);
    const coding = negotiateEncoding(headerList(options.acceptEncoding), offered);
    if (!coding) return {
        kind: "not-acceptable"
    };
    if (coding === "identity") return {
        kind: "identity"
    };
    setHeader(headers, "content-encoding", coding);
    deleteHeader(headers, "content-length");
    appendVary(headers, "Accept-Encoding");
    return {
        kind: "compress",
        coding
    };
}
export function responseCompressionTransform(plan) {
    return plan.kind === "compress" ? compressStream(plan.coding) : null;
}
export function writeContentCodingNotAcceptable(headers) {
    setHeader(headers, "content-type", "text/plain; charset=utf-8");
    setHeader(headers, "content-length", String(Buffer.byteLength("Not Acceptable")));
    deleteHeader(headers, "content-encoding");
    appendVary(headers, "Accept-Encoding");
}
function offeredCodings(codings) {
    if (!codings) return [
        ...supportedCompressionCodings(),
        "identity"
    ];
    return codings.includes("identity") ? codings : [
        ...codings,
        "identity"
    ];
}
function headerList(value) {
    return Array.isArray(value) ? value.join(", ") : value;
}
function accepted(coding, options) {
    return negotiateEncoding(headerList(options.acceptEncoding), [
        coding
    ]) === null ? {
        kind: "not-acceptable"
    } : {
        kind: "identity"
    };
}
function knownCoding(value) {
    const normalized = value?.split(",", 1)[0]?.trim().toLowerCase();
    return normalized === "br" || normalized === "gzip" || normalized === "deflate" || normalized === "zstd" || normalized === "identity" ? normalized : null;
}
function headerKey(headers, name) {
    const normalized = name.toLowerCase();
    return Object.keys(headers).find((key)=>key.toLowerCase() === normalized);
}
function headerValue(headers, name) {
    const key = headerKey(headers, name);
    return key === undefined ? undefined : headers[key];
}
function setHeader(headers, name, value) {
    deleteHeader(headers, name);
    headers[name] = value;
}
function deleteHeader(headers, name) {
    const key = headerKey(headers, name);
    if (key !== undefined) delete headers[key];
}
function appendVary(headers, value) {
    const existing = headerValue(headers, "vary");
    if (!existing) {
        setHeader(headers, "vary", value);
        return;
    }
    const tokens = existing.split(",").map((token)=>token.trim()).filter(Boolean);
    if (tokens.some((token)=>token === "*" || token.toLowerCase() === value.toLowerCase())) return;
    setHeader(headers, "vary", `${existing}, ${value}`);
}
function cacheControlHasNoTransform(value) {
    if (!value) return false;
    return value.split(",").some((part)=>part.trim().toLowerCase() === "no-transform");
}
