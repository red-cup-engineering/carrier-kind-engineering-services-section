import test from "node:test";
import assert from "node:assert/strict";
import { BOARD_DT, BOARD_LAWS, balanceLimit, boardPark, groundAt, ride, startRide, stepRide, turnBy } from "../src/board.mjs";

const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) <= eps, `${what} ${a} !~ ${b} (±${eps})`);
const SECOND = 64;
const kinds = (events) => events.map((e) => e.kind);
const flat = boardPark({ floor: 0 });
// Frictionless, dragless laws isolate the gravity and contact laws.
const ideal = { rollingResistance: 0, manualResistance: 0, grindFriction: 0, drag: 0 };

test("rolling on the flat loses speed to rolling resistance and drag, and pushes add speed up to the push top speed", () => {
  const start = startRide(flat, { position: [0, 0, 0], heading: [0, 1], speed: 5 });
  const coasted = ride(flat, start, [], { ticks: SECOND });
  assert.ok(coasted.state.speed < 5 && coasted.state.speed > 4.5, `${coasted.state.speed}`);
  assert.ok(coasted.state.position[1] > 4.5 && coasted.state.position[1] < 5);
  const pushed = ride(flat, startRide(flat, { position: [0, 0, 0] }), Array.from({ length: 10 }, (_, i) => ({ tick: i * BOARD_LAWS.pushCooldown, push: true })), { ticks: 10 * BOARD_LAWS.pushCooldown });
  assert.equal(kinds(pushed.events).filter((k) => k === "push").length, 10);
  assert.ok(pushed.state.speed <= BOARD_LAWS.pushTopSpeed && pushed.state.speed > 5.5, `${pushed.state.speed}`);
  const spammed = ride(flat, startRide(flat, { position: [0, 0, 0] }), [0, 1, 2, 3].map((tick) => ({ tick, push: true })), { ticks: 4 });
  assert.equal(kinds(spammed.events).filter((k) => k === "push").length, 1, "pushes wait for the cooldown");
});

test("turns carve: the heading rotates at the turn rate and the velocity turns with it", () => {
  // turnBy is the tangent-half-angle rotation; for one tick it agrees with the circular rotation.
  const h = turnBy([0, 1], 0.04);
  near(h[0], Math.sin(0.04), 1e-9, "x"); near(h[1], Math.cos(0.04), 1e-9, "y");
  const out = ride(flat, startRide(flat, { position: [0, 0, 0], speed: 4 }), [{ tick: 0, turn: 1 }], { ticks: SECOND, laws: ideal });
  const angle = BOARD_LAWS.turnRate; // radians in one second
  near(out.state.heading[0], Math.sin(angle), 1e-7, "heading x");
  near(out.state.heading[1], Math.cos(angle), 1e-7, "heading y");
  const v = out.state.velocity;
  near(v[0] / Math.hypot(v[0], v[1]), out.state.heading[0], 1e-12, "velocity follows the board");
  near(out.state.speed, 4, 1e-12, "a carve keeps its speed without friction");
});

test("an ollie on the flat flies the ballistic arc and lands clean", () => {
  const out = ride(flat, startRide(flat, { position: [0, 0, 0], speed: 3 }), [{ tick: 10, ollie: true }], { ticks: 2 * SECOND, laws: ideal, sample: 1 });
  const launch = out.events.find((e) => e.kind === "launch"), landing = out.events.find((e) => e.kind === "land");
  assert.equal(launch.from, "ollie");
  const airtime = (landing.tick - launch.tick) * BOARD_DT;
  near(airtime, (2 * BOARD_LAWS.ollie) / BOARD_LAWS.gravity, 2 * BOARD_DT, "airtime");
  const top = Math.max(...out.trace.map((p) => p.position[2]));
  near(top, BOARD_LAWS.ollie ** 2 / (2 * BOARD_LAWS.gravity), 0.03, "height");
  assert.equal(landing.fakie, false);
  assert.equal(out.state.mode, "rolling");
  near(out.state.speed, 3, 1e-12);
});

// A kicker (rising north at a 0.4 gradient) at the foot of a flat run, a terrace with a drop, a ledge and a rail.
const spot = boardPark({
  floor: 0,
  surfaces: [
    { id: "kicker", footprint: [[-2, 10], [2, 10], [2, 13], [-2, 13]], z: 0, gradient: [0, 0.4] },
    { id: "terrace", footprint: [[-5, -10], [5, -10], [5, -4], [-5, -4]], z: 1.2 },
    { id: "ledge", footprint: [[8, 0], [9, 0], [9, 30], [8, 30]], z: 0.5 },
  ],
  rails: [
    { id: "rail", from: [-10, 20, 0.6], to: [-10, 26, 0.6] },
    { id: "long-rail", from: [20, 0, 0.6], to: [20, 200, 0.6] },
  ],
});

