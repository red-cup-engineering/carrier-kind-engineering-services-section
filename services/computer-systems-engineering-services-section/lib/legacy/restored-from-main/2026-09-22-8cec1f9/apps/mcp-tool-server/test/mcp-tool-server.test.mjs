import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpToolServer } from "../src/mcp-tool-server.mjs";

test("admits declared arguments before dispatch and exposes the tool catalog", async () => {
  let calls = 0;
  const server = createMcpToolServer({
    serverInfo: { name: "tool-server-test", version: "1" },
    tools: [{ name: "double", inputSchema: { type: "object", required: ["value"], properties: { value: { type: "integer" } }, additionalProperties: false }, outputSchema: { type: "object", required: ["value"], properties: { value: { type: "integer" } } } }],
    dispatch: (_name, args) => { calls += 1; return { value: args.value * 2 }; },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  assert.equal((await client.listTools()).tools[0]?.name, "double");
  await assert.rejects(client.callTool({ name: "double", arguments: { value: "no" } }), /arguments outside inputSchema/u);
  assert.equal(calls, 0);
  assert.deepEqual((await client.callTool({ name: "double", arguments: { value: 2 } })).structuredContent, { value: 4 });
  assert.equal(calls, 1);
  await Promise.all([client.close(), server.close()]);
});

test("paginates a tool catalog and refuses malformed cursors", async () => {
  const server = createMcpToolServer({
    serverInfo: { name: "paging-test", version: "1" }, toolsPageSize: 1,
    tools: [{ name: "one", inputSchema: { type: "object" } }, { name: "two", inputSchema: { type: "object" } }], dispatch: () => "ok",
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const first = await client.listTools();
  assert.equal(first.tools[0]?.name, "one");
  assert.equal((await client.listTools({ cursor: first.nextCursor })).tools[0]?.name, "two");
  await assert.rejects(client.listTools({ cursor: "bad" }), /invalid tools\/list cursor/u);
  await Promise.all([client.close(), server.close()]);
});
