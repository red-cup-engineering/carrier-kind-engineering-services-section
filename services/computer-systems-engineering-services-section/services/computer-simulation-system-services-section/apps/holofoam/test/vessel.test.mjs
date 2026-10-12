import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SYSTEM, airDensity, chain, createPlan, tellCoast, headAddress, orbitSummary, planOf, poseAt, surfaceVelocity, systemOf, tellImpulse } from "../src/orbit.mjs";
import { G0, admitCatalog, deltaVLeft, fuelLedger, spend, stackDesign, stagesOf, tellAscent } from "../src/vessel.mjs";

const CATALOG = admitCatalog({
  pod: { kind: "pod", mass: 840 },
  small: { kind: "tank", mass: 250, fuel: 2000 },
  large: { kind: "tank", mass: 500, fuel: 4000 },
  terrier: { kind: "engine", mass: 500, thrust: 60000, isp: 345 },
  swivel: { kind: "engine", mass: 1500, thrust: 215000, isp: 320 },
  decoupler: { kind: "decoupler", mass: 50 },
});
const TWO_STAGE = ["pod", "small", "terrier", "decoupler", "large", "large", "swivel"];
const terra = systemOf(createPlan().history).bodies.get("terra");
const SITE = { parent: "terra", r: [terra.radius, 0, 0] };
const close = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`);

test("a stack reads as stages bottom first, each with Tsiolkovsky's Δv", () => {
  const stages = stagesOf(TWO_STAGE, CATALOG);
  assert.equal(stages.length, 2);
  assert.deepEqual(stages[0].parts, ["decoupler", "large", "large", "swivel"]);
  assert.equal(stages[0].ignitionMass, 840 + 2250 + 500 + 50 + 4500 * 2 + 1500);
  assert.equal(stages[0].fuel, 8000);
  close(stages[0].deltaV, 320 * G0 * Math.log(14140 / 6140), 1e-9, "first stage Δv");
  assert.equal(stages[1].ignitionMass, 14140 - 8000 - 50 - 1000 - 1500);
  close(stages[1].deltaV, 345 * G0 * Math.log(3590 / 1590), 1e-9, "second stage Δv");
  close(stages[0].twr, 215000 / (14140 * G0), 1e-12, "liftoff thrust-to-weight");
});

test("a stage without an engine holds no usable Δv and its fuel falls with it", () => {
  const stages = stagesOf(["pod", "decoupler", "small"], CATALOG);
  assert.equal(stages[0].deltaV, 0);
  assert.equal(stages[0].dryDropped, 50 + 2250);
});

test("the same stack is a structure design with a decoupler joint below each decoupler", () => {
  const design = stackDesign(TWO_STAGE, CATALOG);
  assert.equal(design.parts.length, TWO_STAGE.length);
  assert.deepEqual(design.joints.map((joint) => joint.kind).sort(), ["decoupler", "weld", "weld", "weld", "weld", "weld"]);
  const engine = design.parts.find((part) => part.id === "6:swivel");
  assert.deepEqual(engine.thrust, [0, 0, 215000]);
});

test("spending Δv stages as each stage empties, and refuses what the vessel does not hold", () => {
  const stages = stagesOf(TWO_STAGE, CATALOG);
  const full = fuelLedger(stages), total = deltaVLeft(stages, full);
  close(total, stages[0].deltaV + stages[1].deltaV, 1e-6, "total Δv");
  const first = spend(stages, full, 3000);
  assert.equal(first.short, 0);
  assert.deepEqual(first.dropped, [0]);
  assert.equal(first.ledger.stage, 1);
  close(deltaVLeft(stages, first.ledger), total - 3000, 1e-6, "Δv after a burn");
  const second = spend(stages, first.ledger, 10000);
  close(second.short, 10000 - (total - 3000), 1e-6, "the part of the burn the vessel cannot give");
  assert.equal(second.ledger.fuel, 0);
  close(second.ledger.mass, 1590, 1e-6, "dry upper stage");
});

test("a staged ascent reaches the apoapsis cutoff, and a circularizing burn at apoapsis makes an orbit", () => {
  const stages = stagesOf(TWO_STAGE, CATALOG);
  const ascent = tellAscent(planOf(createPlan(), "kestrel"), { vessel: "kestrel", site: SITE, stages, apoapsis: terra.radius + 80000 });
  assert.equal(ascent.events[0].kind, "ignition");
  assert.equal(ascent.events.at(-1).kind, "cutoff");
  const suborbit = orbitSummary(ascent.plan, "kestrel", ascent.end);
  const cutoffAltitude = Math.hypot(...poseAt(ascent.plan, ascent.end, "kestrel").local.r) - terra.radius;
  assert.ok(cutoffAltitude > 20000, `the default programme cuts off clear of the ground (${cutoffAltitude} m)`);
  assert.ok(suborbit.timeToApoapsis < suborbit.timeToPeriapsis, "still climbing at cutoff, not falling toward a periapsis first");
  close(suborbit.apoapsisAltitude, 80000, 1000, "apoapsis altitude at cutoff");
  assert.ok(suborbit.periapsisAltitude < 70000, "not yet in orbit at cutoff");
  const tApo = ascent.end + suborbit.timeToApoapsis, atApo = poseAt(ascent.plan, tApo, "kestrel");
  const rn = Math.hypot(...atApo.local.r), dv = Math.sqrt(terra.mu / rn) - Math.hypot(...atApo.local.v);
  const paid = spend(stages, ascent.ledger, dv);
  assert.equal(paid.short, 0);
  const orbit = orbitSummary(tellImpulse(ascent.plan, { vessel: "kestrel", t: tApo, dv: { prograde: dv } }), "kestrel", tApo);
  assert.ok(orbit.periapsisAltitude > 70000, `periapsis ${orbit.periapsisAltitude}`);
  assert.ok(orbit.eccentricity < 0.01);
  assert.equal(orbit.nextEvent, null, "a closed orbit has no impact");
});

test("an ascent is a deterministic history: the same rocket and programme give the same head", () => {
  const stages = stagesOf(TWO_STAGE, CATALOG);
  const fly = () => tellAscent(planOf(createPlan(), "kestrel"), { vessel: "kestrel", site: SITE, stages, apoapsis: terra.radius + 80000 });
  assert.equal(headAddress(fly().plan), headAddress(fly().plan));
});

test("a rocket that cannot lift itself never leaves the pad", () => {
  const stages = stagesOf(["pod", "large", "large", "large", "terrier"], CATALOG);
  assert.ok(stages[0].twr < 1);
  const ascent = tellAscent(planOf(createPlan(), "brick"), { vessel: "brick", site: SITE, stages, apoapsis: terra.radius + 80000 });
  assert.equal(ascent.events.at(-1).kind, "impact");
});

test("a rocket launched east from a rotating world starts with the ground's speed and keeps the Δv it saves", () => {
  const system = systemOf(createPlan().history);
  const ground = surfaceVelocity(system, "terra", SITE.r);
  close(Math.hypot(...ground), (2 * Math.PI * terra.radius) / 21549.425, 1e-9, "Kerbin's equatorial speed, 174.94 m/s");
  assert.ok(Math.abs(Math.hypot(...ground) - 174.94) < 0.01);
  const still = DEFAULT_SYSTEM.map(({ rotationPeriod, ...body }) => body);
  const toOrbit = (plan) => {
    const stages = stagesOf(TWO_STAGE, CATALOG);
    const ascent = tellAscent(planOf(plan, "kestrel"), { vessel: "kestrel", site: SITE, stages, apoapsis: terra.radius + 80000 });
    const suborbit = orbitSummary(ascent.plan, "kestrel", ascent.end), tApo = ascent.end + suborbit.timeToApoapsis;
    const atApo = poseAt(ascent.plan, tApo, "kestrel"), dv = Math.sqrt(terra.mu / Math.hypot(...atApo.local.r)) - Math.hypot(...atApo.local.v);
    const paid = spend(stages, ascent.ledger, dv);
    assert.equal(paid.short, 0);
    return deltaVLeft(stages, paid.ledger);
  };
  const turning = toOrbit(createPlan()), standing = toOrbit(createPlan(still));
  assert.ok(turning > standing + 100, `rotation saves Δv: ${turning} vs ${standing}`);
});

test("a stage that burns out mid-ascent falls away and the next stage carries on to the cutoff", () => {
  const stages = stagesOf(TWO_STAGE, CATALOG);
  const ascent = tellAscent(planOf(createPlan(), "kestrel"), { vessel: "kestrel", site: SITE, stages, apoapsis: terra.radius + 250000 });
  assert.deepEqual(ascent.events.map((event) => event.kind), ["ignition", "burnout", "ignition", "cutoff"]);
  assert.equal(ascent.ledger.stage, 1);
  close(orbitSummary(ascent.plan, "kestrel", ascent.end).apoapsisAltitude, 250000, 2000, "apoapsis altitude at cutoff");
});

test("atmospheric drag: air thins as e^(-h/H) up to the atmosphere's edge, and an ascent through it costs more Δv", () => {
  const system = systemOf(createPlan().history);
  close(airDensity(system, "terra", terra.radius), 1.225, 1e-12, "sea-level density");
  close(airDensity(system, "terra", terra.radius + 5600), 1.225 / Math.E, 1e-9, "one scale height up");
  assert.equal(airDensity(system, "terra", terra.radius + 70000), 0, "nothing at or above the edge (KSP's cut)");
  const dragged = admitCatalog(Object.fromEntries(Object.entries(CATALOG).map(([id, part]) => [id, { ...part, drag: { pod: 0.3, tank: 0.1, engine: 0.15, decoupler: 0.05 }[part.kind] }])));
  const costToOrbit = (catalog) => {
    const stages = stagesOf(TWO_STAGE, catalog);
    const ascent = tellAscent(planOf(createPlan(), "kestrel"), { vessel: "kestrel", site: SITE, stages, apoapsis: terra.radius + 80000 });
    assert.equal(ascent.events.at(-1).kind, "cutoff");
    const suborbit = orbitSummary(ascent.plan, "kestrel", ascent.end), atApo = poseAt(ascent.plan, ascent.end + suborbit.timeToApoapsis, "kestrel");
    const dv = Math.sqrt(terra.mu / Math.hypot(...atApo.local.r)) - Math.hypot(...atApo.local.v);
    return deltaVLeft(stages, fuelLedger(stages)) - deltaVLeft(stages, spend(stages, ascent.ledger, dv).ledger);
  };
  assert.equal(stagesOf(TWO_STAGE, dragged)[0].dragArea, 0.3 + 0.1 + 0.15 + 0.05 + 0.1 + 0.1 + 0.15);
  const inAir = costToOrbit(dragged), inVacuum = costToOrbit(CATALOG);
  assert.ok(inAir > inVacuum + 50, `drag costs Δv: ${inAir} against ${inVacuum}`);
  assert.ok(inAir > 3000 && inAir < 3600, `orbit from a Kerbin-like world costs KSP's order of Δv (${inAir} m/s)`);
});

