import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { createGatewayAuth, loadGatewayAuth } from "../src/auth.mjs";
import { createMachineTokenStore } from "../src/machine-credentials.mjs";
import { createPrincipalRegistry, hashPrincipalSecret, writePrincipalsFile } from "../src/principal-registry.mjs";

function fakeOAuth(tokens = {}) {
  return {
    metadata: () => ({
      issuer: "https://ops.561.group",
      token_endpoint: "https://ops.561.group/oauth/token",
      grant_types_supported: ["authorization_code", "refresh_token"],
    }),
    validateToken: (token) => tokens[token] ?? null,
  };
}

function formRequest(fields) {
  const req = Readable.from([Buffer.from(new URLSearchParams(fields).toString())]);
  req.headers = { "content-type": "application/x-www-form-urlencoded" };
  return req;
}

function guardedHandler(tokens = {}) {
  const auth = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth(tokens),
  });
  const guarded = auth.guard({ resources: [{ id: "protected", handler: () => ({ status: 204 }) }] });
  return { auth, handler: guarded.resources[0].handler };
}

test("publishes exact authorization and path-aware protected-resource metadata", () => {
  const { app, resourceUrl, resourceMetadataUrl, challenge } = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth(),
  });
  assert.equal(resourceUrl, "https://ops.561.group/mcp");
  assert.equal(resourceMetadataUrl, "https://ops.561.group/.well-known/oauth-protected-resource/mcp");
  assert.match(challenge, /resource_metadata="https:\/\/ops\.561\.group\/\.well-known\/oauth-protected-resource\/mcp"/);
  const pathAware = app.resources.find((resource) => resource.id === "ops-mcp.oauth-protected-resource-path");
  assert.deepEqual(JSON.parse(pathAware.handler().body), {
    resource: "https://ops.561.group/mcp",
    authorization_servers: ["https://ops.561.group"],
  });
});

test("guard returns 401 for missing or invalid bearer, 403 for a valid wrong identity, and admits exact email case-insensitively", async () => {
  const { auth, handler } = guardedHandler({
    unknown: null,
    wrong: { email: "another@example.invalid" },
    good: { email: "Operator@Example.invalid" },
  });
  const missing = await handler({ req: { headers: {} } });
  assert.equal(missing.status, 401);
  assert.equal(missing.headers["www-authenticate"], auth.challenge);
  const unknown = await handler({ req: { headers: { authorization: "Bearer unknown" } } });
  assert.equal(unknown.status, 401);
  const wrong = await handler({ req: { headers: { authorization: "Bearer wrong" } } });
  assert.equal(wrong.status, 403);
  const admitted = await handler({ req: { headers: { authorization: "Bearer good" } } });
  assert.equal(admitted.status, 204);
});

test("authorization-server metadata advertises client_credentials alongside the existing grants", () => {
  const { app } = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth(),
  });
  const resource = app.resources.find((candidate) => candidate.id === "ops-mcp.oauth-authorization-server");
  const metadata = JSON.parse(resource.handler().body);
  assert.deepEqual(new Set(metadata.grant_types_supported), new Set(["authorization_code", "refresh_token", "client_credentials"]));
});

test("guard admits a client_credentials-issued token by its actor claim, and still admits the bootstrap email token", async () => {
  const { secretSalt, secretHash } = hashPrincipalSecret("s3cret");
  const registry = createPrincipalRegistry({
    allowedEmail: "operator@example.invalid",
    principals: [{ kind: "client", clientId: "machine_1", actor: "actor:one", secretSalt, secretHash }],
  });
  const machineTokens = createMachineTokenStore();
  const { token } = machineTokens.issue("machine_1", "actor:one");
  const auth = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth({ good: { email: "operator@example.invalid" } }),
    registry,
    machineTokens,
  });
  const guarded = auth.guard({ resources: [{ id: "protected", handler: () => ({ status: 204 }) }] });
  const handler = guarded.resources[0].handler;
  const client = await handler({ req: { headers: { authorization: `Bearer ${token}` } } });
  assert.equal(client.status, 204);
  const human = await handler({ req: { headers: { authorization: "Bearer good" } } });
  assert.equal(human.status, 204);
});

test("guard rejects an old machine token after the registry rebinds or revokes its client", async () => {
  const { secretSalt, secretHash } = hashPrincipalSecret("s3cret");
  const machineTokens = createMachineTokenStore();
  const { token } = machineTokens.issue("machine_1", "actor:one");
  for (const principal of [
    { kind: "client", clientId: "machine_1", actor: "actor:two", secretSalt, secretHash },
    { kind: "client", clientId: "machine_1", actor: "actor:one", secretSalt, secretHash, revoked: true },
  ]) {
    const registry = createPrincipalRegistry({ principals: [principal] });
    const auth = createGatewayAuth({ publicBaseUrl: "https://ops.561.group", oauth: fakeOAuth(), registry, machineTokens });
    const handler = auth.guard({ resources: [{ id: "protected", handler: () => ({ status: 204 }) }] }).resources[0].handler;
    assert.equal((await handler({ req: { headers: { authorization: `Bearer ${token}` } } })).status, 403);
  }
});

