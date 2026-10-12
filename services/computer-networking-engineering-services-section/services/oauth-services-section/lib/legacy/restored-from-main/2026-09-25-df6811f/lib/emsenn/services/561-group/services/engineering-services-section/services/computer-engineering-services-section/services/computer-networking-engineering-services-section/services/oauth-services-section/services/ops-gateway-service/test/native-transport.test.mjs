import assert from "node:assert/strict";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { startNativeApplication } from "@red-cup-engineering/computer-web-server/native-application";
import { createOpsMcpGatewayApp } from "../src/app.mjs";

test("the shared Node transport serves health, enforces admission, and streams an authenticated MCP exchange", async (t) => {
  const stateDir = await mkdtemp(join(tmpdir(), "ops-shared-transport-"));
  t.after(() => rm(stateDir, { recursive: true, force: true }));
  const calls = [];
  const oauth = {
    metadata: () => ({ issuer: "https://ops.test.invalid" }),
    registerClient: () => ({ client_id: "test-client" }),
    exchangeCode: () => ({ access_token: "good", token_type: "Bearer" }),
    validateToken: (token) => token === "good" ? { email: "operator@example.invalid" } : null,
    revoke: () => {},
  };
  const wire = 'event: message\ndata: {"jsonrpc":"2.0","id":7,"result":{"ok":true}}\n\n';
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.test.invalid", upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid", stateDir,
  }, { oauth, fetchImpl: async (url, options) => {
    const body = await new Request(url, options).text();
    calls.push({ url: String(url), body });
    return new Response(new ReadableStream({ start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(wire.slice(0, 19)));
      controller.enqueue(encoder.encode(wire.slice(19)));
      controller.close();
    } }), { headers: { "content-type": "text/event-stream", "mcp-session-id": "test-session" } });
  } });
  const server = await startNativeApplication(app, { host: "127.0.0.1", port: 0 });
  t.after(() => server.close());
  await new Promise(resolve => setTimeout(resolve, 150));
  const origin = `http://127.0.0.1:${server.port}`;
  const health = await fetch(origin + "/healthz");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  const body = JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/list" });
  const refused = await fetch(origin + "/mcp", { method: "POST", headers: { "content-type": "application/json" }, body });
  assert.equal(refused.status, 401);
  await refused.arrayBuffer();
  assert.equal(calls.length, 0);
  const reply = await fetch(origin + "/mcp?cursor=7", { method: "POST", headers: { authorization: "Bearer good", "content-type": "application/json" }, body });
  assert.equal(reply.status, 200);
  assert.equal(reply.headers.get("content-type"), "text/event-stream");
  assert.equal(reply.headers.get("mcp-session-id"), "test-session");
  assert.equal(await reply.text(), wire);
  assert.deepEqual(calls, [{ url: "http://127.0.0.1:18811/mcp?cursor=7", body }]);
});
