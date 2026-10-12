// validateBearerToken — token + token state -> identity claims | null.
//
// Moved verbatim from OAuthServer.validateToken() in
// organizing-with-the-web/src/oauth-google/oauth.mts. The class's private
// `tokens` Map becomes an explicit parameter (state in, state out): the caller
// still owns the store, this function only performs the lookup-and-shape
// transformation.

/**
 * @param {string} token
 * @param {Map<string, { client_id: string, email: string, expires_at: number }>} tokens
 * @param {number} [now]
 * @returns {{ client_id: string, email: string, issuer?: string, subject?: string } | null}
 */
export function validateBearerToken(token, tokens, now = Date.now()) {
  const record = tokens.get(token);
  if (!Number.isFinite(now) || !record || typeof record.client_id !== "string" || record.client_id.length === 0 || typeof record.email !== "string" || record.email.length === 0 || !Number.isFinite(record.expires_at) || record.expires_at <= now) return null;
  const hasIssuer = Object.hasOwn(record, "issuer"), hasSubject = Object.hasOwn(record, "subject");
  if (hasIssuer !== hasSubject || (hasIssuer && (typeof record.issuer !== "string" || record.issuer.length === 0 || typeof record.subject !== "string" || record.subject.length === 0))) return null;
  return {
    client_id: record.client_id,
    email: record.email,
    ...(hasIssuer
      ? { issuer: record.issuer, subject: record.subject }
      : {}),
  };
}
