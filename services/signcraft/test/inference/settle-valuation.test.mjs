import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./run-command.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = "settle-valuation";
const FIXTURE = join(HERE, "fixtures", "settle.json");

test("settle-valuation.mjs settles a fixture file to its fixed point with a free-energy ledger receipt", async () => {
  const r = await runCommand(SCRIPT, [FIXTURE]);
  assert.equal(r.status, 0, r.stderr);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.result.valuation.length, 5);
  assert.equal(body.result.receipt.steps, 1);
  assert.deepEqual(body.result.receipt.ledger, { initialDeficit: 0, totalFlux: 0, closes: true });
  assert.ok(Array.isArray(body.result.receipt.witnesses));
  // o2 has {warm, fur} but not mammal, and the DG basis induced from this
  // very context does not force mammal from {warm, fur} alone (o1 is the
  // only mammal witness) -- settling must not manufacture that charge.
  assert.equal(body.result.valuation.some((cell) => cell.g === "o2" && cell.m === "mammal"), false);
});

test("settle-valuation.mjs refuses malformed readings with a typed JSON error and exit 1", async () => {
  const input = JSON.stringify({ objects: ["o1"], attributes: ["a"], pairs: [["o1", "a"]], readings: "not-an-array" });
  const r = await runCommand(SCRIPT, [], { input });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.refusal.code, "malformed-input");
  assert.match(body.refusal.message, /readings/);
});

test("settle-valuation.mjs --help prints usage and exits 0", async () => {
  const r = await runCommand(SCRIPT, ["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: settle-valuation\.mjs/);
});
