/**
 * Holofoam board: a rider on a wheeled board in contact with a park of planar surfaces and rails.
 *
 * Law, not state, as in flight: a ride is its park, its start and its inputs (each at a tick); every pose is
 * derived by stepping from the start at the fixed dt, so the same ride yields the same bits on every node and a
 * submitted ride is verified by replaying it. Only + − × ÷ and Math.sqrt, in a fixed order; no transcendental
 * functions (turns use the rational rotation of the tangent half-angle, see `turnBy`).
 *
 * The rider is a point at the board's centre with a heading (a unit vector in the ground plane) and one of five
 * modes, each with its own contact law:
 *
 * - `rolling`: the wheels hold the board to the surface under it and to its heading, so motion is one signed speed
 *   along the heading (negative is fakie). Along it act the slope's share of gravity, rolling resistance and air
 *   drag; a push adds speed up to the push top speed; turning carves (the velocity turns with the board). Rolling
 *   off a surface's edge onto lower ground launches the rider with the surface's own velocity (a ramp's lip throws
 *   you up); running into a surface higher than a step is a wall (stop, or bail when fast).
 * - `air`: ballistic under gravity; held turn spins the board about the vertical. A timed air action (a flip or a
 *   grab, named by the caller) runs for its ticks. Landing on a surface is clean when no action is unfinished, the
 *   board points along its horizontal velocity (either way: fakie lands too) and the impact is survivable;
 *   otherwise it is a bail. A manual armed in the air begins at the landing.
 * - `grind`: the board is constrained to a rail segment, sliding along it under the rail's slope, grind friction
 *   and drag. It is entered from the air within reach of a rail and roughly along it, and left by ollieing off or
 *   by running off an end (into the air).
 * - `manual`: rolling on two wheels, with extra friction.
 * - `bailed`: the rider is down; nothing moves until `recover`.
 *
 * Grinds and manuals are balanced. The lean drifts with a push that grows linearly with time on the feature; the
 * rider's correction cancels at most `correction` of it, so the lean stays level for correction/drift seconds and then
 * runs away; |lean| ≥ 1 is a bail. Holding a feature longer is therefore a skill a game may grant (a smaller drift),
 * not a reflex test: every rider who asks for the same hold gets the same outcome. The longest hold is
 * `balanceLimit(drift, correction)`.
 *
 * Inputs (each `{ tick, ... }`, applied at the start of that tick, in the order given within a tick):
 *   { push: true }                 a push (rolling only, at most once per `pushCooldown` ticks)
 *   { turn: -1 | 0 | 1 }           held turn (+1 clockwise seen from above, as compass headings turn)
 *   { ollie: true }                pop into the air from rolling, manual or grind
 *   { grind: style }               grind (air only): held until a rail comes in reach, or dropped at landing;
 *                                  `style` is the caller's label
 *   { grind: null }                let go of a held grind
 *   { manual: true }               begin a manual (rolling), or arm one for the landing (air)
 *   { release: true }              end a manual
 *   { action: { id, ticks } }      begin a timed air action
 *   { recover: true }              stand up after a bail, at rest
 * Events (`{ tick, kind, ... }`): push, launch (with from: ollie|edge|rail-end), spin (each half turn), action-begin,
 * action-complete, land (with fakie and impact), grind-begin, grind-end, manual-begin, manual-end, wall, bail (with
 * reason), recover.
 */
import { length } from "./rigid-body.mjs";

export const BOARD_FORMAT = "holofoam.board/v1";
/** The fixed step, a power of two so tick times are exact. */
export const BOARD_DT = 1 / 64;
export const MAX_RIDE_TICKS = 64 * 60 * 10;

