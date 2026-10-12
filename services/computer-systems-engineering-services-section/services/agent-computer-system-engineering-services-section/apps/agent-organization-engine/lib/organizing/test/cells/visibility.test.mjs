import assert from "node:assert/strict";
import test from "node:test";

import { agentVisibilityReading } from "../../src/cells/visibility.mjs";

function observation(overrides = {}) {
  return {
    kind: "organizing.cell.visibility-observation",
    sourceRef: "semioverse:visibility:fixture",
    sourceMode: "canonical",
    scope: "resource:fixture",
    operation: "enumerate",
    applicable: true,
    supported: true,
    accessible: true,
    enumerable: true,
    complete: true,
    resultCount: 0,
    evidence: ["fixture:visibility"],
    ...overrides,
  };
}

test("complete enumerable zero results derive VERIFIED_EMPTY", () => {
  const reading = agentVisibilityReading(observation());
  assert.equal(reading.classification, "verified-empty");
});

test("positive results derive VERIFIED_PRESENT before completeness matters", () => {
  const reading = agentVisibilityReading(observation({
    complete: false,
    resultCount: 1,
  }));
  assert.equal(reading.classification, "verified-present");
});

test("obstructions outrank zero-result absence", () => {
  assert.equal(agentVisibilityReading(observation({ applicable: false })).classification, "not-applicable");
  assert.equal(agentVisibilityReading(observation({ supported: false })).classification, "unsupported");
  assert.equal(agentVisibilityReading(observation({ error: "timeout" })).classification, "error-degraded");
  assert.equal(agentVisibilityReading(observation({ accessible: false })).classification, "inaccessible");
  assert.equal(agentVisibilityReading(observation({ enumerable: false })).classification, "unenumerable");
  assert.equal(agentVisibilityReading(observation({ complete: false })).classification, "filtered-partial");
});

test("source and result-count inputs are validated", () => {
  assert.throws(
    () => agentVisibilityReading(observation({ sourceRef: "" })),
    /visibility sourceRef/u,
  );
  assert.throws(
    () => agentVisibilityReading(observation({ resultCount: -1 })),
    /nonnegative safe integer/u,
  );
  assert.throws(
    () => agentVisibilityReading(observation({ sourceMode: "fallback" })),
    /sourceMode: unexpected value/u,
  );
});
