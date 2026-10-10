/**
 * Holofoam: a SignCraft simulation engine. An experiment is a SignCraft history: its definition and every
 * admitted event are cells observed at their tick. Organism state is never written; it is derived by
 * deterministic replay of that history. Policies are SignCell evidence settled by SignChain rules under
 * SignCraft's closure.
 */
import { mulberry32 } from "@red-cup-engineering/computer-data-engineering-services-section/randomization/mulberry32";
import { cell } from "@red-cup-engineering/signcell/cell";
import { rule } from "@red-cup-engineering/signchain/rules";
import { settleCells } from "@red-cup-engineering/signcraft/settle";
import { createHistory, historyHeads, observeHistory, queryHistory, restoreHistory, validateHistory } from "@red-cup-engineering/signcraft/history";
import { admitEvent, admitSpec, presetNames } from "./admission.mjs";
import { admitLegacyCheckpoint } from "./legacy-state.mjs";

export { admitEvent, presetNames };

const TAU = Math.PI * 2;
export const EXPERIMENT_FORMAT = "holofoam.experiment/v2";
const MAX_TERMINAL_TICK = 1_000_000;
const MAX_EVENTS = 10_000;
const MAX_REPLAY_ORGANISM_TICKS = 20_000_000;


// The sensed atoms, and the recommendation each genome edge licenses when its atom is sensed.
const ATOMS = ["favorable-flow", "signal", "crowded", "mixed"];
const EDGE_OF_ATOM = { "favorable-flow": "flow", signal: "signal", crowded: "crowded", mixed: "mixed" };
const RECOMMENDS = { "favorable-flow": "approach-for", signal: "approach-for", crowded: "approach-against", mixed: "approach-against" };
const sensedCell = (atom, witnesses = []) => cell("senses", "holds", atom, { for: witnesses });
const recommendation = (value, witnesses = []) => cell("policy", "recommends", value, { for: witnesses });
const compiledTables = new Map();

/** The policy table of a genome: for each sensory signature, the SignCraft settlement of the sensed atoms under the genome's edges as SignChain rules. */
export function compileModel(genome) {
  const signature = `${genome.id}|${ATOMS.map((atom) => (genome.edges[EDGE_OF_ATOM[atom]] ? 1 : 0)).join("")}`;
  let table = compiledTables.get(signature);
  if (table === undefined) {
    const rules = ATOMS.filter((atom) => genome.edges[EDGE_OF_ATOM[atom]]).map((atom) => rule(`${genome.id}-${EDGE_OF_ATOM[atom]}`, [{ cell: sensedCell(atom), atLeast: "potential" }], { cell: recommendation(RECOMMENDS[atom]), reading: "potential" }));
    table = Object.freeze(Object.fromEntries(Array.from({ length: 16 }, (_, mask) => {
      const sensed = ATOMS.filter((_, bit) => mask & (1 << bit)).map((atom) => sensedCell(atom, [`sensed:${atom}`]));
      const settled = settleCells(sensed, rules).settled;
      const told = (value) => settled.find((at) => at.subject === "policy" && at.predicate === "recommends" && at.object === value && at.for.length > 0);
      const values = Object.freeze(["approach-for", "approach-against"].filter((value) => told(value) !== undefined));
      const witnesses = Object.freeze(Object.fromEntries(values.map((value) => [value, told(value).for])));
      const action = values.length === 2 ? "inspect" : values[0] === "approach-against" ? "avoid" : values[0] === "approach-for" ? "approach" : "explore";
      return [mask, Object.freeze({ action, values, witnesses })];
    })));
    if (compiledTables.size > 256) compiledTables.clear();
    compiledTables.set(signature, table);
  }
  return Object.freeze({ id: genome.id, lineage: genome.lineage, parent: genome.parent, edges: genome.edges, table });
}

