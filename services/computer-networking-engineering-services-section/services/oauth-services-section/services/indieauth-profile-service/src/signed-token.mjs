/**
 * Self-contained bearer tokens: an IndieAuth server with no token store. A token is
 * `base64url(claims).base64url(HMAC-SHA-256(secret, base64url(claims)))`; the claims ride inside it, so a
 * resource server holding the secret verifies without a database or a call to the token endpoint
 * (IndieAuth leaves the token format opaque to clients, 5.2). The secret is the caller's and is never
 * read from the environment here. Such tokens are valid until they expire -- there is no revocation
 * without a store, so keep `ttlSeconds` short (use refresh through the store-backed server for more).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const MIN_SECRET_BYTES = 32;

const sign = (secret, payload) => createHmac("sha256", secret).update(payload).digest("base64url");

function checkSecret(secret) {
  const bytes = Buffer.isBuffer(secret) ? secret.length : typeof secret === "string" ? Buffer.byteLength(secret) : 0;
  if (bytes < MIN_SECRET_BYTES) throw new TypeError(`the signing secret must be at least ${MIN_SECRET_BYTES} bytes`);
}

/** A scope as a sorted list of distinct tokens (RFC 6749 3.3: space-delimited, case-sensitive). */
export function normalizeScope(scope) {
  return [...new Set((Array.isArray(scope) ? scope : String(scope ?? "").split(/\s+/u)).filter(Boolean))].sort();
}

/** Whether `claims.scope` includes `scope`. */
export const tokenHasScope = (claims, scope) => normalizeScope(claims?.scope).includes(scope);

/** The token of an `Authorization: Bearer` header (RFC 6750 2.1), or null. */
export function bearerFromHeader(header) {
  const match = /^Bearer +([A-Za-z0-9._~+/-]+=*)$/iu.exec(String(header ?? "").trim());
  return match ? match[1] : null;
}

/** Mint a token for `{ me, client_id, scope }`. Returns `{ token, claims, response }`, the response being the token endpoint's JSON. */
export function mintSignedToken({ me, client_id, scope }, secret, { ttlSeconds = 3600, now = () => Date.now() } = {}) {
  checkSecret(secret);
  if (typeof me !== "string" || typeof client_id !== "string") throw new TypeError("a token names its profile (me) and client");
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) throw new RangeError("ttlSeconds must be a positive integer");
  const iat = Math.floor(now() / 1000);
  const claims = Object.freeze({ me, client_id, scope: normalizeScope(scope).join(" "), iat, exp: iat + ttlSeconds });
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const token = `${payload}.${sign(secret, payload)}`;
  return Object.freeze({ token, claims, response: Object.freeze({ access_token: token, token_type: "Bearer", expires_in: ttlSeconds, ...(claims.scope ? { scope: claims.scope } : {}), me }) });
}

/** Verify a token: `{ valid: true, claims }` or `{ valid: false, reason }`. The signature is compared in constant time before the claims are read. */
export function verifySignedToken(token, secret, { now = () => Date.now() } = {}) {
  checkSecret(secret);
  if (typeof token !== "string") return { valid: false, reason: "no token" };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed token" };
  const expected = Buffer.from(sign(secret, parts[0]));
  const given = Buffer.from(parts[1]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { valid: false, reason: "bad signature" };
  let claims;
  try { claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")); } catch { return { valid: false, reason: "malformed claims" }; }
  if (!Number.isInteger(claims?.exp) || typeof claims.me !== "string") return { valid: false, reason: "malformed claims" };
  if (claims.exp <= Math.floor(now() / 1000)) return { valid: false, reason: "expired" };
  return { valid: true, claims: Object.freeze(claims) };
}

/** A resource server's `verifyToken` for these tokens: `{ me, client_id, scope }` or null (Micropub's and Microsub's contract). */
export function signedTokenVerifier(secret, options) {
  checkSecret(secret);
  return async (token) => {
    const result = verifySignedToken(token, secret, options);
    return result.valid ? Object.freeze({ me: result.claims.me, client_id: result.claims.client_id, scope: result.claims.scope }) : null;
  };
}