test("the ground is the highest surface not above a step; a taller surface is a wall", () => {
  assert.equal(groundAt(spot, [0, 11.5], 0.6).surface, "kicker");
  near(groundAt(spot, [0, 11.5], 0.6).height, 0.6, 1e-12);
  assert.equal(groundAt(spot, [0, 11.5], 0.5).wall.surface, "kicker", "a ramp face more than a step above is a wall");
  assert.equal(groundAt(spot, [8.5, 5], 0).wall.surface, "ledge");
  assert.equal(groundAt(spot, [8.5, 5], 0.5).surface, "ledge");
  assert.equal(groundAt(spot, [0, 50], 3).surface, null);
});

test("rolling off a kicker's lip launches the rider upward with the ramp's velocity", () => {
  const out = ride(spot, startRide(spot, { position: [0, 5, 0], speed: 6 }), [], { ticks: 3 * SECOND, sample: 1 });
  const launch = out.events.find((e) => e.kind === "launch");
  assert.equal(launch.from, "edge"); assert.equal(launch.surface, "kicker");
  const top = Math.max(...out.trace.map((p) => p.position[2]));
  assert.ok(top > 1.2 + 0.05, `the lip throws the rider above the ramp top: ${top}`);
  assert.ok(out.events.some((e) => e.kind === "land"), "and the rider comes down rolling");
  assert.equal(out.state.mode, "rolling");
});

test("rolling off the terrace drops to the floor; a flip finished in time lands, one unfinished bails", () => {
  const start = startRide(spot, { position: [0, -6, 1.2], heading: [0, 1], speed: 4 });
  const clean = ride(spot, start, [{ tick: 34, action: { id: "kickflip", ticks: 18 } }], { ticks: 2 * SECOND });
  assert.deepEqual(kinds(clean.events).slice(0, 4), ["launch", "action-begin", "action-complete", "land"]);
  const late = ride(spot, start, [{ tick: 34, action: { id: "kickflip", ticks: 60 } }], { ticks: 2 * SECOND });
  assert.equal(late.events.at(-1).kind, "bail"); assert.equal(late.events.at(-1).reason, "unfinished-action");
  assert.equal(late.state.mode, "bailed");
  const up = ride(spot, late.state, [{ tick: late.state.tick, recover: true }], { ticks: 1 });
  assert.equal(up.state.mode, "rolling"); assert.equal(up.state.speed, 0);
});

test("a half turn in the air lands fakie; a quarter turn lands sideways and bails", () => {
  const start = startRide(flat, { position: [0, 0, 0], speed: 3 });
  const halfTicks = Math.ceil((Math.PI / BOARD_LAWS.spinRate) * SECOND); // just over 180°
  const fakie = ride(flat, start, [{ tick: 0, ollie: true }, { tick: 1, turn: 1 }, { tick: 1 + halfTicks, turn: 0 }], { ticks: SECOND, laws: ideal });
  const spin = fakie.events.find((e) => e.kind === "spin");
  assert.equal(spin.halves, 1);
  const landing = fakie.events.find((e) => e.kind === "land");
  assert.equal(landing.fakie, true);
  assert.ok(fakie.state.speed < 0, "fakie rolls backwards along the heading");
  const sideways = ride(flat, start, [{ tick: 0, ollie: true }, { tick: 1, turn: 1 }, { tick: 1 + Math.round(halfTicks / 2), turn: 0 }], { ticks: SECOND, laws: ideal });
  assert.equal(sideways.events.at(-1).reason, "sideways");
});

test("grinding: a grind held in the air locks on when a rail comes in reach, slides its length and flies off the end", () => {
  // Rolling north beside the rail at x = -10, then ollie and hold grind before the rail is in reach.
  const start = startRide(spot, { position: [-10.3, 15, 0], heading: [0, 1], speed: 5 });
  const out = ride(spot, start, [{ tick: 40, ollie: true }, { tick: 50, grind: "50-50" }], { ticks: 3 * SECOND });
  const begin = out.events.find((e) => e.kind === "grind-begin");
  assert.equal(begin.rail, "rail"); assert.equal(begin.style, "50-50");
  const end = out.events.find((e) => e.kind === "grind-end");
  assert.equal(end.how, "end");
  assert.ok(begin.tick > 50, "the held grind waited for the rail");
  near(end.held, 6 / 5, 0.35, "about the rail's length over the speed");
  assert.equal(out.events[out.events.indexOf(end) + 1].from, "rail-end");
  assert.ok(out.events.some((e) => e.kind === "land" && e.tick > end.tick));
  // Out of reach, the grind input does nothing.
  const far = ride(spot, startRide(spot, { position: [-14, 15, 0], heading: [0, 1], speed: 5 }), [{ tick: 40, ollie: true }, { tick: 50, grind: "50-50" }], { ticks: SECOND });
  assert.ok(!far.events.some((e) => e.kind === "grind-begin"));
});