const DEFAULT_RULES = Object.freeze({ east: 0.75, north: 0.42, whirl: 0.68, porous: 0.9 });
const DEFAULT_GENOMES = Object.freeze([
  Object.freeze({ id: "lineage-0-base", lineage: 0, parent: null, edges: Object.freeze({ flow: true, signal: true, crowded: false, mixed: false }) }),
  Object.freeze({ id: "lineage-1-base", lineage: 1, parent: null, edges: Object.freeze({ flow: true, signal: false, crowded: true, mixed: true }) }),
  Object.freeze({ id: "lineage-2-base", lineage: 2, parent: null, edges: Object.freeze({ flow: false, signal: true, crowded: true, mixed: false }) }),
]);

// The derived world of a definition: the initial organisms are a function of the seed, never recorded.
function worldOf(definition) {
  const { seed, preset, width, height, config, origin } = definition;
  const base = {
    version: 1, modelVersion: 1, seed, preset, width, height, tick: 0, paused: false,
    config: { ...config }, rules: { ...definition.rules }, events: [], selected: null,
    signals: new Float32Array(24 * 24), spatial: new Map(), barriers: [],
    genomes: definition.genomes.map((genome) => ({ ...genome, edges: { ...genome.edges } })), compiledModels: [],
  };
  if (origin !== undefined) {
    const state = structuredClone(origin);
    return Object.assign(base, { tick: state.tick, paused: state.paused, rules: state.rules, selected: state.selected, signals: Float32Array.from(state.signals), barriers: state.barriers, genomes: state.genomes, organisms: state.organisms });
  }
  const next = mulberry32(seed);
  const organisms = Array.from({ length: config.population }, (_, id) => {
    const hue = Math.floor(next() * 70) + (id % 3) * 95;
    return {
      id, x: next() * width, y: next() * height,
      vx: (next() - 0.5) * 0.007, vy: (next() - 0.5) * 0.007,
      heading: next() * TAU, hue, lineage: id % 3,
      trait: 0.55 + next() * 0.45, energy: 0.5 + next() * 0.5,
      sensors: { crowding: true, signal: true, favorableFlow: true }, modelId: `lineage-${id % 3}-base`,
      model: { observations: [], witnesses: [], favorableFlow: "unknown", crowding: "unknown", signal: "unknown", flow: 0, action: "explore" },
    };
  });
  return Object.assign(base, { organisms });
}

const definitionCell = (definition) => cell("holofoam.experiment", "defines", { format: EXPERIMENT_FORMAT, ...definition }, { for: ["holofoam.createExperiment"] });
const reachesCell = (tick) => cell("holofoam.experiment", "reaches", tick, { for: ["holofoam.clock"] });
const eventCell = (seq, event) => cell(`tick:${event.tick}`, "event", { seq, ...event }, { for: ["holofoam.admitEvent"] });
const HISTORY_FUNCTIONAL = ["reaches"];

/** A new experiment: the definition observed into a fresh SignCraft history, and the world it derives. */
export function createExperiment(spec = {}, { origin } = {}) {
  const admitted = admitSpec(spec);
  const definition = { ...admitted, rules: { ...DEFAULT_RULES }, genomes: DEFAULT_GENOMES.map((genome) => ({ ...genome, edges: { ...genome.edges } })), ...(origin === undefined ? {} : { origin }) };
  const world = worldOf(definition);
  world.history = observeHistory(createHistory(HISTORY_FUNCTIONAL), [definitionCell(definition), reachesCell(world.tick)], { source: "holofoam.definition" });
  return world;
}

/** A v1 explicit current-state checkpoint, imported as the origin of a history. */
export function experimentFromLegacy(value) {
  const state = admitLegacyCheckpoint(value);
  const world = createExperiment({ seed: state.seed, preset: state.preset, width: state.width, height: state.height, config: state.config }, { origin: state });
  return world;
}

function rebuildModels(world) { world.compiledModels = world.genomes.map((genome) => compileModel(genome)); }

export const SENSE_RADIUS = .12;
function spatialShape(world) { return { x: Math.max(1, Math.floor(world.width / SENSE_RADIUS)), y: Math.max(1, Math.floor(world.height / SENSE_RADIUS)) }; }
function spatialKey(x, y) { return `${x},${y}`; }

