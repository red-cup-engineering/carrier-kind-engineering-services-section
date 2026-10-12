import assert from "node:assert/strict";

import test from "node:test";
import { OAuthError } from "@red-cup-engineering/oauth-services-section";
import { createMachineTokenStore, issueClientCredentialsToken } from "../src/machine-credentials.mjs";
import { createPrincipalRegistry, hashPrincipalSecret } from "../src/principal-registry.mjs";

function registryWithOneClient({ clientId = "machine_1", secret = "s3cret", actor = "actor:one", revoked = false } = {}) {
  const { secretSalt, secretHash } = hashPrincipalSecret(secret);
  return createPrincipalRegistry({ principals: [{ kind: "client", clientId, actor, secretSalt, secretHash, revoked }] });
}

test("issueClientCredentialsToken mints a bearer token the machine token store then validates with the actor claim", () => {
  const registry = registryWithOneClient();
  const machineTokens = createMachineTokenStore();
  const response = issueClientCredentialsToken({ registry, machineTokens, clientId: "machine_1", clientSecret: "s3cret" });
  assert.equal(response.token_type, "Bearer");
  assert.equal(typeof response.access_token, "string");
  assert.equal(typeof response.expires_in, "number");
  assert.deepEqual(machineTokens.validate(response.access_token), { client_id: "machine_1", actor: "actor:one" });
});

test("issueClientCredentialsToken refuses a bad secret", () => {
  const registry = registryWithOneClient({ secret: "s3cret" });
  const machineTokens = createMachineTokenStore();
  assert.throws(
    () => issueClientCredentialsToken({ registry, machineTokens, clientId: "machine_1", clientSecret: "wrong" }),
    (error) => error instanceof OAuthError && error.code === "invalid_client",
  );
});

test("issueClientCredentialsToken refuses an unknown client", () => {
  const registry = registryWithOneClient();
  const machineTokens = createMachineTokenStore();
  assert.throws(
    () => issueClientCredentialsToken({ registry, machineTokens, clientId: "no-such-client", clientSecret: "s3cret" }),
    (error) => error instanceof OAuthError && error.code === "invalid_client",
  );
});

test("issueClientCredentialsToken refuses a revoked client even with the correct secret", () => {
  const registry = registryWithOneClient({ secret: "s3cret", revoked: true });
  const machineTokens = createMachineTokenStore();
  assert.throws(
    () => issueClientCredentialsToken({ registry, machineTokens, clientId: "machine_1", clientSecret: "s3cret" }),
    (error) => error instanceof OAuthError && error.code === "invalid_client",
  );
});

test("issueClientCredentialsToken refuses a missing client_id or client_secret", () => {
  const registry = registryWithOneClient();
  const machineTokens = createMachineTokenStore();
  assert.throws(
    () => issueClientCredentialsToken({ registry, machineTokens, clientId: "", clientSecret: "" }),
    (error) => error instanceof OAuthError && error.code === "invalid_request",
  );
});

test("createMachineTokenStore expires issued tokens after their TTL", () => {
  let now = 1_000_000;
  const machineTokens = createMachineTokenStore({ now: () => now, ttlMs: 1000 });
  const { token } = machineTokens.issue("machine_1", "actor:one");
  assert.deepEqual(machineTokens.validate(token), { client_id: "machine_1", actor: "actor:one" });
  now += 1001;
  assert.equal(machineTokens.validate(token), null);
});
