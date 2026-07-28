import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { discoverJsnodeServices } from "../src/discover-services.mjs";

const sectionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("fresh discovery resolves the moved edit actuator and function movement actuator", () => {
  const result = discoverJsnodeServices(sectionRoot);
  assert.deepEqual(result.refusals, []);
  assert.deepEqual(result.services.map(({ nodeId }) => nodeId), ["function-movement-service", "software-edit-language-service"]);
});
