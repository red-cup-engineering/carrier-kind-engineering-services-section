import { test } from "node:test";
import assert from "node:assert/strict";
import { cell, triple } from "@red-cup-engineering/signcell/cell";
import { rule } from "@red-cup-engineering/signchain/rules";
import { settleCells, derivationOrderOf } from "../src/settle.mjs";
import { proofMotionCarrierOf, proofMotionLeanSourceOf } from "../src/proof-motion-carrier.mjs";

const signed = () => {
  const premise = cell("observation", "has", "both", {
    for: ["affirmed"], against: ["opposed"],
  });
  const conclusion = triple(cell("claim", "requires", "review"));
  const settlement = settleCells(
    [premise],
    [rule("complete-two-lane-license",
      [{ cell: triple(premise), atLeast: "stable" }],
      { cell: conclusion, reading: "potential" })],
  );
  return { settlement, order: derivationOrderOf(settlement) };
};

test("proof-motion carrier receives both evidence colours and real predecessor indices", () => {
  const { settlement, order } = signed();
  const c = proofMotionCarrierOf(order, settlement);
  assert.equal(c.kind, "signcraft.proofMotionCarrier.v1");
  assert.equal(c.admissionLevel, "settlement-replayed");
  assert.equal(c.eventCount, order.events.length);
  assert.equal(c.sourceSettlementId, order.sourceSettlementId);
  const derived = c.events.find(e => e.cell.predicate === "requires");
  assert.ok(derived);
  const parents = c.edges.filter(e => e.child === derived.index);
  assert.deepEqual(new Set(parents.map(p => c.events[p.parent].side)), new Set(["for", "against"]));
  assert.equal(c.cellCount, 2);
  assert.equal(c.cells.length, 2);
  assert.deepEqual(new Set(parents.map(p => c.events[p.parent].cellIndex)).size, 1);
  assert.notEqual(c.events[parents[0].parent].index, c.events[parents[1].parent].index);
  assert.ok(parents.every(p => p.parent < p.child &&
    c.events[p.parent].stage < c.events[p.child].stage));
  assert.ok(Object.isFrozen(c) && Object.isFrozen(c.events) && Object.isFrozen(c.edges));
});

test("Lean obligation is only numerals and fixed source, never supplied strings", () => {
  const { settlement, order } = signed();
  const result = proofMotionLeanSourceOf(order, settlement);
  assert.equal(result.verifiedByLean, false);
  assert.match(result.leanSource, /import ObsmetrologiaComputing.ProofMotionCarrier/);
  assert.match(result.leanSource, /motion\.toCausalSet \(by decide\)/);
  assert.match(result.leanSource, /example : motion\.check = true := by decide/);
  assert.match(result.leanSource, /againstEvidence/);
  assert.match(result.leanSource, /cell := fun i =>/);
  assert.equal(result.cellCount, 2);
  for (const evidence of ["observation", "affirmed", "opposed", "complete-two-lane-license"]) {
    assert.ok(!result.leanSource.includes(evidence), evidence + " leaked into Lean source");
  }
});

test("structural-only orders and tampered source histories cannot become Lean obligations", () => {
  const { settlement, order } = signed();
  assert.throws(() => proofMotionCarrierOf(order), /requires the original settlement/);
  assert.throws(() => proofMotionLeanSourceOf(order), /requires the original settlement/);
  assert.throws(() => proofMotionCarrierOf({
    ...order,
    sourceSettlementId: "forged-source",
  }, settlement), /replayed derivation/);
  const result = order.events.find(e => e.cell.predicate === "requires");
  const forged = {
    ...order, events: order.events.map(e => e.id !== result.id ? e : {
      ...e, predecessors: [],
    }),
  };
  assert.throws(() => proofMotionLeanSourceOf(forged, settlement), /replayed derivation/);
});

test("bounded Lean proof generator refuses arbitrarily large decisions", () => {
  const seeds = Array.from({ length: 33 }, (_, i) =>
    cell("seed-" + i, "is", "observed", { for: ["independent-" + i] }));
  const settlement = settleCells(seeds, []);
  const order = derivationOrderOf(settlement);
  assert.equal(proofMotionCarrierOf(order, settlement).eventCount, 33);
  assert.throws(() => proofMotionLeanSourceOf(order, settlement), /bounded to 32/);
});
