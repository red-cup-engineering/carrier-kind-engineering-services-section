import assert from "node:assert/strict";
import test from "node:test";
import { bindMcpTools } from "../src/tool-binding.mjs";

const tool = { name: "work_read", inputSchema: { type: "object", required: ["limit"], properties: { limit: { type: "integer", minimum: 1 } }, additionalProperties: false }, outputSchema: { type: "object", required: ["count"], properties: { count: { type: "integer" } } } };
test("discovers only granted tools and admits call values at both boundaries", async () => {
  let calls = 0;
  const binding = await bindMcpTools({ client: { async listTools() { return { tools: [tool, { ...tool, name: "not_granted" }] }; }, async callTool() { calls += 1; return { content: [], structuredContent: { count: 1 } }; } }, allowlist: ["work_read"] });
  assert.deepEqual(binding.tools.map((entry) => entry.function.name), ["work_read"]);
  await assert.rejects(binding.toolHandlers.work_read({ limit: 0 }), /input schema/u);
  assert.equal(calls, 0);
  assert.deepEqual(await binding.toolHandlers.work_read({ limit: 1 }), { content: [], structuredContent: { count: 1 } });
});
