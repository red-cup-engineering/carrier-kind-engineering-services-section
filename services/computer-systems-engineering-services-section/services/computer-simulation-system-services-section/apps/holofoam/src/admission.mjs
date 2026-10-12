/** Bounds shared by every route into an experiment: configuration and event admission. */
export const presets = {
  bloom: { label: "Bloom", population: 420, drag: 0.94, field: 0.13, cohesion: 0.016, mutation: 0.08 },
  tide: { label: "Tide", population: 620, drag: 0.91, field: 0.21, cohesion: 0.008, mutation: 0.14 },
  braid: { label: "Braid", population: 520, drag: 0.925, field: 0.18, cohesion: 0.028, mutation: 0.22 },
  ember: { label: "Ember", population: 360, drag: 0.88, field: 0.27, cohesion: 0.005, mutation: 0.31 },
};

export function presetNames() { return Object.keys(presets); }

/** Admit an experiment specification's seed, dimensions and configuration. */
export function admitSpec({ seed = 17, preset = "bloom", width = 1, height = 1, config: suppliedConfig } = {}) {
  if (!Number.isInteger(seed) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 16 || height > 16) throw new TypeError("experiment seed and dimensions are not admitted");
  const config = { ...(presets[preset] ?? presets.bloom), ...(suppliedConfig ?? {}) };
  const ranges = { drag: [.5, .999], field: [0, 1], cohesion: [0, .1], mutation: [0, 1] };
  if (!Number.isInteger(config.population) || config.population < 1 || config.population > 5_000 || Object.keys(suppliedConfig ?? {}).some((key) => !Object.hasOwn(presets.bloom, key)) || !Object.entries(ranges).every(([key, [low, high]]) => Number.isFinite(config[key]) && config[key] >= low && config[key] <= high)) throw new TypeError("experiment configuration is not admitted");
  return { seed, preset, width, height, config };
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

