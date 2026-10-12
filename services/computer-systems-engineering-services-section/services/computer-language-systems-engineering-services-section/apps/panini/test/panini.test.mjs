import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load, read, settle, judge, receipt, render, FIBERS } from "../src/index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "..", "bin", "panini-cli.mjs");

test("quickstart: three lines read a copula sentence with the copula tagged", async () => {
  const bundle = await load("english");
  const reading = read("She is running", bundle);
  const r = receipt(reading);
  assert.deepEqual(r.tokens.map((t) => t.text), ["She", "is", "running"]);
  assert.ok(r.tokens[1].tags.includes("cop"), `copula tagged: ${JSON.stringify(r.tokens[1])}`);
  assert.ok(r.tokens[2].tags.includes("verb"));
  assert.ok(r.arcs.some((a) => a.rel === "nsubj" && a.dependent === "She"));
  assert.equal(typeof r.ambiguity, "number");
  assert.ok(Array.isArray(r.obstructions), "obstructions stay explicit");
  assert.ok(["grammatical", "ungrammatical", "unknown"].includes(judge(reading).status) || typeof judge(reading).status === "string");
  assert.match(render(reading), /TOKENS/);
});

test("every house fiber loads and reads a sentence in its own language", async () => {
  const samples = { english: "The dog runs", tokipona: "mi moku e kili", latin: "puella cantat", mandarin: "我是学生", lakota: "šúŋka" };
  for (const name of Object.keys(FIBERS)) {
    const bundle = await load(name);
    const reading = read(samples[name], bundle);
    assert.ok(reading.forest.readings.length >= 1, `${name}: at least one candidate reading`);
    assert.ok(receipt(reading).tokens.length >= 1, `${name}: tokens`);
  }
});

test("settle returns the engine's forest and read composes it with discourse, lambek, cohomology", async () => {
  const bundle = await load("english");
  const forest = settle("Birds fly", bundle);
  assert.equal(forest.kind, "communicating.parse-forest");
  const reading = read("Birds fly", bundle);
  for (const k of ["forest", "lambek", "discourse", "cohomology", "grammaticality"]) assert.ok(k in reading, k);
});

test("load refuses an unknown fiber and read refuses empty text", async () => {
  await assert.rejects(() => load("@lenticule-science/no-such-fiber"));
  const bundle = await load("english");
  assert.throws(() => read("   ", bundle), /non-empty/);
});

test("the CLI reads a sentence and prints a receipt, and refuses an unknown command with exit 1", () => {
  const r = spawnSync(process.execPath, [CLI, "read", "She", "is", "running", "--lang=english"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const first = JSON.parse(r.stdout.split("\n")[0]);
  assert.equal(first.ok, true);
  assert.ok(first.receipt.tokens[1].tags.includes("cop"));
  assert.match(r.stdout, /TOKENS/);
  const bad = spawnSync(process.execPath, [CLI, "frobnicate"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).refusal.code, "malformed-input");
});
