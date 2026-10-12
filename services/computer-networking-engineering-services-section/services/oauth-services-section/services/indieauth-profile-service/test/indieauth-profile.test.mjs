import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import {
  canonicalizeProfileInput,
  discoverIndieAuthProfile,
  discoverRelMe,
  indieAuthApp,
  indieAuthProfileLinkHeader,
  resolveIndieAuthClient,
  validateClientId,
  validateIndieAuthRedirectUri,
  validateProfileUrl,
  validateReturnedProfile,
  verifyReciprocalRelMe,
} from "../src/indieauth-profile.mjs";

function response(body, { status = 200, url, contentType = "text/html", link } = {}) {
  const headers = new Headers({ "content-type": contentType });
  if (link) headers.set("link", link);
  return { status, url, headers, async text() { return body; } };
}

function routeFetch(routes, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    const value = routes.get(url);
    if (!value) throw new Error(`unexpected fetch ${url}`);
    return typeof value === "function" ? value(url, init) : value;
  };
}

function context(method, url, form) {
  const body = form === undefined ? [] : [new URLSearchParams(form).toString()];
  const req = Readable.from(body);
  req.method = method;
  req.headers = form === undefined ? {} : { "content-type": "application/x-www-form-urlencoded" };
  return { req, url: new URL(url), locals: {} };
}

function appFixture() {
  const clientId = "https://client.example/app.json";
  const fetchImpl = routeFetch(new Map([[clientId, response(JSON.stringify({
    client_id: clientId,
    client_name: "Example client",
    client_uri: "https://client.example/",
    redirect_uris: ["https://client.example/callback"],
    token_endpoint_auth_method: "none",
  }), { url: clientId, contentType: "application/json" })]]));
  const app = indieAuthApp({
    profileUrl: "https://person.example/",
    issuer: "https://auth.example/",
    scopes: ["create", "profile"],
    fetchImpl,
    authenticate: () => ({ subject: "person", name: "Person" }),
    loginUrl: (returnTo) => `/login?return_to=${encodeURIComponent(returnTo)}`,
  });
  return { app, clientId };
}

/** Walk an authorization request through the consent page, approving or denying it. */
async function consented(app, query, decision = "approve") {
  const page = await resource(app, "oauth.authorize").handler(context("GET", `https://auth.example/indieauth/authorize?${query}`));
  if (page.status !== 200) return page;
  const request = /name="request" value="([^"]+)"/u.exec(page.body)[1];
  return resource(app, "oauth.authorize").handler(context("POST", "https://auth.example/indieauth/authorize", { request, decision }));
}

function resource(app, id) {
  return app.resources.find((candidate) => candidate.id === id);
}

test("validates IndieAuth profile and client identifiers without conflating input convenience", () => {
  assert.equal(validateProfileUrl("example.com").valid, false);
  assert.equal(canonicalizeProfileInput("Example.COM"), "https://example.com/");
  assert.equal(validateProfileUrl("https://example.com/users?id=1").valid, true);
  for (const invalid of [
    "mailto:user@example.com",
    "https://user:pass@example.com/",
    "https://example.com:8443/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://example.com/#me",
    "https://example.com/a/../b",
  ]) assert.equal(validateProfileUrl(invalid).valid, false, invalid);

  assert.equal(validateClientId("http://127.0.0.1:3210/client").loopback, true);
  assert.equal(validateClientId("http://[::1]:3210/client").loopback, true);
  assert.equal(validateClientId("https://192.0.2.1/client").valid, false);
  assert.equal(validateClientId("https://client.example/app").valid, true);
});