/** The laws of the ride, SI units. Callers may override any of them per ride. */
export const BOARD_LAWS = Object.freeze({
  gravity: 9.80665,
  rollingResistance: 0.015, // a coefficient of gravity
  manualResistance: 0.05,
  grindFriction: 0.08,
  drag: 0.003, // per metre: deceleration k·v²
  pushSpeed: 1.4, // m/s a push adds
  pushTopSpeed: 6.5, // pushing adds nothing above this
  pushCooldown: 20, // ticks
  turnRate: 2.5, // rad/s while rolling
  spinRate: 10, // rad/s in the air
  ollie: 3.3, // m/s upward
  step: 0.06, // m a wheel rolls up without it being a wall
  lip: 0.04, // m of drop below the plane that makes rolling into flight
  landingAlignment: 0.8, // least |cos| between heading and horizontal velocity on landing
  landingSpeed: 0.5, // below this horizontal speed alignment is not judged
  maxImpact: 9, // m/s of vertical speed a landing survives
  wallBail: 3.5, // m/s into a wall that bails
  grindReach: 0.6, // m horizontally from the rail
  grindHeight: 0.45, // m vertically from the rail
  grindAlignment: 0.55, // least |cos| between velocity and the rail
  balance: Object.freeze({ grind: Object.freeze({ drift: 0.9, correction: 0.9 }), manual: Object.freeze({ drift: 1.2, correction: 0.8 }) }),
});

const fail = (message) => { throw new TypeError(`board: ${message}`); };
const finite = (n, what) => (Number.isFinite(n) ? n : fail(`${what} is not finite`));
const point = (p, n, what) => (Array.isArray(p) && p.length === n ? p.map((c) => finite(c, what)) : fail(`${what} needs ${n} numbers`));
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const unit2 = (v) => { const n = Math.sqrt(dot2(v, v)); if (n === 0) fail("a heading needs a direction"); return [v[0] / n, v[1] / n]; };

/** Rotate a unit 2-vector clockwise (seen from above, x east and y north) by `angle` radians: the exact rotation
 *  whose tangent half-angle is the series tan(a/2) ≈ a/2 + (a/2)³/3, renormalized; for the angles of one tick
 *  (hundredths of a radian) it is the circular rotation to within 1e-9. */
export function turnBy(h, angle) {
  const half = angle / 2, t = half + (half * half * half) / 3, d = 1 + t * t;
  const c = (1 - t * t) / d, s = (2 * t) / d;
  return unit2([h[0] * c + h[1] * s, h[1] * c - h[0] * s]);
}

/** The longest a balance holds: level while the correction covers the drift, then runaway to |lean| = 1. */
export const balanceLimit = ({ drift, correction }) => correction / drift + Math.sqrt(2 / drift);

function convex(polygon) {
  let sign = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], c = polygon[(i + 2) % polygon.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (z !== 0) { if (sign !== 0 && Math.sign(z) !== sign) return false; sign = Math.sign(z); }
  }
  return sign !== 0;
}
function inside(polygon, [x, y]) {
  let sign = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const z = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    if (z === 0) continue;
    if (sign !== 0 && Math.sign(z) !== sign) return false;
    sign = Math.sign(z);
  }
  return true;
}

/**
 * A park: a floor height under everything, convex planar surfaces { id, footprint, z, gradient? } (height
 * z + g·(p − footprint[0]) over the footprint) and rails { id, from, to } (segments the board can grind).
 */
export function boardPark({ floor = 0, surfaces = [], rails = [] } = {}) {
  const ids = new Set();
  const named = (id, what) => { if (typeof id !== "string" || !id || ids.has(id)) fail(`${what} needs a unique id`); ids.add(id); return id; };
  return Object.freeze({
    format: BOARD_FORMAT,
    floor: finite(floor, "floor"),
    surfaces: Object.freeze(surfaces.map((s) => {
      const footprint = Array.isArray(s.footprint) && s.footprint.length >= 3 ? s.footprint.map((p) => point(p, 2, "footprint")) : fail("a surface needs a footprint");
      if (!convex(footprint)) fail(`surface ${s.id} is not convex`);
      return Object.freeze({ id: named(s.id, "surface"), footprint: Object.freeze(footprint), z: finite(s.z, "surface z"), gradient: Object.freeze(point(s.gradient ?? [0, 0], 2, "gradient")) });
    })),
    rails: Object.freeze(rails.map((r) => {
      const from = point(r.from, 3, "rail"), to = point(r.to, 3, "rail");
      const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], len = length(d);
      if (!(len > 0)) fail(`rail ${r.id} has no length`);
      return Object.freeze({ id: named(r.id, "rail"), from: Object.freeze(from), to: Object.freeze(to), length: len, direction: Object.freeze(d.map((c) => c / len)) });
    })),
  });
}

const heightOn = (s, [x, y]) => s.z + s.gradient[0] * (x - s.footprint[0][0]) + s.gradient[1] * (y - s.footprint[0][1]);

