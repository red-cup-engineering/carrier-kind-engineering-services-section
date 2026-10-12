/**
 * JavaScript host cryptographic encodings.
 *
 * These helpers are the host-runtime leaf for auth-surface cryptography (HMAC,
 * nonces, timing-safe comparison, non-identity hashes). Content identity —
 * canonicalBytes, digest, contentAddress — lives in lib/identity. Relational material asks for a stable commitment or a
 * timing-safe comparison; this leaf records that Node's crypto implementation is
 * the concrete JavaScript host codec used to produce it.
 *
 * Every export here is a deterministic hash/HMAC/timing-safe transformation.
 * The one nondeterministic member of this leaf, `randomBase64Url`, lives in
 * the sibling `./generate-random.mjs` instead, named for its effect, so this
 * module's purity never depends on the host CSPRNG.
 *
 * @packageDocumentation
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sha256Base64Url(value) {
  return createHash("sha256").update(value, "utf8").digest("base64url");
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
