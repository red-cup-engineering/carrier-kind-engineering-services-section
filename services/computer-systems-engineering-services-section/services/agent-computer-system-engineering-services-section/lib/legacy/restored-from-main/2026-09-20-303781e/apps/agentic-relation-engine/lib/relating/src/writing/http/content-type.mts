// content-type.mts — the Content-Type field (RFC 9110 §8.3).
//
// Semantic value: a media type with its parameters. Wire form: the
// field text. The pair is a RETRACTION: parseContentType lowercases
// the type and parameter names and forgets quoting style, so
// parseContentType ∘ serializeContentType = id on parsed values.

import { firstHeader, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue, type HeaderValue } from "./header-value.mjs";
import { parseContentType } from "@red-cup-engineering/code-http-content-type-service";
export { parseContentType };

/**
 * Parsed Content-Type value.
 *
 * `type` is the lowercased media type. Parameter names are lowercased and
 * parameter values are unquoted; quoting style and original case are wire-form
 * details and are not retained.
 */
export type ContentType = Readonly<{
  type: string;
  params: Readonly<Record<string, string>>;
}>;



const TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/**
 * Serialize a normalized Content-Type value.
 *
 * Parameter values that are valid HTTP tokens are emitted bare; other values
 * are quoted with the shared header quoting helper. Parsing the result returns
 * the same normalized `ContentType` value.
 */
export function serializeContentType(contentType: ContentType): string {
  const params = Object.entries(contentType.params)
    .map(([key, value]) => `${key}=${TOKEN_RE.test(value) ? value : quoteHeaderValue(value)}`);
  return [contentType.type, ...params].join("; ");
}