test("a grind's balance holds for the balance limit and then bails; a smaller drift holds longer", () => {
  const start = startRide(spot, { position: [20.2, 2, 0], heading: [0, 1], speed: 6 });
  const inputs = [{ tick: 0, ollie: true }, { tick: 20, grind: "boardslide" }];
  const out = ride(spot, start, inputs, { ticks: 8 * SECOND, laws: ideal });
  const bailed = out.events.find((e) => e.kind === "bail");
  assert.equal(bailed.reason, "grind-balance");
  const begin = out.events.find((e) => e.kind === "grind-begin");
  near((bailed.tick - begin.tick) * BOARD_DT, balanceLimit(BOARD_LAWS.balance.grind), 2 * BOARD_DT, "held");
  const skilled = ride(spot, start, inputs, { ticks: 8 * SECOND, laws: { ...ideal, balance: { grind: { drift: 0.3 } } } });
  const skilledBail = skilled.events.find((e) => e.kind === "bail");
  assert.ok(skilledBail === undefined || skilledBail.tick > bailed.tick + SECOND);
});

test("a manual armed in the air begins at the landing and ends on release", () => {
  const start = startRide(flat, { position: [0, 0, 0], speed: 3 });
  const out = ride(flat, start, [{ tick: 0, ollie: true }, { tick: 10, manual: true }, { tick: 70, release: true }], { ticks: 2 * SECOND });
  const landing = out.events.find((e) => e.kind === "land");
  const begin = out.events.find((e) => e.kind === "manual-begin");
  assert.equal(begin.tick, landing.tick); assert.equal(begin.landed, true);
  const end = out.events.find((e) => e.kind === "manual-end");
  assert.equal(end.tick, 70); assert.equal(end.how, "release");
  assert.equal(out.state.mode, "rolling");
});

test("rolling into a ledge's side stops a slow rider and bails a fast one; flying into it crashes", () => {
  const slow = ride(spot, startRide(spot, { position: [7, 5, 0], heading: [1, 0], speed: 1 }), [], { ticks: 2 * SECOND });
  assert.ok(slow.events.some((e) => e.kind === "wall")); assert.equal(slow.state.mode, "rolling"); assert.equal(slow.state.speed, 0);
  const fast = ride(spot, startRide(spot, { position: [6, 5, 0], heading: [1, 0], speed: 5 }), [], { ticks: SECOND });
  assert.equal(fast.events.at(-1).reason, "wall");
  // An ollie high enough clears the ledge and lands on it.
  const onto = ride(spot, startRide(spot, { position: [7, 5, 0], heading: [1, 0], speed: 3 }), [{ tick: 0, ollie: true }], { ticks: SECOND });
  assert.equal(onto.events.find((e) => e.kind === "land").surface, "ledge");
});

test("a ride is a law: the same park, start and inputs give the same bits, stepped or at once", () => {
  const start = startRide(spot, { position: [-10.3, 15, 0], heading: [0, 1], speed: 5 });
  const inputs = [{ tick: 3, push: true }, { tick: 40, ollie: true }, { tick: 42, action: { id: "kickflip", ticks: 6 } }, { tick: 50, grind: "50-50" }];
  const once = ride(spot, start, inputs, { ticks: 2 * SECOND });
  const again = ride(spot, start, JSON.parse(JSON.stringify(inputs)), { ticks: 2 * SECOND });
  assert.deepEqual(again, once);
  let state = start;
  const events = [];
  for (let tick = 0; tick < 2 * SECOND; tick += 1) {
    const step = stepRide(spot, state, inputs.filter((input) => input.tick === tick).map(({ tick: _, ...rest }) => rest));
    events.push(...step.events); state = step.state;
  }
  assert.deepEqual(state, once.state);
  assert.deepEqual(events, [...once.events]);
});

test("rides refuse what they cannot ride", () => {
  assert.throws(() => boardPark({ surfaces: [{ id: "bent", footprint: [[0, 0], [2, 0], [1, 1], [2, 2], [0, 2]], z: 0 }] }), /not convex/u);
  assert.throws(() => boardPark({ rails: [{ id: "dot", from: [0, 0, 0], to: [0, 0, 0] }] }), /no length/u);
  assert.throws(() => ride(flat, startRide(flat, { position: [0, 0, 0] }), [{ push: true }], { ticks: 1 }), /needs a tick/u);
  assert.throws(() => ride({}, {}, [], { ticks: 1 }), /needs a park/u);
});
