/**
 * Holofoam orbits: trajectories as laws over time, so time warp and multiplayer come free.
 *
 * Law, not state. A celestial system is admitted as cells (`body:<id> defines {mu, radius, parent, soiRadius, orbit}`).
 * A vessel's flight plan is a set of segment cells keyed by (vessel, epoch), each one a law:
 *   coast    – the exact two-body conic from a state (r, v) relative to a parent at the segment's epoch;
 *   powered  – fixed-dt semi-implicit Euler (as in flight.mjs) under the parent's point gravity, with thrust, mass flow,
 *              a steering programme and an optional apoapsis cutoff, for at most `steps` ticks.
 * The pose at any time is derived: a coast is propagated analytically by universal variables (Stumpff functions),
 * reduced modulo its period, so a year of warp costs the same as a second; nothing is ticked and nothing is written per tick.
 * Only the arithmetic of deterministic-math.mjs is used (+ − × ÷, sqrt, and the data layer's sin/cos/atan2/log/…), in a fixed
 * order, so every node derives bit-identical poses and the same cells hash to the same history head.
 *
 * Segment ends are derived, never stored. A coast ends at the first sphere-of-influence event (exit from the parent's SOI,
 * entry into a child's, or impact), found by deterministic bisection of |r| − level along the conic (or of the distance to the
 * child's moving centre, scanned at a step bounded by the closing speed); the successor coast in the new parent's frame is the
 * same worldline re-expressed (r ± r_body, v ± v_body), so position and velocity are continuous in the root frame. A powered
 * segment ends at burnout, cutoff, its tick budget, an SOI exit or impact. A segment told at a later epoch (an impulsive burn,
 * a new powered law) truncates whatever the earlier law would have done.
 *
 * Kinematic points (Obsmetrologia, Book VIII). A segment is a causal diamond (a, b) of events; a strictly reaches b when
 * b.t > a.t and the separation is below c·Δt. The diamonds of a plan are ordered by sequencing, (a,b) ≺ (c,d) ⇔ b ≤ c, never
 * by nesting. A readout predicate on diamonds is a kinematic region: its exterior is the diamonds that reach a readout
 * (past-closed), its hole the rest (future-closed); the two are disjoint and nothing in the hole precedes the exterior.
 * `visibilityRegion` and `commRegion` are such readouts.
 *
 * Multiplayer. Segment cells are append-only and keyed by (vessel, epoch); merging plans is SignCraft history merge (a union,
 * so order-independent). Two different laws told at one (vessel, epoch) are both kept and are a seam: H¹ ≠ 0, a list of the
 * contested cells, never resolved silently; the pose of that vessel from the contested epoch on is refused. H¹ = 0 ⟺ the
 * merge reads the same in every order ⟺ the plans are confluent.
 *
 * What-if maneuver planning forks the (immutable) history, tells the candidate burn into the fork and reads the resulting
 * orbit; the original is untouched. The document keeps the inputs (the head address and the candidate), not the derived orbit.
 *
 * Scope: a vessel is a point mass here (the slice-3 rocket integrates a rigid body under uniform gravity; its mass, thrust and
 * staging are not coupled to a central field). A powered segment checks impact and SOI exit, not entry into a child's SOI.
 */
import { cell } from "@red-cup-engineering/signcell/cell";
import { createHistory, historyHeads, mergeHistories, observeHistory, queryHistory } from "@red-cup-engineering/signcraft/history";
import { atan2, asinh, cos, exp, sin, sqrt, stumpff, keplerElliptic, TWO_PI } from "@red-cup-engineering/computer-data-engineering-services-section/number/deterministic-math";
import { add, cross, dot, length, scale, sub } from "./rigid-body.mjs";

export const ORBIT_FORMAT = "holofoam.orbit/v1";
export const MANEUVER_KIND = "holofoam.maneuver/v1";
export const LIGHT_SPEED = 299792458;
export const DEFAULT_HORIZON = 315576000; // ten Julian years, in seconds
const ORBIT = "holofoam.orbit";
const SEGMENT = "segment";
const MAX_CHAIN = 4096;
const MAX_SCAN_STEPS = 2_000_000;

// — the default system, at KSP-like scale so play is fast —

export const DEFAULT_SYSTEM = Object.freeze([
  { id: "helios", mu: 1.1723328e18, radius: 2.616e8, parent: null, soiRadius: null, orbit: null },
  { id: "terra", mu: 3.5316e12, radius: 6.0e5, rotationPeriod: 21549.425, atmosphere: { height: 70000, scaleHeight: 5600, density: 1.225 }, parent: "helios", soiRadius: 8.4159286e7, orbit: { a: 1.3599840256e10, e: 0, i: 0, node: 0, arg: 0, m0: 3.14, epoch: 0 } },
  { id: "luna", mu: 6.5138398e10, radius: 2.0e5, parent: "terra", soiRadius: 2.4295562e6, orbit: { a: 1.2e7, e: 0, i: 0, node: 0, arg: 0, m0: 1.7, epoch: 0 } },
]);

const finite = (v, name) => { if (!Number.isFinite(v)) throw new TypeError(`orbit: ${name} is not finite`); return v; };
const vec = (v, name) => { if (!Array.isArray(v) || v.length !== 3) throw new TypeError(`orbit: ${name} is not a 3-vector`); return v.map((c) => finite(c, name)); };
const unit = (v) => { const n = length(v); if (!(n > 0)) throw new RangeError("orbit: zero vector has no direction"); return scale(v, 1 / n); };

export class ContestedCell extends Error {
  constructor(message, conflicts) { super(message); this.name = "ContestedCell"; this.conflicts = conflicts; }
}

// — conics —

