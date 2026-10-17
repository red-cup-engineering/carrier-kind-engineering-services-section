/**
 * PKCE (RFC 7636), S256 only. IndieAuth makes PKCE mandatory for every authorization request, and
 * `plain` is not offered. A verifier is 43-128 characters of `[A-Za-z0-9-._~]`; its challenge is the
 * unpadded base64url of its SHA-256.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/u;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/u;

/** A fresh code verifier: 32 random octets, base64url (43 characters, RFC 7636 4.1). */
export function generateCodeVerifier(bytes = 32) {
  if (!Number.isInteger(bytes) || bytes < 32 || bytes > 96) throw new RangeError("a code verifier is 32-96 random octets (43-128 characters)");
  return randomBytes(bytes).toString("base64url");
}

/** Whether `value` is a well-formed code verifier. */
export const isValidCodeVerifier = (value) => typeof value === "string" && VERIFIER.test(value);

/** Whether `value` is a well-formed S256 code challenge. */
export const isValidCodeChallenge = (value) => typeof value === "string" && CHALLENGE.test(value);

/** `BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))` (RFC 7636 4.2). */
export function deriveS256Challenge(verifier) {
  if (!isValidCodeVerifier(verifier)) throw new TypeError("a code verifier is 43-128 characters of [A-Za-z0-9-._~]");
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

/** Whether `verifier` answers `challenge`, compared in constant time (RFC 7636 4.6). */
export function verifyS256Challenge(verifier, challenge) {
  if (!isValidCodeVerifier(verifier) || !isValidCodeChallenge(challenge)) return false;
  const derived = Buffer.from(deriveS256Challenge(verifier));
  const given = Buffer.from(challenge);
  return derived.length === given.length && timingSafeEqual(derived, given);
}