/**
 * What the ground is at a point for a rider at height z: the highest surface under the point that is not above
 * z + step (the floor when none is), and whether a surface above that blocks the way (a wall).
 */
export function groundAt(park, xy, z, step = BOARD_LAWS.step) {
  let ground = { height: park.floor, surface: null, gradient: [0, 0] }, wall = null;
  for (const s of park.surfaces) {
    if (!inside(s.footprint, xy)) continue;
    const h = heightOn(s, xy);
    if (h > z + step) { if (wall === null || h < wall.height) wall = { height: h, surface: s.id }; continue; }
    if (h > ground.height) ground = { height: h, surface: s.id, gradient: s.gradient };
  }
  return { ...ground, wall };
}

/** The nearest rail point in reach of a position moving with a velocity, with the rail's parameter. */
function railInReach(park, position, velocity, laws) {
  let best = null;
  for (const rail of park.rails) {
    const rel = [position[0] - rail.from[0], position[1] - rail.from[1], position[2] - rail.from[2]];
    const s = Math.min(Math.max(rel[0] * rail.direction[0] + rel[1] * rail.direction[1] + rel[2] * rail.direction[2], 0), rail.length);
    const at = [rail.from[0] + rail.direction[0] * s, rail.from[1] + rail.direction[1] * s, rail.from[2] + rail.direction[2] * s];
    const horizontal = Math.sqrt((position[0] - at[0]) ** 2 + (position[1] - at[1]) ** 2);
    const vertical = Math.abs(position[2] - at[2]);
    if (horizontal > laws.grindReach || vertical > laws.grindHeight) continue;
    const speed = length(velocity);
    const along = speed === 0 ? 0 : (velocity[0] * rail.direction[0] + velocity[1] * rail.direction[1] + velocity[2] * rail.direction[2]) / speed;
    if (Math.abs(along) < laws.grindAlignment) continue;
    const reach = horizontal + vertical;
    if (best === null || reach < best.reach) best = { rail, s, at, reach, speed: speed * along };
  }
  return best;
}

/** A rider at rest (or rolling at `speed` along `heading`) at `position`, on whatever ground is under it. */
export function startRide(park, { position, heading = [0, 1], speed = 0 } = {}) {
  const p = point(position, 3, "position"), h = unit2(point(heading, 2, "heading"));
  const ground = groundAt(park, [p[0], p[1]], p[2]);
  return freeze({ tick: 0, mode: "rolling", position: [p[0], p[1], ground.height], velocity: [h[0] * speed, h[1] * speed, 0], heading: h, speed: finite(speed, "speed"), surface: ground.surface, turn: 0, lastPush: -Infinity, action: null, armedManual: false, armedGrind: null, rail: null, balance: null, spun: 0 });
}

function freeze(state) {
  return Object.freeze({ ...state, position: Object.freeze(state.position), velocity: Object.freeze(state.velocity), heading: Object.freeze(state.heading) });
}

const resolveLaws = (laws = {}) => ({ ...BOARD_LAWS, ...laws, balance: { grind: { ...BOARD_LAWS.balance.grind, ...laws.balance?.grind }, manual: { ...BOARD_LAWS.balance.manual, ...laws.balance?.manual } } });

/** Begin balancing a feature; the drift's sign is the parity of the tick it began on, so it is fixed by the ride. */
const beginBalance = (kind, tick) => ({ kind, held: 0, lean: 0, sign: tick % 2 === 0 ? 1 : -1 });

/** One tick of balance: the drift grows with time held; the correction cancels at most its share. */
function balanceStep(balance, law) {
  const held = balance.held + BOARD_DT;
  const push = Math.max(0, law.drift * held - law.correction);
  return { ...balance, held, lean: balance.lean + balance.sign * push * BOARD_DT };
}

/** Speed along the heading after one tick of rolling (or manual) laws on a surface with this gradient. */
function rollingSpeed(speed, heading, gradient, laws, resistance) {
  const g2 = dot2(gradient, gradient);
  // On the plane z = z0 + g·p the horizontal acceleration of a frictionless mass is −g·grad/(1+|grad|²).
  const downhill = -laws.gravity * dot2(gradient, heading) / (1 + g2);
  let v = speed + downhill * BOARD_DT;
  const loss = (resistance * laws.gravity + laws.drag * v * v) * BOARD_DT;
  v = Math.abs(v) <= loss ? 0 : v - Math.sign(v) * loss;
  return v;
}

