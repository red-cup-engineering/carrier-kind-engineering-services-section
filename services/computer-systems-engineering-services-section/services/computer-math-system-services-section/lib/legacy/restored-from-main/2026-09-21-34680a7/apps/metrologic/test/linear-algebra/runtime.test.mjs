import assert from "node:assert/strict";
import test from "node:test";

import { linearAlgebra } from "../../src/linear-algebra/index.mjs";
import { fromInts, toCount, toInt } from "../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/exact-number.mjs";

test("linear-algebra runtime returns finite matrix receipts", () => {
  const matrix = fromInts([[1, 0], [0, 1]]);
  const receipt = linearAlgebra.squareMatrixInvariants(matrix);
  assert.equal(toInt(receipt.determinant), 1);
  assert.equal(toCount(receipt.rank), 2);
  assert.deepEqual(receipt.characteristicPolynomial.map(toInt), [1, -2, 1]);
});
