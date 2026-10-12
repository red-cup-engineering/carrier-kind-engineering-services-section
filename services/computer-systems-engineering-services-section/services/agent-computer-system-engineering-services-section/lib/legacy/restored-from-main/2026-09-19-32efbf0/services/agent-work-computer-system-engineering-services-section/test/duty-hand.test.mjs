import test from "node:test";
import assert from "node:assert/strict";
import { handOfDuty } from "../src/duty-hand.mjs";

test("handOfDuty routes a missing-capability duty whose lane is not script", () => {
  assert.equal(handOfDuty({ scope: "task:friction-missing-capability-x-1" }, { lane: "frontier" }), "missing-capability");
  assert.equal(handOfDuty({ scope: "task:friction-missing-capability-x-1" }, { lane: "bounded-inference" }), "missing-capability");
});

test("handOfDuty refuses a missing-capability duty already classified script", () => {
  assert.equal(handOfDuty({ scope: "task:friction-missing-capability-x-1" }, { lane: "script" }), null);
});

test("handOfDuty routes a carrier-falsehood duty regardless of lane", () => {
  assert.equal(handOfDuty({ scope: "task:friction-carrier-falsehood-x-1" }, { lane: "bounded-inference" }), "carrier-falsehood");
  assert.equal(handOfDuty({ scope: "task:friction-carrier-falsehood-x-1" }, { lane: "script" }), "carrier-falsehood");
});

test("handOfDuty routes a friction-command or friction-tool duty regardless of lane", () => {
  assert.equal(handOfDuty({ scope: "task:friction-command-x-1" }, { lane: "bounded-inference" }), "derivation");
  assert.equal(handOfDuty({ scope: "task:friction-tool-x-1" }, { lane: "script" }), "derivation");
});

test("handOfDuty routes any other duty classified run-and-read", () => {
  assert.equal(handOfDuty({ scope: "task:some-other-kind-x-1" }, { lane: "run-and-read" }), "derivation");
});

test("handOfDuty sends an ordinary frontier Inquiry to the read-only mission hand", () => {
  assert.equal(handOfDuty({ scope: "task:ordinary-requirement" }, { workType: "inquiry", lane: "frontier" }), "inquiry");
});

test("handOfDuty claims no hand for an unrecognized scope and lane", () => {
  assert.equal(handOfDuty({ scope: "task:exact-deps-pkg" }, { lane: "script" }), null);
  assert.equal(handOfDuty({ scope: "task:some-other-kind-x-1" }, { workType: "procedure", lane: "frontier" }), null);
});