/** Orbital geometry of the state (r, v) about a body of gravitational parameter mu. Parabolic (α = 0) is not admitted. */
export function conic(mu, r, v) {
  const rn = length(r), v2 = dot(v, v), rv = dot(r, v), h = cross(r, v), hMag = length(h);
  const alpha = 2 / rn - v2 / mu;
  if (alpha === 0) throw new RangeError("orbit: exactly parabolic conics are not admitted");
  const ev = scale(sub(scale(r, v2 - mu / rn), scale(v, rv)), 1 / mu), e = length(ev);
  const a = 1 / alpha, rp = a * (1 - e);
  const out = { mu, r: rn, speed: sqrt(v2), alpha, a, e, h, hMag, energy: v2 / 2 - mu / rn, rp, kind: alpha > 0 ? "elliptic" : "hyperbolic" };
  if (alpha > 0) {
    const period = (TWO_PI * a * sqrt(a)) / sqrt(mu), sinPart = rv / sqrt(mu * a), cosPart = 1 - rn / a;
    let m0 = atan2(sinPart, cosPart) - sinPart;
    m0 -= TWO_PI * Math.floor(m0 / TWO_PI);
    const since = (m0 * a * sqrt(a)) / sqrt(mu);
    return { ...out, ra: a * (1 + e), period, since, tPeriapsis: since === 0 ? 0 : period - since, tApoapsis: since <= period / 2 ? period / 2 - since : period * 1.5 - since };
  }
  const A = -a, sinhPart = rv / sqrt(mu * A);
  const since = ((sinhPart - asinh(sinhPart / e)) * A * sqrt(A)) / sqrt(mu);
  return { ...out, ra: null, period: null, since, tPeriapsis: since <= 0 ? -since : null, tApoapsis: null };
}

/** Propagate the state (r0, v0) about mu by dt along its conic (universal variables; elliptic time is reduced modulo the period). */
export function propagate(mu, r0, v0, dt) {
  if (dt === 0) return { r: r0, v: v0 };
  const r0n = length(r0), vr0 = dot(r0, v0) / r0n, alpha = 2 / r0n - dot(v0, v0) / mu, sm = sqrt(mu);
  if (alpha === 0) throw new RangeError("orbit: exactly parabolic conics are not admitted");
  let t = dt, lo, hi;
  if (alpha > 0) {
    const period = TWO_PI / (alpha * sqrt(alpha) * sm);
    t = dt - period * Math.floor(dt / period);
    lo = 0; hi = TWO_PI / sqrt(alpha);
  }
  const target = sm * t, k = (r0n * vr0) / sm;
  const F = (x) => { const z = alpha * x * x, [C, S] = stumpff(z); return k * x * x * C + (1 - alpha * r0n) * x * x * x * S + r0n * x - target; };
  if (alpha <= 0) {
    if (target >= 0) { lo = 0; hi = 1; while (F(hi) < 0) { lo = hi; hi *= 2; } } else { hi = 0; lo = -1; while (F(lo) > 0) { hi = lo; lo *= 2; } }
  }
  let x = alpha > 0 ? Math.min(Math.max(sm * alpha * t, lo), hi) : lo + (hi - lo) / 2;
  for (let i = 0; i < 100; i += 1) {
    const z = alpha * x * x, [C, S] = stumpff(z), f = k * x * x * C + (1 - alpha * r0n) * x * x * x * S + r0n * x - target;
    if (f === 0) break;
    if (f > 0) hi = x; else lo = x;
    const slope = x * x * C + k * x * (1 - z * S) + r0n * (1 - z * C);
    let next = x - f / slope;
    if (!(next > lo && next < hi)) next = lo + (hi - lo) / 2;
    const done = Math.abs(next - x) <= 4e-16 * Math.abs(next);
    x = next;
    if (done) break;
  }
  const z = alpha * x * x, [C, S] = stumpff(z);
  const rn = x * x * C + k * x * (1 - z * S) + r0n * (1 - z * C);
  const f = 1 - (x * x * C) / r0n, g = t - (x * x * x * S) / sm;
  const fdot = (sm / (rn * r0n)) * x * (z * S - 1), gdot = 1 - (x * x * C) / rn;
  return { r: add(scale(r0, f), scale(v0, g)), v: add(scale(r0, fdot), scale(v0, gdot)) };
}

// — systems —

const bodyCell = (body) => cell(`body:${body.id}`, "defines", {
  id: body.id, mu: finite(body.mu, "mu"), radius: finite(body.radius, "radius"), parent: body.parent ?? null, soiRadius: body.soiRadius ?? null,
  ...(body.rotationPeriod === undefined || body.rotationPeriod === null ? {} : { rotationPeriod: finite(body.rotationPeriod, "rotationPeriod") }),
  ...(body.atmosphere === undefined || body.atmosphere === null ? {} : { atmosphere: {
    height: finite(body.atmosphere.height, "atmosphere.height"), scaleHeight: finite(body.atmosphere.scaleHeight, "atmosphere.scaleHeight"), density: finite(body.atmosphere.density, "atmosphere.density"),
  } }),
  orbit: body.orbit === null || body.orbit === undefined ? null : Object.fromEntries(["a", "e", "i", "node", "arg", "m0", "epoch"].map((key) => [key, finite(body.orbit[key], `orbit.${key}`)])),
}, { for: [`${ORBIT}.system`] });

/** The perifocal-to-inertial state of an elliptic orbit's elements about a parent of parameter mu. */
function stateOfElements(mu, o) {
  if (!(o.a > 0 && o.e >= 0 && o.e < 1)) throw new RangeError("orbit: a body's orbit must be elliptic");
  const E = keplerElliptic(o.m0, o.e), cE = cos(E), sE = sin(E), b = sqrt(1 - o.e * o.e), rn = o.a * (1 - o.e * cE), k = sqrt(mu * o.a) / rn;
  const x = o.a * (cE - o.e), y = o.a * b * sE, vx = -k * sE, vy = k * b * cE;
  const cO = cos(o.node), sO = sin(o.node), ci = cos(o.i), si = sin(o.i), cw = cos(o.arg), sw = sin(o.arg);
  const P = [cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si], Q = [-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si];
  return { r: add(scale(P, x), scale(Q, y)), v: add(scale(P, vx), scale(Q, vy)) };
}

