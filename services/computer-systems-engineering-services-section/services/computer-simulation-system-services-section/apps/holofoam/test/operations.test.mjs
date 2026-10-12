import assert from "node:assert/strict";
import test from "node:test";
import { checkpointHistory } from "@red-cup-engineering/signcraft/history";
import { executeOperation, operations } from "../src/operations.mjs";
import { checkpoint, CHECKPOINT_KIND } from "../src/checkpoint.mjs";
import { createExperiment, observeTick, step } from "../src/simulation.mjs";

test("one public registry exposes the admitted experiment actions", () => {
  assert.deepEqual(Object.values(operations).map(({ id }) => id), ["holofoam.admit", "holofoam.step", "holofoam.observe", "holofoam.intervene", "holofoam.fork-compare"]);
});

test("admit, intervene, step, and observe use replayable SignCraft-history experiment state", () => {
  const admitted = executeOperation("holofoam.admit", { spec: { seed: 4, preset: "bloom" } });
  const intervened = executeOperation("holofoam.intervene", { experiment: admitted.experiment, event: { kind: "rule", rule: "east", value: 0.2 } });
  const advanced = executeOperation("holofoam.step", { experiment: intervened.experiment, count: 3 });
  const observed = executeOperation("holofoam.observe", { experiment: advanced.experiment, organismId: 0 });
  assert.equal(advanced.summary.tick, 3);
  assert.equal(observed.organism.id, 0);
  assert.equal(JSON.stringify(advanced.experiment).includes("Float32Array"), false);
  assert.equal(advanced.experiment.kind, "signcraft.history");
  assert.equal(advanced.provenance, "history");
});

test("fork comparison replays the same admitted base into distinct terminal summaries", () => {
  const admitted = executeOperation("holofoam.admit", { spec: { seed: 12, preset: "ember" } });
  const compared = executeOperation("holofoam.fork-compare", {
    experiment: admitted.experiment,
    count: 2,
    variationEvent: { kind: "pulse", x: .5, y: .5, radius: .2, force: .03 },
  });
  assert.equal(compared.baseline.summary.tick, 2);
  assert.equal(compared.variation.summary.tick, 2);
  assert.equal(compared.baseline.summary.events, 0);
  assert.equal(compared.variation.summary.events, 1);
  assert.ok(compared.comparison.meanDisplacement >= 0);
  assert.equal(compared.comparison.genomeState, "held");
});

test("operations reject expensive population, replay, and tick inputs before running", () => {
  assert.throws(() => executeOperation("holofoam.admit", { spec: { config: { population: 1001 } } }), /operation budget/u);
  const admitted = executeOperation("holofoam.admit", { spec: { seed: 1 } });
  assert.throws(() => executeOperation("holofoam.step", { experiment: observeTick(admitted.experiment, 2049), count: 1 }), /operation budget/u);
  assert.throws(() => executeOperation("holofoam.step", { experiment: admitted.experiment, count: 257 }), /256/u);
});

test("operations preflight cumulative organism work and distinguish policy mutation from observation", () => {
  const costly = observeTick(executeOperation("holofoam.admit", { spec: { seed: 1, config: { population: 1000 } } }).experiment, 100);
  assert.throws(() => executeOperation("holofoam.step", { experiment: costly, count: 1 }), /work budget/u);
  const admitted = executeOperation("holofoam.admit", { spec: { seed: 2, config: { population: 2 } } });
  const compared = executeOperation("holofoam.fork-compare", { experiment: admitted.experiment, count: 1, variationEvent: { kind: "mutate", lineage: 0, edge: "signal" } });
  assert.equal(compared.comparison.genomeState, "changed");
  assert.equal(compared.comparison.policyState, "changed");
  const observed = executeOperation("holofoam.observe", { experiment: admitted.experiment, organismId: 0 });
  assert.equal(observed.organism.compiledPolicy.id, "lineage-0-base");
});


