/**
 * Holofoam structure: a ship is a part graph whose rigidity and stress are cohomology, and whose breakage is a
 * typed settlement event.
 *
 *  - A design (parts, joints) is observed into a SignCraft history as cells; the design in force is derived by
 *    replay of that history (the design cells minus every `removes` event), never written back.
 *  - Welds fuse parts into rigid clusters (union-find). Every other joint is a constraint between clusters:
 *    a strut is a bar, a decoupler a ball joint (pin), a hinge a pin plus two axis rows. The constraints form a
 *    body-bar rigidity sheaf (signgraph/cellular-sheaf) read exactly over ℚ: H⁰ = infinitesimal motions,
 *    mechanisms = H⁰ − 6 per connected piece, self-stresses = H¹, and the Maxwell identity is checked.
 *  - Loads are static equilibrium on the sheaf: member forces f solve Rᵀf = −p (f > 0 compression), R the
 *    coboundary. The piece is free, so inertial (d'Alembert) loads from its rigid-body acceleration are added to
 *    the external ones. An over-braced piece (H¹ > 0) takes the minimum-norm solution, the harmonic
 *    representative; a load a mechanism cannot carry is returned as the obstruction it is. Welds carry the
 *    resultant force across their cut (moments are not assessed; a weld in a weld-cycle is indeterminate).
 *  - Failure: a member whose load exceeds its strength is TOLD AGAINST (its design cell told it for); holding
 *    both is the FOUR ⊤ reading, and the member fires. The most overloaded member fires first; it vanishes (a
 *    T2 event; a split of the piece is also a T1 event), and the survivor is re-settled until nothing fires:
 *    the driven settling flow, with each firing step a singular time.
 */
import { cell } from "@red-cup-engineering/signcell/cell";
import { createHistory, observeHistory, queryHistory } from "@red-cup-engineering/signcraft/history";
import { bodyBarReceipt, bodyBarSheaf, solveNormal } from "@red-cup-engineering/signgraph/cellular-sheaf";
import { ratPairOfEntry } from "@red-cup-engineering/computer-data-engineering-services-section/number/rational-matrix";
import { add, angularAcceleration, cross, dot, length, massProperties, scale, sub } from "./rigid-body.mjs";

export const JOINT_KINDS = Object.freeze(["weld", "strut", "hinge", "decoupler"]);
const DESIGN_WITNESS = "holofoam.structure.design";
const LOAD_WITNESS = "holofoam.structure.load";
const MAX_PARTS = 2_000;

// — exact coordinates —

/** An exact entry for a coordinate: integers and "a/b" as given, a finite decimal as its decimal fraction. */
function exactEntry(x) {
  if (typeof x === "string") { ratPairOfEntry(x); return x; }
  if (!Number.isFinite(x)) throw new TypeError("structure: a coordinate is not finite");
  if (Number.isSafeInteger(x)) return x;
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(x));
  if (m === null) throw new TypeError("structure: a coordinate is not admitted");
  let numerator = BigInt(m[2] + (m[3] ?? "")), denominator = 10n ** BigInt((m[3] ?? "").length);
  const exponent = BigInt(m[4] ?? 0);
  if (exponent >= 0n) numerator *= 10n ** exponent; else denominator *= 10n ** -exponent;
  const [n, d] = ratPairOfEntry(`${m[1]}${numerator}/${denominator}`);
  return d === 1n ? `${n}` : `${n}/${d}`;
}
const numberOf = (entry) => { const [n, d] = ratPairOfEntry(entry); return Number(n) / Number(d); };
const vec3 = (v, name) => {
  if (!Array.isArray(v) || v.length !== 3) throw new TypeError(`structure: ${name} must be a 3-vector`);
  return Object.freeze(v.map(exactEntry));
};
const floats = (v) => v.map(numberOf);

// — designs —

const idOf = (value, name) => { if (typeof value !== "string" || value === "") throw new TypeError(`structure: ${name} must be a non-empty string`); return value; };
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Admit a ship design: parts { id, mass, at, kind, radius?, thrust? } and joints { id, from, to, kind, strength, at?, axis?, releasedBy? }.
 *  Returns the canonical frozen design (parts and joints sorted by id, coordinates exact). */