const systems = new WeakMap();
/** The derived system of a history: bodies by id, each with its law (state relative to its parent at its orbit epoch). */
export function systemOf(history) {
  if (systems.has(history)) return systems.get(history);
  const groups = new Map();
  for (const at of queryHistory(history, { predicate: "defines" })) if (typeof at.subject === "string" && at.subject.startsWith("body:")) {
    if (!groups.has(at.subject)) groups.set(at.subject, []);
    groups.get(at.subject).push(at);
  }
  const contested = [...groups.entries()].filter(([, list]) => list.length > 1).map(([subject, list]) => ({ body: subject.slice(5), laws: list.map((x) => x.object) }));
  if (contested.length > 0) throw new ContestedCell("orbit: the system's definition is contested", contested);
  const bodies = new Map([...groups.values()].map(([at]) => [at.object.id, { ...at.object, soi: at.object.soiRadius ?? Infinity, children: [] }]));
  if (bodies.size === 0) throw new TypeError("orbit: history has no celestial system");
  for (const body of bodies.values()) {
    if (body.parent !== null) {
      const parent = bodies.get(body.parent);
      if (parent === undefined) throw new TypeError(`orbit: body ${body.id} has an unknown parent`);
      parent.children.push(body.id);
      body.law = { epoch: body.orbit.epoch, ...stateOfElements(parent.mu, body.orbit) };
    }
  }
  const result = Object.freeze({ bodies });
  systems.set(history, result);
  return result;
}

/** A body's state relative to its parent at time t. */
export function bodyRelative(system, id, t) {
  const body = system.bodies.get(id);
  if (body === undefined) throw new TypeError(`orbit: unknown body ${id}`);
  if (body.parent === null) return { r: [0, 0, 0], v: [0, 0, 0] };
  return propagate(system.bodies.get(body.parent).mu, body.law.r, body.law.v, t - body.law.epoch);
}
/** The velocity of a point fixed to a body's surface, relative to the body: ω × r, the body spinning about +z once per
 *  `rotationPeriod` (sidereal, seconds). A body with no rotation period does not turn. */
export function surfaceVelocity(system, id, r) {
  const body = system.bodies.get(id);
  if (body === undefined) throw new TypeError(`orbit: unknown body ${id}`);
  if (!(body.rotationPeriod > 0)) return [0, 0, 0];
  const omega = TWO_PI / body.rotationPeriod;
  return [-omega * r[1], omega * r[0], 0];
}

/** Air density at a radius from a body's centre: ρ₀·e^(−h/H) below the atmosphere's height, none above it (KSP cuts its
 *  atmospheres at a fixed height, as this does). A body with no atmosphere has no air. */
export function airDensity(system, id, radius) {
  const body = system.bodies.get(id);
  if (body === undefined) throw new TypeError(`orbit: unknown body ${id}`);
  const air = body.atmosphere, h = radius - body.radius;
  if (!air || h >= air.height) return 0;
  return air.density * exp(-Math.max(h, 0) / air.scaleHeight);
}

/** A body's state in the root (inertial) frame at time t. */
export function bodyState(system, id, t) {
  const body = system.bodies.get(id);
  const rel = bodyRelative(system, id, t);
  if (body.parent === null) return rel;
  const up = bodyState(system, body.parent, t);
  return { r: add(up.r, rel.r), v: add(up.v, rel.v) };
}

// — plans —

/** A new plan: the system admitted as cells into a fresh SignCraft history. A plan is { history, vessel? }. */
export function createPlan(system = DEFAULT_SYSTEM) {
  const history = observeHistory(createHistory([]), system.map(bodyCell), { source: `${ORBIT}.system` });
  systemOf(history);
  return Object.freeze({ history });
}
export const planOf = (plan, vessel) => Object.freeze({ history: plan.history, vessel });
export const headAddress = (plan) => historyHeads(plan.history).join(",");

const segmentCell = (law, player) => cell(`segment:${law.vessel}@${law.epoch}`, SEGMENT, law, { for: [`${ORBIT}:${player ?? "anonymous"}`] });
const told = (plan, law, player) => Object.freeze({ ...plan, history: observeHistory(plan.history, [segmentCell(law, player)], { source: `${ORBIT}.segment` }) });

function admitLaw(plan, law) {
  const system = systemOf(plan.history);
  if (typeof law.vessel !== "string" || law.vessel === "") throw new TypeError("orbit: a segment needs a vessel");
  if (!system.bodies.has(law.parent)) throw new TypeError("orbit: a segment needs a known parent body");
  finite(law.epoch, "epoch");
  return { ...law, r: vec(law.r, "r"), v: vec(law.v, "v") };
}

/** Tell a coast law: the vessel's state (r, v) relative to `parent` at `epoch`. */
export function tellCoast(plan, { vessel, epoch, parent, r, v, mass, dragArea, player }) {
  // A coast carrying the vessel's mass and drag area meets the air: where its conic dips into a body's atmosphere it
  // ends, and an integrated segment under gravity and drag carries it until it climbs out or strikes the ground.
  const air = dragArea > 0 ? { mass: finite(mass, "mass"), dragArea: finite(dragArea, "dragArea") } : {};
  return told(plan, admitLaw(plan, { kind: "coast", vessel, epoch, parent, r, v, ...air }), player);
}

/** Tell a powered law. thrust in N, flow in kg/s, mass and dry in kg, dt a power of two. steer:
 *  { vertical, kick, tilt, east, spin? } (radial for `vertical` s, then r̂ + tilt·east for `kick` s, then prograde) or null (prograde).
 *  With `spin` (the parent's rate about +z, rad/s) the turn follows prograde relative to the turning ground, v − spin·ẑ × r, as an
 *  ascent from a rotating world must: early on, inertial prograde is mostly the ground's own eastward motion. */
