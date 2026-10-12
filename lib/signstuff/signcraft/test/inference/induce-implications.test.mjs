import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./run-command.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = "induce-implications";
const FIXTURE = join(HERE, "fixtures", "induce.json");

test("induce-implications.mjs learns both the exact basis and the weighted rules from a fixture file", async () => {
  const r = await runCommand(SCRIPT, [FIXTURE]);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.ok(body.result.exact.length > 0);
  assert.ok(body.result.weighted.length > 0);
  const furImpliesMammal = body.result.weighted.find((rule) => rule.then === "mammal" && rule.if.length === 1 && rule.if[0] === "fur");
  assert.ok(furImpliesMammal, JSON.stringify(body.result.weighted));
  assert.equal(furImpliesMammal.support, 2);
  assert.equal(furImpliesMammal.confidence, 1);
});

test("induce-implications.mjs refuses a corpus missing pairs with a typed JSON error and exit 1", async () => {
  const r = await runCommand(SCRIPT, [], { input: JSON.stringify({ objects: [], attributes: [] }) });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.refusal.code, "malformed-input");
});

test("induce-implications.mjs --help prints usage and exits 0", async () => {
  const r = await runCommand(SCRIPT, ["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: induce-implications\.mjs/);
});
