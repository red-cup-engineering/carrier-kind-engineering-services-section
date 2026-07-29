import assert from "node:assert/strict";
import test from "node:test";
import { canonical, parse, parseLines, serializeLines } from "../dist/json/index.mjs";
import { parse as parseEavt, serialize as serializeEavt } from "../dist/json/jsonl/eavt/index.mjs";

test("JSON and JSONL preserve canonical recovered behavior", () => {
  assert.equal(canonical(parse('{"b":2,"a":1}')), '{"a":1,"b":2}');
  assert.deepEqual(parseLines('{"b":2}\n{"a":1}\n'), [{ b: 2 }, { a: 1 }]);
  assert.equal(serializeLines([{ b: 2 }, { a: 1 }]), '{"b":2}\n{"a":1}\n');
});

test("EAVT remains the JSONL restriction", () => {
  const rows = parseEavt('["entity","attribute","value","time"]\n');
  assert.deepEqual(rows, [{ e: "entity", a: "attribute", v: "value", t: "time" }]);
  assert.equal(serializeEavt(rows), '{"a":"attribute","e":"entity","t":"time","v":"value"}\n');
});
