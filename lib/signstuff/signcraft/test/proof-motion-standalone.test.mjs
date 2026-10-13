// Dependency-free verifier for the SignCraft-to-Lean projection only.
// It intentionally does not claim to check SignCell admission, SignChain rule
// semantics, or the Lean kernel. Those are separate end-to-end gates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/proof-motion-carrier.mjs", import.meta.url), "utf8")
  .replace(/^import[^\n]*\n/gm, "").replace(/^export function /gm, "function ");
const replay = (order, settlement) => ({
  admitted: order.sourceSettlementId === settlement.id,
  level: settlement.level ?? "settlement-replayed",
  reason: "replay mismatch",
});
const loader = new Function("address", "derivationOrderAdmits",
  source + "\nreturn {proofMotionCarrierOf, proofMotionLeanSourceOf};");
const { proofMotionCarrierOf, proofMotionLeanSourceOf } =
  loader(c => JSON.stringify(c), replay);

const raw = (side = "for", stage = 0, id = "seed", parents = [], cell = { subject: "s", predicate: "p", object: "o" }) =>
  ({ id, side, stage, cell, witnessId: "w-" + id, predecessors: parents });
const fixture = () => ({
  sourceSettlementId: "source",
  events: [
    raw("for", 0, "pos"),
    raw("against", 0, "neg"),
    raw("for", 1, "deduced", ["pos", "neg"], { subject: "x", predicate: "y", object: "z" }),
  ],
});

test("the provenance reader preserves two colours of the same predication cell", () => {
  const carrier = proofMotionCarrierOf(fixture(), { id: "source" });
  assert.equal(carrier.eventCount, 3);
  assert.equal(carrier.cellCount, 2);
  assert.equal(carrier.events[0].cellIndex, carrier.events[1].cellIndex);
  assert.notEqual(carrier.events[0].cellIndex, carrier.events[2].cellIndex);
  assert.deepEqual(carrier.edges, [{ parent: 0, child: 2 }, { parent: 1, child: 2 }]);
  assert.equal(carrier.admissionLevel, "settlement-replayed");
  assert.ok(Object.isFrozen(carrier.edges) && Object.isFrozen(carrier.cells));
});

test("the generated Lean program contains no untrusted strings or external effects", () => {
  const order = fixture();
  const adversarialCell = { ...order.events[0].cell, subject: "#eval (unsafePerformIO)" };
  order.events[0].cell = adversarialCell;
  order.events[1].cell = adversarialCell;
  const result = proofMotionLeanSourceOf(order, { id: "source" });
  assert.equal(result.verifiedByLean, false);
  assert.equal(result.cellCount, 2);
  assert.match(result.leanSource, /RawMotion 3/);
  assert.match(result.leanSource, /cell := fun i =>/);
  assert.match(result.leanSource, /againstEvidence/);
  assert.match(result.leanSource, /example : motion\.check = true := by decide/);
  assert.ok(!result.leanSource.includes("unsafePerformIO"));
  assert.ok(!result.leanSource.includes('"source"'));
  assert.ok(!result.leanSource.includes("subject"));
});

test("proof emission fails closed on missing source replay and fake predecessor edges", () => {
  assert.throws(() => proofMotionLeanSourceOf(fixture()), /original settlement/);
  assert.throws(() => proofMotionLeanSourceOf(fixture(), { id: "other" }), /replayed derivation/);
  assert.throws(() => proofMotionLeanSourceOf(fixture(), { id: "source", level: "structural-only" }), /replayed derivation/);
  const bad = fixture();
  bad.events[2].stage = 0;
  assert.throws(() => proofMotionLeanSourceOf(bad, { id: "source" }), /strict stage/);
  bad.events[2].stage = 1;
  bad.events[2].predecessors = ["not-a-real-event"];
  assert.throws(() => proofMotionLeanSourceOf(bad, { id: "source" }), /predecessor index/);
});

test("the emitter caps expensive Lean decision expressions", () => {
  const big = { sourceSettlementId: "source", events: Array.from({ length: 33 }, (_, i) =>
    raw("for", 0, "seed-" + i, [], { subject: "seed-" + i, predicate: "is", object: "observed" })) };
  assert.equal(proofMotionCarrierOf(big, { id: "source" }).eventCount, 33);
  assert.throws(() => proofMotionLeanSourceOf(big, { id: "source" }), /bounded to 32/);
  const empty = proofMotionLeanSourceOf({ sourceSettlementId: "source", events: [] }, { id: "source" });
  assert.match(empty.leanSource, /RawMotion 0/);
  assert.match(empty.leanSource, /edge := fun p c => false/);
});
