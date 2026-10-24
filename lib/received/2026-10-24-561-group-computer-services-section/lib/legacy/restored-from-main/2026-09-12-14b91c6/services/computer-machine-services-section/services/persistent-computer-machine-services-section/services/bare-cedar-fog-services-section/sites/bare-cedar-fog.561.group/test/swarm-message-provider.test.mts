import assert from "node:assert/strict";
import test from "node:test";
import { submitSwarmMessage } from "../src/swarm-message-provider.mts";

test("submitSwarmMessage rejects a non-string message", async () => {
  const result = await submitSwarmMessage(42);
  assert.equal(result.status, 400);
  assert.equal(result.body.status, "failed");
});

test("submitSwarmMessage rejects a blank message", async () => {
  const result = await submitSwarmMessage("   ");
  assert.equal(result.status, 400);
});

test("submitSwarmMessage rejects a message over the byte limit", async () => {
  const result = await submitSwarmMessage("a".repeat(16_001));
  assert.equal(result.status, 413);
});

test("submitSwarmMessage refuses an endpoint that is not the loopback /messages service", async () => {
  await assert.rejects(() => submitSwarmMessage("hi", { endpoint: "http://example.com/messages" }));
});

test("submitSwarmMessage returns the provider's result on success", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ type: "SwarmMessageResult", status: "completed", result: "hello" }), { status: 200 });
  const result = await submitSwarmMessage("hi", { fetchImpl });
  assert.equal(result.status, 200);
  assert.equal(result.body.result, "hello");
});

test("submitSwarmMessage returns 502 when the provider returns an invalid envelope", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ nope: true }), { status: 200 });
  const result = await submitSwarmMessage("hi", { fetchImpl });
  assert.equal(result.status, 502);
});

test("submitSwarmMessage returns 502 when the provider is unreachable", async () => {
  const fetchImpl = async (): Promise<Response> => { throw new Error("ECONNREFUSED"); };
  const result = await submitSwarmMessage("hi", { fetchImpl });
  assert.equal(result.status, 502);
  assert.match(result.body.reason ?? "", /ECONNREFUSED/);
});
