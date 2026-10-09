import test from "node:test";
import assert from "node:assert/strict";
import { queryHistory } from "@red-cup-engineering/signcraft/history";
import { admitDesign } from "../src/structure.mjs";
import { bodiesAt, designOf, headAddress, launch, setThrottle, stage } from "../src/flight.mjs";
import { length, massProperties, mulMatVec } from "../src/rigid-body.mjs";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);
const DT = 1 / 64;

// A lander: a heavy tank over an engine, welded, joined to a side pod by a decoupler and three braces.
const lander = (thrust = 4000) => admitDesign({
  parts: [
    { id: "tank", mass: 100, at: [0, 0, 1], kind: "tank" },
    { id: "engine", mass: 50, at: [0, 0, 0], kind: "engine", thrust: [0, 0, thrust] },
    { id: "pod-a", mass: 20, at: [2, 0, 1], kind: "pod" },
    { id: "pod-b", mass: 20, at: [2, 1, 1], kind: "pod" },
    { id: "pod-c", mass: 20, at: [2, 0, 2], kind: "pod" },
    { id: "ring-a", mass: 5, at: [0, 1, 1], kind: "ring" },
    { id: "ring-b", mass: 5, at: [0, 0, 2], kind: "ring" },
  ],
  joints: [
    { id: "w1", from: "tank", to: "engine", kind: "weld", strength: 1e9 },
    { id: "w2", from: "tank", to: "ring-a", kind: "weld", strength: 1e9 },
    { id: "w3", from: "tank", to: "ring-b", kind: "weld", strength: 1e9 },
    { id: "wp1", from: "pod-a", to: "pod-b", kind: "weld", strength: 1e9 },
    { id: "wp2", from: "pod-a", to: "pod-c", kind: "weld", strength: 1e9 },
    { id: "dec", from: "tank", to: "pod-a", kind: "decoupler", at: [1, 0, 1], strength: 1e6 },
    { id: "k1", from: "tank", to: "pod-b", kind: "strut", strength: 1e6, releasedBy: "dec" },
    { id: "k2", from: "ring-a", to: "pod-c", kind: "strut", strength: 1e6, releasedBy: "dec" },
    { id: "k3", from: "ring-b", to: "pod-b", kind: "strut", strength: 1e6, releasedBy: "dec" },
  ],
});
const segmentCount = (flight) => queryHistory(flight.history, { predicate: "segment" }).length;

test("free fall: the integrator follows the closed form of semi-implicit Euler", () => {
  const f = launch(lander(0), { dt: DT, gravity: [0, 0, -10], position: [0, 0, 100] });
  assert.equal(f.firings.length, 0);
  const [body] = bodiesAt(f, 64);
  const n = 64;
  near(body.velocity[2], -10 * n * DT, 1e-9);
  near(body.position[2] - body.centre[2], 100 - 10 * DT * DT * (n * (n + 1)) / 2, 1e-9);
  near(Math.hypot(...body.orientation), 1, 1e-12);
  assert.deepEqual(body.angularVelocity, [0, 0, 0]);
});

// An on-axis stack: thrust through the centre of mass.
const stack = () => admitDesign({
  parts: [{ id: "tank", mass: 100, at: [0, 0, 1], kind: "tank" }, { id: "engine", mass: 50, at: [0, 0, 0], kind: "engine", thrust: [0, 0, 3000] }],
  joints: [{ id: "w", from: "tank", to: "engine", kind: "weld", strength: 1e9 }],
});

test("thrust: acceleration is thrust over mass minus gravity, and an on-axis stack does not turn", () => {
  const f = launch(stack(), { dt: DT, gravity: [0, 0, -10] });
  const [body] = bodiesAt(f, 64);
  near(body.mass, 150);
  near(body.velocity[2], 3000 / 150 - 10);
  assert.deepEqual(body.angularVelocity, [0, 0, 0]);
  assert.deepEqual(body.orientation, [1, 0, 0, 0]);
});