function bail(state, events, reason) {
  events.push({ tick: state.tick, kind: "bail", reason });
  return { ...state, mode: "bailed", velocity: [0, 0, 0], speed: 0, action: null, armedManual: false, armedGrind: null, rail: null, balance: null, turn: 0 };
}

function applyInput(state, input, laws, park, events) {
  const at = state.tick;
  if (state.mode === "bailed") {
    if (input.recover) { events.push({ tick: at, kind: "recover" }); const ground = groundAt(park, [state.position[0], state.position[1]], state.position[2]); return { ...state, mode: "rolling", position: [state.position[0], state.position[1], ground.height], surface: ground.surface, spun: 0 }; }
    return state;
  }
  if ("turn" in input) return { ...state, turn: Math.sign(finite(input.turn, "turn")) };
  if (input.push) {
    if (state.mode !== "rolling" || at - state.lastPush < laws.pushCooldown) return state;
    events.push({ tick: at, kind: "push" });
    const forward = state.speed >= 0 ? 1 : -1;
    const magnitude = Math.abs(state.speed);
    const next = magnitude >= laws.pushTopSpeed ? magnitude : Math.min(laws.pushTopSpeed, magnitude + laws.pushSpeed);
    return { ...state, speed: forward * next, lastPush: at };
  }
  if (input.ollie) {
    if (!["rolling", "manual", "grind"].includes(state.mode)) return state;
    const from = state.mode === "grind" ? "rail" : "ollie";
    if (state.mode === "grind") events.push({ tick: at, kind: "grind-end", rail: state.rail.id, held: state.balance.held, how: "ollie" });
    if (state.mode === "manual") events.push({ tick: at, kind: "manual-end", held: state.balance.held, how: "ollie" });
    events.push({ tick: at, kind: "launch", from });
    return { ...state, mode: "air", velocity: [state.velocity[0], state.velocity[1], state.velocity[2] + laws.ollie], rail: null, balance: null, spun: 0, surface: null };
  }
  if ("grind" in input) {
    if (state.mode !== "air") return state;
    return lockOnRail({ ...state, armedGrind: input.grind ?? null }, park, laws, events);
  }
  if (input.manual) {
    if (state.mode === "air") return { ...state, armedManual: true };
    if (state.mode !== "rolling") return state;
    events.push({ tick: at, kind: "manual-begin" });
    return { ...state, mode: "manual", balance: beginBalance("manual", at) };
  }
  if (input.release) {
    if (state.mode === "air") return { ...state, armedManual: false };
    if (state.mode !== "manual") return state;
    events.push({ tick: at, kind: "manual-end", held: state.balance.held, how: "release" });
    return { ...state, mode: "rolling", balance: null };
  }
  if (input.action) {
    const { id, ticks } = input.action;
    if (state.mode !== "air" || state.action !== null || typeof id !== "string" || !(Number.isInteger(ticks) && ticks > 0)) return state;
    events.push({ tick: at, kind: "action-begin", action: id });
    return { ...state, action: { id, ticks, done: 0 } };
  }
  return state;
}

/** A rider in the air holding a grind takes the nearest rail in reach, if any. */
function lockOnRail(state, park, laws, events) {
  if (state.armedGrind === null || state.armedGrind === undefined) return state;
  const reach = railInReach(park, state.position, state.velocity, laws);
  if (reach === null) return state;
  if (state.action !== null) return bail(state, events, "grind-mid-action");
  const forward = reach.speed >= 0 ? 1 : -1;
  events.push({ tick: state.tick, kind: "grind-begin", rail: reach.rail.id, style: state.armedGrind });
  const d = reach.rail.direction;
  return { ...state, mode: "grind", rail: { id: reach.rail.id, s: reach.s, style: state.armedGrind }, armedGrind: null, position: reach.at, speed: reach.speed, heading: unit2([d[0] * forward, d[1] * forward]), velocity: [d[0] * reach.speed, d[1] * reach.speed, d[2] * reach.speed], balance: beginBalance("grind", state.tick), spun: 0, armedManual: false };
}

