import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { invokeCloudFunctionMovement } from "../src/cloud-client.mjs";

test("local trigger sends one signed request to cloud and returns its result", async () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  let seen;
  const result = await invokeCloudFunctionMovement({
    baseUrl: "https://movement.invalid",
    input: { sourceText: "a", targetText: "b", functionName: "moveMe", functionSource: "moveMe", targetMarker: "b" },
    privateKey,
    now: 1_700_000_000_000,
    fetchImpl: async (_url, init) => { seen = init; return { ok: true, status: 200, json: async () => ({ providerWorkspace: "ephemeral", persisted: false }) }; },
  });
  assert.equal(result.persisted, false);
  assert.match(seen.headers["x-union-signature"], /^[A-Za-z0-9_-]+$/);
});
