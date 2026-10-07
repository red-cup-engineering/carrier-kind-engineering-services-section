import assert from "node:assert/strict";
import test from "node:test";
import { ARTICULATE_OPERATION, ARTICULATING_APEX } from "@red-cup-engineering/signcell/articulating";
import { articulatingMcpTools } from "../src/articulating-tools.mjs";
import { createMcpServer } from "../src/server.mjs";

const input = Object.freeze({ tokenMark: { source: "test" }, claimMark: "alive" });

test("the articulating apex is served as tools through the one MCP server", async () => {
  const server = createMcpServer({ name: "articulating", version: "1", tools: articulatingMcpTools });
  const listed = await server.handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), [ARTICULATE_OPERATION]);
  const called = await server.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: ARTICULATE_OPERATION, arguments: { input } } });
  assert.equal(called.result.isError, undefined);
  const receipt = JSON.parse(called.result.content[0].text);
  assert.equal(receipt.apex, ARTICULATING_APEX);
  assert.equal(receipt.cell.kind, "utterance.articulation.cell");
});
