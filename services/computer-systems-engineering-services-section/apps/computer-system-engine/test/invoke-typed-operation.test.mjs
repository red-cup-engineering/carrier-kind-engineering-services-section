import assert from "node:assert/strict";
import test from "node:test";
import { invokeTypedOperation } from "../src/typed-operation-message.mjs";

const operations = Object.freeze({
  double: (input) => input.n * 2,
  explode: () => {
    throw new Error("boom");
  },
});

function request(overrides = {}) {
  return {
    version: 1,
    kind: "typed-operation-request",
    requestId: "r1",
    operationId: "double",
    inputCodec: "json",
    input: JSON.stringify({ n: 21 }),
    outputCodec: "json",
    actorResourceCatalog: {},
    ...overrides,
  };
}

test("invokes a registered operation and returns a typed-operation-result", async () => {
  const result = await invokeTypedOperation({ operations, request: request() });
  assert.equal(result.kind, "typed-operation-result");
  assert.equal(result.requestId, "r1");
  assert.equal(JSON.parse(result.output), 42);
});

test("refuses a request that fails typed-operation-request admission", async () => {
  const result = await invokeTypedOperation({ operations, request: request({ actorResourceCatalog: undefined }) });
  assert.equal(result.kind, "typed-operation-refusal");
  assert.equal(result.code, "malformed-request");
});

test("refuses an unregistered operationId", async () => {
  const result = await invokeTypedOperation({ operations, request: request({ operationId: "missing" }) });
  assert.equal(result.kind, "typed-operation-refusal");
  assert.equal(result.code, "unknown-operation");
});

test("refuses an unsupported codec", async () => {
  const result = await invokeTypedOperation({ operations, request: request({ outputCodec: "cbor" }) });
  assert.equal(result.kind, "typed-operation-refusal");
  assert.equal(result.code, "unsupported-codec");
});

test("refuses a handler that throws, without leaking the throw", async () => {
  const result = await invokeTypedOperation({ operations, request: request({ operationId: "explode" }) });
  assert.equal(result.kind, "typed-operation-refusal");
  assert.equal(result.code, "operation-failed");
  assert.equal(result.message, "boom");
});
