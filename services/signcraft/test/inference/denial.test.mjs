import { test } from "node:test";
import assert from "node:assert/strict";
import { makeContext, dgBasis, lawfulBasis, extent, NEG } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, readingAt, settle } from "../../src/inference/nuclei.mjs";
import { makeMachineState, runMachineAction } from "../../src/inference/kernel.mjs";

// Penguins are birds and are witnessed NOT to fly; robins are birds and fly.
const G = ["p1", "p2", "r1", "r2"];
const M = ["penguin", "bird", "flies"];
const pairs = [
  ["p1", "penguin"], ["p1", "bird"], ["p2", "penguin"], ["p2", "bird"],
  ["r1", "bird"], ["r1", "flies"], ["r2", "bird"], ["r2", "flies"],
];
const denials = [["p1", "flies"], ["p2", "flies"]];

test("denial rows dichotomize the alphabet: ctx.A = M ⊔ ¬M, ctx.M unchanged", () => {
  const ctx = makeContext(G, M, pairs, denials);
  assert.deepEqual(ctx.M, M);
  assert.deepEqual(ctx.A, [...M, ...M.map((m) => NEG + m)]);
  assert.deepEqual(makeContext(G, M, pairs).A, M);
});

test("the supported basis carries the denied law penguin ∧ bird → ¬flies and drops vacuous premises", () => {
  const ctx = makeContext(G, M, pairs, denials);
  const all = dgBasis(ctx);
  const lawful = lawfulBasis(ctx);
  assert.ok(lawful.length < all.length, "some implications had empty-extent premises and were dropped");
  for (const imp of lawful) assert.ok(extent(ctx, imp.from).size > 0);
  const denied = lawful.find((imp) => imp.from.has("penguin") && imp.to.has(NEG + "flies"));
  assert.ok(denied, "penguin → ¬flies must be a supported law");
});

test("σ fires the neg lane from positive evidence: a new penguin is denied flight, with a neg-lane witness", () => {
  const ctx = makeContext(G, M, pairs, denials);
  const basis = lawfulBasis(ctx);
  let v = makeValuation();
  v = withReading(v, "x", "penguin", "potential"); // x is not in ctx.G: a fresh utterance comprehended against the corpus
  const out = settle(ctx, v, { basis });
  assert.equal(readingAt(out.v, "x", "bird"), "potential");
  assert.equal(readingAt(out.v, "x", "flies"), "active");
  const lanes = out.trace.flatMap((s) => s.witnesses).map((w) => w.lane);
  assert.ok(lanes.includes("neg"));
  assert.ok(lanes.includes("pos"));
  assert.equal(out.ledger.closes, true);
});

test("a contradicting seed stays a local contested cell (a mint), never an explosion", () => {
  const ctx = makeContext(G, M, pairs, denials);
  const basis = lawfulBasis(ctx);
  let v = makeValuation();
  v = withReading(v, "y", "penguin", "potential");
  v = withReading(v, "y", "flies", "potential");
  const out = settle(ctx, v, { basis });
  assert.equal(readingAt(out.v, "y", "flies"), "stable");
  assert.equal(readingAt(out.v, "y", "penguin"), "potential");
  assert.equal(readingAt(out.v, "y", "bird"), "potential");
  const mints = out.trace.reduce((n, s) => n + s.mints, 0);
  assert.equal(mints, 1);
});

test("machine actor accepts denial rows and settles them through the same pure transition", () => {
  const machine = makeMachineState({ objects: G, attributes: M, incidencePairs: pairs, denialPairs: denials });
  const transition = runMachineAction(machine, { kind: "settle" });
  assert.equal(transition.effects.length, 0);
  const out = transition.result.settlement;
  assert.equal(readingAt(out.v, "p1", "flies"), "active");
  assert.equal(readingAt(out.v, "r1", "flies"), "potential");
  assert.equal(out.ledger.closes, true);
});