function land(state, ground, laws, events) {
  const impact = -state.velocity[2];
  const horizontal = [state.velocity[0], state.velocity[1]];
  const hs = Math.sqrt(dot2(horizontal, horizontal));
  const along = hs === 0 ? 0 : dot2(horizontal, state.heading) / hs;
  const landed = { ...state, position: [state.position[0], state.position[1], ground.height], surface: ground.surface, armedGrind: null };
  if (state.action !== null) return bail(landed, events, "unfinished-action");
  if (impact > laws.maxImpact) return bail(landed, events, "impact");
  if (hs >= laws.landingSpeed && Math.abs(along) < laws.landingAlignment) return bail(landed, events, "sideways");
  const speed = hs * (along < 0 ? -1 : 1);
  events.push({ tick: state.tick, kind: "land", fakie: along < 0, impact, surface: ground.surface });
  const rolling = { ...landed, mode: "rolling", speed, velocity: [state.heading[0] * speed, state.heading[1] * speed, 0], spun: 0 };
  if (!state.armedManual) return rolling;
  events.push({ tick: state.tick, kind: "manual-begin", landed: true });
  return { ...rolling, armedManual: false, mode: "manual", balance: beginBalance("manual", state.tick) };
}

function advance(state, laws, park, events) {
  const dt = BOARD_DT;
  if (state.mode === "bailed") return state;
  if (state.mode === "rolling" || state.mode === "manual") {
    const heading = state.turn === 0 ? state.heading : turnBy(state.heading, state.turn * laws.turnRate * dt);
    let next = { ...state, heading };
    if (state.mode === "manual") {
      const balance = balanceStep(state.balance, laws.balance.manual);
      if (Math.abs(balance.lean) >= 1) return bail(next, events, "manual-balance");
      next = { ...next, balance };
    }
    const here = groundAt(park, [state.position[0], state.position[1]], state.position[2]);
    const speed = rollingSpeed(state.speed, heading, here.gradient, laws, state.mode === "manual" ? laws.manualResistance : laws.rollingResistance);
    const xy = [state.position[0] + heading[0] * speed * dt, state.position[1] + heading[1] * speed * dt];
    const climb = here.gradient[0] * heading[0] * speed * dt + here.gradient[1] * heading[1] * speed * dt;
    const planeZ = state.position[2] + climb;
    const there = groundAt(park, xy, Math.max(planeZ, state.position[2]));
    if (there.wall !== null) {
      events.push({ tick: state.tick, kind: "wall", surface: there.wall.surface, speed });
      if (Math.abs(speed) >= laws.wallBail) return bail(next, events, "wall");
      return { ...next, speed: 0, velocity: [0, 0, 0] };
    }
    const vz = climb / dt;
    if (there.height < planeZ - laws.lip) {
      if (state.mode === "manual") events.push({ tick: state.tick, kind: "manual-end", held: next.balance.held, how: "edge" });
      events.push({ tick: state.tick, kind: "launch", from: "edge", surface: here.surface });
      return { ...next, mode: "air", balance: null, position: [xy[0], xy[1], planeZ], velocity: [heading[0] * speed, heading[1] * speed, vz], speed, surface: null, spun: 0 };
    }
    return { ...next, speed, position: [xy[0], xy[1], there.height], velocity: [heading[0] * speed, heading[1] * speed, vz], surface: there.surface };
  }
  if (state.mode === "grind") {
    const rail = park.rails.find((r) => r.id === state.rail.id);
    const balance = balanceStep(state.balance, laws.balance.grind);
    if (Math.abs(balance.lean) >= 1) return bail(state, events, "grind-balance");
    let v = state.speed - laws.gravity * rail.direction[2] * dt;
    const loss = (laws.grindFriction * laws.gravity + laws.drag * v * v) * dt;
    v = Math.abs(v) <= loss ? 0 : v - Math.sign(v) * loss;
    const s = state.rail.s + v * dt;
    const d = rail.direction;
    if (s < 0 || s > rail.length || v === 0) {
      events.push({ tick: state.tick, kind: "grind-end", rail: rail.id, held: balance.held, how: v === 0 ? "stall" : "end" });
      if (v === 0) return bail(state, events, "stall");
      const clamped = Math.min(Math.max(s, 0), rail.length);
      events.push({ tick: state.tick, kind: "launch", from: "rail-end" });
      return { ...state, mode: "air", rail: null, balance: null, position: [rail.from[0] + d[0] * clamped, rail.from[1] + d[1] * clamped, rail.from[2] + d[2] * clamped], velocity: [d[0] * v, d[1] * v, d[2] * v], speed: v, spun: 0 };
    }
    return { ...state, balance, speed: v, rail: { ...state.rail, s }, position: [rail.from[0] + d[0] * s, rail.from[1] + d[1] * s, rail.from[2] + d[2] * s], velocity: [d[0] * v, d[1] * v, d[2] * v] };
  }
  // air
  let next = state;
  if (state.turn !== 0) {
    const spun = state.spun + state.turn * laws.spinRate * dt;
    // A half turn is π radians; count each one crossed, in either direction.
    const halves = Math.trunc(Math.abs(spun) / Math.PI), before = Math.trunc(Math.abs(state.spun) / Math.PI);
    if (halves > before) events.push({ tick: state.tick, kind: "spin", halves, direction: Math.sign(spun) });
    next = { ...next, heading: turnBy(state.heading, state.turn * laws.spinRate * dt), spun };
  }
  if (next.action !== null) {
    const done = next.action.done + 1;
    if (done >= next.action.ticks) { events.push({ tick: state.tick, kind: "action-complete", action: next.action.id }); next = { ...next, action: null }; }
    else next = { ...next, action: { ...next.action, done } };
  }
  const velocity = [state.velocity[0], state.velocity[1], state.velocity[2] - laws.gravity * dt];
  const position = [state.position[0] + velocity[0] * dt, state.position[1] + velocity[1] * dt, state.position[2] + velocity[2] * dt];
  next = { ...next, velocity, position };
  const ground = groundAt(park, [position[0], position[1]], state.position[2]);
  // Flying into the side of something taller than the rider is a crash, not a pass through it.
  if (ground.wall !== null && position[2] < ground.wall.height) { events.push({ tick: state.tick, kind: "wall", surface: ground.wall.surface, speed: length(velocity) }); return bail(next, events, "wall"); }
  if (velocity[2] <= 0 && position[2] <= ground.height) return land(next, ground, laws, events);
  return lockOnRail(next, park, laws, events);
}