function indexOrganisms(world) {
  const cells = spatialShape(world);
  const spatial = new Map();
  for (const organism of world.organisms) {
    const x = Math.floor(organism.x / world.width * cells.x) % cells.x;
    const y = Math.floor(organism.y / world.height * cells.y) % cells.y;
    const key = spatialKey(x, y);
    if (!spatial.has(key)) spatial.set(key, []);
    spatial.get(key).push(organism);
  }
  world.spatial = spatial;
}

function localCandidates(world, organism) {
  const cells = spatialShape(world);
  const originX = Math.floor(organism.x / world.width * cells.x) % cells.x;
  const originY = Math.floor(organism.y / world.height * cells.y) % cells.y;
  const candidates = [];
  const seen = new Set();
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    const key = spatialKey((originX + dx + cells.x) % cells.x, (originY + dy + cells.y) % cells.y);
    if (!seen.has(key)) { seen.add(key); candidates.push(...(world.spatial.get(key) ?? [])); }
  }
  return candidates;
}

function diffuseSignals(world) {
  const side = 24;
  const next = new Float32Array(world.signals.length);
  for (let y = 0; y < side; y += 1) for (let x = 0; x < side; x += 1) {
    const read = (dx, dy) => world.signals[((y + dy + side) % side) * side + (x + dx + side) % side];
    next[y * side + x] = (read(0, 0) * .56 + (read(1, 0) + read(-1, 0) + read(0, 1) + read(0, -1)) * .11) * .88;
  }
  world.signals = next;
}

function signalIndex(world, x, y) {
  const side = 24;
  return Math.floor(wrap(y, world.height) / world.height * side) * side + Math.floor(wrap(x, world.width) / world.width * side);
}

/** Read only local observations. `unknown` is distinct from an observed zero. */
export function sense(world, organism) {
  const flow = fieldAt(world, organism.x, organism.y);
  let same = 0; let other = 0; let ax = 0; let ay = 0;
  for (const candidate of localCandidates(world, organism)) {
    if (candidate === organism) continue;
    const [dx, dy, distanceTo] = distance(organism, candidate, world.width, world.height);
    if (distanceTo > SENSE_RADIUS) continue;
    if (candidate.lineage === organism.lineage) same += 1; else other += 1;
    const affinity = candidate.lineage === organism.lineage ? 1 : -0.45;
    if (organism.sensors.crowding) { ax += (dx / distanceTo) * affinity * (0.12 - distanceTo); ay += (dy / distanceTo) * affinity * (0.12 - distanceTo); }
  }
  const signal = world.signals[signalIndex(world, organism.x, organism.y)];
  return {
    tick: world.tick,
    favorableFlow: organism.sensors.favorableFlow ? (flow.x + flow.y > .00006 ? "present" : "absent") : "unknown",
    crowding: organism.sensors.crowding ? { same, other } : "unknown",
    signal: organism.sensors.signal ? (signal > .006 ? "present" : "absent") : "unknown",
    flow: organism.sensors.favorableFlow ? flow : { x: 0, y: 0 }, steering: { x: ax, y: ay },
  };
}

/** Keep a bounded local model; conflicting social cues stay as a conflict. */
export function updateModel(organism, observation) {
  const crowding = observation.crowding === "unknown" ? "unknown" : observation.crowding;
  const mixed = crowding !== "unknown" && crowding.same > 0 && crowding.other > 0;
  organism.model = {
    observations: [...organism.model.observations.slice(-3), observation],
    // The current estimate may change; time-indexed witnesses keep the
    // observed condition distinct from a later condition at this location.
    witnesses: [...organism.model.witnesses.slice(-11), Object.freeze({ tick: observation.tick, favorableFlow: observation.favorableFlow, crowding: observation.crowding, signal: observation.signal })],
    favorableFlow: observation.favorableFlow,
    crowding,
    mixed,
    signal: observation.signal,
    flow: Math.hypot(observation.flow.x, observation.flow.y),
    action: organism.model.action,
  };
  return organism.model;
}

