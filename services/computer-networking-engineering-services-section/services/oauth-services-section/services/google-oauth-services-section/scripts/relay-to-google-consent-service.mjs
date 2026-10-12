// relayToGoogleConsent — pending authorization + google client config -> consent
// redirect URL.
//
// Moved verbatim from the tail of OAuthServer.startAuthorization() in
// organizing-with-the-web/src/oauth-google/oauth.mts: the accounts.google.com
// URL-building block, once mint-authorization-request-service has already
// validated the client/redirect_uri/PKCE method and minted the pending record's
// state token.
//
// scopes/redirectPath/codeChallenge/nonce/prompt/loginHint are NEW (not
// moved): added so a Cloudflare-Worker deployment can drive PKCE and nonce
// through to Google without changing the shape callers already depend on.
// Every new field is optional and every default matches the old hardcoded
// value exactly, so a plain three-argument call still produces the exact
// same URL as before, parameter-for-parameter — see the pinned-output test.

/**
 * @param {{
 *   state: string,
 *   googleClientId: string,
 *   publicBaseUrl: string,
 *   scopes?: readonly string[] | string,
 *   redirectPath?: string,
 *   codeChallenge?: string,
 *   nonce?: string,
 *   accessType?: "online" | "offline",
 *   prompt?: string,
 *   loginHint?: string,
 * }} params
 * @returns {string}
 */
export function relayToGoogleConsent(params) {
  const {
    state,
    googleClientId,
    publicBaseUrl,
    scopes,
    redirectPath = "/oauth/google/callback",
    codeChallenge,
    nonce,
    accessType = "online",
    prompt,
    loginHint,
  } = params;
  const scope = scopes === undefined ? "openid email" : Array.isArray(scopes) ? scopes.join(" ") : scopes;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleClientId);
  url.searchParams.set("redirect_uri", `${publicBaseUrl}${redirectPath}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", accessType);
  if (codeChallenge !== undefined) {
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (nonce !== undefined) url.searchParams.set("nonce", nonce);
  if (prompt !== undefined) url.searchParams.set("prompt", prompt);
  if (loginHint !== undefined) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}
