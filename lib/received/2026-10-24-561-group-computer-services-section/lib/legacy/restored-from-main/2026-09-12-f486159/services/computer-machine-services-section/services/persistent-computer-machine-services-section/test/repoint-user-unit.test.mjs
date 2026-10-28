import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { RECEIPT_CATEGORY, RECEIPT_OBJECT_KIND, repointUserUnit, rewriteUnitKeyLine } from "../scripts/repoint-user-unit.mjs";

const SAMPLE_UNIT = [
  "[Unit]",
  "Description=Sample unit",
  "",
  "[Service]",
  "Type=oneshot",
  "WorkingDirectory=/home/emsenn/info/lib/emsenn/services/sample-package",
  "EnvironmentFile=-/home/emsenn/.config/emsenn/sample.env",
  "ExecStart=/home/emsenn/.local/bin/node src/service.mjs --operation run-due",
  "",
].join("\n");

test("rewriteUnitKeyLine: rewrites exactly one line, reports found and previous, and leaves the rest untouched", () => {
  const result = rewriteUnitKeyLine(SAMPLE_UNIT, "WorkingDirectory", "/new/path");
  assert.equal(result.found, true);
  assert.equal(result.previous, "/home/emsenn/info/lib/emsenn/services/sample-package");
  assert.ok(result.text.includes("WorkingDirectory=/new/path"));
  assert.ok(result.text.includes("EnvironmentFile=-/home/emsenn/.config/emsenn/sample.env"), "EnvironmentFile line is untouched");
  assert.ok(result.text.includes("ExecStart=/home/emsenn/.local/bin/node src/service.mjs --operation run-due"), "ExecStart line is untouched");
});

test("rewriteUnitKeyLine: reports found=false for a key the unit does not carry", () => {
  const result = rewriteUnitKeyLine(SAMPLE_UNIT, "Restart", "on-failure");
  assert.equal(result.found, false);
  assert.equal(result.previous, null);
  assert.equal(result.text, SAMPLE_UNIT);
});

test("repointUserUnit: refuses a relative unitFile", async () => {
  const result = await repointUserUnit({ unitFile: "relative.service", workingDirectory: "/a", execStart: "/b" });
  assert.equal(result.outcome, "refused");
  assert.equal(result.refusals[0].step, "usage");
});

test("repointUserUnit: refuses when the unit carries no WorkingDirectory= line", async () => {
  const root = mkdtempSync(join(tmpdir(), "repoint-user-unit-"));
  try {
    const unitFile = join(root, "no-working-directory.service");
    writeFileSync(unitFile, "[Service]\nExecStart=/bin/true\n");
    const calls = [];
    const result = await repointUserUnit({
      unitFile,
      workingDirectory: "/new/path",
      execStart: "/new/path/exec",
      dataRoot: root,
      run: (command, args) => { calls.push({ command, args }); return ""; },
    });
    assert.equal(result.outcome, "refused");
    assert.equal(result.refusals[0].step, "working-directory-missing");
    assert.equal(calls.length, 0, "no daemon-reload was issued");
    assert.equal(readFileSync(unitFile, "utf8"), "[Service]\nExecStart=/bin/true\n", "the unit file was not mutated");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("repointUserUnit: rewrites WorkingDirectory=/ExecStart=, daemon-reloads, and journals a receipt", async () => {
  const root = mkdtempSync(join(tmpdir(), "repoint-user-unit-"));
  try {
    const unitFile = join(root, "sample.service");
    writeFileSync(unitFile, SAMPLE_UNIT);
    const calls = [];
    const result = await repointUserUnit({
      unitFile,
      workingDirectory: "/home/emsenn/.local/share/561-group/releases/sample-package/current",
      execStart: "/home/emsenn/.local/bin/node /home/emsenn/.local/share/561-group/releases/sample-package/current/src/service.mjs --operation run-due",
      dataRoot: root,
      recordedAt: "2026-09-05T00:00:00.000Z",
      run: (command, args) => { calls.push({ command, args }); return ""; },
    });

    assert.equal(result.outcome, "repointed");
    assert.equal(result.previousWorkingDirectory, "/home/emsenn/info/lib/emsenn/services/sample-package");
    assert.equal(result.previousExecStart, "/home/emsenn/.local/bin/node src/service.mjs --operation run-due");

    const written = readFileSync(unitFile, "utf8");
    assert.ok(written.includes("WorkingDirectory=/home/emsenn/.local/share/561-group/releases/sample-package/current"));
    assert.ok(written.includes("ExecStart=/home/emsenn/.local/bin/node /home/emsenn/.local/share/561-group/releases/sample-package/current/src/service.mjs --operation run-due"));
    assert.ok(written.includes("EnvironmentFile=-/home/emsenn/.config/emsenn/sample.env"), "EnvironmentFile line is untouched");

    assert.deepEqual(calls, [{ command: "systemctl", args: ["--user", "daemon-reload"] }]);

    const journal = createSemanticRecordJournal({ root, objectKind: RECEIPT_OBJECT_KIND });
    const [found] = journal.query({ category: RECEIPT_CATEGORY }).filter((row) => row.id === result.receipt.id);
    assert.ok(found, "the receipt was persisted");
    assert.equal(found.record.unitFile, unitFile);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
