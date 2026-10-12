/**
 * Holofoam vessels: a rocket stacked from parts, read as stages, and flown into an orbit plan.
 *
 * A stack is a sequence of part ids, top (the payload) first. A catalog maps an id to a part { kind, mass, fuel?, thrust?, isp?,
 * height? }, with kind one of pod, tank, engine, decoupler. Decouplers cut the stack into groups; the bottom group fires first,
 * and when its fuel is spent it falls away with the decoupler above it. The groups, bottom first, are the stages. A stage burns
 * only its own fuel through its own engines (no crossfeed); its Δv is Tsiolkovsky's, Isp·g₀·ln(m₀/m₁), with m₀ the whole
 * vessel still attached at ignition.
 *
 * The same stack is also a structure design (structure.mjs): parts on the stack axis, welded to their neighbours, held across
 * each decoupler by a decoupler joint, so rigidity, loads and staging read it with no second description.
 *
 * A staged ascent is told into an orbit plan (orbit.mjs) as one powered law per stage: the first stage carries the gravity-turn
 * programme, later stages fly prograde, and every stage stops at the apoapsis cutoff. The plan stays law, not state: each stage's
 * ignition is told at the epoch the previous stage's law derives for its burnout. A vessel's propellant is a ledger kept beside
 * the plan (`spend`): an impulsive burn is admitted only when the stages still attached hold the Δv it asks for.
 */
import { admitDesign } from "./structure.mjs";
import { chain, poseAt, surfaceVelocity, systemOf, tellPowered } from "./orbit.mjs";
import { cross, length } from "./rigid-body.mjs";

export const G0 = 9.80665;
export const PART_KINDS = Object.freeze(["pod", "tank", "engine", "decoupler"]);
const MAX_STACK = 64;

const finitePositive = (v, name) => { if (!(Number.isFinite(v) && v > 0)) throw new TypeError(`vessel: ${name} must be a positive number`); return v; };
const finiteNonNegative = (v, name) => { if (!(Number.isFinite(v) && v >= 0)) throw new TypeError(`vessel: ${name} must be a non-negative number`); return v; };

/** Admit a part catalog: { id: { kind, name?, mass, fuel?, thrust?, isp?, height?, drag? } }, frozen and checked. drag is the
 *  part's drag area Cd·A in m², summed over the parts attached. */
export function admitCatalog(catalog) {
  if (catalog === null || typeof catalog !== "object") throw new TypeError("vessel: a catalog is a record of parts");
  const out = {};
  for (const [id, part] of Object.entries(catalog)) {
    if (!PART_KINDS.includes(part?.kind)) throw new TypeError(`vessel: part ${id} has no admitted kind`);
    const admitted = { id, kind: part.kind, name: part.name ?? id, mass: finitePositive(part.mass, `${id} mass`), fuel: finiteNonNegative(part.fuel ?? 0, `${id} fuel`), height: finitePositive(part.height ?? 1, `${id} height`), drag: finiteNonNegative(part.drag ?? 0, `${id} drag`) };
    if (part.kind === "engine") Object.assign(admitted, { thrust: finitePositive(part.thrust, `${id} thrust`), isp: finitePositive(part.isp, `${id} isp`) });
    out[id] = Object.freeze(admitted);
  }
  return Object.freeze(out);
}

function admitStack(stack, catalog) {
  if (!Array.isArray(stack) || stack.length === 0) throw new TypeError("vessel: a stack needs at least one part");
  if (stack.length > MAX_STACK) throw new TypeError(`vessel: a stack holds at most ${MAX_STACK} parts`);
  return stack.map((id) => { const part = catalog[id]; if (part === undefined) throw new TypeError(`vessel: unknown part ${id}`); return part; });
}