export function tellPowered(plan, { vessel, epoch, parent, r, v, mass, thrust, flow = 0, dry = 0, dt = 1 / 16, steps, steer = null, cutoff = null, dragArea = 0, player }) {
  if (!(mass > dry && thrust >= 0 && flow >= 0 && dt > 0 && dt <= 1 && Number.isInteger(steps) && steps > 0 && steps <= 10_000_000)) throw new TypeError("orbit: a powered segment is not admitted");
  const programme = steer === null ? null : { vertical: finite(steer.vertical, "vertical"), kick: finite(steer.kick, "kick"), tilt: finite(steer.tilt, "tilt"), east: vec(steer.east, "east"),
    ...(steer.spin === undefined ? {} : { spin: finite(steer.spin, "spin") }) };
  const stop = cutoff === null ? null : { apoapsis: finite(cutoff.apoapsis, "apoapsis") };
  return told(plan, admitLaw(plan, { kind: "powered", vessel, epoch, parent, r, v, mass: finite(mass, "mass"), thrust: finite(thrust, "thrust"), flow: finite(flow, "flow"), dry: finite(dry, "dry"), dt, steps, steer: programme, cutoff: stop,
    ...(dragArea > 0 ? { dragArea: finite(dragArea, "dragArea") } : {}) }), player);
}

const basis = (r, v) => {
  const prograde = unit(v), normal = unit(cross(r, v));
  return { prograde, normal, radial: cross(prograde, normal) };
};
/** A Δv given inertially in the parent frame ({ vector }) or in the orbit's frame ({ prograde, normal, radial } in m/s). */
export function deltaV(r, v, dv) {
  if (dv.vector !== undefined) return vec(dv.vector, "dv");
  const b = basis(r, v);
  return add(add(scale(b.prograde, dv.prograde ?? 0), scale(b.normal, dv.normal ?? 0)), scale(b.radial, dv.radial ?? 0));
}

/** Tell an impulsive burn: from the plan's own pose at t, a new coast law with v + Δv. The cell is keyed (vessel, t). */
export function tellImpulse(plan, { vessel = plan.vessel, t, dv, player }) {
  const pose = poseAt(plan, t, vessel);
  const burn = deltaV(pose.local.r, pose.local.v, dv);
  return told(plan, admitLaw(plan, { kind: "coast", vessel, epoch: t, parent: pose.parent, r: pose.local.r, v: add(pose.local.v, burn), cause: { dv: burn } }), player);
}

// — seams (H¹) and merging —

const lawTables = new WeakMap();
const lawsOf = (history) => {
  if (lawTables.has(history)) return lawTables.get(history);
  const groups = new Map();
  for (const at of queryHistory(history, { predicate: SEGMENT })) {
    if (!groups.has(at.subject)) groups.set(at.subject, []);
    groups.get(at.subject).push(at);
  }
  lawTables.set(history, groups);
  return groups;
};

/** The seams of a plan: every (vessel, epoch) cell told with two different laws, and every body defined two ways.
 *  h1 counts them; h1 = 0 exactly when the history reads the same in every merge order. */
const seamTables = new WeakMap();
export function seams(plan) {
  if (seamTables.has(plan.history)) return seamTables.get(plan.history);
  const conflicts = [...lawsOf(plan.history).values()].filter((list) => list.length > 1).map((list) => ({
    vessel: list[0].object.vessel, epoch: list[0].object.epoch, told: "both",
    laws: list.map((at) => ({ law: at.object, witnesses: [...at.for] })).sort((a, b) => (JSON.stringify(a.law) < JSON.stringify(b.law) ? -1 : 1)),
  })).sort((a, b) => (a.vessel < b.vessel ? -1 : a.vessel > b.vessel ? 1 : a.epoch - b.epoch));
  const bodies = new Map();
  for (const at of queryHistory(plan.history, { predicate: "defines" })) if (typeof at.subject === "string" && at.subject.startsWith("body:")) bodies.set(at.subject, [...(bodies.get(at.subject) ?? []), at]);
  const system = [...bodies.entries()].filter(([, list]) => list.length > 1).map(([subject, list]) => ({ body: subject.slice(5), told: "both", laws: list.map((at) => at.object) }));
  const found = Object.freeze({ h1: conflicts.length + system.length, ok: conflicts.length + system.length === 0, conflicts: Object.freeze(conflicts), system: Object.freeze(system) });
  seamTables.set(plan.history, found);
  return found;
}

/** Merge plans: SignCraft history merge (a union, so order-independent), with the seams that merge opens. */
export function mergePlans(...plans) {
  const history = mergeHistories(...plans.map((plan) => plan.history));
  const merged = Object.freeze({ history });
  return Object.freeze({ ...merged, seams: seams(merged), head: headAddress(merged) });
}

// — powered integration —

function steerDirection(law, tLocal, r, v) {
  const s = law.steer, up = unit(r);
  if (s === null) return length(v) > 0 ? unit(v) : up;
  if (tLocal < s.vertical) return up;
  if (tLocal < s.vertical + s.kick) return unit(add(up, scale(s.east, s.tilt)));
  const relative = s.spin === undefined ? v : sub(v, [-s.spin * r[1], s.spin * r[0], 0]);
  return length(relative) > 0 ? unit(relative) : up;
}

