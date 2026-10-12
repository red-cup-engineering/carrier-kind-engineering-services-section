// integrity — string-oriented digest, HMAC, and timing-safe comparison encodings for
// the JavaScript host. Composes this section's own `sha256` (src/hash.mjs) for the
// SHA-256 family rather than calling node:crypto a second time; sha1Base64 and
// timingSafeStringEqual use node:crypto directly for the one digest algorithm
// hash.mjs does not carry (SHA-1, used only for a legacy encoding) and the one
// constant-time comparison primitive, which has no digest of its own to compose.
//
// Merged 2026-09-11 from the separate `@red-cup-engineering/cryptographic-integrity-
// service` package (deleted), which duplicated this section's SHA-256 host-crypto
// surface — its own `createHash("sha256").update(value, "utf8").digest("hex")` next
// to this section's `sha256(buf)` — under a sibling npm package instead of composing
// this section's src/hash.mjs, in violation of the org-layering rule that a child
// section enriches its parent's capability rather than copying the parent's
// operations into another flat package.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sha256 } from "./hash.mjs";

/** The SHA-256 of bytes, or of text as UTF-8, in lowercase hex. */
export function sha256Hex(value) {
  return sha256(Buffer.from(value, "utf8")).toString("hex");
}

/** The SHA-256 of bytes or UTF-8 text in unpadded base64url (RFC 4648 §5), as PKCE S256 and JWS use it. */
export function sha256Base64Url(value) {
  return sha256(Buffer.from(value, "utf8")).toString("base64url");
}

/** The digest string `sha256:<hex>` of the OCI image specification (algorithm, colon, encoded), over bytes or UTF-8 text. */
export function sha256Digest(value) {
  return `sha256:${sha256Hex(value)}`;
}

export function sha1Base64(value) {
  return createHash("sha1").update(value, "utf8").digest("base64");
}

export function hmacSha256Base64Url(secret, parts) {
  const hmac = createHmac("sha256", secret);
  for (const part of parts) hmac.update(part);
  return hmac.digest("base64url");
}

export function timingSafeStringEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function randomBase64Url(byteLength) {
  if (!Number.isInteger(byteLength) || byteLength <= 0) {
    throw new TypeError("randomBase64Url requires a positive integer byteLength");
  }
  return randomBytes(byteLength).toString("base64url");
}
