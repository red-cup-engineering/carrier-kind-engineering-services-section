import assert from "node:assert/strict";
import test from "node:test";
import { mcpResource } from "../src/http.mjs";
import { createMcpClient, mcpHttpTransport } from "../src/client.mjs";

const context = (request, extra = {}) => ({ request, url: new URL(request.url), input: { bytes: async () => new Uint8Array(await request.clone().arrayBuffer()) }, ...extra });
const post = (body, headers = {}) => new Request("https://mcp.test/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers }, body: JSON.stringify(body) });
const double = { name: "double", inputSchema: { type: "object", required: ["value"], properties: { value: { type: "integer" } } }, handler: ({ value }, context) => ({ value: value * 2, principal: context.principal ?? null }) };

test("retrieval, unknown protocol versions and foreign origins are refused", async () => {
  const resource = mcpResource({ name: "t", version: "1", tools: [double], allowedOrigins: ["https://client.test"] });
  assert.equal(resource.match, "/mcp");
  const retrieval = await resource.handler(context(new Request("https://mcp.test/mcp")));
  assert.equal(retrieval.status, 405);
  assert.equal(retrieval.headers.get("allow"), "POST");
  assert.equal((await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { "mcp-protocol-version": "1900-01-01" })))).status, 400);
  assert.equal((await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: "https://mcp.test" })))).status, 200);
  assert.equal((await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: "https://client.test" })))).status, 200);
  assert.equal((await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: "https://evil.test" })))).status, 403);
  assert.equal((await resource.handler(context(post({ jsonrpc: "2.0", method: "notifications/initialized" })))).status, 202);
});

test("bearer authentication challenges with the protected-resource metadata and hands the principal to tools", async () => {
  const resource = mcpResource({ name: "t", version: "1", tools: [double], realm: "t", resourceMetadataUrl: (url) => `${url.origin}/.well-known/oauth-protected-resource/mcp`, verifyToken: (token) => (token === "good" ? "reader" : undefined) });
  const request = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "double", arguments: { value: 21 } } };
  const missing = await resource.handler(context(post(request)));
  assert.equal(missing.status, 401);
  assert.equal(missing.headers.get("www-authenticate"), 'Bearer realm="t", resource_metadata="https://mcp.test/.well-known/oauth-protected-resource/mcp"');
  assert.match((await resource.handler(context(post(request, { authorization: "Bearer bad" })))).headers.get("www-authenticate"), /error="invalid_token"/u);
  const accepted = await resource.handler(context(post(request, { authorization: "Bearer good" })));
  assert.deepEqual((await accepted.json()).result.structuredContent, { value: 42, principal: "reader" });
});

test("a bound context is closed after each message, and an event-stream-only client gets one event", async () => {
  let closed = 0;
  const resource = mcpResource({ name: "t", version: "1", tools: [double], bind: () => ({ close: () => { closed += 1; } }) });
  const response = await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { accept: "text/event-stream" })));
  assert.equal(response.headers.get("content-type"), "text/event-stream");
  assert.match(await response.text(), /^event: message\ndata: \{"jsonrpc":"2.0","id":1,"result":\{\}\}\n\n$/u);
  assert.equal(closed, 1);
});

test("the client speaks to the resource over Streamable HTTP, carrying the session it was given", async () => {
  const resource = mcpResource({ name: "t", version: "1", tools: [double], sessions: true });
  const seen = [];
  const fetchImpl = async (url, init) => { const request = new Request(url, init); seen.push(request.headers.get("mcp-session-id")); return resource.handler(context(request)); };
  const client = createMcpClient({ transport: mcpHttpTransport({ url: "https://mcp.test/mcp", fetchImpl }) });
  assert.deepEqual((await client.listTools()).tools.map((tool) => tool.name), ["double"]);
  assert.deepEqual(await client.call("double", { value: 4 }), { value: 8, principal: null });
  assert.equal(seen[0], null);
  assert.ok(seen.slice(1).every((id) => typeof id === "string" && id === seen[1]));
  await client.close();
  const stale = await resource.handler(context(post({ jsonrpc: "2.0", id: 9, method: "ping" }, { "mcp-session-id": seen[1] })));
  assert.equal(stale.status, 404);
});

test("federation republishes upstream tools under a prefix and forwards calls; the stdio bridge carries a host to an upstream", async () => {
  const { federateMcpServers } = await import("../src/federation.mjs");
  const { createMcpServer } = await import("../src/server.mjs");
  const upstream = mcpResource({ name: "up", version: "1", tools: [double, { name: "odd:name", handler: () => "ok" }] });
  const fetchImpl = async (url, init) => upstream.handler(context(new Request(url, init)));
  const federation = await federateMcpServers([{ prefix: "calc", description: "calculator", url: "https://mcp.test/mcp" }, { prefix: "gone", url: "https://gone.test/mcp" }], {
    fetchImpl: async (url, init) => (String(url).includes("gone") ? new Response("down", { status: 502 }) : fetchImpl(url, init)),
  });
  assert.deepEqual(federation.tools.map((tool) => tool.name), ["calc_double", "calc_odd_name"]);
  assert.equal(federation.unavailable[0].prefix, "gone");
  const front = createMcpServer({ name: "front", version: "1", toolSources: [federation.tools] });
  const called = await front.handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "calc_double", arguments: { value: 5 } } });
  assert.deepEqual(called.result.structuredContent, { value: 10, principal: null });
  assert.match((await front.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" })).result.tools[0].description, /^\[calculator\] /u);

  const { PassThrough } = await import("node:stream");
  const { bridgeMcpStdio } = await import("../src/federation.mjs");
  const { mcpHttpTransport } = await import("../src/client.mjs");
  const input = new PassThrough();
  const output = new PassThrough();
  let written = "";
  output.on("data", (chunk) => { written += chunk; });
  const bridge = bridgeMcpStdio(mcpHttpTransport({ url: "https://mcp.test/mcp", fetchImpl }), { input, output });
  input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "double", arguments: { value: 2 } } })}\n`);
  input.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
  await new Promise((resolve) => setImmediate(resolve));
  await bridge.done();
  assert.equal(written.trim().split("\n").length, 1);
  assert.equal(JSON.parse(written).result.structuredContent.value, 4);
});
