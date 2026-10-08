import assert from "node:assert/strict";
import test from "node:test";
import { checkpoint, CHECKPOINT_KIND, readingOf, restoreCheckpoint } from "../src/checkpoint.mjs";
import { applyEvent, clearDerived, createExperiment, step } from "../src/simulation.mjs";
import { executeOperation } from "../src/operations.mjs";

const organismsOf = (world) => JSON.stringify([world.organisms, Array.from(world.signals), world.barriers, world.rules, world.genomes]);

test("a checkpoint is a SignCraft history cut; its world is derived by replay and continues bit-identically", () => {
  const world = createExperiment({ seed: 4, config: { population: 2 } }); step(world, 3);
  applyEvent(world, { kind: "rule", rule: "east", value: .3 }); step(world, 2);
  const saved = checkpoint(world);
  assert.equal(saved.kind, CHECKPOINT_KIND);
  assert.equal(saved.history.kind, "signcraft.history");
  assert.equal("organisms" in saved, false);
  assert.equal(JSON.stringify(saved).includes("\"vx\""), false, "organism state is not written into the record");
  const wire = JSON.parse(JSON.stringify(saved));
  clearDerived();
  const replayed = restoreCheckpoint(wire);
  assert.equal(replayed.tick, 5);
  assert.equal(organismsOf(replayed), organismsOf(world));
  step(world, 4); step(replayed, 4);
  assert.equal(organismsOf(replayed), organismsOf(world));
  const compared = executeOperation("holofoam.fork-compare", { checkpoint: saved, count: 2 });
  assert.equal(compared.baseline.summary.tick, 7);
});

test("a checkpoint rejects tampered history, a wrong tick, and a foreign kind", () => {
  const world = createExperiment({ config: { population: 2 } }); step(world, 2); applyEvent(world, { kind: "select", id: 1 });
  const saved = JSON.parse(JSON.stringify(checkpoint(world)));
  assert.throws(() => restoreCheckpoint({ ...saved, kind: "other" }), /provenance/u);
  assert.throws(() => restoreCheckpoint({ ...saved, tick: 99 }), /tick/u);
  const tampered = structuredClone(saved);
  tampered.history.checkpoint.cells.find((at) => at.predicate === "event").object.id = 0;
  assert.throws(() => restoreCheckpoint(tampered), /not admitted|address/u);
  assert.equal(restoreCheckpoint(saved).selected, 1);
});

test("default population checkpoint preserves state and a 32-tick continuation", () => {
  const world = createExperiment({ seed: 9 }); step(world, 3); const saved = checkpoint(world);
  clearDerived(); const restored = restoreCheckpoint(saved);
  assert.deepEqual(readingOf(restored), readingOf(world)); step(world, 32); step(restored, 32);
  assert.equal(organismsOf(restored), organismsOf(world));
});

test("a v1 explicit current-state checkpoint is imported as the origin of a history", () => {
  const world = createExperiment({ seed: 5, config: { population: 3 } }); step(world, 4);
  const v1 = { kind: "holofoam.current-state/v1", provenance: "unverified-current-state", world: {
    version: 1, modelVersion: 1, seed: world.seed, preset: world.preset, width: world.width, height: world.height, tick: world.tick, paused: false,
    config: structuredClone(world.config), rules: structuredClone(world.rules), events: [], selected: null, signals: Array.from(world.signals), barriers: [], genomes: structuredClone(world.genomes), organisms: structuredClone(world.organisms),
  } };
  const imported = restoreCheckpoint(v1);
  assert.deepEqual(imported.organisms, world.organisms);
  const again = checkpoint(imported);
  clearDerived();
  const replayed = restoreCheckpoint(JSON.parse(JSON.stringify(again)));
  step(imported, 3); step(replayed, 3);
  assert.equal(organismsOf(replayed), organismsOf(imported));
  assert.deepEqual(replayed.organisms, (step(world, 3), world.organisms));
});
