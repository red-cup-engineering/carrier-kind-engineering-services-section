import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import { admissibleRedirectUri, createAuthorizationServer } from "../src/authorization-server.mjs";

const ISSUER = "https://garden.test";
const RESOURCE = "https://garden.test/mcp";

function request(method, target, { body, headers = {} } = {}) {
  const url = new URL(target, ISSUER);
  const payload = body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))];
  const req = Object.assign(Readable.from(payload), { method, url: `${url.pathname}${url.search}`, headers: { ...(body === undefined ? {} : { "content-type": typeof body === "string" ? "application/x-www-form-urlencoded" : "application/json" }), ...headers } });
  return { req, url };
}

function harness({ signedIn = { subject: "reader@garden.test", email: "reader@garden.test" } } = {}) {
  const session = { principal: signedIn };
  const server = createAuthorizationServer({
    issuer: ISSUER,
    name: "Garden",
    resources: [RESOURCE],
    authenticate: () => session.principal,
    loginUrl: (returnTo) => `/login?return=${encodeURIComponent(returnTo)}`,
    admit: (principal) => principal.subject !== "stranger",
  });
  const route = (method, target, options) => {
    const ctx = request(method, target, options);
    const found = server.app.resources.find((resource) => resource.match === ctx.url.pathname && resource.methods.includes(method));
    assert.ok(found, `${method} ${ctx.url.pathname} is served`);
    return found.handler(ctx);
  };
  return { server, session, route };
}

const pkce = () => { const verifier = crypto.randomBytes(32).toString("base64url"); return { verifier, challenge: crypto.createHash("sha256").update(verifier).digest("base64url") }; };
const form = (values) => new URLSearchParams(values).toString();
const json = (repr) => JSON.parse(repr.body);

test("metadata documents describe the issuer and the protected resource", async () => {
  const { route } = harness();
  const metadata = json(await route("GET", "/.well-known/oauth-authorization-server"));
  assert.equal(metadata.issuer, ISSUER);
  assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
  assert.equal(metadata.registration_endpoint, `${ISSUER}/oauth/register`);
  const resource = json(await route("GET", "/.well-known/oauth-protected-resource/mcp"));
  assert.deepEqual(resource.authorization_servers, [ISSUER]);
  assert.equal(resource.resource, RESOURCE);
  assert.equal(json(await route("GET", "/.well-known/oauth-protected-resource")).resource, RESOURCE);
});