/** Integrate a powered law by up to `steps` ticks; stops early at impact, SOI exit, cutoff or burnout. */
function integrate(system, law, steps) {
  const body = system.bodies.get(law.parent), mu = body.mu;
  let r = law.r, v = law.v, mass = law.mass, n = 0, reason = "steps";
  const dt = law.dt;
  while (n < steps) {
    const tLocal = n * dt;
    if (mass <= law.dry) { reason = "burnout"; break; }
    const rn = length(r), g = scale(r, -mu / (rn * rn * rn));
    const thrust = scale(steerDirection(law, tLocal, r, v), law.thrust / mass);
    let force = add(thrust, g);
    if (law.dragArea > 0) {
      // Drag ½ρ|u|u·CdA against the air, which turns with the body: u = v − ω × r.
      const rho = airDensity(system, law.parent, rn);
      if (rho > 0) {
        const omega = body.rotationPeriod > 0 ? TWO_PI / body.rotationPeriod : 0, u = sub(v, [-omega * r[1], omega * r[0], 0]);
        force = add(force, scale(u, (-0.5 * rho * length(u) * law.dragArea) / mass));
      }
    }
    v = add(v, scale(force, dt));
    r = add(r, scale(v, dt));
    mass -= law.flow * dt;
    n += 1;
    const radius = length(r);
    if (radius < body.radius * (1 - 1e-9)) { reason = "impact"; break; }
    if (radius >= body.soi) { reason = "soi-exit"; break; }
    if (law.air === true && body.atmosphere && radius >= body.radius + body.atmosphere.height && dot(r, v) > 0) { reason = "atmosphere-exit"; break; }
    if (law.cutoff !== null) { const o = conic(mu, r, v); if (o.alpha <= 0 || o.ra >= law.cutoff.apoapsis) { reason = "cutoff"; break; } }
  }
  return { r, v, mass, steps: n, reason };
}

const memo = new Map();
const remembered = (key, make) => {
  if (memo.has(key)) return memo.get(key);
  if (memo.size > 4096) memo.clear();
  const value = make();
  memo.set(key, value);
  return value;
};
const run = (system, law) => remembered(`run|${JSON.stringify(law)}`, () => integrate(system, law, law.steps));

/** The state of a powered law at local time tau: whole ticks, then one partial tick. */
function poweredState(system, law, tau) {
  const full = run(system, law), end = full.steps * law.dt;
  if (tau >= end) return { r: full.r, v: full.v, mass: full.mass };
  const n = Math.floor(tau / law.dt), at = integrate(system, law, n), rest = tau - n * law.dt;
  if (rest === 0) return { r: at.r, v: at.v, mass: at.mass };
  const partial = { ...law, r: at.r, v: at.v, mass: at.mass, dt: rest, steer: law.steer === null ? null : { ...law.steer, vertical: law.steer.vertical - n * law.dt } };
  const next = integrate(system, { ...partial, steps: 1, cutoff: null }, 1);
  return { r: next.r, v: next.v, mass: next.mass };
}

// — natural ends: sphere-of-influence events along a coast —

function bisect(g, lo, hi, rising) {
  for (let i = 0; i < 300; i += 1) {
    const mid = lo + (hi - lo) / 2;
    if (mid <= lo || mid >= hi) break;
    const reached = rising ? g(mid) >= 0 : g(mid) <= 0;
    if (reached) hi = mid; else lo = mid;
  }
  return hi;
}

/** The monotone pieces of |r| after τ = 0: { from, to, rising }. */
function radialPieces(o) {
  if (o.kind === "elliptic") {
    const extrema = [];
    for (let k = 0; k < 3; k += 1) for (const [t, rising] of [[-o.since + k * o.period, false], [-o.since + o.period / 2 + k * o.period, true]]) if (t > 0) extrema.push({ t, rising });
    extrema.sort((a, b) => a.t - b.t);
    const pieces = [];
    let from = 0;
    for (const { t, rising } of extrema.slice(0, 3)) { pieces.push({ from, to: t, rising }); from = t; }
    return pieces;
  }
  return o.since < 0 ? [{ from: 0, to: -o.since, rising: false }, { from: -o.since, to: Infinity, rising: true }] : [{ from: 0, to: Infinity, rising: true }];
}

/** First τ in (0, tMax] at which |r| crosses `level` upward (or downward), or null. */
function radialCrossing(mu, r0, v0, o, level, upward, tMax) {
  if (o.kind === "elliptic" && !(o.rp < level && level < o.ra)) return null;
  const g = (tau) => length(propagate(mu, r0, v0, tau).r) - level;
  for (const piece of radialPieces(o)) {
    if (piece.from >= tMax) return null;
    if (piece.rising !== upward) continue;
    const to = Math.min(piece.to, tMax);
    if (upward) {
      if (!(g(piece.from) < 0)) continue;
      if (to === Infinity) {
        let step = Math.max(1, Math.abs(level - o.rp) / (o.speed + 1)), q = piece.from + step;
        for (let i = 0; i < 200 && g(q) < 0; i += 1) { step *= 2; q = piece.from + step; }
        return bisect(g, piece.from, q, true);
      }
      if (g(to) >= 0) return bisect(g, piece.from, to, true);
    } else if (g(piece.from) > 0 && g(to) <= 0) return bisect(g, piece.from, to, false);
  }
  return null;
}

/** The first moment the vessel's conic enters a child body's SOI, scanned at a step bounded by the closing speed. */
function entryTime(system, law, child, o, tMax) {
  const parent = system.bodies.get(law.parent), mu = parent.mu;
  const co = conic(mu, child.law.r, child.law.v);
  if (o.rp > co.ra + child.soi || (o.ra !== null && o.ra < co.rp - child.soi)) return null;
  const vessel = sqrt(mu * (2 / Math.max(o.rp, parent.radius) - o.alpha)), moon = sqrt(mu * (2 / co.rp - co.alpha));
  const h = (0.5 * child.soi) / (vessel + moon);
  if (tMax / h > MAX_SCAN_STEPS) throw new RangeError("orbit: the sphere-of-influence scan is too long; shorten the horizon");
  const g = (tau) => length(sub(propagate(mu, law.r, law.v, tau).r, bodyRelative(system, child.id, law.epoch + tau).r)) - child.soi;
  let before = g(0), previous = 0;
  for (let i = 1; previous < tMax; i += 1) {
    const t = Math.min(i * h, tMax), now = g(t);
    if (before > 0 && now <= 0) return bisect(g, previous, t, false);
    before = now; previous = t;
  }
  return null;
}

