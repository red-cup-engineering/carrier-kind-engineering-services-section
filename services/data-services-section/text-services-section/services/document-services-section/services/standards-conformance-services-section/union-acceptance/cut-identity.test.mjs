import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { PHASE2_RULESET_ID, scanTerritory } from "../src/scan-territory.mjs";

const CUT_PROFILE = "org.emsenn.phase2.territory-cut.v1";
const NI_SHA256 = /^ni:\/\/\/sha-256;[\w-]{43}$/u;

function manifest({ reverse = false } = {}) {
  const law = reverse
    ? { "operation-catalog": { right: {}, left: {} }, "node-id": "test-settlement" }
    : { "node-id": "test-settlement", "operation-catalog": { left: {}, right: {} } };
  return reverse
    ? JSON.stringify({ "x-agentic-metro-enterprise": law, name: "test-settlement" })
    : JSON.stringify({ name: "test-settlement", "x-agentic-metro-enterprise": law });
}

function fixture(options) {
  const root = mkdtempSync(join(tmpdir(), "phase2-cut-identity-"));
  writeFileSync(join(root, "package.json"), manifest(options));
  return root;
}

function expectedCutId(entry) {
  const encoded = encodeRelationalValue({
    profile: CUT_PROFILE,
    ruleset: PHASE2_RULESET_ID,
    settlement: entry.settlement,
    violationCount: entry.violationCount,
    rules: entry.rules,
    paths: entry.paths,
  });
  return semanticId(["ascribe", encoded.type, encoded.term]);
}

test("canonical-cut-ni-identity", () => {
  const root = fixture();
  try {
    const entry = scanTerritory(root).cutFrontier[0];
    assert.match(entry.cutId, NI_SHA256);
    assert.equal(entry.cutId, expectedCutId(entry));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("key-order-independent-cut-identity", () => {
  const left = fixture(), right = fixture({ reverse: true });
  try {
    const leftId = scanTerritory(left).cutFrontier[0].cutId;
    const rightId = scanTerritory(right).cutFrontier[0].cutId;
    assert.match(leftId, NI_SHA256);
    assert.match(rightId, NI_SHA256);
    assert.equal(leftId, rightId);
  } finally {
    rmSync(left, { recursive: true, force: true });
    rmSync(right, { recursive: true, force: true });
  }
});

test("repeatable-cut-identity", () => {
  const root = fixture();
  try {
    const first = scanTerritory(root).cutFrontier[0].cutId;
    const second = scanTerritory(root).cutFrontier[0].cutId;
    assert.match(first, NI_SHA256);
    assert.equal(first, second);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("material-change-changes-cut-identity", () => {
  const root = fixture();
  try {
    const before = scanTerritory(root).cutFrontier[0].cutId;
    mkdirSync(join(root, "data"));
    writeFileSync(join(root, "data/live.jsonl"), "{}\n");
    const after = scanTerritory(root).cutFrontier[0].cutId;
    assert.match(before, NI_SHA256);
    assert.match(after, NI_SHA256);
    assert.notEqual(before, after);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
