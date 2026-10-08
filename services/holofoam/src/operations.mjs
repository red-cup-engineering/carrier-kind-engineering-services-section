/** JSON-safe Holofoam action registry shared by browser and headless callers. */
import { applyEvent, compileModel, createExperiment, describeHistory, isDerived, rememberDerived, replay, snapshot, step } from "./simulation.mjs";
import { checkpoint, MAX_CHECKPOINT_TICK, readingOf, restoreCheckpoint } from "./checkpoint.mjs";

const MAX_POPULATION = 1_000;
const MAX_REPLAY_TICKS = 2_048;
const MAX_ACTION_TICKS = 256;
const MAX_ORGANISM_TICKS = 100_000;
const MAX_REPLAY_PREFIX_ORGANISM_TICKS = 8_000_000;

function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

// An experiment is a shared SignCraft history, bounded by what it declares before any of it is replayed.
function withinBudget(experiment, additionalTicks = 0, copies = 1) {
  const described = describeHistory(experiment);
  const population = described.definition.config?.population ?? MAX_POPULATION;
  if (!Number.isInteger(population) || population < 1 || population > MAX_POPULATION) throw new TypeError("experiment population exceeds the operation budget");
  if (described.terminalTick > MAX_REPLAY_TICKS) throw new TypeError("experiment terminal tick exceeds the operation budget");
  if (described.events.length > MAX_REPLAY_TICKS) throw new TypeError("experiment event count exceeds the operation budget");
  if (!Number.isInteger(additionalTicks) || additionalTicks < 0 || population * (described.terminalTick + additionalTicks) * copies > MAX_ORGANISM_TICKS) throw new TypeError("experiment replay exceeds the operation work budget");
  return described.history;
}

function restore(experiment, additionalTicks = 0) { return replay(withinBudget(experiment, additionalTicks)); }

// A checkpoint is bounded by its declared tick and population before it is replayed; a derived prefix costs nothing again.
function restoreWithinBudget(value, additionalTicks, copies = 1) {
  const described = describeHistory(value?.history);
  const population = described.definition.config?.population ?? MAX_POPULATION;
  if (described.terminalTick + additionalTicks > MAX_CHECKPOINT_TICK || population * additionalTicks * copies > MAX_ORGANISM_TICKS) throw new TypeError("checkpoint continuation exceeds the operation work budget");
  if (!isDerived(described.history) && population * described.terminalTick > MAX_REPLAY_PREFIX_ORGANISM_TICKS) throw new TypeError("checkpoint continuation exceeds the operation work budget");
  return restoreCheckpoint(value);
}

const encode = snapshot;

function summary(world) {
  const energy = world.organisms.reduce((sum, organism) => sum + organism.energy, 0);
  return Object.freeze({
    tick: world.tick,
    organisms: world.organisms.length,
    meanEnergy: world.organisms.length === 0 ? 0 : energy / world.organisms.length,
    selected: world.selected,
    events: world.events.length,
  });
}

function count(value) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_ACTION_TICKS) throw new TypeError(`count must be an integer from 1 through ${MAX_ACTION_TICKS}`);
  return value;
}

function admittedWorld(input, additionalTicks = 0) {
  const hasCheckpoint = input.checkpoint !== undefined; const hasExperiment = input.experiment !== undefined; const hasSpec = input.spec !== undefined;
  if ([hasCheckpoint, hasExperiment, hasSpec].filter(Boolean).length > 1) throw new TypeError("input must carry one state representation");
  if (hasCheckpoint) {
    const world = restoreWithinBudget(input.checkpoint, additionalTicks);
    return Object.freeze({ world, seedHistory: false });
  }
  if (hasExperiment) return Object.freeze({ world: restore(input.experiment, additionalTicks), seedHistory: true });
  if (input.spec === undefined) throw new TypeError("input must carry spec, experiment, or checkpoint");
  const spec = record(input.spec, "spec"); const population = spec.config?.population;
  if (population !== undefined && (!Number.isInteger(population) || population < 1 || population > MAX_POPULATION)) throw new TypeError("experiment population exceeds the operation budget");
  return Object.freeze({ world: createExperiment(spec), seedHistory: true });
}

