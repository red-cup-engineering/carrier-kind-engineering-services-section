/**
 * The IndieAuth client flow (IndieAuth 5): build the authorization request from a discovered profile,
 * verify what returns to the redirect URI, and redeem the code.
 *
 * - {@link createAuthorizationRequest} makes the URL with a fresh `state` and PKCE S256 pair, both
 *   mandatory, and the expectations the response will be checked against.
 * - {@link verifyAuthorizationResponse} refuses an error response, a `state` that is not the one sent,
 *   and an `iss` that is not the discovered issuer (RFC 9207: a client that discovered an `issuer`
 *   MUST reject a response without it, defeating mix-up attacks).
 * - {@link redeemAuthorizationCode} POSTs the code with its verifier. A request that asked for no scope
 *   is redeemed at the authorization endpoint and answers `{ me }`; one that asked for scope is
 *   redeemed at the token endpoint and answers the token with `me`. The returned `me` must be the
 *   profile the flow began with, or one served by the same authorization endpoint.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { deriveS256Challenge, generateCodeVerifier } from "./pkce.mjs";
import { discoverIndieAuthProfile, validateClientId, validateReturnedProfile } from "./indieauth-profile.mjs";

const fail = (code, message) => Object.assign(new Error(message), { code });

const scopeString = (scope) => (Array.isArray(scope) ? scope.join(" ") : String(scope ?? "")).split(/\s+/u).filter(Boolean).join(" ");

function equalSecret(a, b) {
  const left = Buffer.from(String(a ?? ""));
  const right = Buffer.from(String(b ?? ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/**
 * @param discovery a {@link discoverIndieAuthProfile} result.
 * @param options `{ clientId, redirectUri, scope?, me?, state?, codeVerifier? }`; `me` is the profile hint, defaulting to the discovered profile.
 * @returns `{ url, state, codeVerifier, expected }`, to keep until the user returns.
 */
export function createAuthorizationRequest(discovery, options) {
  const client = validateClientId(options?.clientId);
  if (!client.valid) throw fail("INDIEAUTH_CLIENT_ID_INVALID", client.reason);
  let redirect;
  try { redirect = new URL(options.redirectUri); } catch { throw fail("INDIEAUTH_REDIRECT_INVALID", "redirect_uri must be an absolute URL"); }
  const state = options.state ?? randomBytes(16).toString("base64url");
  const codeVerifier = options.codeVerifier ?? generateCodeVerifier();
  const scope = scopeString(options.scope);
  const url = new URL(discovery.authorizationEndpoint);
  const params = {
    response_type: "code", client_id: client.url, redirect_uri: redirect.href, state,
    code_challenge: deriveS256Challenge(codeVerifier), code_challenge_method: "S256",
    ...(scope ? { scope } : {}), me: options.me ?? discovery.profileUrl,
  };
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return Object.freeze({
    url: url.href, state, codeVerifier,
    expected: Object.freeze({ clientId: client.url, redirectUri: redirect.href, scope, issuer: discovery.issuer, authorizationEndpoint: discovery.authorizationEndpoint, tokenEndpoint: discovery.tokenEndpoint, discovery }),
  });
}

/** Check the redirect's query against the request; returns `{ code }` or throws. */
export function verifyAuthorizationResponse(query, request) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query);
  if (params.has("error")) throw fail("INDIEAUTH_AUTHORIZATION_DENIED", `${params.get("error")}${params.get("error_description") ? `: ${params.get("error_description")}` : ""}`);
  if (!equalSecret(params.get("state"), request.state)) throw fail("INDIEAUTH_STATE_MISMATCH", "state does not match the request");
  const issuer = request.expected.issuer;
  if (issuer && params.get("iss") !== issuer) throw fail("INDIEAUTH_ISSUER_MISMATCH", params.has("iss") ? "iss is not the discovered issuer" : "the response lacks the iss parameter");
  const code = params.get("code");
  if (!code) throw fail("INDIEAUTH_CODE_MISSING", "the response carries no code");
  return Object.freeze({ code });
}

/** Redeem `code`; resolves to `{ me, ...tokenResponse }` with `me` validated, or throws. */
export async function redeemAuthorizationCode(request, code, options = {}) {
  const { expected } = request;
  const endpoint = expected.scope ? expected.tokenEndpoint : expected.authorizationEndpoint;
  if (!endpoint) throw fail("INDIEAUTH_ENDPOINT_MISSING", expected.scope ? "the server advertises no token endpoint" : "the server advertises no authorization endpoint");
  if (typeof options.fetchImpl !== "function") throw fail("INDIEAUTH_FETCH_REQUIRED", "redeeming a code requires an injected fetchImpl");
  const admit = options.admitFetch ?? (() => true);
  if (await admit(endpoint, Object.freeze({ purpose: "code redemption" })) !== true) throw fail("INDIEAUTH_FETCH_DENIED", "fetch policy denied code redemption");
  const response = await options.fetchImpl(endpoint, {
    method: "POST", redirect: "error",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: expected.clientId, redirect_uri: expected.redirectUri, code_verifier: request.codeVerifier }).toString(),
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw fail("INDIEAUTH_REDEMPTION_INVALID", "the server answered with a body that is not JSON"); }
  if (response.status !== 200 || body === null || typeof body !== "object") throw fail("INDIEAUTH_REDEMPTION_REFUSED", `${body?.error ?? "redemption failed"} (HTTP ${response.status})`);
  if (typeof body.me !== "string") throw fail("INDIEAUTH_REDEMPTION_INVALID", "the response lacks me");
  if (expected.scope && typeof body.access_token !== "string") throw fail("INDIEAUTH_REDEMPTION_INVALID", "the response lacks access_token");
  const verified = await validateReturnedProfile(body.me, expected.discovery, options);
  if (!verified.valid) throw fail("INDIEAUTH_PROFILE_MISMATCH", verified.reason ?? "the returned profile is not the one signed in");
  return Object.freeze({ ...body, me: verified.profileUrl });
}

export { discoverIndieAuthProfile };
