import assert from "node:assert/strict";
import test from "node:test";
import { firstHeader, joinedHeader, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue } from "../src/code-http-header-value.mts";

test("codes repeated and parameterized HTTP field values", () => {
  assert.equal(firstHeader(["one", "two"]), "one");
  assert.equal(joinedHeader(["one", "two"]), "one,two");
  assert.deepEqual(splitHeaderParameters('form-data; name="a;b"; filename="x\\\"y"'), ["form-data", 'name="a;b"', 'filename="x\\\"y"']);
  assert.equal(unquoteHeaderValue(quoteHeaderValue('a"b\\c')), 'a"b\\c');
});
