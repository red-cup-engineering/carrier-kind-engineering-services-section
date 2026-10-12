import test from "node:test";
import assert from "node:assert/strict";
import {
  bottom, top, potential, active, violation, compliant,
  isBottom, isTop, isViolation, isCompliant, chargeStatus,
  leqKnowledge, joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  negate, conflate,
} from "./charge.mjs";

test("constructors produce the correct charge values", () => {
  assert.equal(bottom().value, "absurd");
  assert.equal(top().value, "stable");
  assert.equal(potential().value, "potential");
  assert.equal(active().value, "active");
  assert.equal(violation("w").value, "active");
  assert.equal(compliant("w").value, "potential");
  assert.equal(violation("w").kind, "language-algebra.charge");
});

test("potential and active are evidenceless; violation and compliant carry witnesses", () => {
  assert.deepEqual(potential().positiveWitnesses, []);
  assert.deepEqual(potential().negativeWitnesses, []);
  assert.deepEqual(active().positiveWitnesses, []);
  assert.deepEqual(active().negativeWitnesses, []);
});

test("violation and compliant attach witnesses to the correct side", () => {
  const v = violation("bad");
  assert.deepEqual(v.negativeWitnesses, ["bad"]);
  assert.deepEqual(v.positiveWitnesses, []);
  const c = compliant("good");
  assert.deepEqual(c.positiveWitnesses, ["good"]);
  assert.deepEqual(c.negativeWitnesses, []);
});

test("guards are consistent with constructors", () => {
  assert.ok(isBottom(bottom()));
  assert.ok(isTop(top()));
  assert.ok(isViolation(violation("w")));
  assert.ok(isCompliant(compliant("w")));
  assert.ok(!isViolation(compliant("w")));
  assert.ok(!isCompliant(violation("w")));
  assert.ok(isViolation(top()));
  assert.ok(isCompliant(top()));
});

test("chargeStatus classifies correctly", () => {
  assert.equal(chargeStatus(bottom()), "void");
  assert.equal(chargeStatus(top()), "ambiguous");
  assert.equal(chargeStatus(violation("w")), "decided");
  assert.equal(chargeStatus(compliant("w")), "decided");
});

test("joinKnowledge is the knowledge-order lub; absurd is its identity", () => {
  const v = violation("w");
  const c = compliant("w");
  assert.equal(joinKnowledge(bottom(), v).value, "active");
  assert.equal(joinKnowledge(bottom(), c).value, "potential");
  assert.equal(joinKnowledge(v, c).value, "stable");
  assert.equal(joinKnowledge(bottom(), bottom()).value, "absurd");
  assert.equal(joinKnowledge(top(), v).value, "stable");
});

test("meetKnowledge is the knowledge-order glb; stable is its identity", () => {
  assert.equal(meetKnowledge(top(), violation("w")).value, "active");
  assert.equal(meetKnowledge(violation("w"), compliant("w")).value, "absurd");
  assert.equal(meetKnowledge(top(), top()).value, "stable");
});

test("joinTruth and meetTruth satisfy truth-order laws", () => {
  const v = violation("w");
  const c = compliant("w");
  assert.equal(joinTruth(v, c).value, "potential");
  assert.equal(meetTruth(v, c).value, "active");
  assert.equal(joinTruth(bottom(), c).value, "potential");
  assert.equal(meetTruth(top(), v).value, "active");
});

test("joinKnowledge accumulates evidence from both sides", () => {
  const joined = joinKnowledge(violation("a"), compliant("b"));
  assert.deepEqual(joined.negativeWitnesses, ["a"]);
  assert.deepEqual(joined.positiveWitnesses, ["b"]);
  assert.equal(joined.value, "stable");
});

test("negate is an involution that swaps evidence sides", () => {
  const v = violation("w");
  const neg = negate(v);
  assert.equal(neg.value, "potential");
  assert.deepEqual(neg.positiveWitnesses, ["w"]);
  assert.deepEqual(neg.negativeWitnesses, []);
  assert.equal(negate(negate(v)).value, v.value);
});

test("conflate is an involution: swaps absurd↔stable, fixes active and potential", () => {
  assert.equal(conflate(bottom()).value, "stable");
  assert.equal(conflate(top()).value, "absurd");
  assert.equal(conflate(violation("w")).value, "active");
  assert.equal(conflate(compliant("w")).value, "potential");
  assert.equal(conflate(conflate(violation("w"))).value, "active");
});

test("leqKnowledge is a partial order consistent with the lattice", () => {
  const b = bottom();
  const v = violation("w");
  const c = compliant("w");
  const t = top();
  assert.ok(leqKnowledge(b, b));
  assert.ok(leqKnowledge(b, v));
  assert.ok(leqKnowledge(b, c));
  assert.ok(leqKnowledge(b, t));
  assert.ok(leqKnowledge(v, t));
  assert.ok(leqKnowledge(c, t));
  assert.ok(!leqKnowledge(v, c));
  assert.ok(!leqKnowledge(c, v));
  assert.ok(!leqKnowledge(t, b));
});
