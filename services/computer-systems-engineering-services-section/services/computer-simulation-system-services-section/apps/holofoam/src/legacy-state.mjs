/** Admission of the v1 explicit current-state checkpoint, kept so v1 documents remain readable. A v1 state is imported as the origin of a v2 history. */
import { admitEvent, admitSpec } from "./admission.mjs";

export const LEGACY_CHECKPOINT_KIND = "holofoam.current-state/v1";
const SIGNAL_CELLS = 24 * 24;
const MAX_POPULATION = 1_000;
export const MAX_CHECKPOINT_TICK = 1_000_000;
const EDGE_NAMES = new Set(["flow", "signal", "crowded", "mixed"]);

function record(value, label) { if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`); return value; }
function finite(value, label, low = -Infinity, high = Infinity) { if (!Number.isFinite(value) || value < low || value > high) throw new TypeError(`${label} is not admitted`); return value; }
function integer(value, label, low = -Infinity, high = Infinity) { if (!Number.isInteger(value) || value < low || value > high) throw new TypeError(`${label} is not admitted`); return value; }
function clone(value) { return structuredClone(value); }

function cue(value, label) { if (!["present", "absent", "unknown"].includes(value)) throw new TypeError(`${label} is not admitted`); return value; }
function crowding(value, label) { if (value === "unknown") return value; const input = record(value, label); return { same: integer(input.same, `${label} same`, 0, MAX_POPULATION), other: integer(input.other, `${label} other`, 0, MAX_POPULATION) }; }
function observation(value) { const input = record(value, "model observation"); return { tick: integer(input.tick, "model observation tick", 0, MAX_CHECKPOINT_TICK), favorableFlow: cue(input.favorableFlow, "model favorable flow"), crowding: crowding(input.crowding, "model crowding"), signal: cue(input.signal, "model signal"), flow: { x: finite(input.flow?.x, "model flow x", -1, 1), y: finite(input.flow?.y, "model flow y", -1, 1) }, steering: { x: finite(input.steering?.x, "model steering x", -120, 120), y: finite(input.steering?.y, "model steering y", -120, 120) } }; }
function model(value) {
  const input = record(value, "organism model");
  if (!Array.isArray(input.observations) || !Array.isArray(input.witnesses) || input.observations.length > 4 || input.witnesses.length > 12 || !["explore", "approach", "avoid", "inspect"].includes(input.action)) throw new TypeError("organism model is not admitted");
  return { observations: input.observations.map(observation), witnesses: input.witnesses.map((witness) => { const item = record(witness, "model witness"); return { tick: integer(item.tick, "model witness tick", 0, MAX_CHECKPOINT_TICK), favorableFlow: cue(item.favorableFlow, "witness favorable flow"), crowding: crowding(item.crowding, "witness crowding"), signal: cue(item.signal, "witness signal") }; }), favorableFlow: cue(input.favorableFlow, "model favorable flow"), crowding: crowding(input.crowding, "model crowding"), signal: cue(input.signal, "model signal"), mixed: input.mixed === undefined ? false : typeof input.mixed === "boolean" ? input.mixed : (() => { throw new TypeError("model mixed is not admitted"); })(), flow: finite(input.flow, "model flow", 0, 2), action: input.action };
}

function genome(value, index) {
  const input = record(value, "genome");
  if (typeof input.id !== "string" || input.id.length === 0 || integer(input.lineage, "genome lineage", 0, 2) !== index || !(input.parent === null || typeof input.parent === "string")) throw new TypeError("genome is not admitted");
  const edges = record(input.edges, "genome edges");
  if (Object.keys(edges).length !== EDGE_NAMES.size || [...EDGE_NAMES].some((key) => typeof edges[key] !== "boolean")) throw new TypeError("genome edges are not admitted");
  return { id: input.id, lineage: input.lineage, parent: input.parent, edges: { ...edges } };
}

function organism(value, index, width, height) {
  const input = record(value, "organism");
  if (integer(input.id, "organism id", 0, MAX_POPULATION - 1) !== index || integer(input.lineage, "organism lineage", 0, 2) < 0 || typeof input.modelId !== "string" || !record(input.sensors, "organism sensors")) throw new TypeError("organism is not admitted");
  for (const key of ["x", "y", "vx", "vy", "heading", "hue", "trait", "energy"]) finite(input[key], `organism ${key}`, -1000, 1000);
  if (input.x < 0 || input.x >= width || input.y < 0 || input.y >= height || input.energy < 0 || input.energy > 1 || ["crowding", "signal", "favorableFlow"].some((key) => typeof input.sensors[key] !== "boolean")) throw new TypeError("organism bounds are not admitted");
  return { ...clone(input), model: model(input.model), sensors: { ...input.sensors } };
}

export function admitLegacyCheckpoint(value) {
  const input = record(value, "checkpoint");
  if (input.kind !== LEGACY_CHECKPOINT_KIND || input.provenance !== "unverified-current-state") throw new TypeError("checkpoint provenance is not admitted");
  const state = record(input.world, "checkpoint world");
  const width = finite(state.width, "checkpoint width", Number.MIN_VALUE, 16); const height = finite(state.height, "checkpoint height", Number.MIN_VALUE, 16);
  if (integer(state.version, "checkpoint version", 1, 1) !== 1 || integer(state.modelVersion, "checkpoint model version", 1, 1) !== 1 || !Number.isInteger(state.seed) || typeof state.preset !== "string" || typeof state.paused !== "boolean" || integer(state.tick, "checkpoint tick", 0, MAX_CHECKPOINT_TICK) < 0) throw new TypeError("checkpoint header is not admitted");
  const config = record(state.config, "checkpoint config");
  if (integer(config.population, "checkpoint population", 1, MAX_POPULATION) < 1) throw new TypeError("checkpoint config is not admitted");
  let admittedConfig;
  try { admittedConfig = admitSpec({ seed: state.seed, preset: state.preset, width, height, config }).config; }
  catch { throw new TypeError("checkpoint config is not admitted"); }
  const rules = record(state.rules, "checkpoint rules");
  for (const rule of ["east", "north", "whirl", "porous"]) admitEvent({ kind: "rule", rule, value: rules[rule] }, state.tick);
  if (!Array.isArray(state.signals) || state.signals.length !== SIGNAL_CELLS || state.signals.some((signal) => !Number.isFinite(signal) || !Number.isFinite(Math.fround(signal)))) throw new TypeError("checkpoint signal grid is not admitted");
  if (!Array.isArray(state.genomes) || state.genomes.length !== 3 || !Array.isArray(state.organisms) || state.organisms.length !== config.population || !Array.isArray(state.events) || state.events.length > 2_048 || !Array.isArray(state.barriers) || state.barriers.length > 256) throw new TypeError("checkpoint collections are not admitted");
  const genomes = state.genomes.map(genome);
  const organisms = state.organisms.map((entry, index) => organism(entry, index, width, height));
  for (const entry of organisms) if (entry.modelId !== genomes[entry.lineage].id) throw new TypeError("organism model id is not admitted");
  let previousEventTick = 0;
  const events = state.events.map((entry) => { const item = admitEvent(entry, entry?.tick); if (item.tick < previousEventTick || item.tick > state.tick) throw new TypeError("checkpoint event order is not admitted"); previousEventTick = item.tick; return item; });
  const barriers = state.barriers.map((entry) => { const item = record(entry, "barrier"); finite(item.x, "barrier x", 0, Math.max(0, width - Number.EPSILON)); finite(item.y, "barrier y", 0, Math.max(0, height - Number.EPSILON)); finite(item.radius, "barrier radius", .01, .25); if (typeof item.erase !== "boolean" || !Number.isInteger(item.tick) || item.tick < 0 || item.tick > state.tick) throw new TypeError("barrier is not admitted"); return clone(item); });
  if (!(state.selected === null || integer(state.selected, "selected organism", 0, organisms.length - 1) >= 0)) throw new TypeError("selected organism is not admitted");
  return { version: 1, modelVersion: 1, seed: state.seed, preset: state.preset, width, height, tick: state.tick, paused: state.paused, config: clone(admittedConfig), rules: clone(rules), events, selected: state.selected, signals: Array.from(state.signals), barriers, genomes, organisms };
}
