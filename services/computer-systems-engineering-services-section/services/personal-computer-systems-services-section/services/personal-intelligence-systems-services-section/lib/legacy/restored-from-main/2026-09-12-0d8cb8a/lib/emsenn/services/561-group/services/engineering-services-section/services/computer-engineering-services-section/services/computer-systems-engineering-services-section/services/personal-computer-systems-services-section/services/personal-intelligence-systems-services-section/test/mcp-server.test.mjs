import test from "node:test";
import assert from "node:assert/strict";
import { handleMcpRequest } from "../src/mcp/mcp-server.mjs";

// ToolError mirrors the shape pinned for src/tools/registry.mjs: a named
// error class with a `code` field, thrown by handlers on bad args/missing
// scope. Redeclared locally so this test does not depend on the tools
// agent's module existing yet.
class ToolError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

function makeRegistry() {
  const echoTool = {
    name: "echo",
    description: "Echoes args back as data.",
    parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    async handler(ctx, args) {
      return { data: { echoed: args.text, userId: ctx.userId }, observations: [] };
    },
  };
  const boomTool = {
    name: "boom",
    description: "Always throws a ToolError.",
    parameters: { type: "object", properties: {} },
    async handler() {
      throw new ToolError("boom: bad args", "BAD_ARGS");
    },
  };
  const crashTool = {
    name: "crash",
    description: "Throws a plain, unexpected error.",
    parameters: { type: "object", properties: {} },
    async handler() {
      throw new Error("unexpected failure");
    },
  };
  const toolRegistry = [echoTool, boomTool, crashTool];
  return {
    toolRegistry,
    getTool(name) {
      return toolRegistry.find((t) => t.name === name);
    },
  };
}

function post(bodyText, { headers } = {}) {
  return new Request("https://eve-assist.561.group/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: bodyText,
  });
}

function rpc(method, params, id = 1) {
  return post(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
}

async function ctxFactory() {
  return { userId: 42, characterId: 12345 };
}

test("GET returns 405 with Allow: POST", async () => {
  const registry = makeRegistry();
  const req = new Request("https://eve-assist.561.group/mcp", { method: "GET" });
  const res = await handleMcpRequest(req, { registry, ctxFactory });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("allow"), "POST");
});

test("invalid JSON body -> -32700 parse error", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(post("{not json"), { registry, ctxFactory });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.jsonrpc, "2.0");
  assert.equal(body.error.code, -32700);
  assert.equal(body.id, null);
});

test("malformed JSON-RPC envelope -> -32600 invalid request", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(post(JSON.stringify({ foo: "bar" })), { registry, ctxFactory });
  const body = await res.json();
  assert.equal(body.error.code, -32600);
});

test("array (batch) body -> -32600 invalid request (batch unsupported)", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(post(JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "ping" }])), {
    registry,
    ctxFactory,
  });
  const body = await res.json();
  assert.equal(body.error.code, -32600);
});

test("unknown method -> -32601 method not found", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("nonexistent/method", {}), { registry, ctxFactory });
  const body = await res.json();
  assert.equal(body.error.code, -32601);
  assert.equal(body.id, 1);
});

test("initialize returns protocolVersion, capabilities, serverInfo", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(
    rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test" } }),
    { registry, ctxFactory },
  );
  const body = await res.json();
  assert.equal(body.result.protocolVersion, "2025-06-18");
  assert.deepEqual(body.result.capabilities, { tools: {} });
  assert.deepEqual(body.result.serverInfo, { name: "personal-intelligence-systems", version: "0.1.0" });
});

test("initialize honors a caller-supplied serverInfo", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("initialize", {}), {
    registry,
    ctxFactory,
    serverInfo: { name: "eve-assist", version: "0.1.0" },
  });
  const body = await res.json();
  assert.deepEqual(body.result.serverInfo, { name: "eve-assist", version: "0.1.0" });
});

test("notifications/initialized -> 202 empty body, no JSON-RPC envelope", async () => {
  const registry = makeRegistry();
  const req = post(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));
  const res = await handleMcpRequest(req, { registry, ctxFactory });
  assert.equal(res.status, 202);
  const text = await res.text();
  assert.equal(text, "");
});

test("ping returns empty result object", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("ping", {}), { registry, ctxFactory });
  const body = await res.json();
  assert.deepEqual(body.result, {});
});

test("tools/list lists registered tools with inputSchema from parameters", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("tools/list", {}), { registry, ctxFactory });
  const body = await res.json();
  assert.equal(body.result.tools.length, 3);
  const echo = body.result.tools.find((t) => t.name === "echo");
  assert.equal(echo.description, "Echoes args back as data.");
  assert.deepEqual(echo.inputSchema, registry.toolRegistry[0].parameters);
});

test("tools/call success -> isError false, content text is JSON of {data, observations}", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("tools/call", { name: "echo", arguments: { text: "hi" } }), {
    registry,
    ctxFactory,
  });
  const body = await res.json();
  assert.equal(body.result.isError, false);
  const parsed = JSON.parse(body.result.content[0].text);
  assert.deepEqual(parsed, { data: { echoed: "hi", userId: 42 }, observations: [] });
});

test("tools/call with ToolError -> isError true, message surfaced, no JSON-RPC error", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("tools/call", { name: "boom", arguments: {} }), { registry, ctxFactory });
  const body = await res.json();
  assert.equal(body.error, undefined);
  assert.equal(body.result.isError, true);
  assert.equal(body.result.content[0].text, "boom: bad args");
});

test("tools/call with unexpected handler error -> isError true, not a crash", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("tools/call", { name: "crash", arguments: {} }), { registry, ctxFactory });
  const body = await res.json();
  assert.equal(body.result.isError, true);
  assert.equal(body.result.content[0].text, "unexpected failure");
});

test("tools/call unknown tool name -> isError true", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("tools/call", { name: "does-not-exist", arguments: {} }), {
    registry,
    ctxFactory,
  });
  const body = await res.json();
  assert.equal(body.result.isError, true);
  assert.match(body.result.content[0].text, /Unknown tool/);
});

test("tools/call missing name -> isError true, not a JSON-RPC error", async () => {
  const registry = makeRegistry();
  const res = await handleMcpRequest(rpc("tools/call", {}), { registry, ctxFactory });
  const body = await res.json();
  assert.equal(body.error, undefined);
  assert.equal(body.result.isError, true);
});

test("handleMcpRequest validates its dependencies", async () => {
  const req = post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }));
  await assert.rejects(() => handleMcpRequest(req, { registry: null, ctxFactory }), TypeError);
  await assert.rejects(
    () => handleMcpRequest(req, { registry: makeRegistry(), ctxFactory: undefined }),
    TypeError,
  );
  await assert.rejects(() => handleMcpRequest(null, { registry: makeRegistry(), ctxFactory }), TypeError);
});
