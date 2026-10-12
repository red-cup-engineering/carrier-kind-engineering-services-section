import { OAuthError } from "@red-cup-engineering/oauth-services-section";
import { remoteJsonWebKeySet, verifyJsonWebToken } from "@red-cup-engineering/oauth-services-section/json-web-token";

/** @type {readonly ["https://accounts.google.com", "accounts.google.com"]} */
export const GOOGLE_ISSUERS = Object.freeze(["https://accounts.google.com", "accounts.google.com"]);
/** @type {"https://www.googleapis.com/oauth2/v3/certs"} */
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

/**
 * @param {{ jwksUrl?: string, fetchImpl?: typeof fetch, cooldownDuration?: number }} [options]
 * @returns {(idToken: string, googleClientId: string) => Promise<Record<string, unknown>>}
 */
export function createGoogleIdTokenVerifier(options = {}) {
  const remoteJwkSet = remoteJsonWebKeySet(options.jwksUrl ?? GOOGLE_JWKS_URL, {
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    ...(options.cooldownDuration === undefined ? {} : { cooldownDuration: options.cooldownDuration }),
  });
  return async (idToken, googleClientId) => {
    const { payload } = await verifyJsonWebToken(idToken, remoteJwkSet, {
      issuer: GOOGLE_ISSUERS,
      audience: googleClientId,
      requiredClaims: ["exp", "iat", "sub"],
    });
    return payload;
  };
}

const verifyGoogleIdToken = createGoogleIdTokenVerifier();

function refused(description) {
  throw new OAuthError("access_denied", description);
}

function assertRegisteredClaims(claims, googleClientId, expectedNonce, now) {
  if (claims === null || typeof claims !== "object") refused("Google id_token validation failed");
  if (!GOOGLE_ISSUERS.includes(claims.iss)) refused("id_token issuer mismatch");
  if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= now() / 1000) refused("id_token expired");
  if (typeof claims.iat !== "number" || !Number.isFinite(claims.iat)) refused("id_token issued-at missing");
  if (typeof claims.sub !== "string" || claims.sub.length === 0) refused("id_token subject missing");
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(googleClientId) || audiences.some((audience) => typeof audience !== "string")) refused("id_token audience mismatch");
  if ((audiences.length > 1 || claims.azp !== undefined) && claims.azp !== googleClientId) refused("id_token authorized party mismatch");
  if (expectedNonce !== undefined && claims.nonce !== expectedNonce) refused("id_token nonce mismatch");
}

function identityFrom(claims) {
  if (typeof claims.email !== "string" || claims.email.length === 0) refused("id_token email missing");
  if (claims.email_verified !== true) refused("id_token email is not verified");
  return { issuer: "https://accounts.google.com", subject: claims.sub, email: claims.email, emailVerified: true, claims };
}

/**
 * @param {string} googleCode
 * @param {{ googleClientId: string, googleClientSecret: string, publicBaseUrl: string, redirectPath?: string, codeVerifier?: string, expectedNonce?: string, verifyIdToken?: (idToken: string, googleClientId: string) => Promise<Record<string, unknown>>, fetchImpl?: typeof fetch, now?: () => number }} config
 * @returns {Promise<{ issuer: string, subject: string, email: string, emailVerified: true, claims: Record<string, unknown>, idToken: string }>}
 */
export async function exchangeGoogleCallback(googleCode, config) {
  const {
    googleClientId,
    googleClientSecret,
    publicBaseUrl,
    redirectPath = "/oauth/google/callback",
    codeVerifier,
    expectedNonce,
    verifyIdToken = verifyGoogleIdToken,
    fetchImpl = fetch,
    now = Date.now,
  } = config;
  const body = new URLSearchParams({
    code: googleCode,
    client_id: googleClientId,
    client_secret: googleClientSecret,
    redirect_uri: `${publicBaseUrl}${redirectPath}`,
    grant_type: "authorization_code",
  });
  if (codeVerifier !== undefined) body.set("code_verifier", codeVerifier);
  const tokenResponse = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!tokenResponse.ok) throw new OAuthError("server_error", "Google token exchange failed");
  const { id_token: idToken } = await tokenResponse.json();
  if (typeof idToken !== "string" || idToken.length === 0) throw new OAuthError("server_error", "Google token response missing id_token");
  let claims;
  try {
    claims = await verifyIdToken(idToken, googleClientId);
  } catch (error) {
    if (error instanceof OAuthError) throw error;
    throw new OAuthError("access_denied", "Google id_token validation failed");
  }
  assertRegisteredClaims(claims, googleClientId, expectedNonce, now);
  return { ...identityFrom(claims), idToken };
}
