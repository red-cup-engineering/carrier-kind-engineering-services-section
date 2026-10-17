// RFC 7662 introspection as IndieAuth 6 (Access Token Verification) requires it: a resource server
// POSTs `token`, authorized by a Bearer credential or confidential-client authentication; an
// unusable token is `{ "active": false }` with status 200 and nothing more.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import { createAuthorizationServer } from "../src/authorization-server.mjs";

const ISSUER = "https://auth.example";
const ctxOf = (method, target, { body, headers = {} } = {}) => {
  const url = new URL(target, ISSUER);
  const req = Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(body)]), { method, url: `${url.pathname}${url.search}`, headers: { ...(body === undefined ? {} : { "content-type": "application/x-www-form-urlencoded" }), ...headers } });
  return { req, url };
};
function harness(extra = {}) {
  let clock = 1_800_000_000_000;
  const server = createAuthorizationServer({ issuer: ISSUER, authenticate: () => ({ subject: "person" }), loginUrl: (r) => `/login?${r}`, now: () => clock, accessTtlSeconds: 600, ...extra });
  const route = (method, target, options) => server.app.resources.find((r) => r.match === new URL(target, ISSUER).pathname && r.methods.includes(method)).handler(ctxOf(method, target, options));
  return { server, route, advance: (ms) => { clock += ms; } };
}
const form = (values) => new URLSearchParams(values).toString();
const json = (repr) => JSON.parse(repr.body);

async function issue(server, route) {
  const machine = await server.registerMachineClient({ name: "rail", subject: "actor:rail", scope: "read" });
  const tokens = json(await route("POST", "/oauth/token", { body: form({ grant_type: "client_credentials", client_id: machine.client_id, client_secret: machine.client_secret }) }));
  return { machine, tokens };
}

test("metadata advertises the introspection endpoint", async () => {
  const { route } = harness();
  assert.equal(json(await route("GET", "/.well-known/oauth-authorization-server")).introspection_endpoint, `${ISSUER}/oauth/introspect`);
});

test("a live token is active with its scope, client, expiry and issue time (RFC 7662 2.2)", async () => {
  const { server, route } = harness();
  const { machine, tokens } = await issue(server, route);
  const r = await route("POST", "/oauth/introspect", { body: form({ token: tokens.access_token }), headers: { authorization: `Bearer ${tokens.access_token}` } });
  assert.equal(r.status ?? 200, 200);
  const body = json(r);
  assert.deepEqual([body.active, body.scope, body.client_id, body.token_type, body.sub], [true, "read", machine.client_id, "Bearer", "actor:rail"]);
  assert.equal(body.exp, 1_800_000_600);
  assert.equal(body.iat, 1_800_000_000);
});

test("an unknown, expired or revoked token is only { active: false } with status 200", async () => {
  const { server, route, advance } = harness();
  const { tokens } = await issue(server, route);
  const bearer = { authorization: `Bearer ${tokens.access_token}` };
  const unknown = await route("POST", "/oauth/introspect", { body: form({ token: "nonsense" }), headers: bearer });
  assert.deepEqual([unknown.status ?? 200, json(unknown)], [200, { active: false }]);
  const { tokens: second } = await issue(server, route);
  await route("POST", "/oauth/revoke", { body: form({ token: second.access_token }) });
  assert.deepEqual(json(await route("POST", "/oauth/introspect", { body: form({ token: second.access_token }), headers: bearer })), { active: false });
  advance(601_000);
  assert.equal((await route("POST", "/oauth/introspect", { body: form({ token: tokens.access_token }), headers: bearer })).status, 401, "an expired credential no longer authorizes the caller");
});

test("the caller must be authorized: no credential or a dead one is 401, a confidential client may authenticate", async () => {
  const { server, route } = harness();
  const { machine, tokens } = await issue(server, route);
  const anonymous = await route("POST", "/oauth/introspect", { body: form({ token: tokens.access_token }) });
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers["www-authenticate"], /^Bearer/);
  assert.equal((await route("POST", "/oauth/introspect", { body: form({ token: tokens.access_token }), headers: { authorization: "Bearer forged" } })).status, 401);
  const asClient = await route("POST", "/oauth/introspect", { body: form({ token: tokens.access_token, client_id: machine.client_id, client_secret: machine.client_secret }) });
  assert.equal(json(asClient).active, true);
  assert.equal((await route("POST", "/oauth/introspect", { body: form({ token: tokens.access_token, client_id: machine.client_id, client_secret: "wrong" }) })).status, 401);
});

test("an IndieAuth server's answer carries the person's profile URL (IndieAuth 6.2: me is required)", async () => {
  const { server, route } = harness({ me: () => "https://person.example/", scopes: ["create"], resolveUrlClient: async (id) => ({ client_id: id, redirect_uris: ["https://app.example/cb"] }) });
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const authorize = `/oauth/authorize?${form({ response_type: "code", client_id: "https://app.example/", redirect_uri: "https://app.example/cb", code_challenge: challenge, code_challenge_method: "S256", scope: "create", state: "s" })}`;
  const consent = await route("GET", authorize);
  const requestId = /name="request" value="([^"]+)"/u.exec(consent.body)[1];
  const approved = await route("POST", "/oauth/authorize", { body: form({ request: requestId, decision: "approve" }) });
  const code = new URL(approved.headers.location).searchParams.get("code");
  const tokens = json(await route("POST", "/oauth/token", { body: form({ grant_type: "authorization_code", code, client_id: "https://app.example/", redirect_uri: "https://app.example/cb", code_verifier: verifier }) }));
  assert.equal(tokens.me, "https://person.example/");
  const verified = json(await route("POST", "/oauth/introspect", { body: form({ token: tokens.access_token }), headers: { authorization: `Bearer ${tokens.access_token}` } }));
  assert.deepEqual([verified.active, verified.me, verified.client_id, verified.scope], [true, "https://person.example/", "https://app.example/", "create"]);
});
