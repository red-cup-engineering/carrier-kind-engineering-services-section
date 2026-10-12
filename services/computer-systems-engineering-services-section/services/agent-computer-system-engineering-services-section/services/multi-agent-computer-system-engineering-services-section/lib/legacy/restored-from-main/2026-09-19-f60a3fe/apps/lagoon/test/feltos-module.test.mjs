import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { admitPackageModule } from "../../../services/multi-agent-computer-platform-engineering-services-section/apps/feltos/src/package-module.mjs";

const declaration = JSON.parse(await readFile(new URL("../feltos.module.json", import.meta.url), "utf8"));

test("Lagoon publishes its model and scripts as one admitted FeltOS package module", () => {
  const module = admitPackageModule(declaration);
  assert.equal(module.package.name, "@red-cup-engineering/lagoon");
  assert.equal(module.behaviors.length, 12);
  assert.deepEqual(module.behaviors.map(({ path }) => path).sort(), [
    "scripts/eavt-worker.mjs",
    "scripts/fold-harness-lifecycle.mjs",
    "scripts/fold-harness-turns.mjs",
    "scripts/look.scm",
    "scripts/run-node-worker-tests.scm",
    "scripts/seed-offices.mjs",
    "scripts/seed-systemd-services.mjs",
    "scripts/seed-world.mjs",
    "scripts/verify.scm",
    "scripts/world-go.mjs",
    "scripts/world-look.mjs",
    "scripts/world-say.mjs",
  ]);
  assert.match(module.receipt.contentIdentity, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});