/** Resolve the one compiled recommendation row for a partial local model. */
export function resolvePolicy(model, compiled) {
  if (compiled === undefined) return Object.freeze({ action: "explore", values: Object.freeze([]), witnesses: Object.freeze({}) });
  const knownCrowding = typeof model.crowding === "object";
  const mask = (model.favorableFlow === "present" ? 1 : 0) | (model.signal === "present" ? 2 : 0) | (knownCrowding && model.crowding.same + model.crowding.other > 6 ? 4 : 0) | (model.mixed ? 8 : 0);
  return compiled.table[mask];
}

/** Select a policy from the bounded model without treating unknown as absent. */
export function selectAction(model, compiled) {
  return resolvePolicy(model, compiled).action;
}

/** Apply the chosen action to the organism and a shared signal field. */
export function act(world, organism, observation, action) {
  const scale = action === "avoid" ? -1 : action === "approach" ? 1 : 0.35;
  const turn = Math.atan2(observation.flow.y + observation.steering.y * organism.trait * scale, observation.flow.x + observation.steering.x * organism.trait * scale);
  organism.heading += Math.sin(turn - organism.heading) * 0.22;
  organism.vx = (organism.vx + observation.flow.x + Math.cos(organism.heading) * 0.0018 + observation.steering.x * world.config.cohesion * scale) * world.config.drag;
  organism.vy = (organism.vy + observation.flow.y + Math.sin(organism.heading) * 0.0018 + observation.steering.y * world.config.cohesion * scale) * world.config.drag;
  organism.energy = Math.max(0, Math.min(1, organism.energy + (organism.model.favorableFlow === "present" ? 0.02 : 0) - (action === "avoid" ? 0.004 : 0)));
  organism.model.action = action;
  world.signals[signalIndex(world, organism.x, organism.y)] += action === "approach" ? .0015 : .0002;
}

function resolveBarriers(world, organism) {
  for (const barrier of world.barriers) {
    const dx = organism.x - barrier.x; const dy = organism.y - barrier.y;
    const distanceTo = Math.hypot(dx, dy) || .0001;
    if (distanceTo < barrier.radius) {
      organism.x = wrap(barrier.x + dx / distanceTo * barrier.radius, world.width);
      organism.y = wrap(barrier.y + dy / distanceTo * barrier.radius, world.height);
      organism.vx *= -.55; organism.vy *= -.55;
    }
  }
}

function wrap(value, limit) { return (value % limit + limit) % limit; }
function distance(a, b, width, height) {
  let dx = b.x - a.x; let dy = b.y - a.y;
  if (Math.abs(dx) > width / 2) dx -= Math.sign(dx) * width;
  if (Math.abs(dy) > height / 2) dy -= Math.sign(dy) * height;
  return [dx, dy, Math.hypot(dx, dy) || 0.00001];
}

export function fieldAt(world, x, y) {
  const { east, north, whirl, porous } = world.rules;
  const phase = world.tick * 0.012;
  const cx = x - world.width / 2, cy = y - world.height / 2;
  const radius = Math.hypot(cx, cy) + 0.08;
  return {
    x: east * Math.sin(y * 8 + phase) * world.config.field * .004 + (-cy / radius) * whirl * .001 * porous,
    y: north * Math.cos(x * 8 - phase) * world.config.field * .004 + (cx / radius) * whirl * .001 * porous,
  };
}

export function step(world, count = 1, { force = false } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 1_000) throw new TypeError("step count is not admitted");
  if (world.compiledModels.length === 0) rebuildModels(world);
  for (let frame = 0; frame < count; frame += 1) {
    if (world.paused && !force) break;
    indexOrganisms(world);
    diffuseSignals(world);
    const sensed = world.organisms.map((organism) => ({ organism, observation: sense(world, organism) }));
    for (const { organism, observation } of sensed) {
      const model = updateModel(organism, observation);
      act(world, organism, observation, selectAction(model, world.compiledModels[organism.lineage]));
    }
    for (const organism of world.organisms) {
      organism.x = wrap(organism.x + organism.vx, world.width);
      organism.y = wrap(organism.y + organism.vy, world.height);
      resolveBarriers(world, organism);
    }
    world.tick += 1;
  }
  return world;
}