export function admitDesign(design) {
  if (!design || !Array.isArray(design.parts) || !Array.isArray(design.joints ?? [])) throw new TypeError("structure: a design has parts and joints");
  if (design.parts.length === 0 || design.parts.length > MAX_PARTS) throw new TypeError("structure: part count is not admitted");
  const parts = design.parts.map((part) => {
    if (!Number.isFinite(part.mass) || part.mass <= 0) throw new TypeError("structure: a part needs positive mass");
    if (part.radius !== undefined && !(Number.isFinite(part.radius) && part.radius > 0)) throw new TypeError("structure: a part radius must be positive");
    return Object.freeze({
      id: idOf(part.id, "a part id"), mass: part.mass, at: vec3(part.at, "a part position"), kind: idOf(part.kind ?? "part", "a part kind"),
      ...(part.radius === undefined ? {} : { radius: part.radius }),
      ...(part.thrust === undefined ? {} : { thrust: Object.freeze(part.thrust.map((c) => { if (!Number.isFinite(c)) throw new TypeError("structure: thrust is not finite"); return c; })) }),
    });
  }).sort(byId);
  const partIds = new Set(parts.map((p) => p.id));
  if (partIds.size !== parts.length) throw new TypeError("structure: duplicate part id");
  const joints = (design.joints ?? []).map((joint) => {
    if (!JOINT_KINDS.includes(joint.kind)) throw new TypeError(`structure: joint kind ${JSON.stringify(joint.kind)} is not admitted`);
    if (!partIds.has(joint.from) || !partIds.has(joint.to) || joint.from === joint.to) throw new TypeError("structure: a joint joins two distinct parts of the design");
    if (!Number.isFinite(joint.strength) || joint.strength <= 0) throw new TypeError("structure: a joint needs positive strength");
    return Object.freeze({
      id: idOf(joint.id, "a joint id"), from: joint.from, to: joint.to, kind: joint.kind, strength: joint.strength,
      ...(joint.at === undefined ? {} : { at: vec3(joint.at, "a joint position") }),
      ...(joint.axis === undefined ? {} : { axis: vec3(joint.axis, "a hinge axis") }),
      ...(joint.releasedBy === undefined ? {} : { releasedBy: idOf(joint.releasedBy, "releasedBy") }),
    });
  }).sort(byId);
  if (new Set(joints.map((j) => j.id)).size !== joints.length) throw new TypeError("structure: duplicate joint id");
  for (const joint of joints) if (joint.releasedBy !== undefined && !joints.some((j) => j.id === joint.releasedBy && j.kind === "decoupler")) throw new TypeError("structure: releasedBy names a decoupler of the design");
  return Object.freeze({ parts: Object.freeze(parts), joints: Object.freeze(joints) });
}

/** The design without the named joints, and every joint they release. */
export function withoutJoints(design, ids) {
  const gone = new Set(ids);
  for (const joint of design.joints) if (gone.has(joint.releasedBy)) gone.add(joint.id);
  return Object.freeze({ parts: design.parts, joints: Object.freeze(design.joints.filter((j) => !gone.has(j.id))) });
}

// — admission into a SignCraft history —

const partCells = (part) => [
  cell(`part:${part.id}`, "is", part.kind, { for: [DESIGN_WITNESS] }),
  cell(`part:${part.id}`, "mass", part.mass, { for: [DESIGN_WITNESS] }),
  cell(`part:${part.id}`, "at", [...part.at], { for: [DESIGN_WITNESS] }),
  ...(part.radius === undefined ? [] : [cell(`part:${part.id}`, "radius", part.radius, { for: [DESIGN_WITNESS] })]),
  ...(part.thrust === undefined ? [] : [cell(`part:${part.id}`, "thrust", [...part.thrust], { for: [DESIGN_WITNESS] })]),
];
const jointCells = (joint) => [
  cell(`joint:${joint.id}`, "joins", { from: joint.from, to: joint.to, kind: joint.kind, ...(joint.at ? { at: [...joint.at] } : {}), ...(joint.axis ? { axis: [...joint.axis] } : {}), ...(joint.releasedBy ? { releasedBy: joint.releasedBy } : {}) }, { for: [DESIGN_WITNESS] }),
  cell(`joint:${joint.id}`, "strength", joint.strength, { for: [DESIGN_WITNESS] }),
  // the member's claim to hold, told for by its design
  cell(`joint:${joint.id}`, "holds", "design", { for: [DESIGN_WITNESS] }),
];

