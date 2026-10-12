import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";
import { createMcpServer, mcpToolsOfOperations } from "../scripts/mcp-json-rpc.mjs";

function echoServer() {
  return createMcpServer({
    name: "echo-server",
    version: "1.2.3",
    instructions: "echoes text",
    tools: [
      {
        name: "echo",
        description: "echoes text",
        inputSchema: { type: "object", required: ["text"], properties: { text: { type: "string" } }, additionalProperties: false },
        handler: (args) => ({ echoed: args.text }),
      },
      {
        name: "explode",
        description: "always throws",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        handler: () => { throw new Error("boom"); },
      },
      {
        name: "pre-shaped",
        description: "returns an already-shaped CallToolResult",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        handler: () => ({ content: [{ type: "text", text: "raw" }], isError: false }),
      },
    ],
    resources: [
      { uri: "file:///note.txt", name: "note", read: (uri) => ({ uri, mimeType: "text/plain", text: "hello" }) },
    ],
  });
}

test("initialize reports protocol version, capabilities, and server info", async () => {
  const server = echoServer();
  const reply = await server.handleRequest({ jsonrpc: "2.0", id: 1, method: "initialize" });
  assert.equal(reply.result.protocolVersion, "2025-06-18");
  assert.deepEqual(reply.result.capabilities, { tools: { listChanged: false }, resources: { listChanged: false } });
  assert.deepEqual(reply.result.serverInfo, { name: "echo-server", version: "1.2.3" });
  assert.equal(reply.result.instructions, "echoes text");
});

test("ping answers an empty result", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 2, method: "ping" });
  assert.deepEqual(reply.result, {});
});

test("a notification never produces a reply", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(reply, null);
});

test("a request with no id never produces a reply, even on failure", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", method: "tools/call", params: { name: "nope" } });
  assert.equal(reply, null);
});

test("tools/list strips handlers and lists every declared tool", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 3, method: "tools/list" });
  const names = reply.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, ["echo", "explode", "pre-shaped"]);
  assert.ok(reply.result.tools.every((tool) => tool.handler === undefined));
});

test("tools/call wraps a raw handler return as text plus structuredContent", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "echo", arguments: { text: "hi" } } });
  assert.deepEqual(reply.result.structuredContent, { echoed: "hi" });
  assert.equal(reply.result.content[0].type, "text");
  assert.match(reply.result.content[0].text, /echoed/);
});

test("tools/call passes an already-shaped CallToolResult through unchanged", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "pre-shaped", arguments: {} } });
  assert.deepEqual(reply.result, { content: [{ type: "text", text: "raw" }], isError: false });
});

test("tools/call refuses arguments outside the declared inputSchema", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "echo", arguments: {} } });
  assert.equal(reply.error.code, -32602);
  assert.match(reply.error.message, /arguments outside inputSchema/);
});

test("tools/call refuses an unknown tool name", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "ghost" } });
  assert.equal(reply.error.code, -32601);
});

test("a thrown handler error becomes an isError tool result, not a JSON-RPC error", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "explode" } });
  assert.equal(reply.result.isError, true);
  assert.match(reply.result.content[0].text, /boom/);
});

test("resources/list and resources/read", async () => {
  const server = echoServer();
  const listed = await server.handleRequest({ jsonrpc: "2.0", id: 9, method: "resources/list" });
  assert.deepEqual(listed.result.resources, [{ uri: "file:///note.txt", name: "note" }]);
  const read = await server.handleRequest({ jsonrpc: "2.0", id: 10, method: "resources/read", params: { uri: "file:///note.txt" } });
  assert.deepEqual(read.result.contents, [{ uri: "file:///note.txt", mimeType: "text/plain", text: "hello" }]);
});

test("resources/read refuses an unknown uri", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 11, method: "resources/read", params: { uri: "file:///ghost.txt" } });
  assert.equal(reply.error.code, -32601);
});

test("an unknown method is refused", async () => {
  const reply = await echoServer().handleRequest({ jsonrpc: "2.0", id: 12, method: "prompts/list" });
  assert.equal(reply.error.code, -32601);
});

test("mcpToolsOfOperations projects an operation carrier's id/description/schemas", () => {
  const operations = [{ id: "op_one", description: "does one thing", domain: { schema: { type: "object" } }, codomain: { schema: true } }];
  assert.deepEqual(mcpToolsOfOperations(operations), [{ name: "op_one", description: "does one thing", inputSchema: { type: "object" }, outputSchema: {} }]);
});

test("serveStdio answers one JSON-RPC request per input line", async () => {
  const server = echoServer();
  const input = new PassThrough();
  const output = new PassThrough();
  let written = "";
  output.on("data", (chunk) => { written += chunk.toString("utf8"); });
  await server.serveStdio({ input, output });
  input.end(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" })}\n`);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(JSON.parse(written.trim()), { jsonrpc: "2.0", id: 1, result: {} });
});

// A real loopback round-trip (bind + connect in one process) is exercised manually against this
// module (see the task's MCP verification step: apps/mcp-stdio.mjs's sibling `serveHttp` shares
// the same `handleRequest` dispatch already covered above); this sandbox's network policy refuses
// same-process loopback connections from an ESM entry point regardless of the server code (a
// CommonJS `require("node:http")` script with byte-identical listen/request logic connects fine,
// an otherwise-identical `.mjs` script does not), so this test only checks the transport starts,
// listens on an assigned port, and stops cleanly.
test("serveHttp starts a listening server on an assigned port and stops cleanly", async () => {
  const { server, port, close } = await echoServer().serveHttp({ port: 0 });
  assert.equal(server.listening, true);
  assert.equal(typeof port, "number");
  assert.ok(port > 0);
  await close();
  assert.equal(server.listening, false);
});
