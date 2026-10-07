import test from "node:test";
import assert from "node:assert/strict";
import { createJsonRpcTransport, callJsonRpc, requestJsonRpc } from "../src/json-rpc.mjs";
import { BodyReadError } from "../src/body/web.mjs";

const envelope = { jsonrpc: "2.0", id: "request-7", method: "fixture.read", params: [] };
const reply = payload => async () => ({ status: 200, body: JSON.stringify(payload) });

test("shared response validation rejects wrong IDs, versions and ambiguous members", async () => {
  for (const payload of [
    { jsonrpc: "2.0", id: "other", result: 1 },
    { jsonrpc: "1.0", id: envelope.id, result: 1 },
    { id: envelope.id, result: 1 },
    { jsonrpc: "2.0", result: 1 },
    { jsonrpc: "2.0", id: envelope.id },
    { jsonrpc: "2.0", id: envelope.id, result: 1, error: null },
    { jsonrpc: "2.0", id: envelope.id, error: { code: "-1", message: "bad" } },
    { jsonrpc: "2.0", id: null, result: 1 },
    { jsonrpc: "2.0", id: null, error: { code: -32603, message: "unbound" } },
  ]) await assert.rejects(callJsonRpc(reply(payload), "fixture", envelope), /Invalid JSON-RPC/);
});

test("shared response validation retains valid falsey values and structured failures", async () => {
  for (const result of [null, false, 0, "", [], {}]) {
    assert.deepEqual(await callJsonRpc(reply({ jsonrpc: "2.0", id: envelope.id, result }), "fixture", envelope), result);
  }
  for (const [id, code] of [[envelope.id, -32603], [null, -32700], [null, -32600]]) {
    const rpcError = { code, message: "fixture failure", data: { detail: "retained" } };
    await assert.rejects(callJsonRpc(reply({ jsonrpc: "2.0", id, error: rpcError }), "fixture", envelope), error => {
      assert.deepEqual(error.rpcError, rpcError);
      return true;
    });
  }
});

test("HTTP transport preserves public BodyReadError identity and stream failure cause", async () => {
  const failure = new Error("fixture stream failure");
  for (const [stream, maxBytes, status, code, cause] of [
    [new ReadableStream({ start(c) { c.enqueue(new Uint8Array(5)); } }), 4, 413, "body-too-large", undefined],
    [new ReadableStream({ start(c) { c.error(failure); } }), 4, 400, "invalid-body", failure],
  ]) {
    const transport = createJsonRpcTransport({ maxBytes, fetchImpl: async () => new Response(stream) });
    await assert.rejects(callJsonRpc(transport, "fixture", envelope), error => {
      assert.ok(error instanceof BodyReadError);
      assert.equal(error.status, status);
      assert.equal(error.code, code);
      assert.equal(error.cause, cause);
      return true;
    });
  }
});

test("request wrapper preserves URL, POST headers, explicit ID and a single body reader", async () => {
  let reads = 0;
  let fetches = 0;
  const body = new Response(JSON.stringify({ jsonrpc: "2.0", id: 0, result: false })).body;
  const getReader = body.getReader.bind(body);
  body.getReader = (...args) => { reads++; return getReader(...args); };
  const value = await requestJsonRpc("https://fixture.invalid/rpc?x=1", "fixture.read", [7], {
    id: 0, timeout: 200, maxBytes: 128,
    fetchImpl: async (url, init) => {
      fetches++;
      assert.equal(url, "https://fixture.invalid/rpc?x=1");
      assert.equal(init.method, "POST");
      assert.deepEqual(init.headers, { "content-type": "application/json" });
      assert.deepEqual(JSON.parse(init.body), { jsonrpc: "2.0", id: 0, method: "fixture.read", params: [7] });
      assert.ok(init.signal instanceof AbortSignal);
      return { status: 200, body };
    },
  });
  assert.equal(value, false);
  assert.equal(fetches, 1);
  assert.equal(reads, 1);
});

test("response correlation uses the request ID captured before awaiting transport", async () => {
  const request = { ...envelope };
  await assert.rejects(callJsonRpc(async () => {
    request.id = "other";
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: "other", result: 1 }) };
  }, "fixture", request), /Invalid JSON-RPC/);
});