/** A fresh structure history. */
export const createStructureHistory = () => createHistory([]);

/** Observe a ship design into a history as part, mass, position, joint and strength cells. */
export function observeDesign(history, design, { source = "holofoam.design" } = {}) {
  const admitted = admitDesign(design);
  return observeHistory(history, [...admitted.parts.flatMap(partCells), ...admitted.joints.flatMap(jointCells)], { source });
}

const objectsOf = (history, predicate) => new Map(queryHistory(history, { predicate }).map((at) => [at.subject, at.object]));

/** The removal events of a history, in order. */
export function removalsOf(history) {
  return queryHistory(history, { predicate: "removes" }).map((at) => at.object).sort((a, b) => a.seq - b.seq);
}

/** The design in force, derived by replay: the design cells minus the joints removed at or before `tick`, or by the first `removals` events. */
export function designOfHistory(history, { tick = Infinity, removals } = {}) {
  const kinds = objectsOf(history, "is"), masses = objectsOf(history, "mass"), places = objectsOf(history, "at"), radii = objectsOf(history, "radius"), thrusts = objectsOf(history, "thrust");
  const joins = objectsOf(history, "joins"), strengths = objectsOf(history, "strength");
  const parts = [...kinds.keys()].map((subject) => {
    const id = subject.slice("part:".length);
    return { id, kind: kinds.get(subject), mass: masses.get(subject), at: places.get(subject), ...(radii.has(subject) ? { radius: radii.get(subject) } : {}), ...(thrusts.has(subject) ? { thrust: thrusts.get(subject) } : {}) };
  });
  const joints = [...joins.keys()].map((subject) => ({ id: subject.slice("joint:".length), ...joins.get(subject), strength: strengths.get(subject) }));
  const full = admitDesign({ parts, joints });
  const events = removalsOf(history);
  return withoutJoints(full, (removals === undefined ? events.filter((event) => event.tick <= tick) : events.slice(0, removals)).map((event) => event.joint));
}

/** Observe fired members: each is told against its design cell (the FOUR ⊤ reading of the member) and recorded as a T2 removal. */
export function observeFirings(history, firings, { tick = 0, source = "holofoam.failure" } = {}) {
  if (firings.length === 0) return history;
  let seq = removalsOf(history).length;
  const cells = firings.flatMap((firing) => [
    cell(`joint:${firing.member}`, "holds", "design", { against: [{ witness: LOAD_WITNESS, tick, step: firing.step, load: firing.load, strength: firing.strength }] }),
    cell(`event:${seq}`, "removes", { seq: seq++, tick, joint: firing.member, cause: "fire", ...(firing.body === undefined ? {} : { body: firing.body }), step: firing.step, load: firing.load, strength: firing.strength, event: "T2" }, { for: [LOAD_WITNESS] }),
  ]);
  return observeHistory(history, cells, { source });
}

/** Observe a staging: the removal of a decoupler (and, by replay, every joint it releases). */
export function observeStaging(history, decoupler, { tick = 0, source = "holofoam.stage" } = {}) {
  const design = designOfHistory(history, { tick });
  const joint = design.joints.find((j) => j.id === decoupler && j.kind === "decoupler");
  if (joint === undefined) throw new TypeError("structure: staging names a decoupler in force");
  const seq = removalsOf(history).length;
  return observeHistory(history, [cell(`event:${seq}`, "removes", { seq, tick, joint: decoupler, cause: "stage", event: "T2" }, { for: ["holofoam.stage"] })], { source });
}

// — clusters, constraints, pieces —