test("discovers metadata with HTTP Link precedence and validates its issuer and endpoints", async () => {
  const calls = [];
  const fetchImpl = routeFetch(new Map([
    ["https://person.example/", response(`<link rel="indieauth-metadata" href="https://wrong.example/meta">`, {
      url: "https://person.example/",
      link: `<https://auth.example/.well-known/oauth-authorization-server>; rel="indieauth-metadata"`,
    })],
    ["https://auth.example/.well-known/oauth-authorization-server", response(JSON.stringify({
      issuer: "https://auth.example/",
      authorization_endpoint: "https://auth.example/authorize",
      token_endpoint: "https://auth.example/token",
      code_challenge_methods_supported: ["S256"],
    }), { url: "https://auth.example/.well-known/oauth-authorization-server", contentType: "application/json; charset=utf-8" })],
  ]), calls);
  const result = await discoverIndieAuthProfile("https://person.example/", { fetchImpl });
  assert.equal(result.source, "indieauth-metadata");
  assert.equal(result.metadataEndpoint, "https://auth.example/.well-known/oauth-authorization-server");
  assert.equal(result.issuer, "https://auth.example/");
  assert.equal(result.authorizationEndpoint, "https://auth.example/authorize");
  assert.equal(result.tokenEndpoint, "https://auth.example/token");
  assert.deepEqual(calls.map(({ init }) => init.redirect), ["follow", "follow"]);
});

test("supports legacy endpoint relations while keeping metadata validation strict", async () => {
  const legacy = await discoverIndieAuthProfile("https://person.example/", {
    fetchImpl: routeFetch(new Map([["https://person.example/", response(`
      <base href="https://login.example/">
      <link rel="authorization_endpoint" href="authorize">
      <link rel="token_endpoint" href="token">`, { url: "https://person.example/" })]])),
  });
  assert.equal(legacy.source, "legacy-rel");
  assert.equal(legacy.authorizationEndpoint, "https://login.example/authorize");
  assert.equal(legacy.tokenEndpoint, "https://login.example/token");

  await assert.rejects(() => discoverIndieAuthProfile("https://person.example/", {
    fetchImpl: routeFetch(new Map([
      ["https://person.example/", response(`<link rel="indieauth-metadata" href="https://auth.example/meta">`, { url: "https://person.example/" })],
      ["https://auth.example/meta", response(`{"issuer":"https://other.example/","authorization_endpoint":"https://auth.example/authorize"}`, { url: "https://auth.example/meta", contentType: "application/json" })],
    ])),
  }), { code: "INDIEAUTH_METADATA_INVALID" });
});

test("resolves client ID metadata into the active OAuth client-record contract", async () => {
  const calls = [];
  const clientId = "https://client.example/apps/reader.json";
  const result = await resolveIndieAuthClient(clientId, {
    fetchImpl: routeFetch(new Map([[clientId, response(JSON.stringify({
      client_id: clientId,
      client_name: "Reader",
      client_uri: "https://client.example/apps/",
      logo_uri: "reader.svg",
      redirect_uris: ["callback", "https://client.example/other-callback"],
      token_endpoint_auth_method: "none",
    }), { url: clientId, contentType: "application/vnd.example.client+json" })]]), calls),
  });
  assert.equal(result.clientName, "Reader");
  assert.deepEqual(result.oauthClient, {
    client_id: clientId,
    redirect_uris: ["https://client.example/apps/callback", "https://client.example/other-callback"],
  });
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(validateIndieAuthRedirectUri(result, "https://client.example/apps/callback"), "https://client.example/apps/callback");
  assert.throws(() => validateIndieAuthRedirectUri(result, "https://client.example/unregistered"), { code: "INDIEAUTH_REDIRECT_INVALID" });
});

