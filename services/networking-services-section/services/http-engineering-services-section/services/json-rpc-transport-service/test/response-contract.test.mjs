import assert from "node:assert/strict";
import test from "node:test";
import { callJsonRpc, requestJsonRpc } from "../src/json-rpc.mjs";

const url = "https://fixture.invalid/rpc";
const envelope = { jsonrpc: "2.0", id: 7, method: "fixture.read", params: [] };
const respond = (payload) => async () => ({ status: 200, body: JSON.stringify(payload) });

test("correlated 2.0 responses preserve every valid result, including falsey values", async () => {
  for (const id of [7, "7", 0, null]) {
    for (const result of [null, false, 0, "", [], { value: 0 }]) {
      assert.deepEqual(await callJsonRpc(respond({ jsonrpc: "2.0", id, result }), url, { ...envelope, id }), result);
    }
  }
});

test("refuses a response for another request, a missing id, or another protocol version", async () => {
  for (const payload of [
    { jsonrpc: "2.0", id: 8, result: "wrong request" },
    { jsonrpc: "2.0", id: "7", result: "wrong id type" },
    { jsonrpc: "2.0", id: null, result: "uncorrelated" },
    { jsonrpc: "2.0", result: "missing id" },
    { jsonrpc: "1.0", id: 7, result: "wrong version" },
    { id: 7, result: "missing version" },
  ]) {
    await assert.rejects(callJsonRpc(respond(payload), url, envelope), /Invalid JSON-RPC response/);
  }
});

test("requires exactly one own result or error member", async () => {
  const inheritedResult = Object.assign(Object.create({ result: "inherited" }), { jsonrpc: "2.0", id: 7 });
  for (const payload of [
    { jsonrpc: "2.0", id: 7 },
    { jsonrpc: "2.0", id: 7, result: "ambiguous", error: null },
    { jsonrpc: "2.0", id: 7, result: null, error: { code: -32000, message: "refused" } },
    inheritedResult,
  ]) {
    await assert.rejects(callJsonRpc(respond(payload), url, envelope), /Invalid JSON-RPC response/);
  }
});

test("valid RPC errors preserve code, message and structured data", async () => {
  const rpcError = { code: -32000, message: "refused", data: { retry: false, reason: ["held"] } };
  await assert.rejects(callJsonRpc(respond({ jsonrpc: "2.0", id: 7, error: rpcError }), url, envelope), (error) => {
    assert.match(error.message, /RPC error.*refused/);
    assert.deepEqual(error.rpcError, rpcError);
    return true;
  });
});

test("malformed error objects are refused rather than treated as results or RPC errors", async () => {
  for (const error of [null, false, [], "refused", {}, { code: "-32000", message: "refused" }, { code: -32000.5, message: "refused" }, { code: -32000, message: null }]) {
    await assert.rejects(callJsonRpc(respond({ jsonrpc: "2.0", id: 7, error }), url, envelope), /Invalid JSON-RPC error/);
  }
});

test("requestJsonRpc preserves method, params, id and the shared bounded Fetch request", async () => {
  let calls = 0;
  const params = { account: "fixture" };
  const result = await requestJsonRpc(url, "fixture.read", params, {
    id: "request-7",
    fetchImpl: async (target, options) => {
      calls++;
      assert.equal(target, url);
      assert.equal(options.method, "POST");
      assert.equal(options.headers["content-type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), { jsonrpc: "2.0", id: "request-7", method: "fixture.read", params });
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: "request-7", result: 0 }));
    },
  });
  assert.equal(result, 0);
  assert.equal(calls, 1);
});


test("correlation retains the original request id while a transport is pending", async () => {
  const request = { ...envelope };
  await assert.rejects(callJsonRpc(async () => {
    request.id = 8;
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: 8, result: "rebound" }) };
  }, url, request), /Invalid JSON-RPC response/);
});


test("null-id Parse error and Invalid Request retain structured failure evidence only", async () => {
  for (const code of [-32700, -32600]) {
    const rpcError = { code, message: "request could not be read", data: { detail: "fixture" } };
    await assert.rejects(callJsonRpc(respond({ jsonrpc: "2.0", id: null, error: rpcError }), url, envelope), (error) => {
      assert.deepEqual(error.rpcError, rpcError);
      return true;
    });
  }
  for (const payload of [
    { jsonrpc: "2.0", id: null, error: { code: -32000, message: "uncorrelated server error" } },
    { jsonrpc: "2.0", id: 8, error: { code: -32700, message: "another request" } },
    { jsonrpc: "2.0", id: "7", error: { code: -32600, message: "wrong id type" } },
    { jsonrpc: "2.0", id: null, result: "uncorrelated success" },
  ]) {
    await assert.rejects(callJsonRpc(respond(payload), url, envelope), /Invalid JSON-RPC response/);
  }
});
