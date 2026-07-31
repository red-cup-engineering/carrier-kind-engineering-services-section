import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { discoverJsnodeServices } from "../src/discover-services.mjs";

const sectionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("fresh discovery resolves every admitted JSNode actuator", () => {
  const result = discoverJsnodeServices(sectionRoot);
  assert.deepEqual(result.refusals, []);
  assert.deepEqual(result.services.map(({ nodeId }) => nodeId), [
    "discord-steward-check-service",
    "discord-steward-invite-service",
    "discord-steward-run-service",
    "farstone-harbor-mud-service",
    "flickering-delve-service",
    "function-movement-provider-client-service",
    "jsnode-cross-package-module-edge-normalization-service",
    "jsnode-observation-service",
    "jsnode-package-body-observation-service",
    "jsnode-package-dependency-normalization-service",
    "jsnode-package-identity-normalization-service",
    "jsnode-package-identity-reference-normalization-service",
    "jsnode-package-manifest-normalization-service",
    "jsnode-package-owner-projection-service",
    "sandbox-command-execution-service",
    "software-edit-language-service",
    "software-mission-action-record-parser-service",
    "software-mission-customer-induction-service",
    "software-mission-execution-service",
    "software-program-synthesis-service",
    "software-program-synthesis-solicitation-service",
  ]);
});

test("refuses a direct actuator that declares multiple operations", () => {
  const root = mkdtempSync(join(tmpdir(), "jsnode-discovery-"));
  try {
    const service = join(root, "services", "aggregate");
    mkdirSync(service, { recursive: true });
    writeFileSync(join(service, "package.json"), JSON.stringify({
      name: "aggregate",
      "x-agentic-metro-enterprise": { "node-id": "aggregate" },
      "x-semiotic-voxel": { operations: ["first", "second"] },
    }));
    assert.equal(discoverJsnodeServices(root).refusals[0].reason, "direct JSNode actuator must declare exactly one named x-semiotic-voxel operation");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
