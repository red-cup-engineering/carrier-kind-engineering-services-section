import { test } from "node:test";
import assert from "node:assert/strict";
import { makeContext, lawfulBasis } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, settle, readingAt } from "../../src/inference/nuclei.mjs";
import { makeComplex, withConductance, disagreementEnergy } from "../../src/inference/complex.mjs";
import { enabledMoves, opened, closed, disagreementEnergyChange, continuationEnergy } from "../../src/inference/generate.mjs";

const G =["dog", "whale", "sparrow", "trout", "bat"];
const M = ["mammal", "bird", "fish", "warm", "feathers", "aquatic", "airbreathing", "flies"];
const PAIRS = [
  ["dog", "mammal"], ["dog", "warm"], ["dog", "airbreathing"],
  ["whale", "mammal"], ["whale", "warm"], ["whale", "aquatic"], ["whale", "airbreathing"],
  ["sparrow", "bird"], ["sparrow", "warm"], ["sparrow", "feathers"], ["sparrow", "airbreathing"], ["sparrow", "flies"],
  ["trout", "fish"], ["trout", "aquatic"],
  ["bat", "mammal"], ["bat", "warm"], ["bat", "airbreathing"], ["bat", "flies"],
];

test("ΔE is the exact change of the Laplacian quadratic form when the held indicator gains the attribute", () => {
  const ctx = makeContext(G, M, PAIRS);
  let cx = makeComplex(M);
  cx = withConductance(cx, "mammal", "warm", 2);
  cx = withConductance(cx, "warm", "fish", 0.5);
  cx = withConductance(cx, "flies", "feathers", 1);
  let v = makeValuation();
  v = withReading(v, "x", "mammal", "potential");
  v = withReading(v, "x", "flies", "potential");
  const before = { mammal: 1, flies: 1 };
  const after = { mammal: 1, flies: 1, warm: 1 };
  const exact = disagreementEnergy(cx, after) - disagreementEnergy(cx, before);
  const local = disagreementEnergyChange(ctx, cx, v, { g: "x", attr: "warm" });
  assert.ok(Math.abs(exact - local) < 1e-12, `quadratic form ${exact} vs local ${local}`);
  assert.ok(local < 0, "an attribute thickly connected to held attributes lowers disagreement energy");
});

test("opened weighs the knowledge-height deficit of every cell the move forces; a conflict weighs two", () => {
  const ctx = makeContext(G, M, PAIRS);
  const basis = lawfulBasis(ctx);
  let v = makeValuation();
  v = withReading(v, "y", "flies", "potential");
  const oBird = opened(ctx, basis, v, { g: "y", attr: "bird" });
  const oWarm = opened(ctx, basis, v, { g: "y", attr: "warm" });
  assert.ok(oBird >= 1 && oWarm >= 1);
  assert.ok(oBird > oWarm, `adjoining bird forces feathers too (${oBird}) — more unsettled charge than warm alone (${oWarm})`);
  let denied = makeValuation();
  denied = withReading(denied, "z", "flies", "potential");
  denied = withReading(denied, "z", "bird", "active");
  const conflict = opened(ctx, basis, denied, { g: "z", attr: "bird" });
  assert.ok(conflict >= 2, `a move that drives a cell contested contributes 2, got ${conflict}`);
});

test("closed counts the open questions the move answers, never below zero", () => {
  const ctx = makeContext(G, M, PAIRS);
  const basis = lawfulBasis(ctx);
  let v = makeValuation();
  v = withReading(v, "q", "mammal", "potential");
  const questions = enabledMoves(ctx, basis, v, "q");
  assert.ok(questions.length >= 1);
  const answered = closed(ctx, basis, v, { g: "q", attr: questions[0].attr });
  assert.ok(answered >= 1, "adjoining an enabled move answers at least itself");
  assert.equal(closed(ctx, basis, v, { g: "q", attr: "fish" }) >= 0, true);
});

test("continuationEnergy reads only the object's own row: unrelated objects change nothing", () => {
  const ctx = makeContext(G, M, PAIRS);
  const basis = lawfulBasis(ctx);
  let cx = makeComplex(M);
  cx = withConductance(cx, "mammal", "warm", 1);
  let v1 = makeValuation();
  v1 = withReading(v1, "p", "mammal", "potential");
  let v2 = v1;
  for (let i = 0; i < 50; i++) v2 = withReading(v2, "other" + i, "fish", "potential");
  const move = { g: "p", attr: "warm" };
  assert.equal(continuationEnergy(ctx, basis, cx, v1, move), continuationEnergy(ctx, basis, cx, v2, move));
});

test("settle ships an obstruction receipt: contested cells and per-object refusal numbers", () => {
  const ctx = makeContext(G, M, PAIRS);
  let cx = makeComplex(M);
  cx = withConductance(cx, "fish", "aquatic", 1);
  cx = withConductance(cx, "mammal", "warm", 1);
  let v = makeValuation();
  v = withReading(v, "whale", "fish", "potential");
  v = withReading(v, "whale", "fish", "active");
  v = withReading(v, "dog", "mammal", "potential");
  const out = settle(ctx, v, { cx });
  assert.equal(readingAt(out.v, "whale", "fish"), "stable");
  assert.deepEqual(out.obstructions.contested, [{ g: "whale", m: "fish" }]);
  assert.equal(out.obstructions.refusals.length, 1);
  assert.equal(out.obstructions.refusals[0].g, "whale");
  assert.ok(Number.isFinite(out.obstructions.refusals[0].refusal) || out.obstructions.refusals[0].refusal === Infinity);
  assert.ok(out.obstructions.settledCells >= 3);
  const clean = settle(ctx, makeValuation());
  assert.deepEqual(clean.obstructions, { settledCells: 0, contested: [], refusals: [] });
});
