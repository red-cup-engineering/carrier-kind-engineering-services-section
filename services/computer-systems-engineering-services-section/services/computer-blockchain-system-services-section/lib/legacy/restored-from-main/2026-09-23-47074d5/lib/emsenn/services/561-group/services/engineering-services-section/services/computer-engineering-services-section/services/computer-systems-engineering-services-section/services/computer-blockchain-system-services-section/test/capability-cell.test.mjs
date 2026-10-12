import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assayBlockchainCapabilityCell, discoverBlockchainCapabilityCells } from "../src/capability-cell.mjs";

test("a fragment cannot advertise itself as a complete cell", () => {
  const root = mkdtempSync(join(tmpdir(), "blockchain-cell-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({"x-agentic-metro-enterprise":{"node-id":"fragment","actor":"urn:ame:fragment","operation-catalog":{"one":{}}}}));
  const assay = assayBlockchainCapabilityCell(root);
  assert.equal(assay.disposition, "cut-required");
  assert.ok(assay.defects.includes("missing-account"));
});

test("every mandatory organ and exactly one capability admits a cell", () => {
  const root = mkdtempSync(join(tmpdir(), "blockchain-cell-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({"x-agentic-metro-enterprise":{"node-id":"cell","actor":"urn:ame:cell","operation-catalog":{"one":{}}}}));
  for (const path of [".git", "content/contracts", "content/schemas", "bin", "content/evm/accounts", "content/agent-cards", "content/offers", "ops", "test", "data"]) {
    mkdirSync(join(root, path), { recursive: true });
    writeFileSync(join(root, path, path === ".git" ? "HEAD" : "organ"), "present");
  }
  assert.equal(assayBlockchainCapabilityCell(root).disposition, "admitted");
});

test("mesh discovery admits only explicitly declared capcell loci", () => {
  const section = mkdtempSync(join(tmpdir(), "blockchain-section-"));
  const declared = join(section, "services", "declared"), fragment = join(section, "services", "fragment");
  mkdirSync(join(declared, "content", "capcell"), { recursive: true });
  mkdirSync(fragment, { recursive: true });
  writeFileSync(join(declared, "content", "capcell", "manifest.json"), "{}");
  writeFileSync(join(fragment, "package.json"), "{}");
  assert.deepEqual(discoverBlockchainCapabilityCells(section), [declared]);
});
