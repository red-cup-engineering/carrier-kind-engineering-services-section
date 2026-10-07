import test from "node:test";
import assert from "node:assert/strict";
import { canonical, evaluateRunTerm, objectTerm, stringTerm, tm } from "../../../src/index.mjs";

test("JSON and SEN boundaries delegate without changing canonical structure", () => {
  assert.equal(canonical({ b: 2, a: 1 }), '{"a":1,"b":2}');
  const term = tm.lam(objectTerm([["value", stringTerm("ok")]]));
  assert.deepEqual(evaluateRunTerm(term, null), { value: "ok" });
});
