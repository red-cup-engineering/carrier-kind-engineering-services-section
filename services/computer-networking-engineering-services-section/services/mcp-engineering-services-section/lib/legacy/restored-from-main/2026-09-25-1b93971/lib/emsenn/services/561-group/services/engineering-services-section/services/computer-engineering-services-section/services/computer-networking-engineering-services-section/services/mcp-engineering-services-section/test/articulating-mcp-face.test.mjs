import assert from "node:assert/strict";
import test from "node:test";
import { ARTICULATE_OPERATION, ARTICULATING_APEX } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/articulating";
import { handleArticulatingMcp } from "../scripts/articulating-mcp-face.mjs";

const input = Object.freeze({ tokenMark: { source: "test" }, claimMark: "alive" });

test("MCP lists and calls the exact action apex without a resident server", async () => {
  const listed = await handleArticulatingMcp({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), [ARTICULATE_OPERATION]);
  const called = await handleArticulatingMcp({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: ARTICULATE_OPERATION, arguments: { input } } });
  assert.equal(called.result.isError, undefined);
  const receipt = JSON.parse(called.result.content[0].text);
  assert.equal(receipt.apex, ARTICULATING_APEX);
  assert.equal(receipt.cell.kind, "utterance.articulation.cell");
});