function stateOutput(world, seedHistory) { return Object.freeze({ ...(seedHistory ? { experiment: encode(world) } : {}), provenance: "history", checkpoint: checkpoint(world), summary: summary(world) }); }

function admittedEvent(world, event) {
  return applyEvent(world, record(event, "event"));
}

function toroidalDistance(left, right, width, height) {
  const dx = Math.abs(left.x - right.x); const dy = Math.abs(left.y - right.y);
  return Math.hypot(Math.min(dx, width - dx), Math.min(dy, height - dy));
}

function compareWorlds(baseline, variation) {
  let displacement = 0;
  let energyDelta = 0;
  const changedActions = [];
  let observationChanged = false;
  let policyChanged = false;
  for (const organism of baseline.organisms) {
    const other = variation.organisms[organism.id];
    displacement += toroidalDistance(organism, other, baseline.width, baseline.height);
    energyDelta += other.energy - organism.energy;
    if (organism.model.action !== other.model.action && changedActions.length < 64) changedActions.push(organism.id);
    if (JSON.stringify(organism.model) !== JSON.stringify(other.model)) observationChanged = true;
    if (organism.modelId !== other.modelId) policyChanged = true;
  }
  const genomeChanged = JSON.stringify(baseline.genomes) !== JSON.stringify(variation.genomes);
  const selected = baseline.selected ?? variation.selected;
  const selectedObservations = selected === null ? null : Object.freeze({
    id: selected,
    baseline: structuredClone(baseline.organisms[selected]?.model.witnesses.at(-1) ?? null),
    variation: structuredClone(variation.organisms[selected]?.model.witnesses.at(-1) ?? null),
  });
  return Object.freeze({
    changedActions: Object.freeze(changedActions),
    changedActionCount: baseline.organisms.filter((organism) => organism.model.action !== variation.organisms[organism.id].model.action).length,
    meanDisplacement: displacement / baseline.organisms.length,
    deltaMeanEnergy: energyDelta / baseline.organisms.length,
    selectedObservations,
    observationState: observationChanged ? "changed" : "held",
    policyState: policyChanged ? "changed" : "held",
    genomeState: genomeChanged ? "changed" : "held",
  });
}

