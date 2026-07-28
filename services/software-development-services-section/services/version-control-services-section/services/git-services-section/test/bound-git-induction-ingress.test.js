import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { executeBoundGitA2aMessage } from "../src/bound-git-induction-a2a-executor.js";

test("A2A executor carries customer authorization into the production handler and returns its signature", async () => {
  const root = mkdtempSync(join(tmpdir(), "bound-git-ingress-"));
  const files = {
    BOUND_GIT_ROUTES: "{}",
    BOUND_GIT_COORDINATOR_IDENTITY: "{}",
    BOUND_GIT_BINDING: "{}",
    BOUND_GIT_SIGNING_KEY: "private",
  };
  const environment = {
    BOUND_GIT_PROVIDER_ACCOUNT: "eip155:31337:0x0000000000000000000000000000000000000001",
    BOUND_GIT_RPC_URL: "http://127.0.0.1:8545",
    BOUND_GIT_NONCE_ROOT: join(root, "nonces"),
    BOUND_GIT_COORDINATOR_AGENT: "http://127.0.0.1:9001",
    BOUND_GIT_RECEIVER_AGENT: "http://127.0.0.1:9002",
    BOUND_GIT_OBJECT_FORMAT: "sha1",
    BOUND_GIT_SIGNING_KID: "git-key",
    BOUND_GIT_SIGNING_JWKS: "https://git.invalid/jwks.json",
  };
  for (const [name, value] of Object.entries(files)) {
    const path = join(root, name);
    writeFileSync(path, value);
    environment[name] = path;
  }
  const runtime = join(root, "runtime.mjs");
  writeFileSync(runtime, "export const loadReceipt=()=>{};export const bindingReceipt=()=>{};export const loadPrepareChain=()=>{};");
  environment.BOUND_GIT_RUNTIME_MODULE = runtime;
  const authorization = {
    operationJws: { protected: "p", signature: "s" },
    customerGrantSignature: "0x01",
    customerGrantExpiry: 9999999999,
  };
  const message = userRmnMessage(Buffer.from([1, 2, 3]));
  message.metadata.boundGitAuthorization = authorization;
  let observed;
  const response = await executeBoundGitA2aMessage(message, {
    environment,
    handle: async (bytes, configuration) => {
      observed = { bytes, configuration };
      return { bytes: Buffer.from([4, 5]), jws: { protected: "out", signature: "sig" } };
    },
  });
  assert.deepEqual(observed.bytes, Buffer.from([1, 2, 3]));
  assert.deepEqual(observed.configuration.authorization, authorization);
  assert.equal(observed.configuration.coordinatorAgentUrl, environment.BOUND_GIT_COORDINATOR_AGENT);
  assert.deepEqual(response.metadata.jws, { protected: "out", signature: "sig" });
  assert.equal(response.parts.length, 1);
  assert.equal(response.parts[0].mediaType, "application/rmn+cbor");
});
