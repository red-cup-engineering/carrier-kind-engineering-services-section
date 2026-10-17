// IndieAuth (W3C, https://www.w3.org/TR/indieauth/) conformance: PKCE (RFC 7636), the client flow
// (5), self-contained tokens, and the server's authorization, token, introspection (6) and metadata.
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { createAuthorizationRequest, redeemAuthorizationCode, verifyAuthorizationResponse } from "../src/client.mjs";
import { indieAuthApp } from "../src/indieauth-app.mjs";
import { deriveS256Challenge, generateCodeVerifier, isValidCodeChallenge, isValidCodeVerifier, verifyS256Challenge } from "../src/pkce.mjs";
import { bearerFromHeader, mintSignedToken, normalizeScope, signedTokenVerifier, tokenHasScope, verifySignedToken } from "../src/signed-token.mjs";

test("RFC 7636 Appendix B: the published verifier derives the published challenge", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
  assert.equal(deriveS256Challenge(verifier), challenge);
  assert.equal(verifyS256Challenge(verifier, challenge), true);
  assert.equal(verifyS256Challenge(verifier, challenge.replace(/.$/u, "A")), false);
  assert.equal(verifyS256Challenge("short", challenge), false);
});
test("verifiers are 43-128 characters of the unreserved set; generated ones are fresh and valid", () => {
  const a = generateCodeVerifier();
  assert.ok(isValidCodeVerifier(a) && a.length === 43);
  assert.notEqual(a, generateCodeVerifier());
  assert.equal(isValidCodeVerifier("a".repeat(42)), false);
  assert.equal(isValidCodeVerifier("a".repeat(129)), false);
  assert.equal(isValidCodeVerifier(`${"a".repeat(43)}!`), false);
  assert.equal(isValidCodeChallenge(deriveS256Challenge(a)), true);
  assert.throws(() => deriveS256Challenge("plain"), /43-128/);
  assert.throws(() => generateCodeVerifier(8), /32-96/);
});

const SECRET = "0123456789abcdef0123456789abcdef";
test("signed tokens carry their claims, expire, and refuse tampering and short secrets", () => {
  const now = () => 1_800_000_000_000;
  const { token, claims, response } = mintSignedToken({ me: "https://me.example/", client_id: "https://app.example/", scope: "update create create" }, SECRET, { ttlSeconds: 60, now });
  assert.deepEqual([claims.scope, claims.exp - claims.iat], ["create update", 60]);
  assert.deepEqual([response.token_type, response.me, response.expires_in], ["Bearer", "https://me.example/", 60]);
  assert.equal(verifySignedToken(token, SECRET, { now }).valid, true);
  assert.deepEqual(verifySignedToken(token, SECRET, { now: () => 1_800_000_061_000 }), { valid: false, reason: "expired" });
  assert.equal(verifySignedToken(token, `${SECRET}x`, { now }).reason, "bad signature");
  const [payload, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ ...claims, scope: "delete" })).toString("base64url");
  assert.equal(verifySignedToken(`${forged}.${signature}`, SECRET, { now }).reason, "bad signature");
  assert.equal(verifySignedToken(`${payload}`, SECRET, { now }).reason, "malformed token");
  assert.throws(() => mintSignedToken({ me: "https://me.example/", client_id: "c" }, "short"), /at least 32 bytes/);
  assert.equal(tokenHasScope(claims, "update"), true);
  assert.equal(tokenHasScope(claims, "media"), false);
  assert.deepEqual(normalizeScope("b a  b"), ["a", "b"]);
  assert.equal(bearerFromHeader("Bearer abc.def"), "abc.def");
  assert.equal(bearerFromHeader("Basic abc"), null);
});
test("a resource server's verifier answers Micropub's contract: { me, client_id, scope } or null", async () => {
  const now = () => 1_800_000_000_000;
  const { token } = mintSignedToken({ me: "https://me.example/", client_id: "https://app.example/", scope: "create" }, SECRET, { now });
  const verify = signedTokenVerifier(SECRET, { now });
  assert.deepEqual({ ...(await verify(token)) }, { me: "https://me.example/", client_id: "https://app.example/", scope: "create" });
  assert.equal(await verify("garbage"), null);
});

