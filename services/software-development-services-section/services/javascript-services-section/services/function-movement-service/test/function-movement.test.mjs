import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { invokeCloudFunctionMovement } from "../src/cloud-client.mjs";
import { prepareFunctionMovement } from "../src/function-movement.mjs";

const request = {
  sourceSemioverse: "urn:semioverse:source",
  sourcePackage: "source-package",
  sourceFile: "src/source.mjs",
  targetSemioverse: "urn:semioverse:target",
  targetPackage: "target-package",
  targetFile: "src/target.mjs",
  functionName: "moveMe",
  functionSource: "export function moveMe() { return 1; }",
  targetMarker: "export const target = true;",
};

test("prepares exactly two bounded edits and delegates writes to receiver", () => {
  const result = prepareFunctionMovement(request);
  assert.equal(result.artifacts.length, 2);
  assert.match(result.artifacts[0].content, /<<<<<<< SEARCH/);
  assert.match(result.artifacts[1].content, /moveMe/);
  assert.equal(result.nextActuator, "accepted-software-delivery-receiver");
  assert.equal(result.writeAuthority, "receiver-only");
  assert.match(result.artifactSetDigest, /^sha256:[0-9a-f]{64}$/);
});

test("refuses same source and target", () => {
  assert.throws(() => prepareFunctionMovement({ ...request, targetPackage: request.sourcePackage, targetSemioverse: request.sourceSemioverse, targetFile: request.sourceFile }), /distinct/);
});

test("refuses a named function absent from the supplied exact source", () => {
  assert.throws(() => prepareFunctionMovement({ ...request, functionName: "missing" }), /does not contain/);
});

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
