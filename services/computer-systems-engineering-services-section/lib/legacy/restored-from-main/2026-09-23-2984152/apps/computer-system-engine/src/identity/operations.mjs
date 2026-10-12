import { makeNiUri, isNiUri, niUriDigest } from "./ni-uri.mjs";
import { encodeCanonical, decodeCanonical } from "./cbor-codec.mjs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

/** The identity operations as request-to-result functions; each is a face of one primitive above. */

/** @param {{bytesBase64?: string, text?: string, algorithm?: string}} request @returns {{uri: string}} */
export function makeNiUriService(request) {
  const hasBytes = typeof request?.bytesBase64 === "string";
  const hasText = typeof request?.text === "string";
  if (hasBytes === hasText) throw new TypeError("exactly one of bytesBase64 or text is required");
  if (request.algorithm !== undefined && request.algorithm !== "sha-256") {
    throw new TypeError(`unsupported ni URI algorithm ${JSON.stringify(request.algorithm)}; only sha-256 is available`);
  }
  const bytes = hasBytes ? Buffer.from(request.bytesBase64, "base64") : Buffer.from(request.text, "utf8");
  return { uri: makeNiUri(bytes) };
}

/** @param {{uri: string}} request @returns {{algorithm: "sha-256", digest: string}} */
export function parseNiUri(request) {
  if (typeof request?.uri !== "string") throw new TypeError("uri must be a string");
  if (!isNiUri(request.uri)) throw new TypeError(`invalid sha-256 ni URI ${JSON.stringify(request.uri)}`);
  return { algorithm: "sha-256", digest: niUriDigest(request.uri) };
}

/** @param {{value: unknown}} request @returns {{base64: string}} */
export function encodeCbor(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { base64: encodeCanonical(request.value).toString("base64") };
}

/** @param {{base64: string}} request @returns {{value: unknown}} */
export function decodeCbor(request) {
  if (typeof request?.base64 !== "string") throw new TypeError("base64 must be a string");
  return { value: decodeCanonical(Buffer.from(request.base64, "base64")) };
}

/** @param {{value: unknown}} request @returns {{text: string}} */
export function canonicalizeJson(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { text: canonicalJson(request.value) };
}
