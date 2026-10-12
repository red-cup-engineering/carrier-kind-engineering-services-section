import { splitHeaderParameters } from "@red-cup-engineering/code-http-header-value-service";
export { splitHeaderParameters };
import { parseDirectiveList } from "@red-cup-engineering/code-http-header-value-service";
export { parseDirectiveList };
// header-value.mts — the shape a field value arrives in, and the
// parameterized-value grammar shared by Content-Type, Content-Disposition,
// and friends (RFC 9110 §5.6.6 parameters; quoted-string §5.6.4).

/** A field value as an HTTP adapter hands it over: absent, one line, or repeated lines. */
export type HeaderValue = string | readonly string[] | undefined;

/** First line of a possibly repeated field. */
export function firstHeader(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? (value as readonly string[])[0] : (value as string | undefined);
}

/** All lines of a possibly repeated field, joined as one comma list. */
export function joinedHeader(value: HeaderValue): string {
  return Array.isArray(value) ? value.join(",") : value == null ? "" : String(value);
}



/**
 * Remove quoted-string framing and backslash escapes. Retraction:
 * unquoteHeaderValue ∘ quoteHeaderValue = id, but bare tokens pass
 * through unchanged, so distinct wire forms share a semantic value.
 */
export function unquoteHeaderValue(value: string): string {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1).replace(/\\(["\\])/g, "$1");
  }
  return value;
}

/** Frame a value as a quoted-string, escaping quotes and backslashes. */
export function quoteHeaderValue(value: string): string {
  return `"${value.replace(/([\\"])/g, "\\$1")}"`;
}