/** Validate and order a ride's inputs: ticks are non-negative integers; ties keep their given order. */
export function rideInputs(inputs) {
  if (!Array.isArray(inputs)) fail("inputs must be a list");
  return inputs.map((input, index) => {
    if (input === null || typeof input !== "object" || !Number.isInteger(input.tick) || input.tick < 0 || input.tick > MAX_RIDE_TICKS) fail(`input ${index} needs a tick`);
    return { input, index };
  }).sort((a, b) => a.input.tick - b.input.tick || a.index - b.index).map(({ input }) => input);
}

/**
 * Ride a park from a start for `ticks` ticks under the inputs. Returns the final state, every event in order, and,
 * when `sample` is a positive integer, the pose every `sample` ticks ({ tick, mode, position, heading }) for drawing.
 */
export function ride(park, start, inputs, { ticks, laws: overrides, sample = 0 } = {}) {
  if (park?.format !== BOARD_FORMAT) fail("ride needs a park from boardPark");
  if (!(Number.isInteger(ticks) && ticks >= 0 && ticks <= MAX_RIDE_TICKS)) fail(`ticks must be an integer in [0, ${MAX_RIDE_TICKS}]`);
  const laws = resolveLaws(overrides);
  const ordered = rideInputs(inputs);
  const events = [];
  const trace = [];
  let state = { ...start };
  let next = 0;
  for (let tick = start.tick; tick < start.tick + ticks; tick += 1) {
    state = { ...state, tick };
    while (next < ordered.length && ordered[next].tick <= tick) { state = applyInput(state, ordered[next], laws, park, events); next += 1; }
    if (sample > 0 && (tick - start.tick) % sample === 0) trace.push(Object.freeze({ tick, mode: state.mode, position: Object.freeze([...state.position]), heading: Object.freeze([...state.heading]) }));
    state = advance(state, laws, park, events);
  }
  state = { ...state, tick: start.tick + ticks };
  return Object.freeze({ state: freeze(state), events: Object.freeze(events.map((e) => Object.freeze(e))), trace: Object.freeze(trace) });
}

/** One step of the ride with its own inputs for that tick: for a client that predicts as its keys are pressed. */
export function stepRide(park, state, inputs = [], { laws } = {}) {
  return ride(park, state, inputs.map((input) => ({ ...input, tick: state.tick })), { ticks: 1, laws });
}