/** Apply an event already admitted (by applyEvent, or by replay from a history that recorded it). */
function enact(world, admitted) {
  if ((admitted.kind === "select" || admitted.kind === "adopt") && admitted.id >= world.organisms.length) throw new TypeError("organism id is not admitted for this experiment");
  world.events.push(admitted);
  if (admitted.kind === "rule") world.rules[admitted.rule] = admitted.value;
  if (admitted.kind === "pulse") {
    for (const organism of world.organisms) {
      const dx = organism.x - admitted.x, dy = organism.y - admitted.y;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d < admitted.radius) { organism.vx += dx / d * admitted.force; organism.vy += dy / d * admitted.force; }
    }
  }
  if (admitted.kind === "select") world.selected = admitted.id;
  if (admitted.kind === "barrier") world.barriers = admitted.erase ? world.barriers.filter((barrier) => Math.hypot(barrier.x - admitted.x, barrier.y - admitted.y) > admitted.radius) : [...world.barriers, admitted];
  if (admitted.kind === "adopt") { world.organisms[admitted.id].lineage = admitted.lineage; world.organisms[admitted.id].modelId = world.genomes[admitted.lineage].id; }
  if (admitted.kind === "mutate") {
    const parent = world.genomes[admitted.lineage]; const edges = { ...parent.edges, [admitted.edge]: !parent.edges[admitted.edge] };
    const revision = world.events.filter((entry) => entry.kind === "mutate" && entry.lineage === admitted.lineage).length;
    world.genomes[admitted.lineage] = { id: `lineage-${admitted.lineage}-t${world.tick}-r${revision}`, lineage: admitted.lineage, parent: parent.id, edges };
    world.organisms.filter((organism) => organism.lineage === admitted.lineage).forEach((organism) => { organism.modelId = world.genomes[admitted.lineage].id; }); rebuildModels(world);
  }
  return world;
}

/** Admit an event, observe it into the experiment's history at the current tick, and enact it. */
export function applyEvent(world, event) {
  const admitted = admitEvent(event, world.tick);
  if ((admitted.kind === "select" || admitted.kind === "adopt") && admitted.id >= world.organisms.length) throw new TypeError("organism id is not admitted for this experiment");
  if (world.events.length >= MAX_EVENTS) throw new TypeError("experiment event count is not admitted");
  const history = observeHistory(world.history, [eventCell(world.events.length, admitted)], { source: "holofoam.event" });
  enact(world, admitted);
  world.history = history;
  return world;
}

function reachedTick(history) {
  const reached = queryHistory(history, { subject: "holofoam.experiment", predicate: "reaches" });
  return reached.length === 1 ? reached[0].object : undefined;
}

/** Observe the world's tick into its history and return that history: the experiment's whole record. */
export function snapshot(world) {
  if (reachedTick(world.history) !== world.tick) world.history = observeHistory(world.history, [reachesCellChecked(world.tick)], { source: "holofoam.clock" });
  return world.history;
}

function reachesCellChecked(tick) {
  if (!Number.isInteger(tick) || tick < 0 || tick > MAX_TERMINAL_TICK) throw new TypeError("experiment terminal tick is not admitted");
  return reachesCell(tick);
}

/** The same history reaching a later (or earlier, for a cut) tick. */
export function observeTick(history, tick) { return observeHistory(history, [reachesCellChecked(tick)], { source: "holofoam.clock" }); }

/** The bounded facts a history declares, read without replaying it. */
export function describeHistory(input) {
  const history = admitHistory(input);
  const defined = queryHistory(history, { subject: "holofoam.experiment", predicate: "defines" });
  const events = queryHistory(history, { predicate: "event" });
  const terminalTick = reachedTick(history);
  if (defined.length !== 1 || defined[0].object?.format !== EXPERIMENT_FORMAT || !Number.isInteger(terminalTick) || terminalTick < 0 || terminalTick > MAX_TERMINAL_TICK || events.length > MAX_EVENTS) throw new TypeError("experiment is not admitted");
  return Object.freeze({ history, definition: defined[0].object, events: events.map((at) => at.object).sort((a, b) => a.seq - b.seq), terminalTick, address: historyHeads(history).join(",") });
}

