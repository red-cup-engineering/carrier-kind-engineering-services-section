import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import { bridgeMcpStdio } from "../src/federation.mjs";
import { mcpHttpTransport } from "../src/client.mjs";
import { mcpResource } from "../src/http.mjs";

const context = (request) => ({ request, url: new URL(request.url), input: { bytes: async () => new Uint8Array(await request.clone().arrayBuffer()) } });
const double = { name: "double", inputSchema: { type: "object", required: ["value"], properties: { value: { type: "integer" } } }, handler: ({ value }) => ({ value: value * 2 }) };
const triple = { name: "triple", inputSchema: { type: "object", required: ["value"], properties: { value: { type: "integer" } } }, handler: ({ value }) => ({ value: value * 3 }) };
const initialize = (id) => ({ jsonrpc: "2.0", id, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "harness", version: "1" } } });

function host(fetchImpl, cache) {
  const input = new PassThrough();
  const output = new PassThrough();
  const lines = [];
  let partial = "";
  output.on("data", (chunk) => {
    partial += chunk;
    for (let at = partial.indexOf("\n"); at >= 0; at = partial.indexOf("\n")) { lines.push(JSON.parse(partial.slice(0, at))); partial = partial.slice(at + 1); }
  });
  const bridge = bridgeMcpStdio(mcpHttpTransport({ url: "https://mcp.test/mcp", fetchImpl }), { input, output, cache });
  const send = (message) => input.write(`${JSON.stringify(message)}\n`);
  const answered = async (id) => { for (;;) { const line = lines.find((entry) => entry.id === id); if (line !== undefined) return line; await new Promise((resolve) => setImmediate(resolve)); } };
  return { send, answered, lines, bridge };
}

test("the bridge starts a host from the server's last handshake while the server is slow, and only a call waits for it", async () => {
  let stored;
  const cache = { read: () => stored, write: (entry) => { stored = structuredClone(entry); } };
  const first = mcpResource({ name: "node", version: "1", tools: [double] });
  const met = host(async (url, init) => first.handler(context(new Request(url, init))), cache);
  met.send(initialize(1));
  assert.equal((await met.answered(1)).result.serverInfo.name, "node");
  met.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  met.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual((await met.answered(2)).result.tools.map((tool) => tool.name), ["double"]);
  assert.deepEqual(stored.tools.tools.map((tool) => tool.name), ["double"]);
  assert.equal(stored.requested, "2025-06-18");

  // The node now answers only when released, and has gained a tool.
  const later = mcpResource({ name: "node", version: "1", tools: [double, triple] });
  let release;
  const released = new Promise((resolve) => { release = resolve; });
  const slow = host(async (url, init) => { await released; return later.handler(context(new Request(url, init))); }, cache);
  slow.send(initialize(1));
  const started = await slow.answered(1);
  assert.equal(started.result.serverInfo.name, "node");
  assert.equal(started.result.capabilities.tools.listChanged, true);
  slow.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  slow.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual((await slow.answered(2)).result.tools.map((tool) => tool.name), ["double"]);
  slow.send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "triple", arguments: { value: 2 } } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(slow.lines.some((line) => line.id === 3), false);
  release();
  assert.equal((await slow.answered(3)).result.structuredContent.value, 6);
  await slow.bridge.done();
  for (let turn = 0; turn < 50 && !slow.lines.some((line) => line.method === "notifications/tools/list_changed"); turn += 1) await new Promise((resolve) => setImmediate(resolve));
  assert.ok(slow.lines.some((line) => line.method === "notifications/tools/list_changed"));
  assert.deepEqual(stored.tools.tools.map((tool) => tool.name), ["double", "triple"]);
});

test("a host asking another protocol version is the server's to answer, not the cache's", async () => {
  const stored = { initialize: { protocolVersion: "2025-03-26", capabilities: {}, serverInfo: { name: "stale", version: "0" } }, requested: "2025-03-26" };
  const node = mcpResource({ name: "node", version: "1", tools: [double] });
  const met = host(async (url, init) => node.handler(context(new Request(url, init))), { read: () => stored, write: () => undefined });
  met.send(initialize(1));
  assert.equal((await met.answered(1)).result.serverInfo.name, "node");
});