// -- the whole flow against the IndieAuth server of this package -------------------------------------
const PROFILE = "https://person.example/";
const ISSUER = "https://auth.example";
const CLIENT = "https://app.example/";
const CALLBACK = "https://app.example/callback";

function serverFixture() {
  const app = indieAuthApp({
    profileUrl: PROFILE, issuer: ISSUER, scopes: ["create", "profile"],
    authenticate: () => ({ subject: "person", name: "Person" }), loginUrl: (r) => `/login?r=${encodeURIComponent(r)}`,
    fetchImpl: async () => ({ status: 200, url: CLIENT, headers: new Headers({ "content-type": "application/json" }), async text() { return JSON.stringify({ client_id: CLIENT, client_name: "App", redirect_uris: [CALLBACK] }); } }),
  });
  const ctx = (method, target, body, headers = {}) => {
    const url = new URL(target, ISSUER);
    const req = Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(body)]), { method, url: `${url.pathname}${url.search}`, headers: { ...(body === undefined ? {} : { "content-type": "application/x-www-form-urlencoded" }), ...headers } });
    return { req, url, locals: {} };
  };
  const call = (method, target, body, headers) => app.resources.find((r) => r.match === new URL(target, ISSUER).pathname && r.methods.includes(method)).handler(ctx(method, target, body, headers));
  // the network seen by the client: the server's own endpoints
  const fetchImpl = async (url, init) => {
    const r = await call(init.method, url, init.body);
    return { status: r.status ?? 200, async text() { return r.body; } };
  };
  return { app, call, fetchImpl };
}
const discovery = { profileUrl: PROFILE, issuer: ISSUER, authorizationEndpoint: `${ISSUER}/indieauth/authorize`, tokenEndpoint: `${ISSUER}/indieauth/token` };
const approve = async (call, url) => {
  const target = new URL(url);
  const consent = await call("GET", `${target.pathname}${target.search}`);
  const requestId = /name="request" value="([^"]+)"/u.exec(consent.body)[1];
  const approved = await call("POST", "/indieauth/authorize", new URLSearchParams({ request: requestId, decision: "approve" }).toString());
  return new URL(approved.headers.location).searchParams;
};

