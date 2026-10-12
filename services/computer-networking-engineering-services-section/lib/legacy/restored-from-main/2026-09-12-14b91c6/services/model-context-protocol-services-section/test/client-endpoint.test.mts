import assert from "node:assert/strict";
import test from "node:test";
import { admitMcpClientEndpoint, mcpClientEndpointType } from "../src/client-endpoint.mts";

test("a stdio endpoint under the repository and an http endpoint are admitted; a machine path, a parent escape, and an unknown transport are refused", () => {
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "sites/x/scripts/serve-mcp.mjs", cwd: "sites/x", environment: { K: "v" }, enabledTools: ["search"], startupTimeoutSeconds: 10 }).ok, true);
  assert.equal(admitMcpClientEndpoint({ transport: "http", url: "http://127.0.0.1:18808/mcp", toolTimeoutSeconds: 30 }).ok, true);
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "/home/someone/serve.mjs" }).ok, false);
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "../outside/serve.mjs" }).ok, false);
  assert.equal(admitMcpClientEndpoint({ transport: "websocket", url: "ws://x" }).ok, false);
  assert.equal(mcpClientEndpointType.id, "https://schemas.561.group/computer/networking/mcp-client-endpoint.schema.json");
});
