import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyState, chain, commRange, conic, continuity, createPlan, diamonds, eventLeq, headAddress, kinematicRegion, mergePlans, nests, orbitSummary, planOf,
  poseAt, precedes, propagate, reaches, reopenManeuver, seams, sequencingCheck, systemOf, tellCoast, tellImpulse, tellPowered, visibilityRegion, visibleFrom, whatIf,
} from "../src/orbit.mjs";

const norm = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crossN = (a, b) => norm([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
const MU = 3.5316e12, R1 = 6.9e5;
const circular = (r) => ({ r: [r, 0, 0], v: [0, Math.sqrt(MU / r), 0] });
const leo = (plan, vessel = "v", extra = {}) => tellCoast(plan, { vessel, epoch: 0, parent: "terra", ...circular(R1), player: "a", ...extra });
const fresh = (vessel = "v") => planOf(createPlan(), vessel);

test("a coast law conserves energy and angular momentum over 1000 orbits", () => {
  const r0 = [8e5, 1e5, 2e4], v0 = [-300, 2700, 400];
  const o = conic(MU, r0, v0);
  assert.equal(o.kind, "elliptic");
  let worstE = 0, worstH = 0;
  for (let k = 0; k <= 1000; k += 50) for (const f of [0, 0.123, 0.5, 0.987]) {
    const s = propagate(MU, r0, v0, (k + f) * o.period);
    const energy = dot(s.v, s.v) / 2 - MU / norm(s.r), h = crossN(s.r, s.v);
    worstE = Math.max(worstE, Math.abs(energy / o.energy - 1));
    worstH = Math.max(worstH, Math.abs(h / o.hMag - 1));
  }
  assert.ok(worstE < 1e-11, `energy drift ${worstE}`);
  assert.ok(worstH < 1e-11, `angular momentum drift ${worstH}`);
  const back = propagate(MU, r0, v0, 1000 * o.period);
  assert.ok(norm([back.r[0] - r0[0], back.r[1] - r0[1], back.r[2] - r0[2]]) < 1e-4, "1000 periods return to the start");
});

test("a hyperbolic coast conserves energy and angular momentum, and inverts in time", () => {
  const r0 = [7e5, 0, 0], v0 = [0, 4200, 900];
  const o = conic(MU, r0, v0);
  assert.equal(o.kind, "hyperbolic");
  for (const dt of [1, 300, 5e3, 1e6, 3e8, -4e3]) {
    const s = propagate(MU, r0, v0, dt);
    assert.ok(Math.abs((dot(s.v, s.v) / 2 - MU / norm(s.r)) / o.energy - 1) < 1e-10, `energy at ${dt}`);
    const conditioning = (norm(s.r) * norm(s.v)) / o.hMag; // the cross product of a nearly radial far state loses digits by this factor
    assert.ok(Math.abs(crossN(s.r, s.v) / o.hMag - 1) < 1e-10 + 1e-14 * conditioning, `h at ${dt}`);
  }
  const there = propagate(MU, r0, v0, 12345), back = propagate(MU, there.r, there.v, -12345);
  assert.ok(norm([back.r[0] - r0[0], back.r[1] - r0[1], back.r[2] - r0[2]]) < 1e-5);
});

test("a body's ephemeris is an analytic law: the homeworld stays on its orbit across decades", () => {
  const system = systemOf(createPlan().history);
  const radius = norm(bodyState(system, "terra", 0).r);
  for (const years of [0.25, 1, 10, 100]) assert.ok(Math.abs(norm(bodyState(system, "terra", years * 31557600).r) / radius - 1) < 1e-9);
});

test("a coast reads the same at any time and warping ten years is one call", () => {
  const plan = leo(fresh());
  const near = poseAt(plan, 1000), far = poseAt(plan, 315576000);
  assert.equal(far.parent, "terra");
  assert.ok(Math.abs(norm(far.local.r) / R1 - 1) < 1e-9);
  assert.ok(Math.abs(norm(near.local.r) / R1 - 1) < 1e-12);
});

test("the sphere-of-influence entry and exit are continuous in position and velocity", () => {
  // transfer to the moon, then escape the moon again: two derived transitions
  let plan = leo(fresh());
  const dv = Math.sqrt(MU / R1) * (Math.sqrt((2 * 1.2e7) / (R1 + 1.2e7)) - 1);
  let found;
  for (let t = 60; t < 140000 && found === undefined; t += 60) {
    const fork = whatIf(plan, { kind: "impulse", t, dv: { prograde: dv } });
    const event = fork.result.nextEvent;
    if (event !== null && event.reason === "soi-entry") found = { t, fork };
  }
  assert.ok(found, "a departure reaching the moon's sphere exists");
  plan = found.fork.plan;
  const steps = chain(plan, "v", found.t + 1e6);
  assert.equal(steps[1].endReason, "soi-entry");
  assert.equal(steps[2].law.parent, "luna");
  const jumps = continuity(plan, "v", found.t + 1e6).filter((j) => j.from === "soi-entry" || j.from === "soi-exit");
  assert.ok(jumps.length >= 1);
  for (const j of jumps) {
    assert.ok(j.positionJump < 1e-5, `position jump ${j.positionJump}`); // root-frame magnitudes are ~1e10 m, where one ulp is 2e-6 m
    assert.ok(j.velocityJump < 1e-9, `velocity jump ${j.velocityJump}`);
  }
  const entry = steps[1].end;
  const before = poseAt(plan, entry - 1e-3), after = poseAt(plan, entry + 1e-3);
  assert.equal(before.parent, "terra");
  assert.equal(after.parent, "luna");
  assert.ok(norm([before.position[0] - after.position[0], before.position[1] - after.position[1], before.position[2] - after.position[2]]) < 5 * 2e-3 * 1.2e4);
  // the entry is on the sphere: |r - r_luna| = soi at the event time
  const system = systemOf(plan.history), luna = system.bodies.get("luna");
  const atEntry = poseAt(plan, entry + 0);
  assert.ok(Math.abs(norm(atEntry.local.r) / luna.soi - 1) < 1e-9);
  // leave again: a fast prograde burn inside the lunar sphere escapes to the homeworld
  const kicked = tellImpulse(plan, { t: entry + 100, dv: { prograde: 4000 }, player: "a" });
  const out = chain(kicked, "v", entry + 5e6);
  const exit = out.find((s) => s.endReason === "soi-exit");
  assert.ok(exit, "escape leaves the sphere");
  assert.equal(out[out.indexOf(exit) + 1].law.parent, "terra");
  for (const j of continuity(kicked, "v", entry + 5e6).filter((x) => x.from === "soi-exit")) assert.ok(j.positionJump < 1e-5 && j.velocityJump < 1e-9);
  assert.ok(Math.abs(norm(poseAt(kicked, exit.end - 1e-6).local.r) / luna.soi - 1) < 1e-8, "the exit is on the sphere");
});

test("a bound lunar orbit never leaves: ten years ahead is the same call", () => {
  let plan = leo(fresh());
  const dv = Math.sqrt(MU / R1) * (Math.sqrt((2 * 1.2e7) / (R1 + 1.2e7)) - 1);
  for (let t = 60; t < 140000; t += 60) {
    const fork = whatIf(plan, { kind: "impulse", t, dv: { prograde: dv } });
    if (fork.result.nextEvent?.reason === "soi-entry") { plan = fork.plan; break; }
  }
  const steps = chain(plan, "v", 1e6), entry = steps[1].end;
  const inside = orbitSummary(plan, "v", entry), lunaMu = systemOf(plan.history).bodies.get("luna").mu;
  const tPe = entry + inside.timeToPeriapsis, pe = poseAt(plan, tPe);
  const captured = tellImpulse(plan, { t: tPe, dv: { prograde: Math.sqrt(lunaMu / norm(pe.local.r)) - norm(pe.local.v) }, player: "a" });
  const far = poseAt(captured, 315576000);
  assert.equal(far.parent, "luna");
  assert.ok(Math.abs(norm(far.local.r) / norm(pe.local.r) - 1) < 1e-6);
});

test("impact ends a segment, and the vessel stays destroyed", () => {
  const plan = tellCoast(fresh(), { vessel: "v", epoch: 0, parent: "terra", r: [R1, 0, 0], v: [0, 1500, 0], player: "a" });
  const [first] = chain(plan, "v", 1e5);
  assert.equal(first.endReason, "impact");
  assert.equal(poseAt(plan, first.end - 1).status, "flying");
  const wreck = poseAt(plan, first.end + 5000);
  assert.equal(wreck.status, "destroyed");
  assert.ok(Math.abs(norm(wreck.local.r) / 6e5 - 1) < 1e-9);
});

test("a powered law with a cutoff ends at the requested apoapsis, deterministically", () => {
  const launch = () => tellPowered(fresh(), {
    vessel: "v", epoch: 0, parent: "terra", r: [6e5, 0, 0], v: [0, 0, 0], mass: 20000, dry: 5000, thrust: 360000, flow: 114.7, dt: 1 / 16, steps: 6400,
    steer: { vertical: 6, kick: 10, tilt: 0.5, east: [0, 1, 0] }, cutoff: { apoapsis: 7e5 }, player: "a",
  });
  const a = launch(), b = launch();
  assert.equal(headAddress(a), headAddress(b));
  const [burn, coast] = chain(a, "v", 5000);
  assert.equal(burn.endReason, "cutoff");
  assert.equal(coast.law.kind, "coast");
  const o = orbitSummary(a, "v", burn.end);
  assert.ok(o.apoapsis >= 7e5 && o.apoapsis < 7.05e5, `apoapsis ${o.apoapsis}`);
  assert.deepEqual(poseAt(a, 77.3), poseAt(b, 77.3));
  const before = poseAt(a, burn.end - 1 / 16), after = poseAt(a, burn.end);
  assert.ok(norm([before.local.r[0] - after.local.r[0], before.local.r[1] - after.local.r[1], before.local.r[2] - after.local.r[2]]) < 1e4);
  assert.ok(after.mass < 20000 && after.mass > 5000);
});

test("segments are kinematic points: a sequencing chain, not nesting", () => {
  const plan = tellImpulse(leo(fresh()), { t: 1000, dv: { prograde: 200 }, player: "a" });
  const withBurn = tellImpulse(plan, { t: 5000, dv: { prograde: -100 }, player: "a" });
  const points = diamonds(withBurn, { until: 20000 });
  assert.equal(points.length, 3);
  assert.deepEqual(points.map((p) => p.a.t), [0, 1000, 5000]);
  assert.equal(points[0].b, points[1].a, "consecutive diamonds share their joint event");
  const check = sequencingCheck(points);
  assert.ok(check.ok, JSON.stringify(check.violations));
  for (const p of points) assert.ok(reaches(p.a, p.b));
  assert.ok(precedes(points[0], points[2]) && !precedes(points[2], points[0]));
  assert.ok(!nests(points[0], points[1]) && !nests(points[1], points[0]));
});

test("the sequencing check refuses nesting and superluminal diamonds", () => {
  const e = (t, x) => ({ vessel: "v", t, x: [x, 0, 0] });
  const outer = { id: "outer", a: e(0, 0), b: e(100, 0) }, inner = { id: "inner", a: e(10, 0), b: e(20, 0) };
  const nested = sequencingCheck([outer, inner]);
  assert.ok(!nested.ok && nested.violations.some((x) => x.kind === "nested"));
  assert.ok(!nested.violations.every((x) => x.kind !== "not-sequenced"));
  const fast = sequencingCheck([{ id: "fast", a: e(0, 0), b: e(1, 4e9) }]);
  assert.ok(fast.violations.some((x) => x.kind === "endpoints-do-not-reach"));
  assert.ok(eventLeq(e(5, 0), e(5, 0)) && !eventLeq(e(6, 0), e(5, 0)));
});

test("a kinematic region obeys the hole and exterior laws", () => {
  const plan = tellImpulse(tellImpulse(leo(fresh()), { t: 1000, dv: { prograde: 100 }, player: "a" }), { t: 3000, dv: { prograde: 100 }, player: "a" });
  const points = diamonds(plan, { until: 9000 });
  for (const pattern of [[true, false, false], [false, true, false], [false, false, true], [false, false, false], [true, true, true], [true, false, true]]) {
    const region = kinematicRegion("pattern", (p) => pattern[points.indexOf(p)]);
    assert.ok(region.laws(points).ok, JSON.stringify(pattern));
    const reading = region.reading(points);
    reading.forEach((x, i) => assert.equal(x.exterior, pattern.slice(i).some(Boolean)));
    reading.forEach((x) => assert.notEqual(x.hole, x.exterior));
  }
});

test("line of sight is blocked by a body and communication needs range and sight", () => {
  let plan = leo(fresh("near"), "near");
  plan = tellCoast(plan, { vessel: "far", epoch: 0, parent: "terra", r: [-R1, 0, 0], v: [0, -Math.sqrt(MU / R1), 0], player: "a" });
  plan = tellCoast(plan, { vessel: "high", epoch: 0, parent: "terra", r: [2e6, 0, 0], v: [0, Math.sqrt(MU / 2e6), 0], player: "a" });
  const near = planOf(plan, "near"), far = planOf(plan, "far"), high = planOf(plan, "high");
  assert.equal(visibleFrom(near, far, 0), false, "terra is in the way");
  assert.equal(visibleFrom(near, high, 0), true);
  assert.equal(commRange(near, high, 0, { range: 1.4e6 }).linked, true);
  assert.equal(commRange(near, high, 0, { range: 1e5 }).inRange, false);
  assert.equal(commRange(near, far, 0, { range: 1e9 }).linked, false);
  const points = diamonds(far, { until: 4000 });
  const region = visibilityRegion(near, far, { samples: 8 });
  assert.ok(region.laws(points).ok);
  assert.equal(region.reading(points)[0].readout, false, "antipodal at one radius, the pair never sees each other");
  assert.equal(region.reading(points)[0].hole, true);
  const seen = diamonds(high, { until: 4000 });
  assert.equal(visibilityRegion(near, high, { samples: 32 }).reading(seen)[0].readout, true, "a higher orbit is seen over the horizon at some moment");
});

test("merge order does not change the result", () => {
  const base = leo(fresh());
  const a = tellImpulse(base, { t: 1000, dv: { prograde: 100 }, player: "alice" });
  const b = tellCoast(base, { vessel: "w", epoch: 0, parent: "terra", r: [0, 9e5, 0], v: [-Math.sqrt(MU / 9e5), 0, 0], player: "bob" });
  const c = tellImpulse(tellCoast(base, { vessel: "x", epoch: 10, parent: "luna", r: [4e5, 0, 0], v: [0, 800, 0], player: "carol" }), { vessel: "x", t: 4000, dv: { radial: 20 }, player: "carol" });
  const orders = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]].map((order) => mergePlans(...order));
  for (const merged of orders) {
    assert.equal(merged.head, orders[0].head);
    assert.deepEqual(merged.seams, orders[0].seams);
    for (const [vessel, t] of [["v", 7000], ["w", 7000], ["x", 9000]]) assert.deepEqual(poseAt(merged, t, vessel), poseAt(orders[0], t, vessel));
  }
  const nested = mergePlans(mergePlans(a, b), c), other = mergePlans(a, mergePlans(b, c)), again = mergePlans(a, a, b);
  assert.equal(nested.head, other.head);
  assert.equal(nested.head, orders[0].head);
  assert.equal(mergePlans(a, a).head, headAddress(a), "merge is idempotent");
  assert.ok(again.seams.ok);
  assert.equal(orders[0].seams.h1, 0);
});

