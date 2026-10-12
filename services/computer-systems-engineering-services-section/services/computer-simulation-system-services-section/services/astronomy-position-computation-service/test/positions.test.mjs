import test from "node:test";
import assert from "node:assert/strict";
import { computeAstronomyPositions, computeChart, normalizeDegrees } from "../src/index.mjs";

test("positions are deterministic, complete, and carry their method", () => {
  const instant = "2026-09-08T00:00:00Z";
  const first = computeChart(instant);
  const second = computeChart(instant);
  assert.deepEqual(first, second);
  assert.equal(Object.keys(first.bodies).length, 10);
  assert.equal(first.provenance.algorithm, "meeus-truncated-series + jpl-approximate-elements (zero-dependency)");
  for (const state of Object.values(first.bodies)) {
    assert.ok(state.longitude >= 0 && state.longitude < 360);
    assert.ok(Number.isFinite(state.latitude));
  }
  assert.equal(normalizeDegrees(-1), 359);
});

test("the published astronomy response preserves its audited numerical golden", () => {
  const result = computeAstronomyPositions("2026-09-08T00:00:00Z");
  assert.equal(result.time, "2026-09-08T00:00:00.000Z");
  assert.equal(result.frame, "geocentric ecliptic-of-date, tropical, apparent");
  assert.deepEqual(
    {
      sun: result.bodies.sun.longitude,
      moon: result.bodies.moon.longitude,
      saturn: result.bodies.saturn.longitude,
      saturnSpeed: result.bodies.saturn.speed,
      elongation: result.lunarPhase.elongation,
      illumination: result.lunarPhase.illuminatedFraction,
    },
    {
      sun: 165.377,
      moon: 124.2712,
      saturn: 13.3367,
      saturnSpeed: -0.06424,
      elongation: 318.8943,
      illumination: 0.123251,
    },
  );
  assert.equal(result.accuracy.perBodyDegrees.saturn, 0.18);
});
