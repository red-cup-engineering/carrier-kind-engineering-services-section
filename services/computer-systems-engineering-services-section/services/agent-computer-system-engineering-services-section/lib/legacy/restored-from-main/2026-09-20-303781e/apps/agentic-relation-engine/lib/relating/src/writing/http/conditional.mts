// conditional.mts — entity tags (RFC 9110 §8.8.3) and the precondition
// evaluators over field values (§13). Each evaluator takes the field
// value as received — never the request object; binding a field to a
// live request is transport.

import { parseHttpDate } from "./date.mjs";
import { firstHeader, type HeaderValue } from "./header-value.mjs";
import { ifRange } from "@red-cup-engineering/evaluate-http-conditional-request-service";
export { ifRange };

/** Parse an If-Match / If-None-Match field value into its entity-tag list. */
export function etagList(value: string | readonly string[]): string[] {
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  return raw.split(",").map((etag) => etag.trim()).filter(Boolean);
}

function stripWeak(etag: string): string {
  return etag.startsWith("W/") ? etag.slice(2) : etag;
}

/** Weak comparison (§8.8.3.2): opaque-tags equal, weakness ignored. */
export function weakEtagMatch(a: string, b: string): boolean {
  return stripWeak(a) === stripWeak(b);
}

/** Strong comparison (§8.8.3.2): equal, and neither validator is weak. */
export function strongEtagMatch(a: string, b: string): boolean {
  return !a.startsWith("W/") && !b.startsWith("W/") && a === b;
}

/** If-None-Match evaluates true when the precondition FAILS for the given validator (§13.1.2). */
export function ifNoneMatch(value: HeaderValue, etag: string): boolean {
  if (!value) return false;
  const candidates = etagList(value);
  return candidates.includes("*") || candidates.some((candidate) => weakEtagMatch(candidate, etag));
}

/** If-Match evaluates true when the precondition HOLDS for the given validator (§13.1.1). */
export function ifMatch(value: HeaderValue, etag: string): boolean {
  if (!value) return true;
  const candidates = etagList(value);
  return candidates.includes("*") || candidates.some((candidate) => strongEtagMatch(candidate, etag));
}

/** If-Modified-Since evaluates true when the representation changed after the field date (§13.1.3). */
export function ifModifiedSince(value: HeaderValue, lastModified: Date): boolean {
  const raw = firstHeader(value);
  if (!raw) return false;
  const date = parseHttpDate(raw);
  return date !== null && lastModified <= date;
}

/** If-Unmodified-Since evaluates true when the precondition HOLDS (§13.1.4). */
export function ifUnmodifiedSince(value: HeaderValue, lastModified: Date): boolean {
  const raw = firstHeader(value);
  if (!raw) return true;
  const date = parseHttpDate(raw);
  return date === null || lastModified <= date;
}


