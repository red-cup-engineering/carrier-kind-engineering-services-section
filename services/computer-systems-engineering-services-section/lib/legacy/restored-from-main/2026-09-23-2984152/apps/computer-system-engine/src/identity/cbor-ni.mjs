import { decodeCanonical, encodeCanonical } from "./cbor-codec.mjs";
import { makeNiUri } from "./ni-uri.mjs";

/**
 * Name one canonical CBOR byte string.
 *
 * Input: RFC 8949 core-deterministic CBOR bytes representing already-admitted
 * application material. Output: the RFC 6920 SHA-256 `ni:` URI for those exact
 * bytes. It deliberately does not admit a term, normalize a carrier, or encode
 * CBOR; those are separate transformations.
 */
export function canonicalCborToNiUri(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("canonical CBOR must be a Uint8Array");
  }
  const canonical = Buffer.from(bytes);
  decodeCanonical(canonical);
  return makeNiUri(canonical);
}

/**
 * Names the canonical CBOR encoding of an admitted carrier value with its ni: URI.
 * @param {{value: unknown}} request
 * @returns {{uri: string}}
 */
export function deriveCborNi(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { uri: canonicalCborToNiUri(encodeCanonical(request.value)) };
}
