import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { scanTerritory } from "../src/scan-territory.mjs";
import { authorizeTerritory, decodeTerritoryScanRequest, encodeTerritoryScanRequest } from "../src/protocol.mjs";

const SERVICE_ROOT = fileURLToPath(new URL("..", import.meta.url));

test("the conformance die can assay its own closed rule fixtures without self-indictment", () => {
  assert.equal(scanTerritory(SERVICE_ROOT).conforming, true);
});

test("scanner rejects forbidden live carriers but excludes preserved legacy bytes", () => {
  const root = mkdtempSync(join(tmpdir(), "phase2-scan-"));
  try {
    mkdirSync(join(root, "data")); mkdirSync(join(root, "src")); mkdirSync(join(root, "content/contracts"), { recursive: true }); mkdirSync(join(root, "lib/schemas"), { recursive: true }); mkdirSync(join(root, ".agents/skills/old-fabric"), { recursive: true }); mkdirSync(join(root, "content/assets/legacy"), { recursive: true });
    writeFileSync(join(root, "data/live.jsonl"), "{}\n");
    writeFileSync(join(root, "src/bad.mjs"), 'import x from "@x402/core"; import y from "@red-cup-engineering/metroplat/journal"; const retiredActor = "urn:ame:metroplat"; const four = 2; const journal = "events.jsonl"; const cell = { scale: "task" }; const retiredProfile = "org.emsenn.rmn.core.v2"; const flatTrace = "org.emsenn.rmn.typed-circuit-residue.v2"; const displacedAccount = "org.emsenn.evm.sovereign-enterprise-account.v2";\n');
    writeFileSync(join(root, "package.json"), '{"account":"eip155:31337:0x0000000000000000000000000000000000000001"}\n');
    writeFileSync(join(root, "content/contracts/old.json"), '{"kind":"metroplat.contract"}\n');
    writeFileSync(join(root, "lib/schemas/old.json"), '{"const":"metroplat.energetic-obligation"}\n');
    writeFileSync(join(root, ".agents/skills/old-fabric/SKILL.md"), "Write JSONL jobs and run dispatch-jsonl.mjs.\n");
    writeFileSync(join(root, "content/assets/legacy/kept.jsonl"), "{}\n");
    const report = scanTerritory(root);
    assert.equal(report.conforming, false); assert.equal(report.byRule["authoritative-jsonl"], 1); assert.equal(report.byRule["jsonl-operation"], 1); assert.equal(report.byRule["jsonl-instruction"], 1); assert.equal(report.byRule["metroplat-umbrella"], 2); assert.equal(report.byRule["metroplat-law-namespace"], 2); assert.equal(report.byRule["direct-x402-implementation"], 1); assert.equal(report.byRule["four-ordinal"], 1);
    assert.equal(report.byRule["flat-effect-scale"], 1); assert.equal(report.byRule["retired-rmn-core-profile"], 1); assert.equal(report.byRule["flat-circuit-residue-profile"], 1); assert.equal(report.byRule["retired-enterprise-account-profile"], 1); assert.equal(report.byRule["duplicate-manifest-account"], 1); assert.equal(report.violations.some(({ path }) => path.includes("kept.jsonl")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("scanner accepts only the closed method", () => {
  const root = mkdtempSync(join(tmpdir(), "phase2-scan-"));
  try { mkdirSync(join(root, "data")); writeFileSync(join(root, "data/receipt.nq"), "<urn:s> <urn:p> <urn:o> <urn:g> .\n"); assert.equal(scanTerritory(root).conforming, true); }
  finally { rmSync(root, { recursive: true, force: true }); }
});

test("package boundaries distinguish semantic die operations from executable projections and reject unproved boards", () => {
  const root = mkdtempSync(join(tmpdir(), "phase2-board-"));
  try {
    mkdirSync(join(root, "services", "child"), { recursive: true });
    writeFileSync(join(root, "services", "child", "package.json"), '{"name":"child","x-agentic-metro-enterprise":{"node-id":"child","operation-catalog":{"act":{}}}}\n');
    writeFileSync(join(root, "package.json"), JSON.stringify({
      name: "false-die",
      bin: { transport: "./src/transport.mjs", executor: "./src/executor.mjs" },
      "x-agentic-metro-enterprise": { "node-id": "false-board", "operation-catalog": { transact: { contract: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } } },
    }));
    const report = scanTerritory(root);
    assert.equal(report.byRule["die-operation-cardinality"], undefined);
    assert.equal(report.byRule["unproved-board-runtime"], 1);
    assert.equal(report.cutFrontier[0].settlement, ".");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a leaf settlement with several semantic operations is an unfabricated board even when it has one executable", () => {
  const root = mkdtempSync(join(tmpdir(), "phase2-die-"));
  try {
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "false-die", bin: { transport: "./bin/server.mjs" }, "x-agentic-metro-enterprise": { "node-id": "false-die", "operation-catalog": { left: {}, right: {} } } }));
    const report = scanTerritory(root);
    assert.equal(report.byRule["die-operation-cardinality"], 1);
    assert.equal(report.cutFrontier[0].settlement, ".");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the RMN request fixes the ruleset and cannot escape its material grant", () => {
  assert.equal(decodeTerritoryScanRequest(encodeTerritoryScanRequest("lib")).relativePath, "lib");
  assert.throws(() => decodeTerritoryScanRequest(encodeTerritoryScanRequest("../outside")), /escaping/u);
  const root = mkdtempSync(join(tmpdir(), "phase2-grant-"));
  try {
    mkdirSync(join(root, "inside"));
    assert.equal(authorizeTerritory(root, "inside"), join(root, "inside"));
    assert.throws(() => authorizeTerritory(root, "../outside"), /escapes/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