class UnionFind {
  constructor(keys) { this.parent = new Map(keys.map((k) => [k, k])); }
  find(k) { let root = k; while (this.parent.get(root) !== root) root = this.parent.get(root); while (this.parent.get(k) !== root) { const next = this.parent.get(k); this.parent.set(k, root); k = next; } return root; }
  union(a, b) { const [x, y] = [this.find(a), this.find(b)]; if (x !== y) this.parent.set(y < x ? x : y, y < x ? y : x); }
}

/** The rigid clusters (weld-connected parts, named by their lowest part id) and the constraints between them. */
export function structureOf(design) {
  const parts = new Map(design.parts.map((p) => [p.id, p]));
  const welds = new UnionFind(design.parts.map((p) => p.id));
  for (const joint of design.joints) if (joint.kind === "weld") welds.union(joint.from, joint.to);
  const clusterOf = (partId) => welds.find(partId);
  const clusters = new Map();
  for (const part of design.parts) { const id = clusterOf(part.id); if (!clusters.has(id)) clusters.set(id, []); clusters.get(id).push(part.id); }
  const constraints = [], internal = [];
  for (const joint of design.joints) {
    if (joint.kind === "weld") continue;
    const from = clusterOf(joint.from), to = clusterOf(joint.to);
    if (from === to) { internal.push(joint.id); continue; }
    const a = parts.get(joint.from).at, b = parts.get(joint.to).at;
    if (joint.kind === "strut") constraints.push({ id: joint.id, kind: "bar", from, to, a, b, joint });
    else if (joint.kind === "decoupler") constraints.push({ id: joint.id, kind: "pin", from, to, at: joint.at ?? a, joint });
    else constraints.push({ id: joint.id, kind: "hinge", from, to, at: joint.at ?? a, axis: joint.axis ?? [0, 0, 1], joint });
  }
  const pieces = new UnionFind([...clusters.keys()]);
  for (const c of constraints) pieces.union(c.from, c.to);
  const pieceMap = new Map();
  for (const id of [...clusters.keys()].sort()) { const root = pieces.find(id); if (!pieceMap.has(root)) pieceMap.set(root, []); pieceMap.get(root).push(id); }
  const pieceList = [...pieceMap.values()].map((clusterIds) => Object.freeze({
    id: clusterIds[0], clusters: Object.freeze(clusterIds), parts: Object.freeze(clusterIds.flatMap((c) => clusters.get(c)).sort()),
    constraints: Object.freeze(constraints.filter((c) => clusterIds.includes(c.from))),
  })).sort((a, b) => (a.id < b.id ? -1 : 1));
  return Object.freeze({ parts, clusters: Object.freeze([...clusters.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, partIds]) => Object.freeze({ id, parts: Object.freeze(partIds.sort()) }))), constraints: Object.freeze(constraints), internal: Object.freeze(internal), pieces: Object.freeze(pieceList) });
}

const stripJoint = ({ joint, ...constraint }) => constraint;

// — rigidity —

/** The exact rigidity of a design: rigid clusters, per-piece and overall motions, mechanisms, self-stresses, and the Maxwell identity. */
export function rigidity(design) {
  const structure = structureOf(design);
  const overall = bodyBarReceipt(structure.clusters.map((c) => c.id), structure.constraints.map(stripJoint));
  const pieces = structure.pieces.map((piece) => {
    const receipt = bodyBarReceipt([...piece.clusters], piece.constraints.map(stripJoint));
    return Object.freeze({
      id: piece.id, parts: piece.parts, clusters: piece.clusters, members: Object.freeze(piece.constraints.map((c) => c.id)),
      motions: receipt.motions, mechanisms: receipt.mechanisms, selfStresses: receipt.selfStresses, rigid: receipt.rigid, maxwell: receipt.maxwell,
    });
  });
  return Object.freeze({
    kind: "holofoam.rigidity", dimension: 3,
    clusters: structure.clusters, internal: structure.internal, pieces: Object.freeze(pieces),
    motions: overall.motions, mechanisms: overall.mechanisms, selfStresses: overall.selfStresses, rigid: overall.rigid,
    maxwell: overall.maxwell, receipt: overall,
  });
}

// — loads —