test("uses custody for loopback clients and rejects client secrets and oversized network documents", async () => {
  const loopback = "http://127.0.0.1:3210/client";
  const held = await resolveIndieAuthClient(loopback, {
    fetchImpl: async () => { throw new Error("must not fetch"); },
    custody: { async get(clientId) { return { client_id: clientId, redirect_uris: ["http://127.0.0.1:3210/callback"] }; } },
  });
  assert.equal(held.source, "custody");
  assert.equal(held.redirectUris[0], "http://127.0.0.1:3210/callback");

  await assert.rejects(() => resolveIndieAuthClient(loopback, { fetchImpl: async () => { throw new Error("must not fetch"); } }), {
    code: "INDIEAUTH_CLIENT_FETCH_FORBIDDEN",
  });
  await assert.rejects(() => resolveIndieAuthClient("https://client.example/client.json", {
    fetchImpl: routeFetch(new Map([["https://client.example/client.json", response(JSON.stringify({
      client_id: "https://client.example/client.json", client_secret: "published-secret",
    }), { url: "https://client.example/client.json", contentType: "application/json" })]])),
  }), { code: "INDIEAUTH_CLIENT_METADATA_INVALID" });
  await assert.rejects(() => resolveIndieAuthClient("https://client.example/client.json", {
    fetchImpl: routeFetch(new Map([["https://client.example/client.json", response(JSON.stringify({
      client_id: "https://client.example/client.json", jwks: { keys: [{ kty: "oct", k: "symmetric-secret" }] },
    }), { url: "https://client.example/client.json", contentType: "application/json" })]])),
  }), { code: "INDIEAUTH_CLIENT_METADATA_INVALID" });
  await assert.rejects(() => resolveIndieAuthClient("https://client.example/client.json", {
    maxClientBytes: 8,
    fetchImpl: routeFetch(new Map([["https://client.example/client.json", response("0123456789", { url: "https://client.example/client.json", contentType: "application/json" })]])),
  }), { code: "INDIEAUTH_DOCUMENT_TOO_LARGE" });
});

test("supports legacy redirect links without treating rel=me as redirect authority", async () => {
  const clientId = "https://client.example/app";
  const result = await resolveIndieAuthClient(clientId, {
    fetchImpl: routeFetch(new Map([[clientId, response(`
      <link rel="redirect_uri" href="/callback">
      <a rel="me" href="https://person.example/">person</a>`, {
        url: clientId,
        link: `<https://client.example/header-callback>; rel="redirect_uri"`,
      })]])),
  });
  assert.deepEqual(result.redirectUris, ["https://client.example/callback", "https://client.example/header-callback"]);
  assert.throws(() => validateIndieAuthRedirectUri(result, "https://person.example/"), { code: "INDIEAUTH_REDIRECT_INVALID" });
});

test("verifies reciprocal rel=me and re-discovers changed returned profiles", async () => {
  const routes = new Map([
    ["https://a.example/", response(`<a rel="me" href="https://b.example/">B</a><link rel="authorization_endpoint" href="https://auth.example/authorize">`, { url: "https://a.example/" })],
    ["https://b.example/", response(`<link rel="me" href="https://a.example/"><link rel="authorization_endpoint" href="https://auth.example/authorize">`, { url: "https://b.example/" })],
    ["https://c.example/", response(`<link rel="authorization_endpoint" href="https://other.example/authorize">`, { url: "https://c.example/" })],
  ]);
  const fetchImpl = routeFetch(routes);
  assert.deepEqual((await discoverRelMe("https://a.example/", { fetchImpl })).links, ["https://b.example/"]);
  assert.equal((await verifyReciprocalRelMe("https://a.example/", "https://b.example/", { fetchImpl })).verified, true);
  const original = await discoverIndieAuthProfile("https://a.example/", { fetchImpl });
  assert.equal((await validateReturnedProfile("https://b.example/", original, { fetchImpl })).valid, true);
  assert.equal((await validateReturnedProfile("https://c.example/", original, { fetchImpl })).valid, false);
});

test("profiles the HTTP Link services", () => {
  assert.equal(indieAuthProfileLinkHeader({
    metadataEndpoint: "https://auth.example/.well-known/oauth-authorization-server",
    relMe: ["https://social.example/person"],
  }), `<https://auth.example/.well-known/oauth-authorization-server>; rel="indieauth-metadata", <https://social.example/person>; rel="me"`);
});