export const operations = Object.freeze({
  admit: Object.freeze({
    id: "holofoam.admit",
    description: "Admit a replayable bounded Holofoam experiment from a specification or snapshot.",
    inputSchema: Object.freeze({ type: "object", properties: { spec: { type: "object" }, experiment: {}, checkpoint: {} }, oneOf: [{ required: ["spec"] }, { required: ["experiment"] }, { required: ["checkpoint"] }], additionalProperties: false }),
    execute(input = {}) {
      const admitted = admittedWorld(record(input, "input"));
      return stateOutput(admitted.world, admitted.seedHistory);
    },
  }),
  step: Object.freeze({
    id: "holofoam.step",
    description: "Advance an admitted Holofoam experiment by a bounded number of ticks.",
    inputSchema: Object.freeze({ type: "object", properties: { experiment: {}, checkpoint: {}, count: { type: "integer", minimum: 1, maximum: MAX_ACTION_TICKS } }, oneOf: [{ required: ["experiment"] }, { required: ["checkpoint"] }], additionalProperties: false }),
    execute(input = {}) {
      const frames = count(input.count ?? 1);
      const admitted = admittedWorld(record(input, "input"), frames);
      step(admitted.world, frames, { force: true });
      return stateOutput(admitted.world, admitted.seedHistory);
    },
  }),
  observe: Object.freeze({
    id: "holofoam.observe",
    description: "Observe one organism's local action, model, and compiled policy table from an admitted experiment.",
    inputSchema: Object.freeze({ type: "object", properties: { experiment: {}, checkpoint: {}, organismId: { type: "integer", minimum: 0 } }, oneOf: [{ required: ["experiment"] }, { required: ["checkpoint"] }], additionalProperties: false }),
    execute(input = {}) {
      const admitted = admittedWorld(record(input, "input"));
      const world = admitted.world;
      const organismId = input.organismId ?? world.selected ?? 0;
      if (!Number.isInteger(organismId) || organismId < 0 || organismId >= world.organisms.length) throw new TypeError("organismId is not admitted");
      const organism = world.organisms[organismId];
      return Object.freeze({
        summary: summary(world),
        organism: Object.freeze({ id: organism.id, lineage: organism.lineage, energy: organism.energy, action: organism.model.action, model: structuredClone(organism.model), compiledPolicy: structuredClone(compileModel(world.genomes[organism.lineage])) }),
      });
    },
  }),
  intervene: Object.freeze({
    id: "holofoam.intervene",
    description: "Apply one admitted event to a replayable Holofoam experiment.",
    inputSchema: Object.freeze({ type: "object", required: ["event"], properties: { experiment: {}, checkpoint: {}, event: { type: "object" } }, oneOf: [{ required: ["experiment"] }, { required: ["checkpoint"] }], additionalProperties: false }),
    execute(input = {}) {
      const admitted = admittedWorld(record(input, "input"));
      admittedEvent(admitted.world, input.event);
      return stateOutput(admitted.world, admitted.seedHistory);
    },
  }),
  forkCompare: Object.freeze({
    id: "holofoam.fork-compare",
    description: "Fork an admitted experiment, run baseline and variation, and return bounded causal differences.",
    inputSchema: Object.freeze({ type: "object", properties: { experiment: {}, checkpoint: {}, count: { type: "integer", minimum: 1, maximum: MAX_ACTION_TICKS }, baselineEvent: { type: "object" }, variationEvent: { type: "object" } }, oneOf: [{ required: ["experiment"] }, { required: ["checkpoint"] }], additionalProperties: false }),
    execute(input = {}) {
      const inputValue = record(input, "input");
      if ([inputValue.checkpoint !== undefined, inputValue.experiment !== undefined, inputValue.spec !== undefined].filter(Boolean).length !== 1) throw new TypeError("input must carry one state representation");
      const frames = count(input.count ?? 1);
      // One history, cut once: both continuations are derived from it, differing only in the interventions observed into them.
      const fromCheckpoint = inputValue.checkpoint !== undefined;
      const origin = fromCheckpoint ? restoreWithinBudget(inputValue.checkpoint, frames, 2) : replay(withinBudget(inputValue.experiment, frames, 2));
      const cut = rememberDerived(origin);
      const run = (event) => {
        const world = replay(cut);
        if (event !== undefined) admittedEvent(world, event);
        step(world, frames, { force: true });
        return Object.freeze({ world, result: Object.freeze({ ...(fromCheckpoint ? {} : { experiment: encode(world) }), checkpoint: Object.freeze({ ...checkpoint(world), reading: readingOf(world) }), provenance: "history", summary: summary(world) }) });
      };
      const baseline = run(input.baselineEvent);
      const variation = run(input.variationEvent);
      return Object.freeze({ baseline: baseline.result, variation: variation.result, comparison: compareWorlds(baseline.world, variation.world), fork: Object.freeze({ from: describeHistory(cut).address, baseline: describeHistory(baseline.world.history).address, variation: describeHistory(variation.world.history).address }) });
    },
  }),
});

export function executeOperation(id, input) {
  const operation = Object.values(operations).find((candidate) => candidate.id === id);
  if (operation === undefined) throw new TypeError(`unknown Holofoam operation: ${id}`);
  return operation.execute(input);
}
