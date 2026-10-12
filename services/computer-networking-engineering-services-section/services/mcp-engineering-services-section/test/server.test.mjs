import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";
import { createMcpServer, mcpOperationTools } from "../src/server.mjs";

function echoServer(extra = {}) {
  return createMcpServer({
    name: "echo-server",
    version: "1.2.3",
    instructions: "echoes text",
    tools: [
      { name: "echo", description: "echoes text", inputSchema: { type: "object", required: ["text"], properties: { text: { type: "string" } }, additionalProperties: false }, handler: (args) => ({ echoed: args.text }) },
      { name: "explode", inputSchema: { type: "object", properties: {}, additionalProperties: false }, handler: () => { throw new Error("boom"); } },
      { name: "pre-shaped", handler: () => ({ content: [{ type: "text", text: "raw" }], isError: false }) },
      { name: "whoami", visible: (context) => context.principal !== undefined, handler: (_args, context) => ({ principal: context.principal }) },
    ],
    resources: [{ uri: "file:///note.txt", name: "note", read: (uri) => ({ mimeType: "text/plain", text: `hello from ${uri}` }) }],
    resourceTemplates: [{ uriTemplate: "note://{id}", name: "notes", read: (_uri, { id }) => (id === "missing" ? undefined : { mimeType: "text/plain", text: `note ${id}` }) }],
    prompts: [{ name: "greet", arguments: [{ name: "who", required: true }], get: ({ who }) => [{ role: "user", content: { type: "text", text: `greet ${who}` } }] }],
    ...extra,
  });
}
const call = (server, method, params, context) => server.handleMessage({ jsonrpc: "2.0", id: 1, method, ...(params === undefined ? {} : { params }) }, context);

test("initialize negotiates the protocol version and reports capabilities", async () => {
  const server = echoServer();
  const offered = await call(server, "initialize", { protocolVersion: "2025-03-26" });
  assert.equal(offered.result.protocolVersion, "2025-03-26");
  const unknown = await call(server, "initialize", { protocolVersion: "1999-01-01" });
  assert.equal(unknown.result.protocolVersion, "2025-11-25");
  assert.deepEqual(Object.keys(offered.result.capabilities).sort(), ["completions", "logging", "prompts", "resources", "tools"]);
  assert.deepEqual(offered.result.serverInfo, { name: "echo-server", version: "1.2.3" });
  assert.equal(offered.result.instructions, "echoes text");
});

