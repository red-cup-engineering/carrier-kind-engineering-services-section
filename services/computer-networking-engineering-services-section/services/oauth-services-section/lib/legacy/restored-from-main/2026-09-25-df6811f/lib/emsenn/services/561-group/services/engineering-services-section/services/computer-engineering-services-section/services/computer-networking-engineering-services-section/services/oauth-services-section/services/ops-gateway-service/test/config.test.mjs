import assert from "node:assert/strict";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";
import { join } from "node:path";
import { loadGatewayConfig, normalizeLoopbackUpstream, normalizePublicBaseUrl } from "../src/config.mjs";
import { hashPrincipalSecret, writePrincipalsFile } from "../src/principal-registry.mjs";

const completeEnv = {
  PUBLIC_BASE_URL: "https://ops.561.group",
  UPSTREAM_MCP_URL: "http://127.0.0.1:18811",
  OPS_MCP_STATE_DIR: "/tmp/ops-mcp-test-state",
  OPS_MCP_ALLOWED_EMAIL: "Operator@Example.invalid",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
};

test("loads the explicit production boundary and normalizes operator identity", () => {
  const config = loadGatewayConfig(completeEnv);
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 18807);
  assert.equal(config.publicBaseUrl, "https://ops.561.group");
  assert.equal(config.upstreamMcpUrl, "http://127.0.0.1:18811");
  assert.equal(config.allowedEmail, "operator@example.invalid");
  assert.ok(Object.isFrozen(config));
});

test("upstreamGatewayToken reads UPSTREAM_MCP_GATEWAY_TOKEN and treats absent or blank as undefined", () => {
  assert.equal(loadGatewayConfig(completeEnv).upstreamGatewayToken, undefined);
  assert.equal(loadGatewayConfig({ ...completeEnv, UPSTREAM_MCP_GATEWAY_TOKEN: "" }).upstreamGatewayToken, undefined);
  assert.equal(loadGatewayConfig({ ...completeEnv, UPSTREAM_MCP_GATEWAY_TOKEN: "   " }).upstreamGatewayToken, undefined);
  assert.equal(loadGatewayConfig({ ...completeEnv, UPSTREAM_MCP_GATEWAY_TOKEN: "shared-secret" }).upstreamGatewayToken, "shared-secret");
});

test("public base requires a credential-free HTTPS origin", () => {
  for (const value of [
    "http://ops.561.group",
    "https://user@ops.561.group",
    "https://ops.561.group/path",
    "https://ops.561.group?query=yes",
  ]) assert.throws(() => normalizePublicBaseUrl(value));
  assert.equal(normalizePublicBaseUrl("http://127.0.0.1:18807", { requireTls: false }), "http://127.0.0.1:18807");
});

test("upstream accepts only an uncredentialed loopback HTTP origin", () => {
  assert.equal(normalizeLoopbackUpstream("http://[::1]:18811"), "http://[::1]:18811");
  for (const value of [
    "https://127.0.0.1:18811",
    "http://example.com:18811",
    "http://user:secret@127.0.0.1:18811",
    "http://127.0.0.1:18811/mcp",
  ]) assert.throws(() => normalizeLoopbackUpstream(value));
});

test("config refuses remote binds and required transport settings", () => {
  assert.throws(() => loadGatewayConfig({ ...completeEnv, HOST: "0.0.0.0" }), /loopback/);
  // GOOGLE_CLIENT_ID/SECRET are covered separately below: they are an
  // all-or-none pair, not each individually required (a Hive-only
  // deployment configures neither).
  for (const key of ["PUBLIC_BASE_URL", "OPS_MCP_STATE_DIR"]) {
    const env = { ...completeEnv };
    delete env[key];
    assert.throws(() => loadGatewayConfig(env), /required/);
  }
});

