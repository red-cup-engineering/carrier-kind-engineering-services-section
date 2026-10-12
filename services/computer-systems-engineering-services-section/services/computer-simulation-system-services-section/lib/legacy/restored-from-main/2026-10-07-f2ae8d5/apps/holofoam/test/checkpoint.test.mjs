import assert from "node:assert/strict";
import test from "node:test";
import { checkpoint, restoreCheckpoint } from "../src/checkpoint.mjs";
import { createExperiment, step } from "../src/simulation.mjs";
import { executeOperation } from "../src/operations.mjs";

test("current-state checkpoint restores exact bounded continuation without claiming seed verification", () => {
  const world = createExperiment({ seed: 4, config: { population: 2 } }); step(world, 3);
  const saved = checkpoint(world);
  assert.equal(saved.provenance, "unverified-current-state");
  const restored = restoreCheckpoint(saved); step(world, 2); step(restored, 2);
  assert.deepEqual(checkpoint(restored).world.organisms, checkpoint(world).world.organisms);
  const compared = executeOperation("holofoam.fork-compare", { checkpoint: saved, count: 2 });
  assert.equal(compared.baseline.summary.tick, 5);
});

test("current-state checkpoint rejects malformed signal, identifiers, and genome-model links", () => {
  const saved = structuredClone(checkpoint(createExperiment({ config: { population: 2 } })));
  saved.world.signals.pop(); assert.throws(() => restoreCheckpoint(saved), /signal grid/u);
  const badId = structuredClone(checkpoint(createExperiment({ config: { population: 2 } }))); badId.world.organisms[1].id = 0; assert.throws(() => restoreCheckpoint(badId), /organism/u);
  const badModel = structuredClone(checkpoint(createExperiment({ config: { population: 2 } }))); badModel.world.organisms[0].modelId = "wrong"; assert.throws(() => restoreCheckpoint(badModel), /model id/u);
});


test("default population checkpoint preserves current state and 32-tick continuation", () => {
  const world = createExperiment({ seed: 9 }); step(world, 3); const saved = checkpoint(world); const restored = restoreCheckpoint(saved);
  assert.deepEqual(checkpoint(restored).world, saved.world); step(world, 32); step(restored, 32);
  assert.deepEqual(checkpoint(restored).world, checkpoint(world).world);
});