/** The first event ending a coast within `upTo`: { t, reason, body? } or null. */
function coastEnd(system, law, upTo) {
  const key = `end|${JSON.stringify(law)}`;
  const cached = memo.get(key);
  if (cached !== undefined && cached.event !== null) return cached.event.t <= upTo ? cached.event : null;
  if (cached !== undefined && cached.scanned >= upTo) return null;
  const parent = system.bodies.get(law.parent), mu = parent.mu, o = conic(mu, law.r, law.v), tMax = upTo - law.epoch;
  const found = [];
  const impact = radialCrossing(mu, law.r, law.v, o, parent.radius, false, Infinity);
  if (impact !== null) found.push({ tau: impact, reason: "impact", rank: 0 });
  if (parent.atmosphere && law.dragArea > 0) {
    const edge = parent.radius + parent.atmosphere.height;
    const entry = length(law.r) < edge ? 0 : radialCrossing(mu, law.r, law.v, o, edge, false, Infinity);
    if (entry !== null) found.push({ tau: entry, reason: "atmosphere-entry", rank: -1 });
  }
  if (parent.soi !== Infinity) {
    const exit = radialCrossing(mu, law.r, law.v, o, parent.soi, true, Infinity);
    if (exit !== null) found.push({ tau: exit, reason: "soi-exit", rank: 1 });
  }
  const limit = Math.min(tMax, ...found.map((f) => f.tau));
  for (const id of parent.children) {
    const child = system.bodies.get(id), tau = limit > 0 ? entryTime(system, law, child, o, limit) : null;
    if (tau !== null) found.push({ tau, reason: "soi-entry", body: id, rank: 2 });
  }
  found.sort((a, b) => a.tau - b.tau || a.rank - b.rank);
  const first = found.find((f) => f.tau <= tMax);
  const event = first === undefined ? null : { t: law.epoch + first.tau, reason: first.reason, ...(first.body === undefined ? {} : { body: first.body }) };
  if (memo.size > 4096) memo.clear();
  memo.set(key, { event, scanned: upTo });
  return event;
}

// — chains —

const toldLaws = (history, vessel) => [...lawsOf(history).values()].flat().map((at) => at.object).filter((law) => law.vessel === vessel).sort((a, b) => a.epoch - b.epoch);

/** The state of a segment at absolute time t (within or after it), local to its parent. */
function stateOfLaw(system, law, t) {
  if (law.kind === "coast") return propagate(system.bodies.get(law.parent).mu, law.r, law.v, t - law.epoch);
  return poweredState(system, law, t - law.epoch);
}

const AIR_STEPS = 16 * 86400;
const end0 = (event, law) => event.state?.mass ?? law.mass;

function successor(system, law, event) {
  const base = { kind: "coast", vessel: law.vessel, epoch: event.t, derived: true, cause: { from: law.epoch, reason: event.reason },
    ...(law.dragArea > 0 ? { dragArea: law.dragArea, mass: end0(event, law) } : {}) };
  const end = event.state;
  if (event.reason === "impact") return null;
  if (event.reason === "atmosphere-entry") {
    // Through the air: an unpowered integrated segment under gravity and drag, until it climbs out or strikes the ground.
    return { kind: "powered", vessel: law.vessel, epoch: event.t, parent: law.parent, r: end.r, v: end.v, mass: base.mass, dry: 0, thrust: 0, flow: 0,
      dt: 1 / 16, steps: AIR_STEPS, steer: null, cutoff: null, dragArea: law.dragArea, air: true, derived: true, cause: base.cause };
  }
  if (event.reason === "soi-exit") {
    const parent = system.bodies.get(law.parent), rel = bodyRelative(system, parent.id, event.t);
    return { ...base, parent: parent.parent, r: add(end.r, rel.r), v: add(end.v, rel.v) };
  }
  if (event.reason === "soi-entry") {
    const rel = bodyRelative(system, event.body, event.t);
    return { ...base, parent: event.body, r: sub(end.r, rel.r), v: sub(end.v, rel.v) };
  }
  return { ...base, parent: law.parent, r: end.r, v: end.v };
}

/** The chain of segments of a vessel up to `upTo`: told laws plus the derived successors at each event, each with its end. */
export function chain(plan, vessel = plan.vessel, upTo) {
  const system = systemOf(plan.history), laws = toldLaws(plan.history, vessel);
  if (laws.length === 0) return [];
  const limit = upTo ?? laws[laws.length - 1].epoch + DEFAULT_HORIZON;
  const contested = seams(plan).conflicts.filter((c) => c.vessel === vessel && c.epoch <= limit);
  if (contested.length > 0) throw new ContestedCell(`orbit: ${vessel} is contested from ${contested[0].epoch}`, contested);
  const out = [];
  let index = 0, law = laws[0];
  while (law !== null && out.length < MAX_CHAIN) {
    const next = laws[index + 1], nextAt = next === undefined ? Infinity : next.epoch;
    let event = null;
    if (law.kind === "coast") {
      event = coastEnd(system, law, Math.min(limit, nextAt));
    } else {
      const done = run(system, law), t = law.epoch + done.steps * law.dt;
      event = { t, reason: done.reason === "steps" ? "end" : done.reason };
    }
    let entry;
    if (event !== null && event.t < nextAt) {
      const state = law.kind === "coast" ? propagate(system.bodies.get(law.parent).mu, law.r, law.v, event.t - law.epoch) : (({ r, v, mass }) => ({ r, v, mass }))(run(system, law));
      const resolved = { ...event, state };
      entry = { law, epoch: law.epoch, end: event.t, endReason: event.reason, ...(event.body === undefined ? {} : { endBody: event.body }), derived: law.derived === true };
      out.push(entry);
      if (event.t > limit) break;
      law = successor(system, law, resolved);
      if (law !== null && state.mass !== undefined) law = { ...law, mass: state.mass };
      if (law === null) break;
      continue;
    }
    entry = { law, epoch: law.epoch, end: next === undefined ? null : next.epoch, endReason: next === undefined ? "open" : "told", derived: law.derived === true };
    out.push(entry);
    if (next === undefined) break;
    law = next; index += 1;
    while (laws[index + 1] !== undefined && laws[index + 1].epoch <= law.epoch) index += 1;
  }
  if (out.length >= MAX_CHAIN) throw new RangeError("orbit: the chain is too long for this horizon");
  return out.map((e) => Object.freeze(e));
}

