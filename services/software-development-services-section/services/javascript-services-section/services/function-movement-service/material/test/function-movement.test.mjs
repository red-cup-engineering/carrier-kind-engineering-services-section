import test from "node:test";
import assert from "node:assert/strict";
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
