// cookie-header.mts — the Cookie request header representation.
//
// Semantic value: a record of cookie names to (decoded) values. Wire
// form: the Cookie header text, "a=1; b=2". The pair is a RETRACTION:
// parseCookieHeader ∘ serializeCookieHeader = id on valid records, while
// the opposite composite normalizes — malformed parts, invalid names,
// and duplicate names (first one wins) are dropped by the parse.

import { assertCookieName, decodeCookieValue, isCookieName, isFieldValue } from "./grammar.mjs";
import { parseCookieHeader } from "@red-cup-engineering/code-http-cookie-service";
export { parseCookieHeader };



export function serializeCookieHeader(
  cookies: Readonly<Record<string, string>>,
  encode: (value: string) => string = encodeURIComponent,
): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(cookies)) {
    assertCookieName(name);
    const encoded = encode(value);
    if (!isFieldValue(encoded)) {
      throw new TypeError(`serializeCookieHeader: encoded value for ${name} contains invalid characters`);
    }
    parts.push(`${name}=${encoded}`);
  }
  return parts.join("; ");
}
