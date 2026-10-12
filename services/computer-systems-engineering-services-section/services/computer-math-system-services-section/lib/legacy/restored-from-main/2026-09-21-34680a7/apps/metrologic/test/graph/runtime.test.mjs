import assert from "node:assert/strict";
import test from "node:test";

import { completeGraphChromatic } from "../../src/graph/index.mjs";

test("graph runtime calculates a complete graph chromatic receipt", () => {
  const receipt = completeGraphChromatic(4);

  assert.equal(receipt.chromaticNumber, 4);
  assert.equal(receipt.requiresAllColours, true);
});
