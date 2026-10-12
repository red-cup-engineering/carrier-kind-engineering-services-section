import assert from "node:assert/strict";
import test from "node:test";
import { admitMcpClientEndpoint, bindMcpClientEndpoint, mcpClientEndpointType } from "../dist/mcp-endpoint.mjs";

test("a stdio endpoint under the repository and an http endpoint are admitted; a machine path, a parent escape, and an unknown transport are refused", () => {
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "sites/x/scripts/serve-mcp.mjs", cwd: "sites/x", environment: { K: "v" }, enabledTools: ["search"], startupTimeoutSeconds: 10 }).ok, true);
  assert.equal(admitMcpClientEndpoint({ transport: "http", url: "http://127.0.0.1:18808/mcp", toolTimeoutSeconds: 30 }).ok, true);
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "/home/someone/serve.mjs" }).ok, false);
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "../outside/serve.mjs" }).ok, false);
  assert.equal(admitMcpClientEndpoint({ transport: "websocket", url: "ws://x" }).ok, false);
  assert.equal(mcpClientEndpointType.id, "https://schemas.561.group/computer/networking/mcp-client-endpoint.schema.json");
});

test("one endpoint binding places native environment loading before the server script", () => {
  assert.deepEqual(bindMcpClientEndpoint("/repo", { transport: "stdio", script: "serve.mjs", environmentFile: ".env", arguments: ["mcp"], environment: { ROOT: "{{root}}" } }), { command: "node", args: ["--env-file=/repo/.env", "/repo/serve.mjs", "mcp"], env: { ROOT: "/repo" } });
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "serve.mjs", environmentFile: "../secrets" }).ok, false);
});