// — poses —

function rootOf(system, parent, local, t) {
  const body = bodyState(system, parent, t);
  return { position: add(body.r, local.r), velocity: add(body.v, local.v) };
}

/** The pose of a vessel at any time t, derived from its laws; warping years ahead is the same call. */
export function poseAt(plan, t, vessel = plan.vessel) {
  finite(t, "t");
  const system = systemOf(plan.history), segments = chain(plan, vessel, t);
  if (segments.length === 0) throw new RangeError(`orbit: ${vessel} has no flight plan`);
  if (t < segments[0].epoch) throw new RangeError(`orbit: ${vessel} does not exist before ${segments[0].epoch}`);
  let current = segments[0];
  for (const segment of segments) if (segment.epoch <= t) current = segment;
  const at = current.end !== null && t > current.end ? current.end : t;
  const local = stateOfLaw(system, current.law, at);
  const destroyed = current.endReason === "impact" && current.end !== null && t >= current.end;
  return Object.freeze({
    vessel, t, segment: current.epoch, kind: current.law.kind, parent: current.law.parent, status: destroyed ? "destroyed" : "flying",
    local: Object.freeze({ r: local.r, v: local.v }), ...rootOf(system, current.law.parent, local, at), ...((local.mass ?? current.law.mass) === undefined ? {} : { mass: local.mass ?? current.law.mass }),
  });
}

/** The osculating orbit of a pose or a law about its parent, with the next event along it. */
export function orbitSummary(plan, vessel, t, { horizon = DEFAULT_HORIZON } = {}) {
  const system = systemOf(plan.history), pose = poseAt(plan, t, vessel), parent = system.bodies.get(pose.parent);
  const o = conic(parent.mu, pose.local.r, pose.local.v);
  const segments = chain(plan, vessel, t + horizon);
  const current = segments.filter((s) => s.epoch <= t).pop();
  const event = current.end !== null && current.endReason !== "told" && current.endReason !== "open" ? { t: current.end, reason: current.endReason, ...(current.endBody === undefined ? {} : { body: current.endBody }) } : null;
  return Object.freeze({
    parent: parent.id, kind: o.kind, eccentricity: o.e, semiMajorAxis: o.a, period: o.period,
    periapsis: o.rp, apoapsis: o.ra, periapsisAltitude: o.rp - parent.radius, apoapsisAltitude: o.ra === null ? null : o.ra - parent.radius,
    timeToPeriapsis: o.tPeriapsis, timeToApoapsis: o.tApoapsis, energy: o.energy, angularMomentum: o.hMag, speed: o.speed,
    nextEvent: event,
  });
}

/** Continuity at every segment boundary of a chain, in the root frame: the end of one law against the start of the next. A derived
 *  successor (an SOI change or burnout) must show no jump; a told segment shows the jump it was told (an impulse's Δv). */
export function continuity(plan, vessel = plan.vessel, upTo) {
  const system = systemOf(plan.history), segments = chain(plan, vessel, upTo);
  const root = (segment, t) => rootOf(system, segment.law.parent, stateOfLaw(system, segment.law, t), t);
  return segments.slice(1).map((next, i) => {
    const previous = segments[i], t = next.epoch, was = root(previous, t), now = root(next, t);
    return Object.freeze({ t, from: previous.endReason, to: next.law.parent, positionJump: length(sub(now.position, was.position)), velocityJump: length(sub(now.velocity, was.velocity)) });
  });
}

// — kinematic points: diamonds, sequencing, regions —

const sameEvent = (a, b) => a.vessel === b.vessel && a.t === b.t;
/** a strictly reaches b: later, and closer than light could have crossed. */
export const reaches = (a, b) => b.t > a.t && length(sub(b.x, a.x)) < LIGHT_SPEED * (b.t - a.t);
/** a ≤ b: the same event, or a reaches b. */
export const eventLeq = (a, b) => sameEvent(a, b) || reaches(a, b);
/** Sequencing: (a,b) ≺ (c,d) iff b ≤ c. */
export const precedes = (p, q) => eventLeq(p.b, q.a);
/** Nesting (never the order): p lies inside q. */
export const nests = (p, q) => eventLeq(q.a, p.a) && eventLeq(p.b, q.b);

/** The kinematic points of a vessel's plan: its segments as causal diamonds (startEvent, endEvent), up to `until`. */
export function diamonds(plan, { vessel = plan.vessel, until } = {}) {
  const system = systemOf(plan.history), segments = chain(plan, vessel, until);
  const eventAt = (segment, t) => Object.freeze({ vessel, t, x: rootOf(system, segment.law.parent, stateOfLaw(system, segment.law, t), t).position });
  const out = [];
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i], following = segments[i + 1];
    let endT = following !== undefined ? following.epoch : segment.end;
    if (endT === null || endT === undefined) endT = until;
    if (endT === undefined) continue;
    const clipped = until !== undefined && endT > until, end = clipped ? until : endT;
    if (!(end > segment.epoch)) continue;
    const previous = out[out.length - 1];
    const a = previous !== undefined && previous.b.t === segment.epoch ? previous.b : eventAt(segment, segment.epoch);
    const b = following !== undefined && end === following.epoch ? eventAt(following, following.epoch) : eventAt(segment, end);
    out.push(Object.freeze({ id: `${vessel}@${segment.epoch}`, vessel, a, b, kind: segment.law.kind, parent: segment.law.parent, endReason: clipped || segment.end === null ? "until" : segment.endReason }));
  }
  return out;
}

/** Check that a chain of diamonds is a sequencing chain: each diamond's endpoints reach, every earlier diamond precedes every later one, and none nests another. */
export function sequencingCheck(points) {
  const violations = [];
  points.forEach((p) => { if (!reaches(p.a, p.b)) violations.push({ kind: "endpoints-do-not-reach", id: p.id }); });
  for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) {
    if (!precedes(points[i], points[j])) violations.push({ kind: "not-sequenced", from: points[i].id, to: points[j].id });
    if (nests(points[i], points[j]) || nests(points[j], points[i])) violations.push({ kind: "nested", a: points[i].id, b: points[j].id });
  }
  return Object.freeze({ ok: violations.length === 0, count: points.length, violations: Object.freeze(violations) });
}

