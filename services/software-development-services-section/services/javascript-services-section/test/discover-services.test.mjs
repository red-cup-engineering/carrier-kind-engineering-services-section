import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { discoverJsnodeServices } from "../src/discover-services.mjs";

const sectionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("fresh discovery resolves every admitted JSNode actuator", () => {
  const result = discoverJsnodeServices(sectionRoot);
  assert.deepEqual(result.refusals, []);
  assert.deepEqual(result.services.map(({ nodeId }) => nodeId), [
    "discord-steward-service",
    "farstone-harbor-mud-service",
    "flickering-delve-service",
    "function-movement-provider-client-service",
    "jsnode-observation-service",
    "sandbox-command-execution-service",
    "software-edit-language-service",
    "software-mission-customer-induction-service",
    "software-mission-execution-service",
    "software-program-synthesis-service",
    "software-program-synthesis-solicitation-service",
  ]);
});
