import assert from "node:assert/strict";
import test from "node:test";
import { composeCapabilities } from "../src/capabilities.mjs";
import { farstoneClimateCapability } from "../src/farstone-climate.mjs";
import { createEngine, join, step, submit } from "../src/engine.mjs";
import { defineGame } from "../src/game.mjs";
import { CLOCK, SEASON_LENGTH } from "../src/world-clock.mjs";
import { value } from "../src/world.mjs";

const runtime = composeCapabilities([farstoneClimateCapability]);

function harborGame(assertions = []) {
  return defineGame({
    id: "feltos.harbor-climate",
    name: "The Harbor",
    start: "quay",
    capabilities: ["feltos.farstone-climate"],
    rooms: {
      quay: { name: "The Quay", description: "Granite and tar.", exits: {} },
      marsh: { name: "The Salt Marsh", description: "Spartina and tidal mud.", exits: {} },
    },
    things: {
      greer: { name: "Greer Tenn", description: "A fishwife.", location: "quay" },
      "the-ferry": { name: "the ferry", description: "The morning boat.", location: "quay" },
    },
    assertions: [
      { subject: "quay", predicate: "tag", object: "harbor" },
      { subject: "quay", predicate: "tag", object: "outdoor" },
      { subject: "marsh", predicate: "tag", object: "marsh" },
      { subject: "marsh", predicate: "tag", object: "shellfish" },
      { subject: "the-ferry", predicate: "tag", object: "ferry" },
      { subject: "greer", predicate: "tag", object: "shopkeeper" },
      ...assertions,
    ],
  });
}

function tick(engine) {
  return step(engine, { runtime });
}

test("a storm closes the harbor and cancels the ferry; clearing reopens it", () => {
  // world-time 1 → next tick is 2, mid-phase (PHASE_LENGTH=6), so the weather we set is not rerolled.
  const storming = harborGame([
    { subject: CLOCK, predicate: "world-time", object: 1 },
    { subject: CLOCK, predicate: "farstone-weather", object: "storm" },
  ]);
  const closed = tick(join(createEngine(storming), "alice")).engine;
  assert.equal(value(closed.world, CLOCK, "harbor-closed"), "true", "the storm shut the harbor");
  assert.equal(value(closed.world, "the-ferry", "sailing"), "cancelled", "the cascade cancelled the ferry");

  const calming = harborGame([
    { subject: CLOCK, predicate: "world-time", object: 1 },
    { subject: CLOCK, predicate: "farstone-weather", object: "clear" },
    { subject: CLOCK, predicate: "harbor-closed", object: "true" },
  ]);
  const reopened = tick(join(createEngine(calming), "alice")).engine;
  assert.equal(value(reopened.world, CLOCK, "harbor-closed"), "false", "calm reopens the harbor");
  assert.equal(value(reopened.world, "the-ferry", "sailing"), "scheduled");
});

test("the off-season turn runs the fish price up", () => {
  // (SEASON_LENGTH*2 - 1) + 1 == SEASON_LENGTH*2, landing exactly on the autumn turn.
  const game = harborGame([
    { subject: CLOCK, predicate: "world-time", object: SEASON_LENGTH * 2 - 1 },
    { subject: "greer", predicate: "price:fish", object: "2" },
    { subject: "greer", predicate: "stock:fish", object: "6" },
  ]);
  const engine = tick(join(createEngine(game), "alice")).engine;
  assert.ok(Number(value(engine.world, "greer", "price:fish")) > 2.4, "autumn scarcity lifts the fish price above its summer base");
  assert.ok(Number(value(engine.world, "greer", "stock:fish")) < 6, "and draws the stock down");
});

test("a wet summer closes the shellfish bed", () => {
  // SEASON_LENGTH (=summer start) + 5 → next tick 726 lands on a phase boundary, still summer.
  const game = harborGame([
    { subject: CLOCK, predicate: "world-time", object: SEASON_LENGTH + 5 },
    { subject: CLOCK, predicate: "recent-rainfall", object: 10 },
  ]);
  const engine = tick(join(createEngine(game), "alice")).engine;
  assert.equal(value(engine.world, CLOCK, "shellfish-closed"), "true", "warm, freshened water shuts the clam bed");
  assert.equal(value(engine.world, "marsh", "shellfish-closed"), "true", "the closure settles on the marsh itself");
});

test("almanac reads the whole spine back to the player", () => {
  const game = harborGame([
    { subject: CLOCK, predicate: "world-time", object: 1 },
    { subject: CLOCK, predicate: "farstone-weather", object: "fog" },
  ]);
  let engine = join(createEngine(game), "skipper");
  engine = submit(engine, { actor: "skipper", command: "almanac" });
  const result = tick(engine);
  const text = result.receipt.events.filter(({ to }) => to === "skipper").map(({ text: t }) => t).join("\n");
  assert.match(text, /Almanac of Farstone/, "the almanac verb is wired and reports the climate");
  assert.match(text, /spring/, "and names the season");
});