test("guard attaches validated claims to ctx so a downstream handler (the /mcp proxy) can read the authenticated subject", async () => {
  const { secretSalt, secretHash } = hashPrincipalSecret("s3cret");
  const registry = createPrincipalRegistry({
    allowedEmail: "operator@example.invalid",
    principals: [{ kind: "client", clientId: "machine_1", actor: "actor:one", secretSalt, secretHash }],
  });
  const machineTokens = createMachineTokenStore();
  const { token } = machineTokens.issue("machine_1", "actor:one");
  const auth = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth({ good: { email: "operator@example.invalid" } }),
    registry,
    machineTokens,
  });
  let observedCtx;
  const guarded = auth.guard({ resources: [{ id: "protected", handler: (ctx) => { observedCtx = ctx; return { status: 204 }; } }] });
  const handler = guarded.resources[0].handler;
  await handler({ req: { headers: { authorization: `Bearer ${token}` } } });
  assert.equal(observedCtx.claims.actor, "actor:one");
  await handler({ req: { headers: { authorization: "Bearer good" } } });
  assert.equal(observedCtx.claims.email, "operator@example.invalid");
  assert.equal(observedCtx.claims.actor, undefined);
});

test("/oauth/token issues a client_credentials bearer token for an admitted confidential client", async () => {
  const { secretSalt, secretHash } = hashPrincipalSecret("s3cret");
  const registry = createPrincipalRegistry({
    principals: [{ kind: "client", clientId: "machine_1", actor: "actor:one", secretSalt, secretHash }],
  });
  const { app } = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth(),
    registry,
  });
  const tokenResource = app.resources.find((candidate) => candidate.id === "oauth.token");
  const response = await tokenResource.handler({
    req: formRequest({ grant_type: "client_credentials", client_id: "machine_1", client_secret: "s3cret" }),
  });
  assert.equal(response.status, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.token_type, "Bearer");
  assert.equal(typeof body.access_token, "string");
});

test("/oauth/token refuses client_credentials for an unknown client_id or a wrong secret", async () => {
  const { secretSalt, secretHash } = hashPrincipalSecret("s3cret");
  const registry = createPrincipalRegistry({
    principals: [{ kind: "client", clientId: "machine_1", actor: "actor:one", secretSalt, secretHash }],
  });
  const { app } = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth(),
    registry,
  });
  const tokenResource = app.resources.find((candidate) => candidate.id === "oauth.token");
  const unknown = await tokenResource.handler({
    req: formRequest({ grant_type: "client_credentials", client_id: "no-such-client", client_secret: "s3cret" }),
  });
  assert.equal(unknown.status, 401);
  assert.equal(JSON.parse(unknown.body).error, "invalid_client");
  const badSecret = await tokenResource.handler({
    req: formRequest({ grant_type: "client_credentials", client_id: "machine_1", client_secret: "wrong" }),
  });
  assert.equal(badSecret.status, 401);
  assert.equal(JSON.parse(badSecret.body).error, "invalid_client");
});

test("createGatewayAuth mounts /login/hive and its callback when stateDir is given, and omits them otherwise", () => {
  const withState = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth(),
    stateDir: "/tmp/ops-mcp-auth-test-state-unused",
  });
  const ids = withState.app.resources.map((resource) => resource.id);
  assert.ok(ids.includes("ops-browser.login-hive"));
  assert.ok(ids.includes("ops-browser.login-hive-callback"));

  const withoutState = createGatewayAuth({
    publicBaseUrl: "https://ops.561.group",
    allowedEmail: "operator@example.invalid",
    oauth: fakeOAuth(),
  });
  const idsWithoutState = withoutState.app.resources.map((resource) => resource.id);
  assert.ok(!idsWithoutState.includes("ops-browser.login-hive"));
});

test("the mounted /login/hive callback refuses an account absent from principals.json (the principal gate), independent of signature verification", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ops-mcp-auth-hive-"));
  try {
    const registry = createPrincipalRegistry({ principals: [{ kind: "hive", account: "emsenn0" }] });
    const auth = createGatewayAuth({
      publicBaseUrl: "https://ops.561.group",
      allowedEmail: "operator@example.invalid",
      oauth: fakeOAuth(),
      registry,
      stateDir: dir,
    });
    const callback = auth.app.resources.find((resource) => resource.id === "ops-browser.login-hive-callback");
    const req = Readable.from([Buffer.from(JSON.stringify({ account: "not-admitted", message: "m", signature: "s", nonce: "n" }))]);
    req.headers = { "content-type": "application/json" };
    const response = await callback.handler({ req });
    assert.equal(response.status, 403);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadGatewayAuth supplies the hot-reload principal registry to upstream Google identity admission", () => {
  const dir = mkdtempSync(join(tmpdir(), "ops-mcp-google-registry-"));
  try {
    writePrincipalsFile(dir, [{ kind: "email", email: "second@example.invalid" }]);
    let config;
    loadGatewayAuth(
      { publicBaseUrl: "https://ops.561.group", allowedEmail: "bootstrap@example.invalid", stateDir: dir },
      {},
      {
        configFromEnv: (parts) => { config = parts; return {}; },
        OAuthServerCtor: class { constructor() { return fakeOAuth(); } },
      },
    );
    assert.equal(config.admitEmail("second@example.invalid"), true);
    assert.equal(config.admitEmail("bootstrap@example.invalid"), true);
    assert.equal(config.admitEmail("unadmitted@example.invalid"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
