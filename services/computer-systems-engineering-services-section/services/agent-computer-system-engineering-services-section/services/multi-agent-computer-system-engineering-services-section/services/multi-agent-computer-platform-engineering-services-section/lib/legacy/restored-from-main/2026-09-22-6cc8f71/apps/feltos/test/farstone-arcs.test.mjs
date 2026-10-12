import assert from "node:assert/strict";
import test from "node:test";
import { composeCapabilities } from "../src/capabilities.mjs";
import { farstoneArcsCapability } from "../src/farstone-arcs.mjs";
import { createEngine, join, step, submit } from "../src/engine.mjs";
import { defineGame } from "../src/game.mjs";
import { value } from "../src/world.mjs";

const runtime = composeCapabilities([farstoneArcsCapability]);

function islandGame(assertions = []) {
  return defineGame({
    id: "feltos.island",
    name: "The Island",
    start: "downtown",
    capabilities: ["feltos.farstone-arcs"],
    rooms: {
      downtown: { name: "Downtown", description: "The civic blocks.", exits: { south: "marsh" } },
      marsh: { name: "The Salt Marsh", description: "Spartina and the clam bed.", exits: { north: "downtown" } },
    },
    things: {
      "coilin-vey": { name: "Coilin Vey", description: "Wants the dredge.", location: "downtown" },
      "brannaugh-ross": { name: "Brannaugh Ross", description: "Works the clam bed.", location: "marsh" },
    },
    assertions: [
      { subject: "downtown", predicate: "tag", object: "civic" },
      { subject: "marsh", predicate: "tag", object: "shellfish" },
      { subject: "the-dredging-permit", predicate: "decision-status", object: "contested" },
      ...assertions,
    ],
  });
}

function say(engine, actor, command) {
  engine = submit(engine, { actor, command });
  return step(engine, { runtime });
}

test("you can only petition at the civic office", () => {
  const engine = join(createEngine(islandGame()), "citizen", { at: "marsh" });
  const result = say(engine, "citizen", "petition brannaugh");
  assert.ok(result.receipt.events.some(({ text }) => text.includes("records clerk's office")));
  assert.equal(value(result.engine.world, "the-dredging-permit", "decision-status"), "contested", "the permit stays held");
});

test("petitioning for Brannaugh spares the clam bed and sours Coilin", () => {
  const engine = join(createEngine(islandGame()), "citizen", { at: "downtown" });
  const result = say(engine, "citizen", "petition brannaugh");
  assert.ok(result.receipt.events.some(({ text }) => text.includes("clam bed is spared")));
  assert.equal(value(result.engine.world, "the-dredging-permit", "decision-status"), "denied", "the world holds to the choice");
  assert.equal(value(result.engine.world, "marsh", "shellfish-closed"), null, "the bed is not fouled");
  assert.equal(value(result.engine.world, "coilin-vey", "embittered"), "true", "the loser bears a lasting grievance");
});

test("petitioning for Coilin cuts the channel and fouls the clam bed forever", () => {
  const engine = join(createEngine(islandGame()), "citizen", { at: "downtown" });
  const result = say(engine, "citizen", "petition coilin");
  assert.ok(result.receipt.events.some(({ text }) => text.includes("silt will choke the marsh clam bed")));
  assert.equal(value(result.engine.world, "the-dredging-permit", "decision-status"), "granted");
  assert.equal(value(result.engine.world, "marsh", "shellfish-closed"), "true", "the dredge fouled the bed");
  assert.ok(Number(value(result.engine.world, "marsh", "pollution")) >= 8, "silt loads the marsh");
  assert.equal(value(result.engine.world, "brannaugh-ross", "embittered"), "true");
});

test("once settled, the dispute stays settled — the world holds to it", () => {
  let engine = join(createEngine(islandGame()), "citizen", { at: "downtown" });
  engine = say(engine, "citizen", "petition coilin").engine;
  const result = say(engine, "citizen", "petition brannaugh");
  assert.ok(result.receipt.events.some(({ text }) => text.includes("already settled (granted)")), "you cannot re-litigate a decided permit");
});

test("Hydrant-23 is a contested top under a precautionary advisory until re-inspected, only from the civic office", () => {
  const game = islandGame([
    { subject: "the-world", predicate: "world-seed", object: 5 },
    { subject: "hydrant-23", predicate: "water-quality", object: "contested" },
    { subject: "hydrant-23", predicate: "advisory", object: "boil-water" },
  ]);

  let refused = say(join(createEngine(game), "clerk", { at: "marsh" }), "clerk", "audit hydrant-23");
  assert.ok(refused.receipt.events.some(({ text }) => text.includes("records clerk's office")));

  const settled = say(join(createEngine(game), "clerk", { at: "downtown" }), "clerk", "audit hydrant-23");
  assert.ok(settled.receipt.events.some(({ text }) => text.includes("re-inspection")), "the clerk dispatches a re-inspection");
  const status = value(settled.engine.world, "hydrant-23", "water-quality");
  assert.ok(status === "pass" || status === "fail", "the top resolves to a definite status, seeded and replay-exact");
  const advisory = value(settled.engine.world, "hydrant-23", "advisory");
  assert.equal(advisory, status === "pass" ? "clear" : "boil-water");

  const again = say(settled.engine, "clerk", "audit hydrant-23");
  assert.ok(again.receipt.events.some(({ text }) => text.includes("settled")), "a resolved hydrant needs no re-inspection");
});
