import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { readFileCensus } from "@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/file-census/service";
import { readLegibility } from "@red-cup-engineering/computer-code-development-engine/monitoring/filesystem/legibility/service";
import { readProofPlay } from "@red-cup-engineering/computer-code-development-engine/monitoring/proof-play/service";
import { proofPlayReadoutContract } from "@red-cup-engineering/computer-code-development-engine/monitoring/proof-play/schema";
import { directoryReadoutRecordSchemaContract, recordDirectoryReadout } from "@red-cup-engineering/knowledge-system-server/directory-readout";

test("filesystem census and legibility retain their moved behavior", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-filesystem-monitor-"));
  try {
    mkdirSync(path.join(root, "src"));
    writeFileSync(path.join(root, "src", "example.mts"), "export const example = 1;\n");
    writeFileSync(path.join(root, "README.md"), "# Example\n");

    const census = readFileCensus(root, {
      ...defaultFilesystemBinding(root),
      maxContentFilesPerTree: 10,
      maxContentBytesPerTree: 1024,
    });
    assert.equal(census.files, 2);
    assert.equal(census.truncated, false);
    assert.equal(census.loc, 2);

    const legibility = readLegibility(root, defaultFilesystemBinding(root));
    assert.equal(legibility.files, census.files);
    assert.equal(legibility.statFailures, 0);
    assert.equal(legibility.trees.reduce((files, tree) => files + tree.files, 0), census.files);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("directory readout records observations without manufacturing plans", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-directory-readout-"));
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-directory-readout-data-"));
  try {
    writeFileSync(path.join(root, "README.md"), "# Observed package\n");

    const record = recordDirectoryReadout(root, {
      ...defaultFilesystemBinding(dataRoot),
      dataRoot,
      at: "2026-07-14T00:00:00.000Z",
    });

    assert.equal(record.kind, "metroplat.directory-readout.record");
    assert.equal(record.operation, "record-directory-readout");
    assert.equal(record.journal.feed, "record-directory-readout");
    assert.equal(record.journal.appended, 1);
    assert.equal(record.readout.root, path.resolve(root));
    assert.equal("proofPlay" in record.readout, false);
    assert.equal(record.readout.nextReads.some((entry) => entry.verb === "proof-play"), true);
    assert.equal("nextActions" in record, false);
    assert.equal(directoryReadoutRecordSchemaContract.assert(record), record);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("Proof-Play interpretation has one canonical monitoring owner", () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-proof-play-monitor-"));
  try {
    writeFileSync(path.join(root, "claim.md"), "---\nsubject: observed\n---\n# Claim\n");

    const readout = readProofPlay(root, defaultFilesystemBinding(root));

    assert.equal(readout.kind, "metroplat.proof-play.readout");
    assert.equal(readout.operation, "read-proof-play");
    assert.equal(readout.ground.root, path.resolve(root));
    assert.equal(readout.ground.files.length, 1);
    assert.equal(readout.fields.some((field) => field.field === "language" && field.value === "markdown"), true);
    assert.equal("arena" in readout, false);
    assert.equal("frontier" in readout, false);
    assert.equal(proofPlayReadoutContract.assert(readout), readout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