test("ActivityPub is absent by default and refuses every partial configuration", () => {
  assert.equal(loadGatewayConfig(completeEnv).activityPub, undefined);
  for (const partial of [
    { ACTIVITYPUB_IDENTIFIER: "ops" },
    { ACTIVITYPUB_IDENTIFIER: "" },
    { ACTIVITYPUB_SQLITE_PATH: "/tmp/activitypub.sqlite" },
    { ACTIVITYPUB_ALLOW_PRIVATE_ADDRESS: "true" },
  ]) {
    assert.throws(() => loadGatewayConfig({ ...completeEnv, ...partial }), /all-or-none/);
  }
});

test("complete ActivityPub configuration keeps actor metadata and keys explicit and defaults SQLite under gateway state", () => {
  const config = loadGatewayConfig({
    ...completeEnv,
    ACTIVITYPUB_ORIGIN: "https://ops.561.group",
    ACTIVITYPUB_IDENTIFIER: "ops",
    ACTIVITYPUB_ACTOR_NAME: "561 Group Operations",
    ACTIVITYPUB_ACTOR_SUMMARY: "Operations federation actor",
    ACTIVITYPUB_KEYS_PATH: "/run/credentials/ops-activitypub-keys.json",
  });
  assert.deepEqual(config.activityPub, {
    origin: "https://ops.561.group",
    identifier: "ops",
    actorName: "561 Group Operations",
    summary: "Operations federation actor",
    keyPath: "/run/credentials/ops-activitypub-keys.json",
    statePath: join(completeEnv.OPS_MCP_STATE_DIR, "activitypub.sqlite"),
  });
  assert.ok(Object.isFrozen(config.activityPub));
});

function withStateDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "ops-mcp-config-login-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("Google OAuth credentials are all-or-none, not individually required", () => withStateDir((dir) => {
  writePrincipalsFile(dir, [{ kind: "hive", account: "emsenn0" }]);
  const base = { ...completeEnv, OPS_MCP_STATE_DIR: dir };
  for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) {
    const env = { ...base };
    delete env[key];
    assert.throws(() => loadGatewayConfig(env), /all-or-none/);
  }
}));

test("a deployment with no Google client configured still loads when a Hive principal is admitted, and serves /login/hive", () => withStateDir((dir) => {
  writePrincipalsFile(dir, [{ kind: "hive", account: "emsenn0" }]);
  const env = { ...completeEnv, OPS_MCP_STATE_DIR: dir };
  delete env.GOOGLE_CLIENT_ID;
  delete env.GOOGLE_CLIENT_SECRET;
  const config = loadGatewayConfig(env);
  assert.equal(config.googleClientId, undefined);
  assert.equal(config.googleClientSecret, undefined);
  assert.equal(config.stateDir, dir);
}));

test("refuses a deployment with no admitted browser login path", () => withStateDir((dir) => {
  const env = { ...completeEnv, OPS_MCP_STATE_DIR: dir };
  delete env.GOOGLE_CLIENT_ID;
  delete env.GOOGLE_CLIENT_SECRET;
  assert.throws(() => loadGatewayConfig(env), /admitted password principal/);
}));

test("a revoked Hive principal does not count as a configured login path", () => withStateDir((dir) => {
  writePrincipalsFile(dir, [{ kind: "hive", account: "emsenn0", revoked: true }]);
  const env = { ...completeEnv, OPS_MCP_STATE_DIR: dir };
  delete env.GOOGLE_CLIENT_ID;
  delete env.GOOGLE_CLIENT_SECRET;
  assert.throws(() => loadGatewayConfig(env), /admitted password principal/);
}));

test("a password-only deployment needs neither Google credentials nor a bootstrap email", () => withStateDir((dir) => {
  const { secretSalt, secretHash } = hashPrincipalSecret("correct horse battery staple");
  writePrincipalsFile(dir, [{ kind: "human", username: "emsenn", secretSalt, secretHash }]);
  const env = { ...completeEnv, OPS_MCP_STATE_DIR: dir };
  delete env.GOOGLE_CLIENT_ID;
  delete env.GOOGLE_CLIENT_SECRET;
  delete env.OPS_MCP_ALLOWED_EMAIL;
  const config = loadGatewayConfig(env);
  assert.equal(config.allowedEmail, undefined);
  assert.equal(config.passwordLoginConfigured, true);
}));
