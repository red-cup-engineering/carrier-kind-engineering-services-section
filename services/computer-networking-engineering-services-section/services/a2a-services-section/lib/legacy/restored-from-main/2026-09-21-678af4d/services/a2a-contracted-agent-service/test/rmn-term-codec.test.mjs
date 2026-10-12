import assert from "node:assert/strict";
import test from "node:test";
import { decodeRmnTerm, encodeRmnTerm, RMN_TERM_OBJECT_KIND } from "../src/rmn-term-codec.mjs";

test("a JSON RMN term round-trips through encode/decode", () => {
  const term = ["climate-place-daily-clearing-demand", { civilDay: "2026-07-23" }];
  const bytes = encodeRmnTerm(term);
  assert.ok(Buffer.isBuffer(bytes));
  assert.deepEqual(decodeRmnTerm(bytes), term);
});

test("encode is deterministic for the same term", () => {
  const term = { b: 2, a: 1 };
  assert.deepEqual(encodeRmnTerm(term), encodeRmnTerm({ a: 1, b: 2 }));
});

test("decode refuses bytes that do not carry their own content identity", () => {
  const foreign = Buffer.from(JSON.stringify({ objectKind: RMN_TERM_OBJECT_KIND, value: ["x"] }), "utf8");
  assert.throws(() => decodeRmnTerm(foreign), TypeError);
});
