import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./run-command.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = "train-residuated-network";
const FIXTURE = join(HERE, "fixtures", "train.json");

test("train-residuated-network.mjs learns a two-layer stack exactly from a fixture file", async () => {
  const r = await runCommand(SCRIPT, [FIXTURE]);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  const { W1, W2, converged, exact, sound } = body.result;
  assert.equal(converged, true);
  assert.equal(sound, true, "the stack never asserts beyond the target");
  assert.equal(exact, true, "the target is realizable, so residuation recovers it exactly");
  assert.deepEqual(W1.rows, ["parent-of-cara", "parent-of-dan", "parent-of-eve"]);
  assert.deepEqual(W2.cols, ["grandparent-of-eve", "grandparent-of-gus"]);
});

test("train-residuated-network.mjs refuses a malformed relation with a typed JSON error and exit 1", async () => {
  const input = JSON.stringify({ rows: ["r"], inputs: ["i"], outputs: ["o"], x: { pos: "nope" }, y: { pos: [] } });
  const r = await runCommand(SCRIPT, [], { input });
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).refusal.code, "malformed-input");
});

test("train-residuated-network.mjs --help prints usage and exits 0", async () => {
  const r = await runCommand(SCRIPT, ["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: train-residuated-network\.mjs/);
});