test("re-entry: a coast that dips into the air is integrated through it, and the air takes the speed off before the ground", () => {
  const r = terra.radius + 80000, vCircular = Math.sqrt(terra.mu / r);
  const coast = (air) => tellCoast(planOf(createPlan(), "capsule"), { vessel: "capsule", epoch: 0, parent: "terra", r: [r, 0, 0], v: [0, vCircular - 150, 0], ...air });
  const reasons = (plan) => chain(plan, "capsule", 7200).map((segment) => segment.endReason);
  const dragged = coast({ mass: 1000, dragArea: 0.5 }), conic = coast({});
  assert.deepEqual(reasons(dragged).slice(0, 2), ["atmosphere-entry", "impact"]);
  assert.deepEqual(reasons(conic), ["impact"]);
  const impactAt = (plan) => chain(plan, "capsule", 7200).find((segment) => segment.endReason === "impact").end;
  const speedAtGround = (plan) => Math.hypot(...poseAt(plan, impactAt(plan) - 1e-6, "capsule").local.v);
  assert.ok(speedAtGround(dragged) < speedAtGround(conic) / 3, `the air slows the capsule (${speedAtGround(dragged)} against ${speedAtGround(conic)} m/s)`);
  assert.equal(poseAt(dragged, impactAt(dragged) + 1, "capsule").status, "destroyed");
});

test("aerobraking: a shallow pass through the air climbs back out with a lower apoapsis", () => {
  const ra = terra.radius + 500000, rp = terra.radius + 60000;
  const va = Math.sqrt(terra.mu * (2 / ra - 2 / (ra + rp)));
  const plan = tellCoast(planOf(createPlan(), "brake"), { vessel: "brake", epoch: 0, parent: "terra", r: [ra, 0, 0], v: [0, va, 0], mass: 1000, dragArea: 1 });
  const segments = chain(plan, "brake", 20000);
  assert.deepEqual(segments.slice(0, 3).map((segment) => segment.endReason), ["atmosphere-entry", "atmosphere-exit", "atmosphere-entry"]);
  const after = orbitSummary(plan, "brake", segments[1].end + 1);
  assert.ok(after.apoapsisAltitude < 500000 - 1000, `the pass lowers apoapsis (${after.apoapsisAltitude} m)`);
  assert.ok(after.apoapsisAltitude > 100000, "but it is a brake, not a crash");
});
