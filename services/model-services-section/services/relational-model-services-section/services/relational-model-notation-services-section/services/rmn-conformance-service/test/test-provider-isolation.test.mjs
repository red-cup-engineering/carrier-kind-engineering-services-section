import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { startRmnProviderProcess } from "../src/test-provider.mjs";

const root = new URL("../", import.meta.url);
const service = readFileSync(new URL("ops/systemd/bare-cedar-fog-rmn-semantic-conformance.service", root), "utf8");

function serviceValue(key) {
  return service.split(/\r?\n/u).find((line) => line.startsWith(`${key}=`))?.slice(key.length + 1);
}

function environmentValue(key) {
  const prefix = `Environment=${key}=`;
  return service.split(/\r?\n/u).find((line) => line.startsWith(prefix))?.slice(prefix.length);
}

test("ephemeral RMN providers own distinct task stores and retire them", async () => {
  const left = await startRmnProviderProcess();
  const right = await startRmnProviderProcess();
  try {
    assert.notEqual(left.taskStoreRoot, right.taskStoreRoot);
    assert.equal(existsSync(left.taskStoreRoot), true);
    assert.equal(existsSync(right.taskStoreRoot), true);
  } finally {
    await Promise.all([left.close(), right.close()]);
  }
  assert.equal(existsSync(left.taskStoreRoot), false);
  assert.equal(existsSync(right.taskStoreRoot), false);
});

test("RMN systemd deployment paths resolve to this package", () => {
  const packageRoot = fileURLToPath(root).replace(/\/$/u, "");
  assert.equal(serviceValue("WorkingDirectory"), packageRoot);
  assert.equal(environmentValue("AGENT_CARD_SIGNING_KEY"), `${packageRoot}/data/agent-card-signing/ed25519-private.pem`);
  assert.equal(environmentValue("AGENT_CARD_JWKS"), `${packageRoot}/content/agent-card-signing/jwks.json`);
});
