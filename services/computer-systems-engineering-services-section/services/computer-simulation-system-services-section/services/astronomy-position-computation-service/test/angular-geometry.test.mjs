import test from "node:test";
import assert from "node:assert/strict";
import {
  sphericalSeparationDegrees, eclipticUnitVector,
  admitAngularGeometryRequest, computeAngularGeometry,
  MAX_ANGULAR_GEOMETRY_BODIES,
} from "../src/angular-geometry.mjs";

const pt = (longitude, latitude) => ({ longitude, latitude });
const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, "separation " + actual + " vs " + expected);

test("unit-sphere geometry at coincident, orthogonal, antipodal, and polar points", () => {
  close(sphericalSeparationDegrees(pt(0, 0), pt(0, 0)), 0);
  close(sphericalSeparationDegrees(pt(0, 0), pt(90, 0)), 90);
  close(sphericalSeparationDegrees(pt(0, 0), pt(180, 0)), 180);
  close(sphericalSeparationDegrees(pt(0, 90), pt(0, -90)), 180);
  close(sphericalSeparationDegrees(pt(0, 90), pt(180, 90)), 0);
  const v = eclipticUnitVector(45, 30);
  close(Math.hypot(v.x, v.y, v.z), 1, 1e-15);
});

test("angle wraps continuously and tiny separations survive dot-product cancellation", () => {
  close(sphericalSeparationDegrees(pt(359, 0), pt(1, 0)), 2);
  close(sphericalSeparationDegrees(pt(-1, 0), pt(361, 0)), 2);
  const tiny = sphericalSeparationDegrees(pt(0, 0), pt(1e-8, 0));
  assert.ok(tiny > 0 && Math.abs(tiny - 1e-8) < 1e-12, "do not lose a micro-angle to acos");
  const a = pt(17, 55), b = pt(352, -20);
  close(sphericalSeparationDegrees(a, b), sphericalSeparationDegrees(b, a), 1e-12);
});

test("spherical atan2 agrees with independent haversine for nondegenerate positions", () => {
  const a = pt(17, 55), b = pt(352, -20);
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians;
  const dLon = (b.longitude - a.longitude) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * radians) *
    Math.cos(b.latitude * radians) * Math.sin(dLon / 2) ** 2;
  const expected = 2 * Math.asin(Math.sqrt(h)) / radians;
  close(sphericalSeparationDegrees(a, b), expected, 1e-11);
});

test("admit finite, normalized and canonical time/body selections before any computation", () => {
  const a = admitAngularGeometryRequest({ time: "2026-09-08", bodies: ["moon", "sun"] });
  assert.equal(a.time, "2026-09-08T00:00:00.000Z");
  assert.deepEqual(a.bodies, ["sun", "moon"]);
  assert.ok(Object.isFrozen(a.bodies));
  assert.equal(MAX_ANGULAR_GEOMETRY_BODIES, 10);
  assert.throws(() => admitAngularGeometryRequest({ time: "not-a-time", bodies: ["sun", "moon"] }), TypeError);
  assert.throws(() => admitAngularGeometryRequest({ time: "1799-01-01", bodies: ["sun", "moon"] }), RangeError);
  assert.throws(() => admitAngularGeometryRequest({ time: "2026-09-08", bodies: ["sun"] }), TypeError);
  assert.throws(() => admitAngularGeometryRequest({ time: "2026-09-08", bodies: ["sun", "sun"] }), TypeError);
  assert.throws(() => admitAngularGeometryRequest({ time: "2026-09-08", bodies: ["sun", "pluto-2"] }), TypeError);
  assert.throws(() => eclipticUnitVector(0, 91), RangeError);
  assert.throws(() => eclipticUnitVector(Number.POSITIVE_INFINITY, 0), TypeError);
});

test("new astronomy operation returns every pair once with honest provenance", () => {
  const selected = computeAngularGeometry({ time: "2026-09-08", bodies: ["moon", "sun", "jupiter"] });
  assert.equal(selected.type, "561.astronomy-angular-geometry.v1");
  assert.equal(selected.pairCount, 3);
  assert.deepEqual(selected.bodies, ["sun", "moon", "jupiter"]);
  assert.ok(selected.provenance.algorithm.includes("meeus"));
  assert.match(selected.measurementNote, /physical accuracy/);
  assert.ok(selected.pairs.every(x => x.separationDegrees >= 0 && x.separationDegrees <= 180));
  assert.deepEqual(selected, computeAngularGeometry({ time: "2026-09-08", bodies: ["jupiter", "sun", "moon"] }));
  const all = computeAngularGeometry({ time: "2026-09-08" });
  assert.equal(all.pairCount, 45);
  assert.equal(new Set(all.pairs.map(x => x.bodyA + ":" + x.bodyB)).size, 45);
  assert.ok(Object.isFrozen(all.pairs));
});
