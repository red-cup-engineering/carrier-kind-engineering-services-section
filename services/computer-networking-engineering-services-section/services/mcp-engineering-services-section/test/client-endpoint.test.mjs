import assert from "node:assert/strict";
import test from "node:test";
import { admitMcpClientEndpoint, bindMcpClientEndpoint } from "../src/client-endpoint.mjs";

test("admits only local stdio and HTTP MCP endpoints", () => {
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "apps/server.mjs" }).ok, true);
  assert.equal(admitMcpClientEndpoint({ transport: "http", url: "http://127.0.0.1:18808/mcp" }).ok, true);
  assert.equal(admitMcpClientEndpoint({ transport: "stdio", script: "../outside.mjs" }).ok, false);
  assert.deepEqual(bindMcpClientEndpoint("/repo", { transport: "stdio", script: "apps/server.mjs", environmentFile: ".env" }), { command: "node", args: ["--env-file=/repo/.env", "/repo/apps/server.mjs"] });
});
