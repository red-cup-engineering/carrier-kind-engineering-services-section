import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "./run-command.mjs";
import { readFileSync } from "node:fs";
import { generateContinuationRequest } from "../../scripts/inference/generate-continuation.mjs";

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

test("the real generator command carries a replayable variate and normalized excluded mass", async () => {
  const r=await runCommand(SCRIPT,[FIXTURE]);
  assert.equal(r.status,0,r.stderr);
  const out=JSON.parse(r.stdout).result, wit=out.wit;
  assert.ok(wit && Number.isFinite(wit.variate) && wit.variate>=0 && wit.variate<1);
  assert.ok(Number.isFinite(wit.chosenProbability) && wit.chosenProbability>0);
  assert.ok(Math.abs(wit.chosenProbability+wit.excludedMass-1)<1e-12);
  assert.ok(Math.abs(wit.chosenProbability+
    wit.excluded.reduce((mass,candidate)=>mass+candidate.p,0)-1)<1e-12);
  assert.equal(out.move.attr,wit.chosen);
  const rerun=JSON.parse((await runCommand(SCRIPT,[FIXTURE])).stdout).result;
  assert.equal(rerun.wit.variate,wit.variate);
});

test("the CLI admits the minimum-energy zero-temperature limit", async () => {
  const data=JSON.parse(readFileSync(FIXTURE,"utf8"));
  data.temperature=0;
  const r=await runCommand(SCRIPT,[],{input:JSON.stringify(data)});
  assert.equal(r.status,0,r.stderr);
  const out=JSON.parse(r.stdout).result;
  assert.ok(out.move);
  assert.equal(out.wit.temperature,0);
  assert.equal(out.dF,Math.min(...out.candidates.map(c=>c.dF)));
});

test("command admission rejects invalid temperatures and unsafe seeds", () => {
  const sample={objects:["g"],attributes:["a"],pairs:[["g","a"]],object:"other"};
  for(const temperature of [-1,Infinity,NaN])
    assert.throws(()=>generateContinuationRequest({...sample,temperature}),/finite nonnegative/);
  assert.equal(generateContinuationRequest({...sample,temperature:0}).temperature,0);
  assert.throws(()=>generateContinuationRequest({...sample,seed:Number.MAX_VALUE}),/safe integer/);
});