/** Static loads of a design under external forces [{ part, force: [fx, fy, fz] }] (applied at the part's position,
 *  in the design frame), uniform gravity (design frame) and an angular velocity (design frame, the same for every piece).
 *  Each piece accelerates as a free rigid body; inertial loads make it a static problem, solved on the rigidity sheaf.
 *  Returns { members, obstructions, pieces, resolved }: a member is { id, kind, piece, resolved, force (signed
 *  compression for a strut, the constraint block otherwise), load (its magnitude), strength, ratio }. */
export function loads(design, externalForces = [], { gravity = [0, 0, 0], angularVelocity = [0, 0, 0] } = {}) {
  const structure = structureOf(design);
  const forceOn = new Map();
  for (const { part, force } of externalForces) {
    if (!structure.parts.has(part)) throw new TypeError(`structure: a force names an unknown part ${JSON.stringify(part)}`);
    forceOn.set(part, add(forceOn.get(part) ?? [0, 0, 0], force));
  }
  const members = [], obstructions = [], pieces = [];
  const clusterOfPart = new Map();
  for (const cluster of structure.clusters) for (const id of cluster.parts) clusterOfPart.set(id, cluster.id);
  for (const piece of structure.pieces) {
    const parts = piece.parts.map((id) => ({ ...structure.parts.get(id), at: floats(structure.parts.get(id).at) }));
    const props = massProperties(parts);
    let total = scale(gravity, props.mass), torque = [0, 0, 0];
    for (const part of parts) {
      const f = forceOn.get(part.id) ?? [0, 0, 0];
      total = add(total, f);
      torque = add(torque, cross(sub(part.at, props.centre), f));
    }
    const acceleration = scale(total, 1 / props.mass);
    const alpha = angularAcceleration(props, torque, angularVelocity);
    // net external + inertial load on each part
    const net = new Map();
    let magnitude = 0;
    for (const part of parts) {
      const r = sub(part.at, props.centre);
      const inertial = scale(add(add(acceleration, cross(alpha, r)), cross(angularVelocity, cross(angularVelocity, r))), part.mass);
      const n = sub(add(forceOn.get(part.id) ?? [0, 0, 0], scale(gravity, part.mass)), inertial);
      net.set(part.id, n);
      magnitude += length(n) * (1 + length(r));
    }
    // wrench on each cluster about the piece's centre of mass
    const wrench = piece.clusters.map((clusterId) => {
      let force = [0, 0, 0], moment = [0, 0, 0];
      for (const part of parts) {
        if (clusterOfPart.get(part.id) !== clusterId) continue;
        const n = net.get(part.id), radius = part.radius ?? 0.5;
        force = add(force, n);
        // the load's moment about the centre of mass, and the inertial couple of the part's own (spherical) inertia
        moment = sub(add(moment, cross(sub(part.at, props.centre), n)), scale(alpha, 0.4 * part.mass * radius * radius));
      }
      return [...force, ...moment];
    });
    const reaction = new Map(parts.map((p) => [p.id, [0, 0, 0]]));
    let pieceResolved = true, mechanisms = 0, residual = 0;
    const solved = [];
    if (piece.constraints.length > 0) {
      const rel = (v) => sub(floats(v), props.centre);
      const constraints = piece.constraints.map((c) => ({ id: c.id, kind: c.kind, from: c.from, to: c.to,
        ...(c.kind === "bar" ? { a: rel(c.a), b: rel(c.b) } : { at: rel(c.at), ...(c.axis ? { axis: floats(c.axis) } : {}) }) }));
      const sheaf = bodyBarSheaf([...piece.clusters], constraints, { normalize: true });
      const solution = solveNormal(sheaf, wrench.flat().map((v) => -v), { floor: magnitude });
      pieceResolved = solution.consistent;
      residual = solution.residual;
      if (!pieceResolved) {
        mechanisms = bodyBarReceipt([...piece.clusters], piece.constraints.map(stripJoint)).mechanisms;
        const perCluster = piece.clusters.map((id, k) => ({ cluster: id, wrench: solution.obstruction.slice(6 * k, 6 * k + 6) }));
        obstructions.push(Object.freeze({ kind: "mechanism", piece: piece.id, mechanisms, residual, load: solution.rhsNorm, clusters: Object.freeze(perCluster) }));
      }
      piece.constraints.forEach((c, k) => {
        const dim = sheaf.edges[k].dim, offset = sheaf.edgeOffsets[k];
        const block = solution.section.slice(offset, offset + dim);
        solved.push({ constraint: c, sheaf: sheaf.edges[k], block });
        // the force this member exerts on the part at its `to` end (equal and opposite at `from`)
        const toPart = c.joint.to, fromPart = c.joint.from;
        let onTo;
        if (c.kind === "bar") { const u = sub(floats(c.b), floats(c.a)); onTo = scale(u, block[0] / length(u)); }
        else onTo = [block[0], block[1], block[2]];
        reaction.set(toPart, add(reaction.get(toPart), onTo));
        reaction.set(fromPart, sub(reaction.get(fromPart), onTo));
        const load = c.kind === "bar" ? Math.abs(block[0]) : length(block);
        members.push(Object.freeze({
          id: c.id, kind: c.joint.kind, piece: piece.id, resolved: pieceResolved,
          force: c.kind === "bar" ? block[0] : Object.freeze(block), load, strength: c.joint.strength, ratio: load / c.joint.strength,
        }));
      });
    }
    // welds: the resultant across each bridge of the weld graph
    const clusterWelds = design.joints.filter((j) => j.kind === "weld" && piece.parts.includes(j.from));
    for (const weld of clusterWelds) {
      const others = clusterWelds.filter((w) => w.id !== weld.id);
      const side = new Set([weld.from]);
      for (let grew = true; grew;) { grew = false; for (const w of others) { if (side.has(w.from) !== side.has(w.to)) { side.add(w.from); side.add(w.to); grew = true; } } }
      const bridge = !side.has(weld.to);
      let carried = [0, 0, 0];
      if (bridge) for (const id of side) carried = add(carried, add(net.get(id), reaction.get(id)));
      const load = bridge ? length(carried) : 0;
      members.push(Object.freeze({ id: weld.id, kind: "weld", piece: piece.id, resolved: pieceResolved && bridge, indeterminate: !bridge, force: Object.freeze(bridge ? carried : [0, 0, 0]), load, strength: weld.strength, ratio: load / weld.strength }));
    }
    pieces.push(Object.freeze({ id: piece.id, parts: piece.parts, mass: props.mass, centre: props.centre, acceleration, angularAcceleration: alpha, resolved: pieceResolved, residual }));
  }
  members.sort(byId);
  return Object.freeze({ kind: "holofoam.loads", members: Object.freeze(members), obstructions: Object.freeze(obstructions), pieces: Object.freeze(pieces), resolved: obstructions.length === 0 });
}

