/**
 * Holofoam flight: rigid bodies under thrust and uniform gravity, derived from a SignCraft history.
 *
 * Law, not state. A body's flight is stored as one segment cell { epoch, position, velocity, orientation,
 * angularVelocity, thrust } (epoch in ticks of the flight's fixed dt; position is the world position of the body's
 * centre of mass; orientation a unit quaternion [w, x, y, z] taking design-frame vectors about the centre of mass
 * to world; angularVelocity in the design frame; thrust the throttled forces on the body's parts, design frame).
 * A segment is told again only when its inputs change: a throttle event, a staging (the removal of a decoupler) or a
 * firing member that changes the body's parts or thrust. The pose at any tick is derived by integrating from the
 * segment's epoch at the fixed dt; nothing is written per tick.
 *
 * Integrator: semi-implicit (symplectic) Euler at fixed dt, only + − × ÷ and sqrt in fixed order. Translation
 * v ← v + dt (R(q) F_thrust + M g)/M, x ← x + dt v; rotation by world angular momentum L ← L + dt R τ,
 * ω = I⁻¹ Rᵀ L, q ← normalize(q + ½ dt q⊗(0, ω)) (see integrate).
 * Mass is constant (no propellant flow); inertia is the point-mass tensor of the parts with a spherical self-inertia
 * (see rigid-body.mjs). dt should be a power of two (default 1/64) so tick times are exact.
 *
 * Bodies are the rigid pieces of the settled design (rigidity.pieces). A piece that is not rigid (a mechanism: a hinge
 * or an under-braced strut set) is flown as its separate rigid clusters; the joint's own articulation is not integrated.
 * Staging removes a decoupler: the piece parts into bodies (T1) and the joint vanishes (T2); each new body inherits
 * the parent's pose, velocity (v + ω×r) and angular velocity at the staging tick. Each event is checked by the
 * structure's failure flow under the loads at that tick; the firings are observed into the same history.
 */
import { cell } from "@red-cup-engineering/signcell/cell";
import { observeHistory, queryHistory } from "@red-cup-engineering/signcraft/history";
import { historyHeads } from "@red-cup-engineering/signcraft/history";
import {
  createStructureHistory, designOfHistory, failure, observeDesign, observeFirings, observeStaging, removalsOf, rigidity,
} from "./structure.mjs";
import {
  add, cross, IDENTITY_QUATERNION, massProperties, mulMatVec, quatMul, quatNormalize, rotate, scale, sub, unrotate,
} from "./rigid-body.mjs";

export const FLIGHT_FORMAT = "holofoam.flight/v1";
const FLIGHT = "holofoam.flight";
const MAX_TICKS = 100_000_000;

const numbers = (v) => v.map((c) => { if (!Number.isFinite(c)) throw new TypeError("flight: a value is not finite"); return c; });
const floatsOf = (at) => at.map((entry) => { if (typeof entry === "number") return entry; const m = /^(-?\d+)(?:\/(\d+))?$/.exec(entry); return Number(m[1]) / Number(m[2] ?? 1); });

function configOf(history) {
  const defined = queryHistory(history, { subject: FLIGHT, predicate: "defines" });
  if (defined.length !== 1 || defined[0].object?.format !== FLIGHT_FORMAT) throw new TypeError("flight: history is not a flight");
  return defined[0].object;
}

// — derived mass properties, memoised per history —

const memo = new WeakMap();
function designAt(history, removals) {
  if (!memo.has(history)) memo.set(history, new Map());
  const table = memo.get(history);
  if (!table.has(removals)) table.set(removals, designOfHistory(history, { removals }));
  return table.get(removals);
}
function propertiesOf(history, removals, parts) {
  const design = designAt(history, removals);
  const chosen = design.parts.filter((p) => parts.includes(p.id)).map((p) => ({ ...p, at: floatsOf(p.at) }));
  return { design, chosen, props: massProperties(chosen) };
}
const thrustOn = (design, parts, throttle) => design.parts.filter((p) => parts.includes(p.id) && p.thrust !== undefined && throttle > 0).map((p) => ({ part: p.id, force: p.thrust.map((c) => c * throttle) }));

// — segments —

const segments = (history) => queryHistory(history, { predicate: "segment" }).map((at) => at.object).sort((a, b) => a.seq - b.seq);
const endings = (history) => queryHistory(history, { predicate: "ends" }).map((at) => at.object).sort((a, b) => a.seq - b.seq);
const nextSeq = (history) => segments(history).length + endings(history).length;

/** Integrate a segment forward by `steps` ticks of dt (pure function of its arguments). Rotation is carried by the
 *  angular momentum L = R I ω (world frame): L ← L + dt R τ, ω ← I⁻¹ Rᵀ L, q ← normalize(q + ½ dt q⊗(0, ω)). The
 *  gyroscopic term is then exact in L, so a fast spin cannot blow up as it does with a forward Euler step of Euler's equations. */
