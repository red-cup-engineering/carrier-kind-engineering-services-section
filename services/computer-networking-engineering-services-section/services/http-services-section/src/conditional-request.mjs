import { parseHttpDate } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/date";
import { firstHeader } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/header-value";
export function etagList(value) {
    const raw = Array.isArray(value) ? value.join(",") : String(value);
    return raw.split(",").map((etag)=>etag.trim()).filter(Boolean);
}
function stripWeak(etag) {
    return etag.startsWith("W/") ? etag.slice(2) : etag;
}
export function weakEtagMatch(a, b) {
    return stripWeak(a) === stripWeak(b);
}
export function strongEtagMatch(a, b) {
    return !a.startsWith("W/") && !b.startsWith("W/") && a === b;
}
export function ifNoneMatch(value, etag) {
    if (!value) return false;
    const candidates = etagList(value);
    return candidates.includes("*") || candidates.some((candidate)=>weakEtagMatch(candidate, etag));
}
export function ifMatch(value, etag) {
    if (!value) return true;
    const candidates = etagList(value);
    return candidates.includes("*") || candidates.some((candidate)=>strongEtagMatch(candidate, etag));
}
export function ifModifiedSince(value, lastModified) {
    const raw = firstHeader(value);
    if (!raw) return false;
    const date = parseHttpDate(raw);
    return date !== null && lastModified <= date;
}
export function ifUnmodifiedSince(value, lastModified) {
    const raw = firstHeader(value);
    if (!raw) return true;
    const date = parseHttpDate(raw);
    return date === null || lastModified <= date;
}
export function ifRange(value, current) {
    const raw = firstHeader(value);
    if (!raw) return true;
    const token = raw.trim();
    if (!token) return true;
    if (token.startsWith("W/")) return false;
    if (token.startsWith("\"")) return current.etag !== undefined && strongEtagMatch(token, current.etag);
    const date = parseHttpDate(token);
    if (date === null) return false;
    return current.lastModified !== undefined && current.lastModified <= date;
}
