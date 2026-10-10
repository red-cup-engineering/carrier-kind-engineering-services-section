import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { actionMcpHandle } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";
import { CATALOG_PROFILE, trcApex } from "../src/index.mjs";

const catalog = {
  profile: CATALOG_PROFILE,
  nodes: [
    { type: "resource", parent: null, recognize: { op: "true" } },
    { type: "mark", parent: "resource", recognize: { op: "content-includes", value: "mark" } },
  ],
};
const input = { catalog, resource: { path: "repo://spore/mark.rmn", content: "mark" } };

test("one action apex projects matching discovery, CLI, and MCP faces", async () => {
  assert.equal(trcApex.discovery.programs.length, 7);
  assert.deepEqual(trcApex.discovery.programs.map((program) => program.name).sort(), [
    "audit-typed-resource-catalog", "catalog-node-workspace-sources", "catalog-workspace-content-graph", "check-language-cone", "classify-typed-resource", "project-trc-receipt-rmn", "scan-temporal-failure-marks",
  ]);

  const mcpTools = await actionMcpHandle(trcApex, { jsonrpc: "2.0", id: 1, method: "tools/list" }, {});
  assert.equal(mcpTools.result.tools.length, trcApex.discovery.programs.length);
  const mcpCall = await actionMcpHandle(trcApex, {
    jsonrpc: "2.0", id: 2, method: "tools/call",
    params: { name: "classify-typed-resource", arguments: { input } },
  }, {});
  const receipt = JSON.parse(mcpCall.result.content[0].text);
  assert.equal(receipt.classification, "mark");
  assert.ok(!JSON.stringify(receipt).includes("/home/"));

  const territoryCall = await actionMcpHandle(trcApex, {
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: "catalog-node-workspace-sources", arguments: { input: { resources: [
      { path: "services/cell/package.json", content: JSON.stringify({ name: "@test/cell", version: "1.0.0" }) },
    ] } } },
  }, {});
  assert.equal(JSON.parse(territoryCall.result.content[0].text).packages[0].name, "@test/cell");
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