test("the IndieAuth server is the one authorization server with the profile's me", async () => {
  const { app, clientId } = appFixture();
  const metadata = JSON.parse(resource(app, "oauth.metadata").handler().body);
  assert.equal(metadata.issuer, "https://auth.example");
  assert.equal(metadata.authorization_endpoint, "https://auth.example/indieauth/authorize");
  assert.equal(metadata.client_id_metadata_document_supported, true);

  const verifier = "a".repeat(64);
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  const query = new URLSearchParams({
    response_type: "code", client_id: clientId, redirect_uri: "https://client.example/callback", state: "local-csrf-state",
    code_challenge: challenge, code_challenge_method: "S256", scope: "profile create delete", me: "https://person.example/",
  });
  const approved = await consented(app, query);
  assert.equal(approved.status, 302);
  const callback = new URL(approved.headers.location);
  assert.equal(callback.searchParams.get("state"), "local-csrf-state");
  assert.equal(callback.searchParams.get("iss"), "https://auth.example");
  const code = callback.searchParams.get("code");

  const token = await resource(app, "oauth.token").handler(context("POST", "https://auth.example/indieauth/token", {
    grant_type: "authorization_code", code, client_id: clientId, redirect_uri: "https://client.example/callback", code_verifier: verifier,
  }));
  const body = JSON.parse(token.body);
  assert.equal(body.me, "https://person.example/");
  assert.equal(body.scope, "create profile");
  assert.deepEqual(await app.verifyIndieAuthToken(body.access_token), { me: "https://person.example/", client_id: clientId, scope: "create profile" });
  assert.equal(await app.verifyIndieAuthToken("nope"), null);

  const replay = await resource(app, "oauth.token").handler(context("POST", "https://auth.example/indieauth/token", {
    grant_type: "authorization_code", code, client_id: clientId, redirect_uri: "https://client.example/callback", code_verifier: verifier,
  }));
  assert.equal(JSON.parse(replay.body).error, "invalid_grant");
});

test("a code granted no scope identifies the person at the authorization endpoint, and nowhere else", async () => {
  const { app, clientId } = appFixture();
  const verifier = "b".repeat(64);
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  const params = (redirectUri, extra = {}) => new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, state: "state", code_challenge: challenge, code_challenge_method: "S256", ...extra });
  const unsafe = await resource(app, "oauth.authorize").handler(context("GET", `https://auth.example/indieauth/authorize?${params("https://attacker.example/callback")}`));
  assert.equal(unsafe.status, 400);
  assert.equal("location" in (unsafe.headers ?? {}), false);

  const redeem = async (endpoint, code) => resource(app, endpoint === "token" ? "oauth.token" : "oauth.authorize").handler(context("POST", `https://auth.example/indieauth/${endpoint === "token" ? "token" : "authorize"}`, {
    grant_type: "authorization_code", code, client_id: clientId, redirect_uri: "https://client.example/callback", code_verifier: verifier,
  }));
  const profileOnly = new URL((await consented(app, params("https://client.example/callback"))).headers.location).searchParams.get("code");
  assert.deepEqual(JSON.parse((await redeem("authorize", profileOnly)).body), { me: "https://person.example/" });
  const another = new URL((await consented(app, params("https://client.example/callback"))).headers.location).searchParams.get("code");
  assert.equal(JSON.parse((await redeem("token", another)).body).error, "invalid_grant");

  const wrongMe = await resource(app, "oauth.authorize").handler(context("GET", `https://auth.example/indieauth/authorize?${params("https://client.example/callback", { me: "https://someone.else/" })}`));
  assert.equal(new URL(wrongMe.headers.location).searchParams.get("error"), "invalid_request");
  const denied = await consented(app, params("https://client.example/callback", { scope: "profile" }), "deny");
  assert.equal(new URL(denied.headers.location).searchParams.get("error"), "access_denied");
  assert.equal(new URL(denied.headers.location).searchParams.get("state"), "state");
});

test("a failed PKCE check spends the code", async () => {
  const { app, clientId } = appFixture();
  const verifier = "c".repeat(64);
  const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
  const query = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: "https://client.example/callback", state: "state", code_challenge: challenge, code_challenge_method: "S256", scope: "create" });
  const code = new URL((await consented(app, query)).headers.location).searchParams.get("code");
  const attempt = (codeVerifier) => resource(app, "oauth.token").handler(context("POST", "https://auth.example/indieauth/token", {
    grant_type: "authorization_code", code, client_id: clientId, redirect_uri: "https://client.example/callback", code_verifier: codeVerifier,
  }));
  assert.equal(JSON.parse((await attempt("d".repeat(64))).body).error, "invalid_grant");
  assert.equal(JSON.parse((await attempt(verifier)).body).error, "invalid_grant");
});