test("a registered public client signs a person in, is consented, and redeems a resource-bound token", async () => {
  const { server, session, route } = harness();
  const registered = await route("POST", "/oauth/register", { body: { client_name: "ChatGPT", redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"] } });
  assert.equal(registered.status, 201);
  const client = json(registered);
  assert.equal(client.client_secret, undefined);
  assert.equal((await route("POST", "/oauth/register", { body: { redirect_uris: ["http://evil.test/cb"] } })).status, 400);

  const { verifier, challenge } = pkce();
  const authorize = `/oauth/authorize?${form({ response_type: "code", client_id: client.client_id, redirect_uri: client.redirect_uris[0], code_challenge: challenge, code_challenge_method: "S256", state: "xyz", resource: RESOURCE, scope: "" })}`;

  session.principal = undefined;
  const login = await route("GET", authorize);
  assert.equal(login.status, 302);
  assert.match(login.headers.location, /^\/login\?return=%2Foauth%2Fauthorize%3F/u);

  session.principal = { subject: "reader@garden.test", email: "reader@garden.test" };
  const consent = await route("GET", authorize);
  assert.equal(consent.status, 200);
  assert.match(consent.body, /Allow <strong>ChatGPT<\/strong>/u);
  assert.equal(consent.headers["x-frame-options"], "DENY");
  const requestId = /name="request" value="([^"]+)"/u.exec(consent.body)[1];

  const approved = await route("POST", "/oauth/authorize", { body: form({ request: requestId, decision: "approve" }) });
  assert.equal(approved.status, 302);
  const redirect = new URL(approved.headers.location);
  assert.equal(redirect.searchParams.get("state"), "xyz");
  assert.equal(redirect.searchParams.get("iss"), ISSUER);
  const code = redirect.searchParams.get("code");

  const wrongVerifier = await route("POST", "/oauth/token", { body: form({ grant_type: "authorization_code", code, client_id: client.client_id, redirect_uri: client.redirect_uris[0], code_verifier: pkce().verifier }) });
  assert.equal(json(wrongVerifier).error, "invalid_grant");

  const again = await route("GET", authorize);
  assert.equal(again.status, 200, "reconnect shows the account even after consent was given");
  assert.match(again.body, /Use a different account/u);
  assert.ok(again.body.includes(`/login?return=${encodeURIComponent(authorize)}`));
  const reconnectRequest = /name="request" value="([^"]+)"/u.exec(again.body)[1];
  const reapproved = await route("POST", "/oauth/authorize", { body: form({ request: reconnectRequest, decision: "approve" }) });
  const secondCode = new URL(reapproved.headers.location).searchParams.get("code");
  const tokens = json(await route("POST", "/oauth/token", { body: form({ grant_type: "authorization_code", code: secondCode, client_id: client.client_id, redirect_uri: client.redirect_uris[0], code_verifier: verifier, resource: RESOURCE }) }));
  assert.equal(tokens.token_type, "Bearer");
  assert.ok(tokens.refresh_token);

  const claims = await server.verifyToken(tokens.access_token, { resource: RESOURCE });
  assert.equal(claims.subject, "reader@garden.test");
  assert.equal(claims.resource, RESOURCE);
  assert.equal(await server.verifyToken(tokens.access_token, { resource: "https://elsewhere.test/mcp" }), undefined);
  const replay = await route("POST", "/oauth/token", { body: form({ grant_type: "authorization_code", code: secondCode, client_id: client.client_id, redirect_uri: client.redirect_uris[0], code_verifier: verifier }) });
  assert.equal(json(replay).error, "invalid_grant");

  const refreshed = json(await route("POST", "/oauth/token", { body: form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: client.client_id }) }));
  assert.notEqual(refreshed.refresh_token, tokens.refresh_token);
  assert.equal(json(await route("POST", "/oauth/token", { body: form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: client.client_id }) })).error, "invalid_grant");

  await route("POST", "/oauth/revoke", { body: form({ token: refreshed.access_token }) });
  assert.equal(await server.verifyToken(refreshed.access_token), undefined);
});

test("denial, foreign resources, missing PKCE and unadmitted accounts come back to the client as errors", async () => {
  const { session, route } = harness();
  const client = json(await route("POST", "/oauth/register", { body: { client_name: "Claude", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] } }));
  const base = { response_type: "code", client_id: client.client_id, redirect_uri: client.redirect_uris[0], state: "s" };
  const noPkce = await route("GET", `/oauth/authorize?${form(base)}`);
  assert.equal(new URL(noPkce.headers.location).searchParams.get("error"), "invalid_request");
  const { challenge } = pkce();
  const foreign = await route("GET", `/oauth/authorize?${form({ ...base, code_challenge: challenge, code_challenge_method: "S256", resource: "https://elsewhere.test/mcp" })}`);
  assert.equal(new URL(foreign.headers.location).searchParams.get("error"), "invalid_target");
  const consent = await route("GET", `/oauth/authorize?${form({ ...base, code_challenge: challenge, code_challenge_method: "S256" })}`);
  const requestId = /name="request" value="([^"]+)"/u.exec(consent.body)[1];
  const denied = await route("POST", "/oauth/authorize", { body: form({ request: requestId, decision: "deny" }) });
  assert.equal(new URL(denied.headers.location).searchParams.get("error"), "access_denied");
  session.principal = { subject: "stranger" };
  const stranger = await route("GET", `/oauth/authorize?${form({ ...base, code_challenge: challenge, code_challenge_method: "S256" })}`);
  assert.equal(new URL(stranger.headers.location).searchParams.get("error"), "access_denied");
  const unknown = await route("GET", `/oauth/authorize?${form({ ...base, client_id: "nobody" })}`);
  assert.equal(unknown.status, 401);
});

