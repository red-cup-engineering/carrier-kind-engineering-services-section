import assert from "node:assert/strict";
import test from "node:test";
import { fabricateSemioticVoxelPackageDescriptor } from "../src/fabricate-semiotic-voxel-package-descriptor.mjs";

test("fabricates one package descriptor from separately admitted identity and classification", () => {
  assert.deepEqual(fabricateSemioticVoxelPackageDescriptor({
    manifest: { "x-agentic-metro-enterprise": { actor: "urn:ame:x" } },
    identity: { owner: "red-cup-engineering", leaf: "x", name: "@red-cup-engineering/x" },
    classification: { kind: "capability-cell", operations: ["run"], capabilities: [["x", ["run"]]] },
  }), { profile: "org.harmonious-union.semiotic-voxel.v1", owner: "red-cup-engineering", kind: "capability-cell", actor: "urn:ame:x", operations: ["run"], capabilities: [{ capability: "x", faces: ["run"] }], package: "@red-cup-engineering/x" });
});
