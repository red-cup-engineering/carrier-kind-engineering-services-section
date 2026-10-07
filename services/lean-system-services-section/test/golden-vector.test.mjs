import assert from "node:assert/strict";
import test from "node:test";
import { decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl, leanGoldenVectorsByAction } from "../src/golden-vector/codec.mjs";

test("Lean golden vectors round-trip as EAVT JSONL and group by action", () => {
  const text = '{"$schema":"lean-system/conformance/golden-vector","e":"lean","a":"checks","v":true,"t":"1"}\n';
  const rows = decodeLeanGoldenVectorJsonl(text);
  assert.equal(encodeLeanGoldenVectorJsonl(rows), text);
  assert.deepEqual([...leanGoldenVectorsByAction(rows).keys()], ["checks"]);
  assert.throws(() => decodeLeanGoldenVectorJsonl('{"$schema":"relating/conformance/golden-vector","e":"x","a":"y","v":1,"t":"1"}'));
});
