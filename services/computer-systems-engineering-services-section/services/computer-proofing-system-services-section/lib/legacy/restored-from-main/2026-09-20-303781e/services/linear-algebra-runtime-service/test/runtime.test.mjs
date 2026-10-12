import assert from "node:assert/strict";
import test from "node:test";

import { linearAlgebra } from "../dist/index.mjs";
import { fromInts, toCount, toInt } from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";

test("linear-algebra runtime returns finite matrix receipts", () => {
  const matrix = fromInts([[1, 0], [0, 1]]);
  const receipt = linearAlgebra.squareMatrixInvariants(matrix);
  assert.equal(toInt(receipt.determinant), 1);
  assert.equal(toCount(receipt.rank), 2);
  assert.deepEqual(receipt.characteristicPolynomial.map(toInt), [1, -2, 1]);
});
