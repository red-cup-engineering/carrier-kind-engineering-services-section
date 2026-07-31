import assert from "node:assert/strict";
import test from "node:test";
import { classifySemioticVoxelPackage } from "../src/classify-semiotic-voxel-package.mjs";

test("groups undeclared operations as faces of one package capability", () => {
  const result = classifySemioticVoxelPackage({ manifest: { name: "@owner/weather-service", "x-agentic-metro-enterprise": { "operation-catalog": { solicit: {}, invoke: {} } } }, path: "services/weather-service/package.json" });
  assert.equal(result.kind, "capability-cell");
  assert.deepEqual(result.capabilities, [["weather-service", ["invoke", "solicit"]]]);
});

test("exposes explicitly distinct capabilities as an aggregate defect", () => {
  const result = classifySemioticVoxelPackage({ manifest: { name: "@owner/x", "x-agentic-metro-enterprise": { "operation-catalog": { read: { capability: "reading" }, write: { capability: "writing" } } } }, path: "services/x/package.json" });
  assert.equal(result.kind, "aggregate-capability-defect");
});
