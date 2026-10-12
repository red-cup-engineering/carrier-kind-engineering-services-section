import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, join, step, submit } from "../src/engine.mjs";
import { FARSTONE_CAPABILITY_IDS, farstoneGame, farstoneRuntime } from "../src/farstone-game.mjs";
import { value } from "../src/world.mjs";

function farstoneIsland() {
  return farstoneGame({
    id: "feltos.farstone",
    name: "Farstone",
    start: "downtown",
    rooms: {
      downtown: { name: "Downtown", description: "The civic blocks.", exits: { south: "marsh", sea: "grounds" } },
      marsh: { name: "The Salt Marsh", description: "Spartina and the clam bed.", exits: { north: "downtown" } },
      grounds: { name: "The Fishing Grounds", description: "Open water.", exits: { in: "downtown" } },
    },
    things: {
      "coilin-vey": { name: "Coilin Vey", description: "Wants the dredge.", location: "downtown" },
      "brannaugh-ross": { name: "Brannaugh Ross", description: "Works the clam bed.", location: "marsh" },
      "hydrant-23": { name: "Hydrant 23", description: "A civic fire hydrant.", location: "downtown" },
    },
    assertions: [
      { subject: "downtown", predicate: "tag", object: "civic" },
      { subject: "marsh", predicate: "tag", object: "shellfish" },
      { subject: "grounds", predicate: "tag", object: "ocean" },
    ],
  });
}

test("composing the shared clock/director with farstone-climate/arcs/depths claims no overlapping commands", () => {
  assert.deepEqual(FARSTONE_CAPABILITY_IDS, ["feltos.world-clock", "feltos.director", "feltos.farstone-climate", "feltos.farstone-arcs", "feltos.depths"]);
  assert.deepEqual([...farstoneRuntime.commands].sort(), ["almanac", "audit", "give", "inspect", "petition", "recheck", "reinspect"]);
});

test("the off-season situation is seeded once, only for the cast the bible actually contains", () => {
  const engine = createEngine(farstoneIsland());
  assert.equal(value(engine.world, "the-dredging-permit", "decision-status"), "contested");
  assert.equal(value(engine.world, "coilin-vey", "belief:dredging-permit"), "stable");
  assert.equal(value(engine.world, "brannaugh-ross", "belief:dredging-permit"), "stable");
  // hydrant-23 is present in this bible (declared via assertions), so its dispute is seeded too.
  assert.equal(value(engine.world, "hydrant-23", "water-quality"), "contested");
  assert.equal(value(engine.world, "hydrant-23", "advisory"), "boil-water");
});

test("a defined-but-absent cast member's belief is never seeded", () => {
  const bare = farstoneGame({
    id: "feltos.farstone-bare",
    name: "Farstone (bare)",
    start: "downtown",
    rooms: { downtown: { name: "Downtown", description: "Empty streets.", exits: {} } },
  });
  const engine = createEngine(bare);
  assert.equal(value(engine.world, "the-dredging-permit", "decision-status"), "contested", "the standing dispute is always seeded");
  assert.equal(value(engine.world, "coilin-vey", "belief:dredging-permit"), null, "an absent fisher gets no belief cell");
  assert.equal(value(engine.world, "hydrant-23", "water-quality"), null, "an absent hydrant gets no dispute");
});

test("the composed engine steps cleanly across many ticks, and both arcs are playable end to end", () => {
  let engine = join(createEngine(farstoneIsland()), "citizen", { at: "downtown" });
  for (let i = 0; i < 30; i += 1) engine = step(engine, { runtime: farstoneRuntime }).engine;
  assert.equal(Number(value(engine.world, "feltos:clock", "world-time")), 30, "the shared clock advances every tick under the composed runtime");

  engine = submit(engine, { actor: "citizen", command: "petition coilin" });
  let result = step(engine, { runtime: farstoneRuntime });
  engine = result.engine;
  assert.ok(result.receipt.events.some(({ text }) => text.includes("silt will choke the marsh clam bed")));
  assert.equal(value(engine.world, "the-dredging-permit", "decision-status"), "granted");
  assert.equal(value(engine.world, "marsh", "shellfish-closed"), "true");

  engine = submit(engine, { actor: "citizen", command: "audit hydrant-23" });
  result = step(engine, { runtime: farstoneRuntime });
  assert.ok(result.receipt.events.some(({ text }) => text.includes("re-inspection")));
});