test("two laws told at one (vessel, epoch) are a seam, never silently resolved", () => {
  const base = leo(fresh());
  const alice = tellImpulse(base, { t: 2000, dv: { prograde: 300 }, player: "alice" });
  const bob = tellImpulse(base, { t: 2000, dv: { prograde: -300 }, player: "bob" });
  const same = tellImpulse(base, { t: 2000, dv: { prograde: 300 }, player: "bob" });
  assert.equal(seams(alice).h1, 0);
  const merged = mergePlans(alice, bob), reversed = mergePlans(bob, alice);
  assert.equal(merged.seams.h1, 1);
  assert.equal(merged.seams.ok, false);
  assert.deepEqual(merged.seams.conflicts.map((c) => [c.vessel, c.epoch, c.told]), [["v", 2000, "both"]]);
  assert.equal(merged.seams.conflicts[0].laws.length, 2);
  assert.deepEqual(merged.seams, reversed.seams);
  assert.equal(merged.head, reversed.head);
  assert.throws(() => poseAt(merged, 2001, "v"), { name: "ContestedCell" });
  assert.throws(() => poseAt(merged, 2000, "v"), { name: "ContestedCell" });
  assert.ok(poseAt(merged, 1999, "v").t === 1999, "before the contested epoch the vessel still reads");
  assert.throws(() => diamonds(merged, { vessel: "v", until: 5000 }), { name: "ContestedCell" });
  // the same law told by two players is one cell with two witnesses: no seam
  const agreed = mergePlans(alice, same);
  assert.equal(agreed.seams.h1, 0);
  assert.ok(poseAt(agreed, 3000, "v").t === 3000);
  // a different vessel at the same epoch is another cell
  const other = tellImpulse(tellCoast(base, { vessel: "w", epoch: 0, parent: "terra", r: [0, 9e5, 0], v: [-2000, 0, 0], player: "bob" }), { vessel: "w", t: 2000, dv: { prograde: 5 }, player: "bob" });
  assert.equal(mergePlans(alice, other).seams.h1, 0);
});

