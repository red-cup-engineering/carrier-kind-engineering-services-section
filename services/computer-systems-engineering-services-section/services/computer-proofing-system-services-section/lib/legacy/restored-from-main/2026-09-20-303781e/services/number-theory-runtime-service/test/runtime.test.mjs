import assert from "node:assert/strict";
import test from "node:test";

import { choose, recurringVerbSequences, step } from "../dist/index.mjs";

test("number-theory runtime realizes its public calculation surfaces", () => {
  assert.equal(step(3), 5);
  assert.equal(choose(5, 2), 10);

  const measurement = recurringVerbSequences([
    { actor: "agent", verb: "observe", argShape: [], validated: true },
    { actor: "agent", verb: "act", argShape: [], validated: true },
    { actor: "agent", verb: "observe", argShape: [], validated: true },
    { actor: "agent", verb: "act", argShape: [], validated: true },
  ]);
  assert.deepEqual(measurement.candidates[0]?.chain, ["observe", "act"]);
});
