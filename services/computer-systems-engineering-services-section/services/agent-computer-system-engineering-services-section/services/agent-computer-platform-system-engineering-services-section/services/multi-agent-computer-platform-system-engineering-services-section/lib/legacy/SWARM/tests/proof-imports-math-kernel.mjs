import assert from "node:assert/strict";

import { articulate } from "@red-cup-engineering/metrologic/bilattice/descent";
import { predicate } from "@red-cup-engineering/metrologic/bilattice/descent";

const utterance = [{ const: "worker" }, { const: "articulates-relation" }];
const cell = articulate(utterance);

assert.deepEqual(cell.potential, utterance);

const fiber = predicate(cell);

assert.deepEqual(fiber["cell-set"]["entity-set"].entities, [{ const: "worker" }]);
assert.deepEqual(fiber["cell-set"]["predicate-set"].predicates, [
  { const: "articulates-relation" },
]);
assert.ok(fiber.fiber);

console.log("ok  SWARM imports math-kernel and descends an utterance");