test("what-if forks the history and leaves the original untouched", () => {
  const plan = leo(fresh());
  const head = headAddress(plan), chainBefore = JSON.stringify(chain(plan, "v", 1e5));
  const result = whatIf(plan, { kind: "impulse", t: 500, dv: { prograde: 250 } });
  assert.equal(headAddress(plan), head);
  assert.equal(JSON.stringify(chain(plan, "v", 1e5)), chainBefore);
  assert.notEqual(result.plan.history, plan.history);
  assert.notEqual(result.result.head, head);
  assert.ok(result.result.before.eccentricity < 1e-9);
  const after = result.result.after;
  assert.ok(Math.abs(after.periapsis / R1 - 1) < 1e-6, "an apoapsis burn raises the other side, not the burn point");
  assert.ok(after.apoapsis > 1e6);
  // vis-viva check of the apoapsis
  const v1 = Math.sqrt(MU / R1) + 250, a = 1 / (2 / R1 - (v1 * v1) / MU);
  assert.ok(Math.abs(after.apoapsis / (2 * a - R1) - 1) < 1e-9);
  assert.equal(result.document.kind, "holofoam.maneuver/v1");
  const reopened = reopenManeuver(plan, result.document);
  assert.equal(reopened.result.head, result.result.head);
  assert.throws(() => reopenManeuver(result.plan, result.document), TypeError);
  assert.deepEqual(JSON.parse(JSON.stringify(result.document)), result.document);
});

test("a rerun derives bit-identical poses and the same history head", () => {
  const build = () => {
    let plan = tellPowered(fresh("p"), {
      vessel: "p", epoch: 0, parent: "terra", r: [6e5, 0, 0], v: [0, 0, 0], mass: 20000, dry: 5000, thrust: 360000, flow: 114.7, dt: 1 / 16, steps: 6400,
      steer: { vertical: 6, kick: 10, tilt: 0.5, east: [0, 1, 0] }, cutoff: { apoapsis: 7e5 }, player: "a",
    });
    plan = tellImpulse(plan, { t: 900, dv: { prograde: 80 }, player: "a" });
    return plan;
  };
  const a = build(), b = build();
  assert.equal(headAddress(a), headAddress(b));
  for (const t of [50, 900.5, 12345, 3.15576e8]) assert.deepEqual(poseAt(a, t), poseAt(b, t));
});
