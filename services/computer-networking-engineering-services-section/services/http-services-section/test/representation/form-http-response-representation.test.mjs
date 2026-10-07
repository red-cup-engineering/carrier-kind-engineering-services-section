import assert from "node:assert/strict";
import test from "node:test";

import {
  emptyRepr,
  htmlRepr,
  jsonRepr,
  textRepr,
} from "../../src/representation/form-http-response-representation.mjs";

test("forms the four foundational response representations", () => {
  assert.deepEqual(jsonRepr({ ok: true }), {
    type: "application/json; charset=utf-8",
    body: "{\"ok\":true}\n",
  });
  assert.deepEqual(textRepr("hello", 201), {
    status: 201,
    type: "text/plain; charset=utf-8",
    body: "hello",
  });
  assert.equal(htmlRepr("<p>hello</p>").type, "text/html; charset=utf-8");
  assert.deepEqual(emptyRepr(), { status: 204 });
});

test("preserves explicit response policy without adding undefined fields", () => {
  const result = jsonRepr({ ok: true }, {
    status: 202,
    newline: false,
    cacheControl: { noStore: true },
    headers: { "x-result": "accepted" },
  });
  assert.deepEqual(result, {
    status: 202,
    headers: { "x-result": "accepted" },
    type: "application/json; charset=utf-8",
    body: "{\"ok\":true}",
    cacheControl: { noStore: true },
  });
});
