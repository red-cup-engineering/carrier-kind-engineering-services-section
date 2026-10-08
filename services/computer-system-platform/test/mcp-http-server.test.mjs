import assert from "node:assert/strict";
import test from "node:test";
import { defineType } from "@red-cup-engineering/computer-data-services-section/type-system";
import { createComputerPlatform } from "@red-cup-engineering/computer-system-platform";
import { declareCapabilityOperation } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";
import { mcpResource } from "@red-cup-engineering/mcp-engineering-services-section/http";
import { mcpOperationTools } from "@red-cup-engineering/mcp-engineering-services-section/server";

const context = (request) => ({ request, url: new URL(request.url), input: { bytes: async () => new Uint8Array(await request.clone().arrayBuffer()) } });
const post = (body, headers = {}) => new Request("https://assist.test/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json", ...headers }, body: JSON.stringify(body) });
const text = defineType({ id: "test:text", name: "Text", description: "Text.", parents: [], schema: { type: "object", required: ["value"], properties: { value: { type: "string" } }, additionalProperties: false } });
const upper = defineType({ id: "test:upper", name: "Upper", description: "Uppercased text.", parents: [], schema: { type: "object", required: ["value"], properties: { value: { type: "string", pattern: "^[A-Z]*$" } } } });
assert.ok(text.ok && upper.ok);
const uppercase = declareCapabilityOperation({ id: "uppercase", description: "Uppercases text.", domain: text.value, codomain: upper.value, effects: ["compute"], capability: "uppercase" });
const refusing = declareCapabilityOperation({ id: "refusing", description: "Always refuses.", domain: text.value, codomain: upper.value, effects: ["compute"], capability: "refusing" });
assert.ok(uppercase.ok && refusing.ok);
const operations = [uppercase.value, refusing.value];

async function startedPlatform() {
  const platform = createComputerPlatform({
    id: "test",
    operations,
    providers: [
      { name: "uppercase", start: () => (input) => ({ value: String(input.value).toUpperCase() }) },
      { name: "refusing", start: () => () => { throw Object.assign(new Error("scope esi-wallet is missing"), { code: "missing_scope" }); } },
    ],
  });
  await platform.start();
  return platform;
}

test("a platform's typed operations are an MCP catalog, executed by the platform each request binds and closed after it", async () => {
  const opened = [];
  const resource = mcpResource({
    name: "bound", version: "1", tools: mcpOperationTools(operations),
    verifyToken: (bearer) => (bearer === "allowed" ? "receiver" : undefined),
    bind: async ({ principal }) => {
      assert.equal(principal, "receiver");
      const platform = await startedPlatform();
      opened.push(platform);
      return { platform, close: () => platform.close() };
    },
  });
  const call = (name, value) => resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: { value } } }, { authorization: "Bearer allowed" })));
  assert.equal((await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "tools/list" })))).status, 401);
  assert.equal(opened.length, 0);
  assert.deepEqual((await (await call("uppercase", "bound")).json()).result.structuredContent, { value: "BOUND" });
  const refused = (await (await call("refusing", "x")).json()).result;
  assert.equal(refused.isError, true);
  assert.match(refused.content[0].text, /^missing_scope: scope esi-wallet is missing$/u);
  assert.equal(opened.length, 2);
  assert.ok(opened.every((platform) => platform.closed()));
});
