import assert from "node:assert/strict";
import test from "node:test";
import { observeCurrentArticulatingCone, OBS_REGION } from "../examples/obsmetrologia-articulating-catalog.mjs";

test("actual Obsmetrologia articulating legs are seated at one witnessed language apex", () => {
  const receipt = observeCurrentArticulatingCone();
  const byName = new Map(receipt.legs.map((leg) => [leg.name, leg]));
  assert.equal(byName.get("lean").classification.classification, "articulating-lean-reading");
  assert.equal(byName.get("solidity").classification.classification, "articulating-solidity-reading");
  assert.equal(byName.get("package").classification.classification, "articulating-package-reading");
  assert.equal(byName.get("node").classification.classification, "articulating-node-reading");
  assert.equal(byName.get("schema").classification.classification, "articulating-schema-reading");
  assert.equal(byName.get("evm-deployment").classification.classification, "articulating-evm-deployment-reading");
  assert.equal(byName.get("rmn").classification.classification, "articulating-rmn-reading");
  assert.equal(byName.get("a2a").classification.classification, "articulating-a2a-reading");
  assert.equal(byName.get("mcp").classification.classification, "articulating-mcp-reading");
  for (const leg of receipt.legs) assert.equal(leg.placement, "seated");
  assert.deepEqual(receipt.missing, []);
  assert.deepEqual(receipt.scattered, []);
  assert.equal(receipt.agreement, "witnessed");
  assert.equal(receipt.disposition, "coherent");
  assert.deepEqual(receipt.obligations, []);
  assert.ok(!receipt.obligations.some((item) => item.kind === "scattered-leg" && item.leg === "node" && item.expectedRegion === OBS_REGION));
  assert.ok(!JSON.stringify(receipt).includes("/home/emsenn/"));
});