function integrate(segment, { props, chosen }, steps, dt, gravity) {
  if (steps === 0) return { position: segment.position, velocity: segment.velocity, orientation: segment.orientation, angularVelocity: segment.angularVelocity };
  let x = segment.position, v = segment.velocity, q = segment.orientation;
  let momentum = rotate(q, mulMatVec(props.inertia, segment.angularVelocity)), w = segment.angularVelocity;
  const at = new Map(chosen.map((p) => [p.id, p.at]));
  let thrust = [0, 0, 0], torque = [0, 0, 0];
  for (const { part, force } of segment.thrust) { thrust = add(thrust, force); torque = add(torque, cross(sub(at.get(part), props.centre), force)); }
  for (let i = 0; i < steps; i += 1) {
    const a = scale(add(rotate(q, thrust), scale(gravity, props.mass)), 1 / props.mass);
    v = add(v, scale(a, dt));
    x = add(x, scale(v, dt));
    momentum = add(momentum, scale(rotate(q, torque), dt));
    w = mulMatVec(props.inverse, unrotate(q, momentum));
    const dq = quatMul(q, [0, w[0], w[1], w[2]]), h = 0.5 * dt;
    q = quatNormalize([q[0] + h * dq[0], q[1] + h * dq[1], q[2] + h * dq[2], q[3] + h * dq[3]]);
  }
  return { position: x, velocity: v, orientation: q, angularVelocity: mulMatVec(props.inverse, unrotate(q, momentum)) };
}

/** The bodies in flight at a tick, each with its pose derived by integration from its segment's epoch. */
export function bodiesAt(flight, tick) {
  const history = flight.history, { dt, gravity } = configOf(history);
  if (!Number.isInteger(tick) || tick < 0 || tick > MAX_TICKS) throw new TypeError("flight: tick is not admitted");
  const latest = new Map();
  for (const segment of segments(history)) if (segment.epoch <= tick) latest.set(segment.body, segment);
  for (const ending of endings(history)) if (ending.epoch <= tick && latest.has(ending.body) && latest.get(ending.body).seq < ending.seq) latest.delete(ending.body);
  return [...latest.values()].sort((a, b) => (a.body < b.body ? -1 : 1)).map((segment) => {
    const mass = propertiesOf(history, segment.removals, segment.parts);
    const state = integrate(segment, mass, tick - segment.epoch, dt, gravity);
    return Object.freeze({
      body: segment.body, parts: Object.freeze([...segment.parts]), mass: mass.props.mass, centre: mass.props.centre, epoch: segment.epoch, tick, time: tick * dt,
      ...state, thrust: segment.thrust,
    });
  });
}
export const poseAt = bodiesAt;

// — events —

/** The bodies of a design: each rigid piece is one body, a mechanism piece splits into its rigid clusters. A body is named by its heaviest part (ties by id). */
const rigidBodies = (design) => {
  const reading = rigidity(design);
  const mass = new Map(design.parts.map((p) => [p.id, p.mass]));
  const named = (parts) => ({ id: parts.reduce((best, id) => (mass.get(id) > mass.get(best) ? id : best)), parts: [...parts] });
  return reading.pieces.flatMap((piece) => (piece.rigid ? [named(piece.parts)] : piece.clusters.map((clusterId) => named(reading.clusters.find((c) => c.id === clusterId).parts))));
};

/** The sub-design of a body: its parts and the joints between them. */
const restrict = (design, parts) => ({ parts: design.parts.filter((p) => parts.includes(p.id)), joints: design.joints.filter((j) => parts.includes(j.from) && parts.includes(j.to)) });

function retell(history, tick, throttle, old, { event } = {}) {
  const { dt, gravity } = configOf(history);
  let next = event === undefined ? history : event(history);
  const firings = [], obstructions = [];
  // 1. every old body is checked under its loads at this tick; fired members leave the history as T2 cells
  for (const body of old) {
    const removals = removalsOf(next).length;
    const design = restrict(designOfHistory(next, { removals }), body.parts);
    const forces = thrustOn(design, body.parts, throttle);
    const settled = failure({ parts: design.parts, joints: design.joints }, forces, { gravity: unrotate(body.orientation, gravity), angularVelocity: body.angularVelocity });
    const fired = settled.firings.map((f) => ({ ...f, body: body.body }));
    next = observeFirings(next, fired, { tick });
    firings.push(...fired);
    obstructions.push(...settled.obstructions.map((o) => ({ ...o, body: body.body })));
  }
  // 2. the settled design's bodies; a body is told again only when its parts or thrust changed
  const removals = removalsOf(next).length;
  const design = designOfHistory(next, { removals });
  const told = [], ended = [];
  let seq = nextSeq(next);
  const fresh = rigidBodies(design);
  for (const body of fresh) {
    const parent = old.find((o) => o.parts.includes(body.parts[0]));
    const thrust = thrustOn(design, body.parts, throttle);
    if (parent !== undefined && parent.parts.length === body.parts.length && parent.body === body.id && JSON.stringify(parent.thrust) === JSON.stringify(thrust)) continue;
    const { props } = propertiesOf(next, removals, body.parts);
    const r = sub(props.centre, parent.centre);
    told.push(cell(`body:${body.id}`, "segment", {
      seq: seq++, body: body.id, epoch: tick, removals, parts: body.parts, thrust,
      position: add(parent.position, rotate(parent.orientation, r)),
      velocity: add(parent.velocity, rotate(parent.orientation, cross(parent.angularVelocity, r))),
      orientation: [...parent.orientation], angularVelocity: [...parent.angularVelocity],
    }, { for: [FLIGHT] }));
  }
  for (const body of old) if (!fresh.some((b) => b.id === body.body)) ended.push(cell(`body:${body.body}`, "ends", { seq: seq++, body: body.body, epoch: tick }, { for: [FLIGHT] }));
  // endings are told before the segments that follow them, so a re-formed id stays live
  next = observeHistory(next, [...ended, ...told], { source: "holofoam.flight" });
  return { history: next, firings, obstructions };
}

