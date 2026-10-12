import assert from "node:assert/strict";
import test from "node:test";
import { queryHistory } from "@red-cup-engineering/signcraft/history";
import { applyEvent, clearDerived, compileModel, createExperiment, decodeExperiment, encodeExperiment, loopCirculation, observeTick, potentialLoopIntegral, replay, sense, selectAction, snapshot, step, updateModel } from "../src/simulation.mjs";

test("the experiment is a SignCraft history; replay of it reproduces the organism field bit-identically", () => {
  const a = createExperiment({ seed: 81, preset: "braid" });
  step(a, 19); applyEvent(a, { kind: "rule", rule: "east", value: .12 }); step(a, 11);
  applyEvent(a, { kind: "mutate", lineage: 1, edge: "crowded" }); step(a, 3);
  const history = snapshot(a);
  assert.equal(history.kind, "signcraft.history");
  assert.equal(queryHistory(history, { predicate: "event" }).length, 2);
  assert.equal(queryHistory(history, { subject: "tick:19", predicate: "event" })[0].object.rule, "east");
  clearDerived();
  const b = replay(JSON.parse(JSON.stringify(history)));
  assert.equal(JSON.stringify([b.organisms, Array.from(b.signals), b.genomes]), JSON.stringify([a.organisms, Array.from(a.signals), a.genomes]));
  const c = decodeExperiment(encodeExperiment(a));
  assert.equal(JSON.stringify(c.organisms), JSON.stringify(a.organisms));
});

test("organism state is not written per tick: stepping adds nothing to the history", () => {
  const a = createExperiment({ seed: 3, config: { population: 5 } });
  const before = snapshot(a);
  step(a, 40);
  assert.equal(a.history, before);
  assert.equal(snapshot(a).revisions.length, before.revisions.length + 1);
});

test("replay rejects an unbounded terminal tick and a forged history", () => {
  const a = createExperiment({ seed: 1, config: { population: 1 } });
  assert.throws(() => observeTick(snapshot(a), Infinity), /not admitted/);
  assert.throws(() => replay({ kind: "signcraft.history", functionalPredicates: [], revisions: [] }), /not admitted/);
  const forged = JSON.parse(JSON.stringify(snapshot(a)));
  forged.revisions[0].cells[0].object.seed = 2;
  assert.throws(() => replay(forged), /not admitted/);
});

test("a directional rule causally changes dynamics under identical seed and input", () => {
  const a = createExperiment({ seed: 8 }); const b = createExperiment({ seed: 8 });
  applyEvent(b, { kind: "rule", rule: "east", value: 0 }); step(a, 30); step(b, 30);
  assert.notDeepEqual(a.organisms.map(({ x, y }) => [x, y]), b.organisms.map(({ x, y }) => [x, y]));
});

test("oriented local circulation reverses sign when loop orientation reverses", () => {
  const world = createExperiment();
  const forward = loopCirculation(world, .5, .5);
  assert.ok(Math.abs(forward) > 0);
  assert.ok(Math.abs(forward + loopCirculation(world, .5, .5, .08, -1)) < 1e-12);
  assert.ok(Math.abs(potentialLoopIntegral(.5, .5)) < 1e-12);
});

test("unknown local cues remain unknown and select exploration rather than absence policy", () => {
  const world = createExperiment({ seed: 4 });
  const lone = { ...world.organisms[0], x: .99, y: .99 };
  lone.sensors = { crowding: false, signal: true, favorableFlow: true };
  world.organisms = [lone];
  const model = updateModel(lone, sense(world, lone));
  assert.equal(model.crowding, "unknown");
  assert.equal(selectAction(model), "explore");
  assert.equal(selectAction(model, world.compiledModels[0] ?? compileModel(world.genomes[0])), "approach");
});

test("policies are settled by SignCraft: the four readings come off the settled valuation", () => {
  const actions = (edges) => { const t = compileModel({ id: "g", lineage: 0, parent: null, edges }).table; return [t[0].action, t[1].action, t[4].action, t[5].action]; };
  assert.deepEqual(actions({ flow: true, signal: false, crowded: true, mixed: false }), ["explore", "approach", "avoid", "inspect"]);
  const both = compileModel({ id: "g2", lineage: 0, parent: null, edges: { flow: true, signal: false, crowded: true, mixed: false } }).table[5];
  assert.deepEqual(both.values, ["approach-for", "approach-against"]);
  assert.equal(both.witnesses["approach-for"][0].rule, "g2-flow");
});

test("lineage mutation changes its compiled policy while a world rule leaves it fixed", () => {
  const world = createExperiment({ seed: 12 });
  step(world);
  const before = world.compiledModels[0].id;
  applyEvent(world, { kind: "rule", rule: "east", value: .02 });
  assert.equal(world.compiledModels[0].id, before);
  applyEvent(world, { kind: "mutate", lineage: 0, edge: "signal" });
  assert.notEqual(world.compiledModels[0].id, before);
});

test("painted barriers reverse organisms that enter their occupied field", () => {
  const world = createExperiment({ seed: 12 });
  world.organisms = [world.organisms[0]];
  Object.assign(world.organisms[0], { x: .5, y: .5, vx: .01, vy: 0 });
  applyEvent(world, { kind: "barrier", x: .51, y: .5, radius: .08, erase: false });
  step(world);
  assert.ok(world.organisms[0].vx < 0);
});

test("configuration admission rejects nonfinite or unsupported dynamics before allocation", () => {
  assert.throws(() => createExperiment({ config: { population: 5, drag: 1e300 } }), /not admitted/);
  assert.throws(() => createExperiment({ config: { population: 5, unknown: 1 } }), /not admitted/);
});