function admitHistory(input) {
  let value = input;
  try { if (typeof value === "string") value = JSON.parse(value.startsWith("{") ? value : atob(value)); validateHistory(value); return restoreHistory(value); }
  catch { throw new TypeError("experiment is not admitted"); }
}

// Derived worlds, remembered by history address so undo and forks need not re-derive a long prefix.
// This is an acceleration of the replay law, never a source: a miss replays from the definition.
const derived = new Map();
const DERIVED_LIMIT = 24;
function remember(address, world) {
  const { history, compiledModels, spatial, ...state } = world;
  derived.delete(address); derived.set(address, structuredClone(state));
  if (derived.size > DERIVED_LIMIT) derived.delete(derived.keys().next().value);
}
/** Forget every remembered derived world; the next restoration replays. */
export function clearDerived() { derived.clear(); }
/** Whether the world of this history is already derived. */
export function isDerived(history) { return derived.has(historyHeads(history).join(",")); }

/** The world a history derives: deterministic replay of its definition and admitted events. */
export function replay(input) {
  const described = describeHistory(input);
  const { history, definition, events, terminalTick, address } = described;
  let world;
  const cached = derived.get(address);
  if (cached !== undefined) {
    world = Object.assign(structuredClone(cached), { spatial: new Map(), compiledModels: [] });
  } else {
    if (definition.config.population * terminalTick > MAX_REPLAY_ORGANISM_TICKS) throw new TypeError("experiment replay exceeds the work bound");
    world = worldOf(definition);
    let previousTick = world.tick;
    events.forEach((recorded, index) => {
      const { seq, ...event } = recorded;
      const admitted = admitEvent(event, event.tick);
      if (seq !== index || admitted.tick < previousTick || admitted.tick > terminalTick) throw new TypeError("event order is not admitted");
      while (world.tick < admitted.tick) step(world, 1, { force: true });
      enact(world, admitted);
      previousTick = admitted.tick;
    });
    while (world.tick < terminalTick) step(world, 1, { force: true });
    if (world.tick !== terminalTick) throw new TypeError("experiment terminal tick is not admitted");
  }
  world.history = history;
  world.paused = false;
  rebuildModels(world);
  return world;
}

/** Record a world's derived state against its history address, for later fast restoration. */
export function rememberDerived(world) { remember(historyHeads(snapshot(world)).join(","), world); return world.history; }

export function encodeExperiment(world) { return btoa(JSON.stringify(snapshot(world))); }

export function decodeExperiment(encoded) {
  if (typeof encoded !== "string" || encoded.length > 2_000_000) throw new TypeError("experiment encoding is not admitted");
  return replay(encoded);
}

/** Finite grid quadrature of the app's vector field, not a global H1 result. */
export function loopCirculation(world, x, y, size = 0.08, orientation = 1) {
  const points = [[x - size, y - size], [x + size, y - size], [x + size, y + size], [x - size, y + size]];
  if (orientation < 0) points.reverse();
  return points.reduce((sum, [px, py], index) => {
    const [nx, ny] = points[(index + 1) % points.length];
    const f = fieldAt(world, (px + nx) / 2, (py + ny) / 2);
    return sum + f.x * (nx - px) + f.y * (ny - py);
  }, 0);
}

/** A discrete gradient integrates to zero around this closed rectangular loop. */
export function potentialLoopIntegral(x, y, size = 0.08, orientation = 1) {
  const points = [[x - size, y - size], [x + size, y - size], [x + size, y + size], [x - size, y + size]];
  if (orientation < 0) points.reverse();
  const potential = ([px, py]) => px * px + py * py * .5;
  return points.reduce((sum, point, index) => sum + potential(points[(index + 1) % points.length]) - potential(point), 0);
}