/** A kinematic region over a chain of diamonds from a readout predicate. Exterior: reaches a readout (a later-or-equal diamond
 *  reads out); hole: does not. Hole is future-closed, exterior past-closed, the two disjoint, and nothing in the hole precedes the exterior. */
export function kinematicRegion(name, readout) {
  const reading = (points) => {
    const reads = points.map((p) => readout(p));
    return points.map((p, i) => {
      const exterior = reads[i] || points.some((q, j) => j > i && reads[j] && precedes(p, q));
      return Object.freeze({ id: p.id, readout: reads[i], exterior, hole: !exterior });
    });
  };
  const laws = (points) => {
    const read = reading(points), by = new Map(read.map((x) => [x.id, x]));
    const failures = [];
    for (const p of points) for (const q of points) if (p !== q && precedes(p, q)) {
      if (by.get(p.id).hole && !by.get(q.id).hole) failures.push({ law: "hole-future-closed", from: p.id, to: q.id });
      if (by.get(q.id).exterior && !by.get(p.id).exterior) failures.push({ law: "exterior-past-closed", from: p.id, to: q.id });
      if (by.get(p.id).hole && by.get(q.id).exterior) failures.push({ law: "no-future-from-hole-to-exterior", from: p.id, to: q.id });
    }
    for (const x of read) if (x.hole === x.exterior) failures.push({ law: "hole-exterior-disjoint", id: x.id });
    return Object.freeze({ ok: failures.length === 0, failures: Object.freeze(failures) });
  };
  return Object.freeze({ name, readout, reading, laws });
}

// — readouts: line of sight and communication range —

/** Line of sight between two plans at t: the segment between the vessels must clear every body's radius. */
export function lineOfSight(observer, target, t) {
  const system = systemOf(observer.history);
  const a = poseAt(observer, t), b = poseAt(target, t);
  const d = sub(b.position, a.position), dd = dot(d, d);
  for (const body of system.bodies.values()) {
    const c = bodyState(system, body.id, t).r;
    const s = dd === 0 ? 0 : Math.min(1, Math.max(0, dot(sub(c, a.position), d) / dd));
    const closest = add(a.position, scale(d, s));
    if (length(sub(closest, c)) < body.radius * (1 - 1e-9)) return Object.freeze({ visible: false, blockedBy: body.id, distance: length(d) });
  }
  return Object.freeze({ visible: true, blockedBy: null, distance: length(d) });
}
const exists = (plan, t) => { const segments = chain(plan, plan.vessel, t); return segments.length > 0 && segments[0].epoch <= t; };
/** Whether the target can be seen from the observer at t. */
export function visibleFrom(observer, target, t) {
  if (!exists(observer, t) || !exists(target, t)) return false;
  return lineOfSight(observer, target, t).visible;
}
/** Communication at t: within `range` metres and in line of sight. */
export function commRange(observer, target, t, { range }) {
  if (!exists(observer, t) || !exists(target, t)) return Object.freeze({ linked: false, inRange: false, visible: false, distance: null });
  const los = lineOfSight(observer, target, t), inRange = los.distance <= range;
  return Object.freeze({ linked: inRange && los.visible, inRange, visible: los.visible, distance: los.distance });
}
const sampled = (p, samples) => Array.from({ length: samples + 1 }, (_, k) => p.a.t + ((p.b.t - p.a.t) * k) / samples);
/** The kinematic region of the target's diamonds in which the observer sees it at some sampled time. */
export const visibilityRegion = (observer, target, { samples = 16 } = {}) => kinematicRegion("visible", (p) => sampled(p, samples).some((t) => visibleFrom(observer, target, t)));
/** The kinematic region of the target's diamonds in which the observer is linked to it within `range` at some sampled time. */
export const commRegion = (observer, target, { range, samples = 16 } = {}) => kinematicRegion("comm", (p) => sampled(p, samples).some((t) => commRange(observer, target, t, { range }).linked));

// — maneuver planning (What-if) —

/** Fork the plan, tell the candidate burn into the fork, and read the resulting orbit; the original is not mutated.
 *  candidate: { vessel, kind: "impulse", t, dv } or { kind: "powered", ...tellPowered arguments }. */
export function whatIf(plan, candidate, { horizon = 31557600 } = {}) {
  const vessel = candidate.vessel ?? plan.vessel;
  const t = candidate.kind === "powered" ? candidate.epoch : candidate.t;
  const before = orbitSummary(plan, vessel, t, { horizon });
  const fork = candidate.kind === "powered" ? tellPowered(plan, { ...candidate, vessel }) : tellImpulse(plan, { ...candidate, vessel });
  const segments = chain(fork, vessel, t + horizon);
  const burn = segments.find((s) => s.epoch === t);
  const after = candidate.kind === "powered"
    ? orbitSummary(fork, vessel, burn.end ?? t, { horizon })
    : orbitSummary(fork, vessel, t, { horizon });
  const document = { kind: MANEUVER_KIND, input: { head: headAddress(plan), vessel, candidate: JSON.parse(JSON.stringify({ ...candidate, vessel })), horizon } };
  const result = Object.freeze({ before, after, nextEvent: after.nextEvent, head: headAddress(fork) });
  return Object.freeze({ document, result, plan: fork });
}

/** Reopen a maneuver document against the plan it names: the same inputs yield the same fork. */
export function reopenManeuver(plan, document) {
  if (document?.kind !== MANEUVER_KIND) throw new TypeError("orbit: maneuver format is not admitted");
  if (document.input.head !== headAddress(plan)) throw new TypeError("orbit: the maneuver names a different history head");
  return whatIf(plan, document.input.candidate, { horizon: document.input.horizon });
}