const virtualShip = (history, design, config) => ({
  body: "ship", parts: design.parts.map((p) => p.id), thrust: [], centre: [0, 0, 0],
  position: config.position, velocity: config.velocity, orientation: config.orientation, angularVelocity: config.angularVelocity,
});

const result = (flight, step) => Object.freeze({ ...flight, history: step.history, firings: Object.freeze(step.firings), obstructions: Object.freeze(step.obstructions) });

/** Launch a ship design: observe it into a fresh SignCraft history with the flight's law, tell each rigid body's first
 *  segment at tick 0 (checking the launch loads), and return the flight { history, firings, obstructions }. */
export function launch(design, { dt = 1 / 64, gravity = [0, 0, -9.80665], throttle = 1, position = [0, 0, 0], velocity = [0, 0, 0], orientation = IDENTITY_QUATERNION, angularVelocity = [0, 0, 0], history } = {}) {
  if (!(dt > 0 && dt <= 1)) throw new TypeError("flight: dt is not admitted");
  if (!(throttle >= 0 && throttle <= 1)) throw new TypeError("flight: throttle is not admitted");
  const config = { format: FLIGHT_FORMAT, dt, gravity: numbers(gravity), throttle, position: numbers(position), velocity: numbers(velocity), orientation: quatNormalize(numbers(orientation)), angularVelocity: numbers(angularVelocity) };
  let h = observeDesign(history ?? createStructureHistory(), design);
  h = observeHistory(h, [cell(FLIGHT, "defines", config, { for: [FLIGHT] })], { source: "holofoam.flight" });
  const admitted = designOfHistory(h);
  return result({ history: h }, retell(h, 0, throttle, [virtualShip(h, admitted, config)]));
}

const lastEpoch = (history) => segments(history).reduce((m, s) => Math.max(m, s.epoch), 0);
const currentThrottle = (history) => {
  const events = queryHistory(history, { predicate: "throttle" }).map((at) => at.object).sort((a, b) => a.seq - b.seq);
  return events.length === 0 ? configOf(history).throttle : events[events.length - 1].value;
};
function guardTick(flight, tick) {
  if (!Number.isInteger(tick) || tick < lastEpoch(flight.history) || tick > MAX_TICKS) throw new TypeError("flight: an event tick must not precede the last told segment");
}

/** Change the throttle at a tick: the bodies whose thrust changes are told again; loads at the new thrust are checked. */
export function setThrottle(flight, tick, throttle) {
  guardTick(flight, tick);
  if (!(throttle >= 0 && throttle <= 1)) throw new TypeError("flight: throttle is not admitted");
  const old = bodiesAt(flight, tick);
  const seq = queryHistory(flight.history, { predicate: "throttle" }).length;
  return result(flight, retell(flight.history, tick, throttle, old, { event: (h) => observeHistory(h, [cell(`flight-event:${seq}`, "throttle", { seq, tick, value: throttle }, { for: [FLIGHT] })], { source: "holofoam.throttle" }) }));
}

/** Stage at a tick: the decoupler (and every joint it releases) is removed by an admitted event; bodies split. */
export function stage(flight, tick, decoupler) {
  guardTick(flight, tick);
  const old = bodiesAt(flight, tick);
  return result(flight, retell(flight.history, tick, currentThrottle(flight.history), old, { event: (h) => observeStaging(h, decoupler, { tick }) }));
}

/** The history's head address: the identity of the whole flight, a function of its law alone. */
export const headAddress = (flight) => historyHeads(flight.history).join(",");
/** The design in force at the end of the flight's record. */
export const designOf = (flight) => designOfHistory(flight.history);
export const flightDt = (flight) => configOf(flight.history).dt;
