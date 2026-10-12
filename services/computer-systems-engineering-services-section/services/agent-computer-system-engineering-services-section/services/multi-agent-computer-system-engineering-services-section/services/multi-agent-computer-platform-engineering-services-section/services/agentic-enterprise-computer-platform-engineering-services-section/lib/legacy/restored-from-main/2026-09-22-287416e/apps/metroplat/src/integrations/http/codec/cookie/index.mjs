
/**
 * Cookie representation codecs.
 *
 * Three encode/decode pairs are exported here:
 *
 * - cookie request headers, between records and header text
 * - `Set-Cookie` response headers, between cookie records and header values
 * - signed cookie values, between plain values and `value.signature` text
 *
 * These pairs are representation retractions over the grammar they accept:
 * parsing after serialization recovers the semantic value, while parsing alone
 * normalizes the wire form or rejects what does not inhabit the cookie grammar.
 * Transport is not represented here; attaching these texts to request and
 * response objects is the adapter's job.
 *
 * @packageDocumentation
 */

export { parseCookieHeader, serializeCookieHeader } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/cookie.mjs";

export { parseSetCookie, serializeSetCookie } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/cookie.mjs";

export { signCookieValue, unsignCookieValue } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/signed-cookie.mjs";

export { assertCookieName, isCookieName } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/cookie.mjs";
