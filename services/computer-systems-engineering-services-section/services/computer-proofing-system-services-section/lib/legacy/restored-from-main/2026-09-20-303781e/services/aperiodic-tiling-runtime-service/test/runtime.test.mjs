import assert from "node:assert/strict";
import test from "node:test";

import { autocorrelation, homometric } from "../dist/index.mjs";

test("aperiodic tiling runtime computes finite cyclic autocorrelation", () => {
  const pattern = [true, false, true, false];

  assert.deepEqual(autocorrelation(pattern), [2, 0, 2, 0]);
  assert.equal(homometric(pattern, [false, true, false, true]), true);
});
