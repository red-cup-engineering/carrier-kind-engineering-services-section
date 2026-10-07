import test from "node:test";
import assert from "node:assert/strict";
import { createJsonRpcTransport, callJsonRpc, requestJsonRpc } from "../src/json-rpc.mjs";
const envelope = { jsonrpc: "2.0", id: 1, method: "example.read", params: [] };
test("exchange retains URL, envelope, timeout and decoded result", async () => {
  const transport = createJsonRpcTransport({ fetchImpl: async (url, init) => {
    assert.equal(url, "https://example.test/rpc?token=fixture");
    assert.deepEqual(JSON.parse(init.body), envelope);
    assert.ok(init.signal instanceof AbortSignal);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: envelope.id, result: { ok: true } }));
  }});
  assert.deepEqual(await callJsonRpc(transport, "https://example.test/rpc?token=fixture", envelope), { ok: true });
});
test("response collection is bounded and cancels oversized streams", async () => {
  let cancelled = false;
  const transport = createJsonRpcTransport({ maxBytes: 4, fetchImpl: async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(5)); }, cancel() { cancelled = true; }
  })) });
  await assert.rejects(transport("https://example.test", envelope), /exceeded 4 bytes/);
  assert.equal(cancelled, true);
});
test("HTTP, malformed JSON, non-object and RPC failures reject", async () => {
  for (const response of [{ status: 503, body: "down" }, { status: 200, body: "no" }, { status: 200, body: "null" }]) {
    await assert.rejects(callJsonRpc(async () => response, "fixture", envelope));
  }
  const error = { code: -1, message: "behind" };
  await assert.rejects(callJsonRpc(async () => ({ status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: envelope.id, error }) }), "fixture", envelope), e => e.rpcError.code === -1);
});
test("timeout covers a stalled response body", async () => {
  const transport = createJsonRpcTransport({ timeout: 10, fetchImpl: async () => new Response(new ReadableStream()) });
  const hold = setTimeout(() => {}, 100);
  try { await assert.rejects(transport("fixture", envelope), { name: "TimeoutError" }); }
  finally { clearTimeout(hold); }
});

test("requestJsonRpc owns the standard envelope while callers inject transport policy", async () => {
  let request;
  const result = await requestJsonRpc("https://example.test/rpc", "chain.read", { account: "alice" }, {
    id: "fixture-7",
    timeout: 123,
    maxBytes: 128,
    fetchImpl: async (_url, init) => {
      request = JSON.parse(init.body);
      assert.ok(init.signal instanceof AbortSignal);
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: "fixture-7", result: { balance: "1.000 HIVE" } }));
    },
  });
  assert.deepEqual(request, { jsonrpc: "2.0", id: "fixture-7", method: "chain.read", params: { account: "alice" } });
  assert.deepEqual(result, { balance: "1.000 HIVE" });
});
