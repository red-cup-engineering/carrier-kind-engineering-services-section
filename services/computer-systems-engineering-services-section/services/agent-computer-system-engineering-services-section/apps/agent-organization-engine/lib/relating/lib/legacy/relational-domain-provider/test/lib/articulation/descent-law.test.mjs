import test from "node:test";
import assert from "node:assert/strict";
import { articulate, mark, utterance } from "../../../src/index.mjs";

test("articulation delegates the established potential-cell law", () => {
  const source = utterance(mark("token"), mark("claim"));
  const result = articulate(source);
  assert.equal(result.kind, "utterance.articulation.cell");
  assert.equal(result.potentialAperiodicArticulationCell[0], source);
});
