import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./run-command.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = "generate-continuation";
const FIXTURE = join(HERE, "fixtures", "generate.json");

test("generate-continuation.mjs draws a receipted continuation for a new object from a fixture file", async () => {
  const r = await runCommand(SCRIPT, [FIXTURE]);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  const { move, candidates, wit, questions, ledger } = body.result;
  assert.ok(move && move.g === "newcomer" && typeof move.attr === "string");
  assert.ok(candidates.length >= 1 && candidates.every((c) => typeof c.dF === "number"));
  assert.equal(wit.chosen, move.attr);
  assert.ok(wit.excludedMass >= 0 && wit.excludedMass < 1);
  assert.equal(wit.excluded.length, candidates.length - 1);
  assert.ok(questions.length >= 1);
  assert.equal(ledger.closes, true);
  const again = JSON.parse((await runCommand(SCRIPT, [FIXTURE])).stdout);
  assert.equal(again.result.move.attr, move.attr, "same seed, same draw");
});

test("generate-continuation.mjs refuses a missing object with a typed JSON error and exit 1", async () => {
  const input = JSON.stringify({ objects: ["o1"], attributes: ["a"], pairs: [["o1", "a"]] });
  const r = await runCommand(SCRIPT, [], { input });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.refusal.code, "malformed-input");
});

test("generate-continuation.mjs --help prints usage and exits 0", async () => {
  const r = await runCommand(SCRIPT, ["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: generate-continuation\.mjs/);
});
