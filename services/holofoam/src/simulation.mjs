/** Deterministic, headless Holofoam organism and field simulation. */
import { mulberry32 } from "@red-cup-engineering/computer-data-services-section/randomization/mulberry32";
import { settleEvidence } from "@red-cup-engineering/metrologic/closure/src/directed-evidence";

const TAU = Math.PI * 2;

const presets = {
  bloom: { label: "Bloom", population: 420, drag: 0.94, field: 0.13, cohesion: 0.016, mutation: 0.08 },
  tide: { label: "Tide", population: 620, drag: 0.91, field: 0.21, cohesion: 0.008, mutation: 0.14 },
  braid: { label: "Braid", population: 520, drag: 0.925, field: 0.18, cohesion: 0.028, mutation: 0.22 },
  ember: { label: "Ember", population: 360, drag: 0.88, field: 0.27, cohesion: 0.005, mutation: 0.31 },
};

export function presetNames() { return Object.keys(presets); }

export function compileModel(genome) {
  const atoms = ["favorable-flow", "signal", "crowded", "mixed"];
  const table = Object.freeze(Object.fromEntries(Array.from({ length: 16 }, (_, mask) => {
    const seed = atoms.filter((_, bit) => mask & (1 << bit));
    const result = settleEvidence({ vertices: [{ id: "senses", basis: atoms, seed }, { id: "policy", basis: ["approach-for", "approach-against"], seed: [] }], edges: [{ id: `${genome.id}-policy`, source: "senses", target: "policy", map: {
      "favorable-flow": genome.edges.flow ? ["approach-for"] : [], signal: genome.edges.signal ? ["approach-for"] : [], crowded: genome.edges.crowded ? ["approach-against"] : [], mixed: genome.edges.mixed ? ["approach-against"] : [],
    } }] });
    const values = result.values.policy;
    const action = values.includes("approach-for") && values.includes("approach-against") ? "inspect" : values.includes("approach-against") ? "avoid" : values.includes("approach-for") ? "approach" : "explore";
    return [mask, Object.freeze({ action, values, witnesses: result.witnesses.policy })];
  })));
  return Object.freeze({ id: genome.id, lineage: genome.lineage, parent: genome.parent, edges: genome.edges, table });
}

