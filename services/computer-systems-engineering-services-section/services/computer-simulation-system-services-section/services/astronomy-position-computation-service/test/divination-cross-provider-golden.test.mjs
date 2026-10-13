// Cross-service scientific receiving. The values are NOT newly generated
// by this astronomy producer. They are the independent historical,
 // externally published golden contract of the paid Moment Essentials:
 // https://github.com/lenticule-science/divination-services-section/blob/main/services/divination-services-section/services/ephemeris-tracking-team/test/ephemeris-product.test.mjs
//
// This guard compares two distinct dates across all ten bodies before
// Divination may replace its old computeChart implementation with this
// source-owned astronomical computation. Never "fix" the values to make
// the test pass: investigate the physical method and approve any new version.
import test from "node:test";
import assert from "node:assert/strict";
import { computeAstronomyPositions } from "../src/astronomy-positions.mjs";
import { BODIES } from "../src/positions.mjs";

const DIVINATION_MOMENT_GOLDENS = Object.freeze({
  "2000-01-01T00:00:00.000Z": Object.freeze({
    sun: 279.8637, moon: 217.2938, mercury: 271.1264, venus: 240.9712, mars: 327.585,
    jupiter: 25.3296, saturn: 40.2458, uranus: 314.7713, neptune: 303.1696, pluto: 251.4328,
  }),
  "2026-07-18T00:00:00.000Z": Object.freeze({
    sun: 115.4185, moon: 163.8291, mercury: 107.8342, venus: 159.1334, mars: 73.4932,
    jupiter: 123.8851, saturn: 14.7605, uranus: 64.4963, neptune: 4.3781, pluto: 304.4898,
  }),
});

test("astronomy reproduces the paid Divination numerical source law, rather than silently re-dating it", () => {
  for (const [instant, golden] of Object.entries(DIVINATION_MOMENT_GOLDENS)) {
    assert.deepEqual(Object.keys(golden), BODIES);
    const actual = computeAstronomyPositions(instant);
    for (const body of BODIES) {
      assert.equal(actual.bodies[body].longitude, golden[body], body + "@" + instant + ": investigate cross-provider drift before switching paid product source");
    }
    assert.match(actual.provenance.algorithm, /meeus-truncated-series/);
    assert.equal(actual.accuracy.validRange, "1800-2050");
  }
});