test("rotation: off-axis thrust spins the ship, the quaternion stays unit, and torque-free spin conserves angular momentum", () => {
  const f = launch(lander(4000), { dt: DT, gravity: [0, 0, -10] });
  const late = bodiesAt(f, 1500)[0];
  assert.ok(late.angularVelocity.every(Number.isFinite) && late.position.every(Number.isFinite));
  assert.ok(length(late.angularVelocity) > 0.1);
  near(Math.hypot(...late.orientation), 1, 1e-12);
  const spin = launch(lander(0), { dt: DT, gravity: [0, 0, 0], angularVelocity: [0.5, 1, 0.3] });
  const design = designOf(spin);
  const parts = design.parts.map((p) => ({ ...p, at: p.at.map((e) => { const [n, d = "1"] = String(e).split("/"); return Number(n) / Number(d); }) }));
  const { inertia } = massProperties(parts);
  const angularMomentum = (b) => length(mulMatVec(inertia, b.angularVelocity));
  const start = bodiesAt(spin, 0)[0], end = bodiesAt(spin, 1280)[0];
  near(angularMomentum(end), angularMomentum(start), 1e-9);
  assert.notDeepEqual(end.orientation, start.orientation);
});

test("law, not state: poses derive from segments; reading never changes the history", () => {
  const f = launch(lander(), { dt: DT, gravity: [0, 0, -10] });
  const head = headAddress(f);
  const a = bodiesAt(f, 500), b = bodiesAt(f, 500);
  assert.deepEqual(a, b);
  assert.equal(headAddress(f), head);
  assert.equal(segmentCount(f), 1);
  assert.notDeepEqual(bodiesAt(f, 500)[0].position, bodiesAt(f, 501)[0].position);
});

test("segments are re-told only when inputs change", () => {
  let f = launch(lander(), { dt: DT, gravity: [0, 0, -10] });
  assert.equal(segmentCount(f), 1);
  f = setThrottle(f, 100, 1); // same throttle: same thrust
  assert.equal(segmentCount(f), 1);
  f = setThrottle(f, 200, 0.5);
  assert.equal(segmentCount(f), 2);
  const pose = bodiesAt(f, 300)[0];
  assert.equal(pose.epoch, 200);
  f = stage(f, 400, "dec");
  assert.equal(segmentCount(f), 4); // two bodies told
  assert.throws(() => setThrottle(f, 399, 1), TypeError);
});

test("staging: a decoupler removal splits the bodies and conserves momentum and the centre of mass", () => {
  let f = launch(lander(), { dt: DT, gravity: [0, 0, -10] });
  const before = bodiesAt(f, 320)[0];
  f = stage(f, 320, "dec");
  assert.equal(f.firings.length, 0);
  const after = bodiesAt(f, 320);
  assert.equal(after.length, 2);
  assert.equal(designOf(f).joints.length, 5);
  const m = after.reduce((s, b) => s + b.mass, 0);
  near(m, before.mass);
  for (let k = 0; k < 3; k += 1) {
    near(after.reduce((s, b) => s + b.mass * b.velocity[k], 0) / m, before.velocity[k], 1e-9); // total momentum
    near(after.reduce((s, b) => s + b.mass * b.position[k], 0) / m, before.position[k], 1e-9); // centre of mass
  }
  // afterwards the parts fly apart on their own laws
  const later = bodiesAt(f, 640);
  assert.equal(later.length, 2);
  assert.ok(later[0].position[0] !== later[1].position[0]);
  assert.throws(() => stage(f, 700, "dec"), TypeError); // already gone
});

test("breakage during flight: an overloaded launch fires members in order and splits the ship", () => {
  const weak = admitDesign({ parts: lander(30000).parts, joints: lander(30000).joints.map((j) => (j.id === "dec" ? { ...j, strength: 100 } : j.id === "k1" ? { ...j, strength: 50 } : j)) });
  const f = launch(weak, { dt: DT, gravity: [0, 0, -10] });
  assert.ok(f.firings.length >= 1);
  assert.deepEqual(f.firings.map((x) => x.step), f.firings.map((_, i) => i + 1));
  assert.ok(bodiesAt(f, 0).length >= 2);
  assert.equal(queryHistory(f.history, { predicate: "removes" }).length, f.firings.length);
});

test("determinism: the same design, flight and events give the same head address", () => {
  const run = () => {
    let f = launch(lander(), { dt: DT, gravity: [0, 0, -10] });
    f = setThrottle(f, 100, 0.7);
    f = stage(f, 200, "dec");
    return { head: headAddress(f), poses: bodiesAt(f, 1000) };
  };
  const a = run(), b = run();
  assert.equal(a.head, b.head);
  assert.deepEqual(a.poses, b.poses);
});