test("an operator-issued machine client gets a token with client credentials, and only with its secret", async () => {
  const { server, route } = harness();
  const machine = await server.registerMachineClient({ name: "rail", subject: "actor:rail" });
  assert.equal(json(await route("POST", "/oauth/token", { body: form({ grant_type: "client_credentials", client_id: machine.client_id, client_secret: "wrong" }) })).error, "invalid_client");
  const basic = Buffer.from(`${machine.client_id}:${machine.client_secret}`).toString("base64");
  const tokens = json(await route("POST", "/oauth/token", { body: form({ grant_type: "client_credentials" }), headers: { authorization: `Basic ${basic}` } }));
  assert.equal(tokens.refresh_token, undefined);
  const claims = await server.verifyToken(tokens.access_token, { resource: RESOURCE });
  assert.equal(claims.subject, "actor:rail");
  assert.equal(claims.principal.machine, true);
});

test("redirect URIs are HTTPS, loopback HTTP, or a private-use scheme", () => {
  assert.equal(admissibleRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect"), true);
  assert.equal(admissibleRedirectUri("http://127.0.0.1:33418/callback"), true);
  assert.equal(admissibleRedirectUri("com.example.app:/callback"), true);
  assert.equal(admissibleRedirectUri("http://evil.test/cb"), false);
  assert.equal(admissibleRedirectUri("https://x.test/cb#frag"), false);
  assert.equal(admissibleRedirectUri("javascript:alert(1)"), false);
});

test("a withdrawn client's tokens stop working at once", async () => {
  const { server, route } = harness();
  const machine = await server.registerMachineClient({ name: "rail", subject: "actor:rail", secret: "s".repeat(40) });
  const tokens = json(await route("POST", "/oauth/token", { body: form({ grant_type: "client_credentials", client_id: machine.client_id, client_secret: "s".repeat(40) }) }));
  assert.ok(await server.verifyToken(tokens.access_token));
  await server.revokeClient(machine.client_id);
  assert.equal(await server.verifyToken(tokens.access_token), undefined);
});

test("the file store sees a client another process issued", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { createJsonFileGrantStore } = await import("../src/authorization-server.mjs");
  const directory = mkdtempSync(join(tmpdir(), "grants-"));
  try {
    const running = createJsonFileGrantStore(directory);
    assert.equal(await running.get("client", "machine_x"), undefined);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await createJsonFileGrantStore(directory).put("client", "machine_x", { client_id: "machine_x" });
    assert.deepEqual(await running.get("client", "machine_x"), { client_id: "machine_x" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the site's own interface is first-party: its code comes back without a consent page", async () => {
  const { route } = harness();
  const client = json(await route("POST", "/oauth/register", { body: { client_name: "Own UI", redirect_uris: [`${ISSUER}/ui`] } }));
  const { challenge } = pkce();
  const answer = await route("GET", `/oauth/authorize?${form({ response_type: "code", client_id: client.client_id, redirect_uri: `${ISSUER}/ui`, code_challenge: challenge, code_challenge_method: "S256", state: "own" })}`);
  assert.equal(answer.status, 302);
  assert.ok(new URL(answer.headers.location).searchParams.get("code"));
});

test("a Fetch-style request is read as a native one, and an oversized body is refused with 413", async () => {
  const { server } = harness();
  const register = server.app.resources.find((resource) => resource.match === "/oauth/register");
  const ok = await register.handler({ request: new Request(`${ISSUER}/oauth/register`, { method: "POST", body: JSON.stringify({ client_name: "fetch", redirect_uris: ["https://client.test/cb"] }) }), url: new URL(`${ISSUER}/oauth/register`) });
  assert.equal(ok.status, 201);
  const big = await register.handler({ request: new Request(`${ISSUER}/oauth/register`, { method: "POST", body: "x".repeat(20_000) }), url: new URL(`${ISSUER}/oauth/register`) });
  assert.equal(big.status, 413);
});
