import test from "node:test";

import assert from "node:assert/strict";
import { createOpsRail, loadOpsClientEnvironment, readToolResult } from "../src/rail-client.mjs";

test("loadOpsClientEnvironment reads the three bridge variables and returns null without a credential", () => {
  assert.equal(loadOpsClientEnvironment({ environment: {} }), null);
  assert.deepEqual(loadOpsClientEnvironment({ environment: { OPS_MCP_CLIENT_ID: "c", OPS_MCP_CLIENT_SECRET: "s", OPS_MCP_ORIGIN: "https://x.example/" } }), { origin: "https://x.example", clientId: "c", clientSecret: "s" });
  assert.equal(loadOpsClientEnvironment({ envPath: "/nonexistent/ops.env", environment: {} }), null);
});

test("readToolResult parses JSON text, returns structured content, and throws the tool's refusal", () => {
  assert.deepEqual(readToolResult("t", { content: [{ type: "text", text: "{\"a\":1}" }] }), { a: 1 });
  assert.deepEqual(readToolResult("t", { structuredContent: { b: 2 } }), { b: 2 });
  assert.equal(readToolResult("t", { content: [] }), null);
  assert.throws(() => readToolResult("agent-work-dispatch", { isError: true, content: [{ type: "text", text: "refused: no" }] }), /ops agent-work-dispatch: refused: no/u);
});

test("createOpsRail mints one token, opens one session lazily, calls tools with {input}, and closes", async () => {
  const fetchImpl = async (url) => {
    assert.equal(String(url), "https://ops.example/oauth/token");
    return { ok: true, json: async () => ({ access_token: "tok", expires_in: 3600 }) };
  };
  const calls = [];
  let closed = 0;
  const connectFn = async (headers) => {
    assert.equal(headers.Authorization, "Bearer tok");
    return { callTool: async (request) => { calls.push(request); return { content: [{ type: "text", text: "{\"ready\":2}" }] }; }, close: async () => { closed += 1; } };
  };
  const rail = createOpsRail({ origin: "https://ops.example", clientId: "c", clientSecret: "s", fetchImpl, connectFn });
  assert.deepEqual(await rail.call("agent-work-dispatch", { limit: 1 }), { ready: 2 });
  assert.deepEqual(await rail.call("duties"), { ready: 2 });
  assert.deepEqual(calls, [{ name: "agent-work-dispatch", arguments: { input: { limit: 1 } } }, { name: "duties", arguments: { input: {} } }]);
  await rail.close();
  await rail.close();
  assert.equal(closed, 1);
  assert.throws(() => createOpsRail({ clientId: "c", clientSecret: "s" }), /origin is required/u);
});
