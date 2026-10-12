import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { actionMcpHandle } from "@red-cup-engineering/agentic-relation-engine/running";
import { CATALOG_PROFILE } from "@red-cup-engineering/typed-resource-catalog";
import { trcApex } from "../src/actions.mjs";

const catalog = {
  profile: CATALOG_PROFILE,
  nodes: [
    { type: "resource", parent: null, recognize: { op: "true" } },
    { type: "mark", parent: "resource", recognize: { op: "json-schema", schema: { type: "object", properties: { kind: { const: "mark" } }, required: ["kind"] } } },
  ],
};
const input = { catalog, resource: { path: "repo://spore/mark.rmn", content: '{"kind":"mark"}' } };

test("one action apex projects matching discovery, CLI, and MCP faces", () => {
  assert.equal(trcApex.discovery.bins.length, 4);
  assert.deepEqual(trcApex.discovery.bins.map((bin) => bin.name).sort(), [
    "audit-typed-resource-catalog", "check-language-cone", "classify-typed-resource", "project-trc-receipt-rmn",
  ]);

  const mcpTools = actionMcpHandle(trcApex, { jsonrpc: "2.0", id: 1, method: "tools/list" }, {});
  assert.equal(mcpTools.result.tools.length, trcApex.discovery.bins.length);
  const mcpCall = actionMcpHandle(trcApex, {
    jsonrpc: "2.0", id: 2, method: "tools/call",
    params: { name: "classify-typed-resource", arguments: { input } },
  }, {});
  const receipt = JSON.parse(mcpCall.result.content[0].text);
  assert.equal(receipt.classification, "mark");
  assert.ok(!JSON.stringify(receipt).includes("/home/"));
});

test("CLI is a thin stateless projection of the same action apex", () => {
  const cli = fileURLToPath(new URL("../scripts/typed-resource-catalog.mjs", import.meta.url));
  const run = spawnSync(process.execPath, [cli, "classify-typed-resource"], {
    input: JSON.stringify(input), encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).classification, "mark");

  const tooLarge = spawnSync(process.execPath, [cli, "classify-typed-resource"], {
    input: "x".repeat(1_048_577), encoding: "utf8",
  });
  assert.equal(tooLarge.status, 64);
  assert.match(tooLarge.stderr, /stdin exceeds 1048576 UTF-8 bytes/u);
});