export function createExperiment({ seed = 17, preset = "bloom", width = 1, height = 1, config: suppliedConfig } = {}) {
  if (!Number.isInteger(seed) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 16 || height > 16) throw new TypeError("experiment seed and dimensions are not admitted");
  const config = { ...(presets[preset] ?? presets.bloom), ...(suppliedConfig ?? {}) };
  const ranges = { drag: [.5, .999], field: [0, 1], cohesion: [0, .1], mutation: [0, 1] };
  if (!Number.isInteger(config.population) || config.population < 1 || config.population > 5_000 || Object.keys(suppliedConfig ?? {}).some((key) => !Object.hasOwn(presets.bloom, key)) || !Object.entries(ranges).every(([key, [low, high]]) => Number.isFinite(config[key]) && config[key] >= low && config[key] <= high)) throw new TypeError("experiment configuration is not admitted");
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
  return {
    version: 1, modelVersion: 1, seed, preset, width, height, tick: 0, paused: false,
    config: { ...config }, organisms,
    // These are persistent, spatially meaningful transport rules. Their
    // settled finite interpretation will arrive from metrologic upstream.
    rules: { east: 0.75, north: 0.42, whirl: 0.68, porous: 0.9 },
    events: [], selected: null,
    signals: new Float32Array(24 * 24),
    spatial: new Map(),
    barriers: [],
    genomes: [
      { id: "lineage-0-base", lineage: 0, parent: null, edges: { flow: true, signal: true, crowded: false, mixed: false } },
      { id: "lineage-1-base", lineage: 1, parent: null, edges: { flow: true, signal: false, crowded: true, mixed: true } },
      { id: "lineage-2-base", lineage: 2, parent: null, edges: { flow: false, signal: true, crowded: true, mixed: false } },
    ],
    compiledModels: [],
  };
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

export function applyEvent(world, event) {
  const admitted = admitEvent(event, world.tick);
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

function finiteBetween(value, low, high, name) {
  if (!Number.isFinite(value) || value < low || value > high) throw new TypeError(`${name} is not admitted`);
  return value;
}

/** Admit only bounded, serializable interactions before they enter a replay. */
export function admitEvent(event, tick) {
  if (!event || !Number.isInteger(tick) || tick < 0 || tick > 1_000_000) throw new TypeError("event tick is not admitted");
  if (event.kind === "rule" && !Object.hasOwn({ east: 1, north: 1, whirl: 1, porous: 1 }, event.rule)) throw new TypeError("rule is not admitted");
  if (event.kind === "rule") return { kind: "rule", rule: event.rule, value: finiteBetween(event.value, 0, 1, "rule value"), tick };
  if (event.kind === "pulse") return { kind: "pulse", x: finiteBetween(event.x, 0, 1, "pulse x"), y: finiteBetween(event.y, 0, 1, "pulse y"), radius: finiteBetween(event.radius, .001, .5, "pulse radius"), force: finiteBetween(event.force, -.05, .05, "pulse force"), tick };
  if (event.kind === "select" && Number.isInteger(event.id) && event.id >= 0 && event.id < 100_000) return { kind: "select", id: event.id, tick };
  if (event.kind === "barrier") return { kind: "barrier", x: finiteBetween(event.x, 0, 1, "barrier x"), y: finiteBetween(event.y, 0, 1, "barrier y"), radius: finiteBetween(event.radius, .01, .25, "barrier radius"), erase: Boolean(event.erase), tick };
  if (event.kind === "adopt" && Number.isInteger(event.id) && Number.isInteger(event.lineage) && event.id >= 0 && event.lineage >= 0 && event.lineage < 3) return { kind: "adopt", id: event.id, lineage: event.lineage, tick };
  if (event.kind === "mutate" && Number.isInteger(event.lineage) && event.lineage >= 0 && event.lineage < 3 && ["flow", "signal", "crowded", "mixed"].includes(event.edge)) return { kind: "mutate", lineage: event.lineage, edge: event.edge, tick };
  throw new TypeError("event kind is not admitted");
}

export function replay(experiment) {
  if (!experiment || experiment.version !== 1 || experiment.modelVersion !== 1 || !Array.isArray(experiment.events) || experiment.events.length > 10_000 || !Number.isInteger(experiment.terminalTick) || experiment.terminalTick < 0 || experiment.terminalTick > 10_000) throw new TypeError("experiment is not admitted");
  const world = createExperiment(experiment);
  const admittedEvents = experiment.events.map((event) => admitEvent(event, event.tick));
  let previousTick = 0;
  for (const admitted of admittedEvents) {
    if (admitted.tick < previousTick || admitted.tick > experiment.terminalTick) throw new TypeError("event order is not admitted");
    while (world.tick < admitted.tick) step(world);
    applyEvent(world, admitted);
    previousTick = admitted.tick;
  }
  while (world.tick < experiment.terminalTick) step(world);
  return world;
}

export function snapshot(world) {
  return JSON.stringify({ version: world.version, modelVersion: world.modelVersion, seed: world.seed, preset: world.preset, width: world.width, height: world.height, config: world.config, rules: world.rules, events: world.events, terminalTick: world.tick });
}

export function encodeExperiment(world) { return btoa(snapshot(world)); }

export function decodeExperiment(encoded) {
  if (typeof encoded !== "string" || encoded.length > 2_000_000) throw new TypeError("experiment encoding is not admitted");
  let parsed;
  try { parsed = JSON.parse(encoded.startsWith("{") ? encoded : atob(encoded)); } catch { throw new TypeError("experiment encoding is not admitted"); }
  return replay(parsed);
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
