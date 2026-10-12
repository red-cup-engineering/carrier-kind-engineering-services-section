import assert from "node:assert/strict";
import test from "node:test";

import { computePrecisionAstronomyPositions, normalizePrecisionAstronomyRequest, oxiEphemerisArguments } from "../src/precision-provider.mjs";

const TIME = "2026-07-21T00:00:00.000Z";
const LOCATION = { latitude: 41.8781, longitude: -87.6298 };
const BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function chart() {
  return { kind: "natal", bodies: BODIES.map((body, index) => ({ body, lon_deg: index * 30 })), nodes: {} };
}

test("Oxi binding forwards supplied chart configuration including sidereal mode", () => {
  assert.deepEqual(
    oxiEphemerisArguments({ ...LOCATION, time: TIME, houseSystem: "placidus", rulership: "modern", sidereal: "lahiri" }, "/data/de440.bin"),
    ["chart", TIME, "--lat", "41.8781", "--lon=-87.6298", "--system", "placidus", "--rulership", "modern", "--de", "/data/de440.bin", "--format", "json", "--sidereal", "lahiri"],
  );
});

test("coordinate-only astronomy calls retain provider defaults and admit no chart configuration", async () => {
  const request = normalizePrecisionAstronomyRequest(TIME, { latitude: 70, longitude: -87.6298, houseSystem: "placidus", sidereal: "lahiri" });
  assert.deepEqual(request, { time: TIME, latitude: 70, longitude: -87.6298 });
  assert.deepEqual(
    oxiEphemerisArguments(request, "/data/de440.bin"),
    ["chart", TIME, "--lat", "70", "--lon=-87.6298", "--system", "whole-sign", "--rulership", "traditional", "--de", "/data/de440.bin", "--format", "json"],
  );
  let observed;
  await computePrecisionAstronomyPositions(TIME, { latitude: 70, longitude: -87.6298, houseSystem: "placidus", sidereal: "lahiri" }, {
    execute: async (value) => { observed = value; return chart(); },
  });
  assert.deepEqual(observed, { time: TIME, latitude: 70, longitude: -87.6298 });
});
