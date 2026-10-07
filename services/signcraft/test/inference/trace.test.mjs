import { test } from "node:test";
import assert from "node:assert/strict";
import { contextFromTrace, cellAttr } from "../../src/inference/trace.mjs";
import { lawfulBasis } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, settle, readingAt } from "../../src/inference/nuclei.mjs";

const readFour = (q) => q;

const t = (n) => `2026-09-02T12:00:${String(n).padStart(2, "0")}.000Z`;
const ROWS = [
  { e: "shut", a: "has-converse", v: "open", t: t(0) },
  { e: "door", a: "open", v: "yes", t: t(1) },
  { e: "door", a: "shut", v: "yes", t: t(2) },
  { e: "p1", a: "kind", v: "penguin", t: t(3) }, { e: "p1", a: "kind", v: "bird", t: t(4) }, { e: "p1", a: "flies", v: "no", t: t(5) },
  { e: "p2", a: "kind", v: "penguin", t: t(6) }, { e: "p2", a: "kind", v: "bird", t: t(7) }, { e: "p2", a: "flies", v: "no", t: t(8) },
  { e: "r1", a: "kind", v: "bird", t: t(9) }, { e: "r1", a: "flies", v: "yes", t: t(10) },
  { e: "r1", a: "color", v: "red", t: t(11) }, { e: "r1", a: "color", v: null, t: t(12) },
];

test("a trace becomes the machine's context through eavt's strata: retraction and converse are eavt's law", () => {
  const { ctx, v, strata, witnesses } = contextFromTrace(ROWS, { converse: {} });
  assert.deepEqual(ctx.G, ["door", "p1", "p2", "r1"]);
  assert.ok(!ctx.A.includes(cellAttr("color", "red")), "a retracted assertion never reaches the settled stratum");
  assert.equal(strata.get("r1").asserted.length, 4);
  assert.equal(strata.get("r1").saturated.length, 2);
  assert.equal(readFour(readingAt(v, "door", cellAttr("shut", "yes"))), "stable", "converse-charged evidence settles to a held contradiction");
  assert.ok(witnesses.get("p1 " + cellAttr("kind", "penguin")).length >= 1);
});

test("a fresh entity is comprehended against the trace's context: penguin forces bird and flies=no", () => {
  const { ctx } = contextFromTrace(ROWS, { converse: {} });
  const basis = lawfulBasis(ctx);
  let seed = makeValuation();
  seed = withReading(seed, "x", cellAttr("kind", "penguin"), "potential");
  const out = settle(ctx, seed, { basis });
  assert.equal(readFour(readingAt(out.v, "x", cellAttr("kind", "bird"))), "potential");
  assert.equal(readFour(readingAt(out.v, "x", cellAttr("flies", "no"))), "potential");
  assert.equal(readFour(readingAt(out.v, "x", cellAttr("flies", "yes"))), "absurd");
  assert.equal(out.ledger.closes, true);
});
