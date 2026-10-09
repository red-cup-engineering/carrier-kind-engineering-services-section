import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./run-command.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = "evaluate-corpus";
const FIXTURE = join(HERE, "fixtures", "evaluate.json");

test("evaluate-corpus.mjs reports deterministic held-out numbers per seed from a fixture file", async () => {
  const r = await runCommand(SCRIPT, ["--seeds", "3", FIXTURE]);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.result.seeds, 3);
  assert.equal(body.result.perSeed.length, 3);
  assert.deepEqual(body.result.perSeed.map((row) => row.seed), [0, 1, 2]);
  for (const row of body.result.perSeed) assert.equal(row.maskedCount + row.keptCount, 11);

  // determinism: mulberry32(seed) makes a rerun bit-identical, not merely close.
  const rerun = await runCommand(SCRIPT, ["--seeds", "3", FIXTURE]);
  assert.deepEqual(JSON.parse(rerun.stdout), body);
});

test("evaluate-corpus.mjs refuses a non-positive --seeds with a typed JSON error and exit 1", async () => {
  const r = await runCommand(SCRIPT, ["--seeds", "0", FIXTURE]);
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.refusal.code, "malformed-input");
  assert.match(body.refusal.message, /--seeds/);
});

test("evaluate-corpus.mjs --help prints usage and exits 0", async () => {
  const r = await runCommand(SCRIPT, ["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: evaluate-corpus\.mjs/);
});
