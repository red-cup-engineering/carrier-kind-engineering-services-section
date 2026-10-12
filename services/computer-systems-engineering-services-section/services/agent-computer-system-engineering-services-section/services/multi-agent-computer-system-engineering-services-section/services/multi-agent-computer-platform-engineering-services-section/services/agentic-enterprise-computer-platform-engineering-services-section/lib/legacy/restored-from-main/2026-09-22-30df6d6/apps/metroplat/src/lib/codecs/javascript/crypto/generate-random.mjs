/**
 * JavaScript host cryptographic randomness — the one effectful export
 * `./index.mjs` used to carry alongside its pure hash/HMAC/timing-safe
 * codecs. Nondeterministic (reads the host CSPRNG), so it is split out here,
 * named for its effect, rather than sharing a module with pure
 * transformations whose purity would otherwise depend on it.
 *
 * @packageDocumentation
 */

import { randomBytes } from "node:crypto";

/** A fresh random token, base64url-encoded, `byteLength` bytes of host entropy. */
export function randomBase64Url(byteLength) {
  return randomBytes(byteLength).toString("base64url");
}
