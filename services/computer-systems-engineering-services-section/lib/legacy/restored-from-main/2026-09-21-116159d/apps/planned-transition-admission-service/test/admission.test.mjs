import assert from "node:assert/strict";
import test from "node:test";
import { admitPlannedTransition } from "../src/admit-planned-transition.mjs";

function request(overrides = {}) {
  return {
    plan: { stages: ["plan", "execute"], dependencies: [{ from: "plan", to: "execute" }] },
    transition: { from: "plan", to: "execute" },
    effects: [{ id: "write-source", capability: "software-engineering", target: "/workspace/cell/src/index.mjs" }],
    obligations: ["write-source"],
    requiredProofLoci: ["incumbent-observed", "provider-bound"],
    observations: [
      { locus: "incumbent-observed", status: "witnessed", provider: "urn:monitor", patch: "planning-view", evidence: "ni:///sha-256;planning", observedAt: "2026-07-25T00:00:00.000Z" },
      { locus: "incumbent-observed", status: "witnessed", provider: "urn:executor", patch: "execution-view", evidence: "ni:///sha-256;execution-material", observedAt: "2026-07-25T00:00:01.000Z" },
      { locus: "provider-bound", status: "witnessed", provider: "urn:executor", patch: "execution-view", evidence: "ni:///sha-256;execution-provider", observedAt: "2026-07-25T00:00:01.000Z" },
    ],
    authority: { capabilities: ["software-engineering"], territories: ["/workspace/cell"] },
    ...overrides,
  };
}

test("admits a placed, material, permeable plan transition", () => {
  const result = admitPlannedTransition(request());
  assert.equal(result.admitted, true);
  assert.equal(result.proof.materiality.judgment, "game.incarnation.material:witness");
  assert.deepEqual(result.responsePair, {
    deficiency: { numerator: "0", denominator: "1" },
    redundancy: { numerator: "0", denominator: "1" },
  });
  assert.equal(result.proof.kinetic.authority, "timestamps-are-evidence-not-deadlines");
});

test("a propagating proof pore refuses kinetically without a timer", () => {
  const input = request();
  input.observations = input.observations.map((observation) => observation.locus === "incumbent-observed"
    ? { ...observation, status: "propagating", observedAt: "2026-07-01T00:00:00.000Z" }
    : observation);
  const result = admitPlannedTransition(input);
  assert.equal(result.admitted, false);
  assert.equal(result.obstruction.kind, "kinetic-obstruction");
  assert.deepEqual(result.responsePair.deficiency, { numerator: "1", denominator: "2" });
});

test("an unobserved incumbent prevents fabrication execution", () => {
  const input = request();
  input.observations = input.observations.filter(({ locus }) => locus !== "incumbent-observed");
  const result = admitPlannedTransition(input);
  assert.equal(result.admitted, false);
  assert.deepEqual(result.obstruction, { kind: "local-obstruction", loci: ["incumbent-observed"] });
});

test("incarnation exposes a proposed effect that answers no obligation as ballast", () => {
  const input = request({
    effects: [
      { id: "write-source", capability: "software-engineering", target: "/workspace/cell/src/index.mjs" },
      { id: "publish-socially", capability: "activitypub-publication" },
    ],
    authority: { capabilities: ["software-engineering", "activitypub-publication"], territories: ["/workspace/cell"] },
  });
  const result = admitPlannedTransition(input);
  assert.equal(result.admitted, false);
  assert.deepEqual(result.obstruction, { kind: "materiality-obstruction", effects: ["publish-socially"] });
  assert.deepEqual(result.responsePair.redundancy, { numerator: "1", denominator: "2" });
});

test("a feedback cycle is coordination cost and consistent local views still glue", () => {
  const cyclic = request({ plan: { stages: ["plan", "execute"], dependencies: [{ from: "plan", to: "execute" }, { from: "execute", to: "plan" }] } });
  const result = admitPlannedTransition(cyclic);
  assert.equal(result.admitted, true);
  assert.equal(result.proof.topological.feedbackCycle, true);
  assert.equal(result.proof.topological.coordination.h1Rank, "1");
  assert.equal(result.proof.topological.gluing.overlapAgreement, true);
});

test("disagreement on an overlap is a witnessed topological obstruction", () => {
  const input = request();
  input.observations[1].status = "obstructed";
  const result = admitPlannedTransition(input);
  assert.equal(result.admitted, false);
  assert.deepEqual(result.obstruction, { kind: "topological-obstruction", reason: "local-sections-disagree-on-overlap" });
  assert.equal(result.proof.topological.gluing.overlapAgreement, false);
});

test("effects outside placement authority remain a separate obstruction", () => {
  const escaped = request({ effects: [{ id: "write-source", capability: "software-engineering", target: "/other/index.mjs" }] });
  assert.deepEqual(admitPlannedTransition(escaped).obstruction, { kind: "placement-obstruction", effects: ["write-source"] });
});