test("5.1: the authorization request carries code, client, redirect, state and a mandatory S256 challenge", () => {
  const request = createAuthorizationRequest(discovery, { clientId: CLIENT, redirectUri: CALLBACK, scope: ["create", "profile"] });
  const q = new URL(request.url).searchParams;
  assert.deepEqual([q.get("response_type"), q.get("client_id"), q.get("redirect_uri"), q.get("code_challenge_method"), q.get("scope"), q.get("me")], ["code", CLIENT, CALLBACK, "S256", "create profile", PROFILE]);
  assert.equal(q.get("code_challenge"), deriveS256Challenge(request.codeVerifier));
  assert.equal(q.get("state"), request.state);
  assert.throws(() => createAuthorizationRequest(discovery, { clientId: "http://127.0.0.2/", redirectUri: CALLBACK }), /loopback/);
  assert.throws(() => createAuthorizationRequest(discovery, { clientId: CLIENT, redirectUri: "not a url" }), /absolute URL/);
});
test("5.2: the response must echo the state and the discovered iss; a denial or foreign issuer is refused", () => {
  const request = createAuthorizationRequest(discovery, { clientId: CLIENT, redirectUri: CALLBACK });
  const ok = new URLSearchParams({ code: "c", state: request.state, iss: ISSUER });
  assert.deepEqual({ ...verifyAuthorizationResponse(ok, request) }, { code: "c" });
  assert.throws(() => verifyAuthorizationResponse(new URLSearchParams({ code: "c", state: "other", iss: ISSUER }), request), { code: "INDIEAUTH_STATE_MISMATCH" });
  assert.throws(() => verifyAuthorizationResponse(new URLSearchParams({ code: "c", state: request.state }), request), { code: "INDIEAUTH_ISSUER_MISMATCH" });
  assert.throws(() => verifyAuthorizationResponse(new URLSearchParams({ code: "c", state: request.state, iss: "https://evil.example" }), request), { code: "INDIEAUTH_ISSUER_MISMATCH" });
  assert.throws(() => verifyAuthorizationResponse(new URLSearchParams({ error: "access_denied", state: request.state, iss: ISSUER }), request), { code: "INDIEAUTH_AUTHORIZATION_DENIED" });
  assert.throws(() => verifyAuthorizationResponse(new URLSearchParams({ state: request.state, iss: ISSUER }), request), { code: "INDIEAUTH_CODE_MISSING" });
});
test("authentication only: a request with no scope is redeemed at the authorization endpoint for { me }", async () => {
  const { call, fetchImpl } = serverFixture();
  const request = createAuthorizationRequest(discovery, { clientId: CLIENT, redirectUri: CALLBACK });
  const { code } = verifyAuthorizationResponse(await approve(call, request.url), request);
  const result = await redeemAuthorizationCode(request, code, { fetchImpl });
  assert.equal(result.me, PROFILE);
  assert.equal(result.access_token, undefined);
  await assert.rejects(redeemAuthorizationCode(request, code, { fetchImpl }), { code: "INDIEAUTH_REDEMPTION_REFUSED" }, "a code is single-use");
});
test("authorization: a scoped request yields a token with me, which the introspection endpoint verifies (6)", async () => {
  const { call, fetchImpl } = serverFixture();
  const request = createAuthorizationRequest(discovery, { clientId: CLIENT, redirectUri: CALLBACK, scope: "create" });
  const { code } = verifyAuthorizationResponse(await approve(call, request.url), request);
  const token = await redeemAuthorizationCode(request, code, { fetchImpl });
  assert.deepEqual([token.me, token.scope, token.token_type], [PROFILE, "create", "Bearer"]);
  const verified = JSON.parse((await call("POST", "/indieauth/introspect", new URLSearchParams({ token: token.access_token }).toString(), { authorization: `Bearer ${token.access_token}` })).body);
  assert.deepEqual([verified.active, verified.me, verified.client_id, verified.scope], [true, PROFILE, CLIENT, "create"]);
});
test("a wrong code_verifier cannot redeem a code", async () => {
  const { call, fetchImpl } = serverFixture();
  const request = createAuthorizationRequest(discovery, { clientId: CLIENT, redirectUri: CALLBACK });
  const { code } = verifyAuthorizationResponse(await approve(call, request.url), request);
  await assert.rejects(redeemAuthorizationCode({ ...request, codeVerifier: generateCodeVerifier() }, code, { fetchImpl }), { code: "INDIEAUTH_REDEMPTION_REFUSED" });
});
test("a server that answers with another person's profile is refused", async () => {
  const request = createAuthorizationRequest(discovery, { clientId: CLIENT, redirectUri: CALLBACK });
  const fetchImpl = async () => ({ status: 200, async text() { return JSON.stringify({ me: "https://attacker.example/" }); } });
  await assert.rejects(redeemAuthorizationCode(request, "c", { fetchImpl }), { code: "INDIEAUTH_PROFILE_MISMATCH" });
});
test("server metadata advertises the endpoints IndieAuth 4.1.1 requires", async () => {
  const { app } = serverFixture();
  assert.deepEqual([app.metadata.issuer, app.metadata.authorization_endpoint, app.metadata.token_endpoint, app.metadata.introspection_endpoint],
    [ISSUER, `${ISSUER}/indieauth/authorize`, `${ISSUER}/indieauth/token`, `${ISSUER}/indieauth/introspect`]);
  assert.deepEqual(app.metadata.code_challenge_methods_supported, ["S256"]);
  assert.equal(app.metadata.authorization_response_iss_parameter_supported, true);
});