/** The stages of a stack, bottom (first to fire) first: { parts, fuel, dryDropped, thrust, isp, flow, ignitionMass, burnoutMass, deltaV, twr }. */
export function stagesOf(stack, catalog, { gravity = G0 } = {}) {
  const parts = admitStack(stack, catalog);
  const groups = [[]];
  for (const part of parts) {
    if (part.kind === "decoupler") groups.push([part]); // the decoupler falls with the group below it
    else groups[groups.length - 1].push(part);
  }
  const bottomFirst = groups.filter((group) => group.length > 0).reverse();
  let attached = parts.reduce((sum, part) => sum + part.mass + part.fuel, 0), drag = parts.reduce((sum, part) => sum + part.drag, 0);
  return Object.freeze(bottomFirst.map((group, index) => {
    const engines = group.filter((part) => part.kind === "engine");
    const thrust = engines.reduce((sum, e) => sum + e.thrust, 0);
    const isp = thrust > 0 ? thrust / engines.reduce((sum, e) => sum + e.thrust / e.isp, 0) : 0;
    const fuel = thrust > 0 ? group.reduce((sum, part) => sum + part.fuel, 0) : 0;
    const ignitionMass = attached, burnoutMass = attached - fuel;
    const stage = {
      index, parts: Object.freeze(group.map((part) => part.id)), fuel, dryDropped: group.reduce((sum, part) => sum + part.mass + (thrust > 0 ? 0 : part.fuel), 0),
      thrust, isp, flow: thrust > 0 ? thrust / (isp * G0) : 0, ignitionMass, burnoutMass,
      deltaV: fuel > 0 ? isp * G0 * Math.log(ignitionMass / burnoutMass) : 0, twr: thrust / (ignitionMass * gravity), dragArea: drag,
    };
    attached = burnoutMass - stage.dryDropped;
    drag -= group.reduce((sum, part) => sum + part.drag, 0);
    return Object.freeze(stage);
  }));
}

/** The stack as a structure design: parts on the z axis, top highest; welds between neighbours, a decoupler joint below each decoupler. */
export function stackDesign(stack, catalog, { strength = 1e7 } = {}) {
  const parts = admitStack(stack, catalog);
  let z = parts.reduce((sum, part) => sum + part.height, 0);
  const placed = parts.map((part, index) => {
    z -= part.height;
    return { id: `${index}:${part.id}`, kind: part.kind, mass: part.mass + part.fuel, at: [0, 0, z + part.height / 2], ...(part.kind === "engine" ? { thrust: [0, 0, part.thrust] } : {}) };
  });
  const joints = placed.slice(1).map((part, index) => {
    const above = placed[index];
    return { id: `j${index}`, from: above.id, to: part.id, kind: above.kind === "decoupler" ? "decoupler" : "weld", strength };
  });
  return admitDesign({ parts: placed, joints });
}

/** A fresh propellant ledger for a stack: the stages still attached, the active stage's remaining fuel and the vessel's mass. */
export function fuelLedger(stages) {
  if (stages.length === 0) throw new TypeError("vessel: no stages");
  return Object.freeze({ stage: 0, fuel: stages[0].fuel, mass: stages[0].ignitionMass });
}

/** The Δv the attached stages still hold. */
export function deltaVLeft(stages, ledger) {
  let total = 0, mass = ledger.mass;
  for (let i = ledger.stage; i < stages.length; i += 1) {
    const stage = stages[i], fuel = i === ledger.stage ? ledger.fuel : stage.fuel;
    if (stage.thrust > 0 && fuel > 0) total += stage.isp * G0 * Math.log(mass / (mass - fuel));
    mass -= fuel + stage.dryDropped;
  }
  return total;
}

/** Drop spent stages: while the active stage is empty and another remains, it falls away. */
function dropSpent(stages, ledger) {
  let { stage, fuel, mass } = ledger;
  const dropped = [];
  while (stage < stages.length - 1 && !(fuel > 1e-9 && stages[stage].thrust > 0)) {
    mass -= fuel + stages[stage].dryDropped; // unburnable fuel falls with its stage
    dropped.push(stage);
    stage += 1; fuel = stages[stage].fuel;
  }
  return { ledger: Object.freeze({ stage, fuel, mass }), dropped };
}

/** Spend a Δv from the ledger, staging as each stage empties. Returns { ledger, spent, short, dropped }: short > 0 when the vessel cannot
 *  give the whole Δv (the ledger then holds what is left after spending what it could). */