// — failure: the driven settling flow —

/** Settle a design under load. Members whose load exceeds their strength are told against; the most overloaded
 *  fires first (ties by id), vanishes (T2), and the survivor is re-settled until none fires. Unresolvable pieces
 *  (mechanisms under load) are reported as obstructions and not fired on. Returns { design, firings, loads, obstructions }.
 *  A firing is { step, member, kind, load, strength, ratio, overloaded (ids over strength at that step), event: "T2",
 *  split (the parts of the pieces the removal parted, a T1 event, or null) }. */
export function failure(design, externalForces = [], options = {}) {
  let current = design;
  const firings = [];
  for (;;) {
    const state = loads(current, externalForces, options);
    const over = state.members.filter((m) => m.resolved && m.load > m.strength);
    if (over.length === 0) return Object.freeze({ design: current, firings: Object.freeze(firings), loads: state, obstructions: state.obstructions });
    const first = over.reduce((best, m) => (m.ratio > best.ratio ? m : best));
    const before = structureOf(current).pieces.length;
    const next = withoutJoints(current, [first.id]);
    const after = structureOf(next).pieces;
    firings.push(Object.freeze({
      step: firings.length + 1, member: first.id, kind: first.kind, load: first.load, strength: first.strength, ratio: first.ratio,
      overloaded: Object.freeze(over.map((m) => m.id)), event: "T2",
      split: after.length > before ? Object.freeze(after.map((p) => p.parts)) : null,
    }));
    current = next;
  }
}
