import assert from "node:assert/strict";
import test from "node:test";
import { defineProvider } from "@red-cup-engineering/fae/provider";
import { FOUR } from "../src/four.mjs";
import { defineGame } from "../src/game.mjs";
import { createFaeOperatedEngine, fourFromFaeReading } from "../src/fae.mjs";
import { step } from "../src/engine.mjs";
import { settleSubject, value } from "../src/world.mjs";

const game = () => defineGame({
  id: "test-dimension",
  name: "Test dimension",
  start: "operations-room",
  rooms: { "operations-room": { name: "Operations", description: "The admitted territory.", exits: {} } },
});

const evidenceFor = (world, subject, predicate, object) => settleSubject(world, subject)
  .find((cell) => cell.predicate === predicate && cell.object === object)?.evidence;

test("FAE resource cells become the initial territory operated by FeltOS", async () => {
  const provider = defineProvider({
    id: "urn:fae:test-provider",
    observe: async () => ({
      resources: [{
        resource: "urn:union:territory:ops",
        focus: "urn:union:territory:ops",
        observedAt: "2026-08-30T00:00:00.000Z",
        cells: [{ subject: "ops", predicate: "operated-by", object: "561-group" }],
      }],
    }),
  });
  const result = await createFaeOperatedEngine({ game: game(), providers: [provider] });
  assert.equal(result.kind, "feltos.fae-operated-engine.v1");
  assert.equal(result.fae.cellCount, 4);
  assert.equal(value(result.engine.world, "ops", "operated-by"), "561-group");
  assert.deepEqual(evidenceFor(result.engine.world, "ops", "operated-by", "561-group"), FOUR.true);
});

test("FAE readings retain every Four evidence lane and their provenance", async () => {
  assert.deepEqual(fourFromFaeReading("BOT"), FOUR.neither);
  assert.deepEqual(fourFromFaeReading("T"), FOUR.true);
  assert.deepEqual(fourFromFaeReading("F"), FOUR.false);
  assert.deepEqual(fourFromFaeReading("TOP"), FOUR.both);

  const relation = { subject: "ops", predicate: "ready-for", object: "operation" };
  const providers = [
    defineProvider({
      id: "urn:fae:positive-provider",
      observe: async () => ({ resources: [{ resource: "urn:resource:positive", observedAt: "2026-09-05T00:00:00.000Z", cells: [relation] }] }),
    }),
    defineProvider({
      id: "urn:fae:negative-provider",
      observe: async () => ({ resources: [{ resource: "urn:resource:negative", observedAt: "2026-09-05T00:00:00.000Z", cells: [{ ...relation, polarity: "against" }] }] }),
    }),
  ];
  const result = await createFaeOperatedEngine({ game: game(), providers });
  const cell = result.fae.cells.find(({ subject, predicate, object }) => subject === relation.subject && predicate === relation.predicate && object === relation.object);
  assert.equal(cell.reading, "TOP");
  assert.deepEqual(cell.origins, [
    { provider: "urn:fae:positive-provider", resource: "urn:resource:positive" },
    { provider: "urn:fae:negative-provider", resource: "urn:resource:negative" },
  ]);
  assert.deepEqual(evidenceFor(result.engine.world, relation.subject, relation.predicate, relation.object), FOUR.both);
  assert.deepEqual(evidenceFor(result.engine.world, "ops", "ready-for", "operation"), FOUR.both);
  assert.deepEqual(step(result.engine).engine.world.assertions
    .find(({ subject, predicate, object }) => subject === relation.subject && predicate === relation.predicate && object === relation.object)?.evidence, FOUR.both);
});

test("a negative-only FAE relation remains false after an engine tick", async () => {
  const relation = { subject: "ops", predicate: "ready-for", object: "operation", polarity: "against" };
  const provider = defineProvider({
    id: "urn:fae:negative-provider",
    observe: async () => ({ resources: [{ resource: "urn:resource:negative", observedAt: "2026-09-05T00:00:00.000Z", cells: [relation] }] }),
  });
  const result = await createFaeOperatedEngine({ game: game(), providers: [provider] });
  assert.deepEqual(evidenceFor(result.engine.world, "ops", "ready-for", "operation"), FOUR.false);
  assert.equal(value(result.engine.world, "ops", "ready-for"), null);
  const afterTick = step(result.engine).engine.world;
  assert.deepEqual(evidenceFor(afterTick, "ops", "ready-for", "operation"), FOUR.false);
  assert.equal(value(afterTick, "ops", "ready-for"), null);
});
