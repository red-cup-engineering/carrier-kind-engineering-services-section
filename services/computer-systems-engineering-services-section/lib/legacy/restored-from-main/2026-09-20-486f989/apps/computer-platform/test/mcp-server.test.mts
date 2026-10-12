import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMcpToolServer } from "../dist/mcp-server.mjs";
import { serveMcpToolServerStdio } from "../dist/mcp-stdio.mjs";

test("advertises JSON Schema tools, rejects invalid arguments before effects, and returns execution errors as tool results", async () => {
  let calls = 0;
  const server = createMcpToolServer({
    serverInfo: { name: "test", version: "1" },
    tools: [{ name: "double", inputSchema: { type: "object", required: ["value"], properties: { value: { type: "integer" } }, additionalProperties: false } }],
    dispatch: (_name, args) => { calls += 1; if (args.value === 3) throw new Error("handler failed"); return { value: Number(args.value) * 2 }; },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const catalog = await client.listTools();
  assert.equal(catalog.tools[0]?.inputSchema?.properties?.value?.type, "integer");
  await assert.rejects(client.callTool({ name: "double", arguments: { value: "no" } }), /arguments outside inputSchema/u);
  assert.equal(calls, 0);
  await assert.rejects(client.callTool({ name: "missing", arguments: {} }), /unknown tool/u);
  assert.equal(calls, 0);
  const failed = await client.callTool({ name: "double", arguments: { value: 3 } });
  assert.equal(failed.isError, true);
  assert.equal(calls, 1);
  const ok = await client.callTool({ name: "double", arguments: { value: 2 } });
  assert.equal(ok.isError, undefined);
  assert.equal(calls, 2);
  await Promise.all([client.close(), server.close()]);
});

test("compiles supplied schemas at server creation", async () => {
  let calls = 0;
  const inputSchema = { type: "object", required: ["value"], properties: { value: { type: "integer" } }, additionalProperties: false };
  const server = createMcpToolServer({
    serverInfo: { name: "compiled", version: "1" },
    tools: [{ name: "compiled", inputSchema }],
    dispatch: () => { calls += 1; return "ok"; },
  });
  (inputSchema.properties.value as { type: string }).type = "string";
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  await assert.rejects(client.callTool({ name: "compiled", arguments: { value: "now-string" } }), /arguments outside inputSchema/u);
  await client.callTool({ name: "compiled", arguments: { value: 2 } });
  assert.equal(calls, 1);
  await Promise.all([client.close(), server.close()]);
});

test("serves initialize, list, and native MCP tool results over stdio", async () => {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const replies: unknown[] = [];
  stdout.setEncoding("utf8");
  stdout.on("data", (chunk: string) => {
    for (const line of chunk.split("\n")) if (line.length > 0) replies.push(JSON.parse(line));
  });
  const server = await serveMcpToolServerStdio({
    serverInfo: { name: "stdio", version: "1" },
    dispatchResult: "mcp",
    tools: [{ name: "native", inputSchema: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } }, additionalProperties: false } }],
    dispatch: (_name, args) => args.ok === true
      ? { content: [{ type: "image", data: "AA==", mimeType: "image/png" }], structuredContent: { state: "complete" } }
      : { content: [{ type: "text", text: "declared refusal" }], isError: true },
  }, { stdin, stdout });
  const request = (id: number, method: string, params: unknown) => stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  const reply = async (id: number): Promise<Record<string, unknown>> => {
    while (true) {
      const found = replies.find((candidate) => typeof candidate === "object" && candidate !== null && (candidate as { id?: unknown }).id === id);
      if (found !== undefined) return found as Record<string, unknown>;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };
  request(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  assert.equal((await reply(1)).error, undefined);
  stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  request(2, "tools/list", {});
  assert.equal(((await reply(2)).result as { tools: readonly { name: string }[] }).tools[0]?.name, "native");
  request(3, "tools/call", { name: "native", arguments: { ok: true } });
  const complete = (await reply(3)).result as { content: readonly { type: string }[]; structuredContent?: { state?: string } };
  assert.equal(complete.content[0]?.type, "image");
  assert.equal(complete.structuredContent?.state, "complete");
  request(4, "tools/call", { name: "native", arguments: { ok: false } });
  assert.equal(((await reply(4)).result as { isError?: boolean }).isError, true);
  await server.close();
});

test("refuses malformed native MCP results", async () => {
  const server = createMcpToolServer({
    serverInfo: { name: "native-validation", version: "1" },
    dispatchResult: "mcp",
    tools: [{ name: "native" }],
    dispatch: () => ({ content: [{ type: "not-mcp-content" }] }),
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  await assert.rejects(client.callTool({ name: "native", arguments: {} }), /invalid native MCP result/u);
  await Promise.all([client.close(), server.close()]);
});

test("native successful results require declared structured output; errors remain admissible", async () => {
  const server = createMcpToolServer({serverInfo:{name:"output-contract",version:"1"}, dispatchResult:"mcp", tools:[{name:"native",outputSchema:{type:"object",required:["count"],properties:{count:{type:"integer"}}}}], dispatch:(_name,args) => args.fail ? {content:[{type:"text",text:"refused"}],isError:true} : {content:[{type:"text",text:"missing structured output"}]}});
  const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
  const client=new Client({name:"test-client",version:"1"});
  await Promise.all([server.connect(serverTransport),client.connect(clientTransport)]);
  await assert.rejects(client.callTool({name:"native",arguments:{}}),/omitted structured content/);
  assert.equal((await client.callTool({name:"native",arguments:{fail:true}})).isError,true);
  await Promise.all([client.close(),server.close()]);
});


test("MCP calls use an existing platform registry, effects, and lifetime", async () => {
  const { createComputerPlatform, bindingsProviders } = await import("../dist/index.mjs");
  const { declareCapabilityOperation } = await import("../dist/operations.mjs");
  const { defineType } = await import("@red-cup-engineering/computer-data-engine");
  const declared = defineType({ id: "mcp:object", name: "Object", description: "Object", parents: [], schema: { type: "object" } });
  if (!declared.ok) throw new Error(declared.refusal.message);
  const operation = declareCapabilityOperation({ id: "echo", domain: declared.value, codomain: declared.value, effects: ["echo"] });
  if (!operation.ok) throw new Error(operation.refusal.message);
  let calls = 0;
  const platform = createComputerPlatform({ operations: [operation.value], providers: bindingsProviders({ echo: (args: unknown) => { calls++; return args; } }) });
  const server = createMcpToolServer({ serverInfo: { name: "existing", version: "1" }, platform, executionOptions: (_name, _args, meta) => {
    assert.equal(typeof meta, "object");
    return { allowedEffects: ["echo"] };
  } });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "client", version: "1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.callTool({ name: "echo", arguments: { retained: true } });
  assert.deepEqual(result.structuredContent, { retained: true });
  assert.equal(calls, 1);
  assert.equal(platform.operation("echo"), operation.value);
  await Promise.all([client.close(), server.close()]);
  assert.equal(platform.closed(), false);
  await platform.close();
});

test("native tool schemas retain local definition references when admitted inside platform envelopes", async () => {
  const schema = { type: "object", $defs: { positive: { type: "integer", minimum: 1 } }, properties: { value: { $ref: "#/$defs/positive" } }, required: ["value"] };
  let calls = 0;
  const server = createMcpToolServer({ serverInfo: { name: "references", version: "1" }, tools: [{ name: "references", inputSchema: schema, outputSchema: schema }], dispatchResult: "mcp", dispatch: (_name, args) => { calls++; return { content: [{ type: "text", text: "ok" }], structuredContent: args }; } });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "references-client", version: "1" });
  await Promise.all([server.connect(st), client.connect(ct)]);
  try {
    await assert.rejects(client.callTool({ name: "references", arguments: { value: 0 } }), /arguments outside inputSchema/u);
    assert.equal(calls, 0);
    const result = await client.callTool({ name: "references", arguments: { value: 2 } });
    assert.equal(result.isError, undefined); assert.equal(calls, 1);
  } finally { await Promise.all([server.close(), client.close()]); }
});
