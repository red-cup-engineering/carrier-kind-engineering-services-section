const TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const FORBIDDEN_TRAILER_NAMES = new Set([
    "connection",
    "content-encoding",
    "content-length",
    "content-range",
    "content-type",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade"
]);
function headerEntries(trailers) {
    return Object.entries(trailers).filter(([name])=>{
        const normalized = name.trim().toLowerCase();
        return TOKEN.test(name) && !FORBIDDEN_TRAILER_NAMES.has(normalized);
    });
}
function headersToTrailers(headers) {
    const out = {};
    for (const [name, value] of headers)out[name] = value;
    return out;
}
function trailerSourceToTrailers(source) {
    if (source === undefined) return undefined;
    return source instanceof Headers ? headersToTrailers(source) : source;
}
function isPromise(value) {
    return typeof value.then === "function";
}
function trailerHeaderValue(trailers, existing) {
    const names = headerEntries(trailers ?? {}).map(([name])=>name);
    if (!names.length) return existing;
    const seen = new Set();
    const merged = [];
    for (const name of [
        ...existing?.split(",") ?? [],
        ...names
    ]){
        const trimmed = name.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(trimmed);
    }
    return merged.join(", ");
}
function stringifyTrailerValue(value) {
    return Array.isArray(value) ? value.map(String).join(", ") : String(value);
}
export function applyTrailerHeader(headers, trailers) {
    const value = trailerHeaderValue(trailers, headers.trailer ?? headers.Trailer);
    if (!value) return false;
    delete headers["content-length"];
    delete headers["Content-Length"];
    headers.trailer = value;
    return true;
}
export function setTrailerHeader(res, trailers) {
    const existing = res.getHeader("Trailer");
    const existingValue = Array.isArray(existing) ? existing.join(", ") : existing === undefined ? undefined : String(existing);
    const value = trailerHeaderValue(trailers, existingValue);
    if (!value) return false;
    res.removeHeader("Content-Length");
    res.setHeader("Trailer", value);
    return true;
}
export function writeResponseTrailers(res, trailers) {
    const out = {};
    for (const [name, value] of headerEntries(trailers ?? {}))out[name] = stringifyTrailerValue(value);
    if (!Object.keys(out).length) return;
    try {
        res.addTrailers(out);
    } catch  {}
}
export function immediateResponseTrailers(response) {
    const source = response.trailers;
    if (source === undefined || isPromise(source)) return undefined;
    return trailerSourceToTrailers(source);
}
export async function resolveResponseTrailers(response) {
    const source = response.trailers;
    if (source === undefined) return undefined;
    return trailerSourceToTrailers(isPromise(source) ? await source : source);
}