test("notifications and id-less requests never answer; batches answer their requests", async () => {
  const server = echoServer();
  assert.equal(await server.handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
  assert.equal(await server.handleMessage({ jsonrpc: "2.0", method: "tools/call", params: { name: "nope" } }), null);
  const batch = await server.handleMessage([{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 2, method: "ping" }]);
  assert.deepEqual(batch.map((answer) => answer.id), [1, 2]);
});

test("tools: listing hides handlers and invisible tools, calls admit arguments and wrap results", async () => {
  const server = echoServer();
  assert.deepEqual((await call(server, "tools/list")).result.tools.map((tool) => tool.name), ["echo", "explode", "pre-shaped"]);
  assert.deepEqual((await call(server, "tools/list", {}, { principal: "p" })).result.tools.map((tool) => tool.name), ["echo", "explode", "pre-shaped", "whoami"]);
  assert.equal((await call(server, "tools/list")).result.tools[2].inputSchema.type, "object");
  assert.deepEqual((await call(server, "tools/call", { name: "echo", arguments: { text: "hi" } })).result.structuredContent, { echoed: "hi" });
  assert.deepEqual((await call(server, "tools/call", { name: "pre-shaped" })).result, { content: [{ type: "text", text: "raw" }], isError: false });
  const refused = await call(server, "tools/call", { name: "echo", arguments: {} });
  assert.equal(refused.error.code, -32602);
  assert.match(refused.error.message, /arguments outside inputSchema/u);
  assert.equal((await call(server, "tools/call", { name: "whoami" })).error.code, -32602);
  assert.deepEqual((await call(server, "tools/call", { name: "whoami" }, { principal: "p" })).result.structuredContent, { principal: "p" });
  const exploded = await call(server, "tools/call", { name: "explode" });
  assert.equal(exploded.result.isError, true);
  assert.match(exploded.result.content[0].text, /boom/u);
});

test("resources, templates and prompts", async () => {
  const server = echoServer();
  assert.deepEqual((await call(server, "resources/list")).result.resources, [{ uri: "file:///note.txt", name: "note" }]);
  assert.deepEqual((await call(server, "resources/read", { uri: "file:///note.txt" })).result.contents, [{ uri: "file:///note.txt", mimeType: "text/plain", text: "hello from file:///note.txt" }]);
  assert.equal((await call(server, "resources/templates/list")).result.resourceTemplates[0].uriTemplate, "note://{id}");
  assert.equal((await call(server, "resources/read", { uri: "note://seven" })).result.contents[0].text, "note seven");
  assert.equal((await call(server, "resources/read", { uri: "note://missing" })).error.code, -32002);
  assert.equal((await call(server, "resources/read", { uri: "file:///ghost" })).error.code, -32002);
  assert.equal((await call(server, "prompts/list")).result.prompts[0].name, "greet");
  assert.equal((await call(server, "prompts/get", { name: "greet", arguments: { who: "you" } })).result.messages[0].content.text, "greet you");
  assert.equal((await call(server, "nothing/here")).error.code, -32601);
});

test("pagination walks the catalog with opaque cursors", async () => {
  const server = echoServer({ pageSize: 2 });
  const first = (await call(server, "tools/list")).result;
  assert.equal(first.tools.length, 2);
  const second = (await call(server, "tools/list", { cursor: first.nextCursor })).result;
  assert.deepEqual(second.tools.map((tool) => tool.name), ["pre-shaped"]);
  assert.equal(second.nextCursor, undefined);
});

test("operation tools project typed operations and execute through the context's platform", async () => {
  const operations = [{ id: "upper", description: "Uppercases.", effects: ["compute"], domain: { schema: { type: "object", required: ["value"], properties: { value: { type: "string" } } } }, codomain: { schema: { type: "object" } } },
    { id: "refuse", effects: [], domain: { schema: { type: "object" } }, codomain: { schema: true } }];
  const platform = { execute: (id, input) => (id === "upper" ? { ok: true, value: { value: input.value.toUpperCase() } } : { ok: false, refusal: { code: "missing_scope", message: "scope esi-wallet is missing" } }) };
  const server = createMcpServer({ name: "ops", version: "1", tools: mcpOperationTools(operations) });
  const listed = (await call(server, "tools/list")).result.tools;
  assert.deepEqual(listed.map((tool) => [tool.name, tool.outputSchema]), [["upper", { type: "object" }], ["refuse", undefined]]);
  assert.deepEqual((await call(server, "tools/call", { name: "upper", arguments: { value: "hi" } }, { platform })).result.structuredContent, { value: "HI" });
  assert.equal((await call(server, "tools/call", { name: "refuse" }, { platform })).result.content[0].text, "missing_scope: scope esi-wallet is missing");
  assert.match((await call(server, "tools/call", { name: "upper", arguments: { value: "x" } })).result.content[0].text, /HostUnavailable/u);
});

test("stdio answers line-framed and Content-Length-framed messages in their own framing", async () => {
  const server = echoServer();
  const input = new PassThrough();
  const output = new PassThrough();
  let written = "";
  output.on("data", (chunk) => { written += chunk.toString("utf8"); });
  const stdio = server.serveStdio({ input, output });
  const framed = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "ping" });
  input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" })}\n`);
  input.write(`Content-Length: ${Buffer.byteLength(framed)}\r\n\r\n${framed}`);
  input.end("not json\n");
  await new Promise((resolve) => setImmediate(resolve));
  await stdio.done();
  assert.ok(written.startsWith(`{"jsonrpc":"2.0","id":1,"result":{}}\nContent-Length: `));
  assert.match(written, /"id":2,"result":\{\}/u);
  assert.match(written, /-32700/u);
});