test("checkpoint state is described, unambiguous, and never re-emitted as seed history", () => {
  for (const descriptor of Object.values(operations)) assert.ok("checkpoint" in descriptor.inputSchema.properties);
  const admitted = executeOperation("holofoam.admit", { spec: { config: { population: 2 } } });
  const fromCheckpoint = executeOperation("holofoam.admit", { checkpoint: admitted.checkpoint });
  assert.equal("experiment" in fromCheckpoint, false);
  const stepped = executeOperation("holofoam.step", { checkpoint: fromCheckpoint.checkpoint, count: 1 });
  const observed = executeOperation("holofoam.observe", { checkpoint: stepped.checkpoint });
  const intervened = executeOperation("holofoam.intervene", { checkpoint: stepped.checkpoint, event: { kind: "select", id: 0 } });
  const forked = executeOperation("holofoam.fork-compare", { checkpoint: intervened.checkpoint, count: 1 });
  assert.equal(observed.organism.id, 0); assert.equal("experiment" in stepped, false); assert.equal("experiment" in intervened, false); assert.equal("experiment" in forked.baseline, false);
  assert.throws(() => executeOperation("holofoam.step", { checkpoint: stepped.checkpoint, experiment: admitted.experiment, count: 1 }), /one state/u);
});


test("explicit checkpoint operations force paused worlds and enforce bounded unambiguous continuation", () => {
  const admitted = executeOperation("holofoam.admit", { spec: { config: { population: 2 } } }); const paused = structuredClone(admitted.checkpoint); paused.paused = true;
  assert.equal(executeOperation("holofoam.step", { checkpoint: paused, count: 1 }).summary.tick, 1);
  assert.throws(() => executeOperation("holofoam.admit", { spec: {}, checkpoint: paused }), /one state/u);
  assert.throws(() => executeOperation("holofoam.admit", { spec: {}, experiment: admitted.experiment }), /one state/u);
  assert.throws(() => executeOperation("holofoam.step", { checkpoint: paused, experiment: admitted.experiment, count: 1 }), /one state/u);
  const costly = executeOperation("holofoam.admit", { spec: { config: { population: 1000 } } }).checkpoint;
  assert.throws(() => executeOperation("holofoam.fork-compare", { checkpoint: costly, count: 101 }), /work budget/u);
  assert.ok(operations.forkCompare.inputSchema.oneOf);
});

test("long-lived paused checkpoints continue through every public operation within bounded work", () => {
  const world = createExperiment({ config: { population: 2 } }); for (let tick = 0; tick < 10_001; tick += 1) step(world); world.paused = true;
  const saved = checkpoint(world);
  const fromCheckpoint = executeOperation("holofoam.admit", { checkpoint: saved });
  const advanced = executeOperation("holofoam.step", { checkpoint: fromCheckpoint.checkpoint, count: 1 });
  const observed = executeOperation("holofoam.observe", { checkpoint: advanced.checkpoint, organismId: 0 });
  const intervened = executeOperation("holofoam.intervene", { checkpoint: advanced.checkpoint, event: { kind: "select", id: 0 } });
  const forked = executeOperation("holofoam.fork-compare", { checkpoint: intervened.checkpoint, count: 1 });
  assert.equal(fromCheckpoint.summary.tick, 10_001);
  assert.equal(advanced.summary.tick, 10_002);
  assert.equal(observed.organism.id, 0);
  assert.equal(intervened.summary.selected, 0);
  assert.equal(forked.baseline.summary.tick, 10_003);
  assert.equal(forked.variation.summary.tick, 10_003);
  assert.equal(forked.fork.baseline, forked.fork.variation);
});

test("checkpoint continuation refuses to cross the restorable tick bound before replaying anything", () => {
  const admitted = executeOperation("holofoam.admit", { spec: { config: { population: 2 } } });
  const history = checkpointHistory(observeTick(admitted.checkpoint.history, 1_000_000));
  const atLimit = { kind: CHECKPOINT_KIND, provenance: "history", tick: 1_000_000, paused: false, history };
  assert.throws(() => executeOperation("holofoam.step", { checkpoint: atLimit, count: 1 }), /checkpoint continuation/u);
  assert.throws(() => executeOperation("holofoam.fork-compare", { checkpoint: atLimit, count: 1 }), /checkpoint continuation/u);
});
