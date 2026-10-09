import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./run-command.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = "derive-verdict";
const FIXTURE = join(HERE, "fixtures", "verdict.json");

test("derive-verdict.mjs derives a held verdict with its witness chain from a fixture file", async () => {
  const r = await runCommand(SCRIPT, [FIXTURE]);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.result.verdict, "potential");
  const steps = body.result.witness.map((w) => w.by);
  assert.ok(steps.includes("law:script-no-app"));
  assert.ok(steps.includes("law:violation-filed"));
  assert.equal(body.result.witness[body.result.witness.length - 1].attr, "needs-finding");
});

test("derive-verdict.mjs refuses a rules-less input with a typed JSON error and exit 1", async () => {
  const r = await runCommand(SCRIPT, [], { input: "{}" });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.refusal.code, "malformed-input");
  assert.match(body.refusal.message, /rules array/);
});

test("derive-verdict.mjs --help prints usage and exits 0 without touching stdin", async () => {
  const r = await runCommand(SCRIPT, ["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: derive-verdict\.mjs/);
});
