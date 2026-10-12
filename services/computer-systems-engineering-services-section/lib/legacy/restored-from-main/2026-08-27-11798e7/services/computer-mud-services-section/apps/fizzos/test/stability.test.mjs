import assert from "node:assert/strict";
import test from "node:test";
import { composeCapabilities } from "../src/capabilities.mjs";
import { defineGame } from "../src/game.mjs";
import { createMudServer } from "../src/mud-server.mjs";
import { clockReport, worldClockCapability } from "../src/world-clock.mjs";

const stabilityGame = defineGame({
  id: "fizzos.stability",
  name: "Stability Assay",
  start: "cell",
  capabilities: ["fizzos.world-clock"],
  rooms: { cell: { name: "Cell", description: "A stability cell.", exits: {} } },
});

function runHorizon(ticks) {
  const server = createMudServer(stabilityGame, {
    runtime: composeCapabilities([worldClockCapability]),
    maxAssertions: 128,
  });
  let maximumAssertions = 0;
  for (let tick = 0; tick < ticks; tick += 1) {
    server.tick();
    maximumAssertions = Math.max(maximumAssertions, server.engine().world.assertions.length);
  }
  return { report: clockReport(server.engine().world), metrics: server.metrics(), maximumAssertions };
}

test("26,880 autonomous ticks replay exactly with a bounded active trace", { timeout: 30_000 }, () => {
  const first = runHorizon(26_880);
  const second = runHorizon(26_880);
  assert.deepEqual(second.report, first.report);
  assert.equal(first.report.time, 26_880);
  assert.equal(first.metrics.tick, 26_880);
  assert.ok(first.maximumAssertions <= 131, `maximum active assertions was ${first.maximumAssertions}`);
});
