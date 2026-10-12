import assert from "node:assert/strict";
import test from "node:test";
import { parseContentType, serializeContentType } from "../src/code-http-content-type.mts";

test("parses and serializes normalized content types", () => {
  const parsed = parseContentType('Text/Plain; Charset="utf-8"; note="a;b"');
  assert.deepEqual(parsed, { type: "text/plain", params: { charset: "utf-8", note: "a;b" } });
  assert.equal(serializeContentType(parsed!), 'text/plain; charset=utf-8; note="a;b"');
});