export function spend(stages, ledger, dv) {
  finiteNonNegative(dv, "dv");
  const start = dropSpent(stages, ledger);
  let left = dv, current = start.ledger;
  const dropped = [...start.dropped];
  while (left > 1e-9) {
    const stage = stages[current.stage];
    if (!(stage.thrust > 0 && current.fuel > 1e-9)) break;
    const exhaust = stage.isp * G0, available = exhaust * Math.log(current.mass / (current.mass - current.fuel));
    if (available >= left) {
      const after = current.mass / Math.exp(left / exhaust);
      current = Object.freeze({ ...current, fuel: current.fuel - (current.mass - after), mass: after });
      left = 0;
      break;
    }
    left -= available;
    const next = dropSpent(stages, { ...current, mass: current.mass - current.fuel, fuel: 0 });
    dropped.push(...next.dropped);
    if (next.dropped.length === 0) { current = Object.freeze({ ...current, mass: current.mass - current.fuel, fuel: 0 }); break; }
    current = next.ledger;
  }
  return Object.freeze({ ledger: current, spent: dv - left, short: left, dropped: Object.freeze(dropped) });
}

/** Fly a staged ascent from a surface site into the plan. site: { parent, r, v? } (a point on the parent's surface, parent frame;
 *  v defaults to the turning ground's own velocity, so an eastward launch starts with it).
 *  Returns { plan, ledger, events: [{ t, kind, stage? }], end }: kind is ignition, burnout, cutoff, impact or exhausted;
 *  `end` is the epoch at which the ascent's last powered law ends. */
export function tellAscent(plan, { vessel, site, stages, ledger = fuelLedger(stages), apoapsis, steer = { vertical: 10, kick: 10, tilt: 0.15 }, dt = 1 / 16, epoch = 0, player }) {
  const system = systemOf(plan.history), body = system.bodies.get(site.parent);
  if (body === undefined) throw new TypeError("vessel: unknown launch body");
  const up = site.r.map((c) => c / length(site.r));
  const east = (() => { const e = cross([0, 0, 1], up), n = length(e); return n > 0 ? e.map((c) => c / n) : [0, 1, 0]; })();
  finitePositive(apoapsis, "apoapsis");
  let r = site.r, v = site.v ?? surfaceVelocity(system, site.parent, site.r), t = epoch, current = dropSpent(stages, ledger).ledger, first = true;
  const events = [];
  while (true) {
    const stage = stages[current.stage];
    if (!(stage.thrust > 0 && current.fuel > 1e-9)) { events.push(Object.freeze({ t, kind: "exhausted", stage: current.stage })); break; }
    const flow = stage.thrust / (stage.isp * G0), burn = current.fuel / flow, steps = Math.ceil(burn / dt) + 1;
    plan = tellPowered(plan, {
      vessel, epoch: t, parent: site.parent, r, v, mass: current.mass, dry: current.mass - current.fuel, thrust: stage.thrust, flow, dt, steps, dragArea: stage.dragArea,
      steer: first ? { ...steer, east, ...(body.rotationPeriod > 0 ? { spin: (2 * Math.PI) / body.rotationPeriod } : {}) } : null, cutoff: { apoapsis }, player,
    });
    events.push(Object.freeze({ t, kind: "ignition", stage: current.stage }));
    first = false;
    const segment = chain(plan, vessel, t + burn + 1).find((s) => s.epoch === t && !s.derived);
    const end = segment.end, reason = segment.endReason, pose = poseAt(plan, end, vessel);
    const used = current.mass - pose.mass;
    current = Object.freeze({ ...current, fuel: Math.max(0, current.fuel - used), mass: pose.mass });
    r = pose.local.r; v = pose.local.v; t = end;
    if (reason === "cutoff" || reason === "impact" || reason === "soi-exit") { events.push(Object.freeze({ t, kind: reason, stage: current.stage })); break; }
    events.push(Object.freeze({ t, kind: "burnout", stage: current.stage }));
    const next = dropSpent(stages, { ...current, fuel: 0, mass: current.mass });
    if (next.dropped.length === 0) { current = Object.freeze({ ...current, fuel: 0 }); events.push(Object.freeze({ t, kind: "exhausted", stage: current.stage })); break; }
    current = next.ledger;
  }
  return Object.freeze({ plan, ledger: current, events: Object.freeze(events), end: t });
}
