import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { eventForRow } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/events";
import { segmentPath } from "@red-cup-engineering/semiotic-eavt-services-section/journal/filesystem/segment-store";
import { journalDirectoryOf } from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-verified-read-"));
  const logPath = path.join(journalDirectoryOf(root), "2026", "09", "07", "2026-09-07-admit-feed.jsonl");
  const statement = eventForRow(["entity", "attribute", "value", "2026-09-07T00:00:00.000Z"], "test");
  try {
    openJournal(root).appendEvents(logPath, [statement]);
    run({ root, logPath, statement, filePath: segmentPath(logPath) });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function snapshot(root) {
  return readdirSync(root, { recursive: true }).sort().flatMap((name) => {
    const file = path.join(root, name);
    const stat = statSync(file);
    return stat.isFile() ? [[name, stat.mtimeMs, readFileSync(file).toString("base64")]] : [];
  });
}

test("unchanged retained witnesses share verification through reads, folds, and feed churn without writes", () => fixture(({ root, logPath, statement }) => {
  const binding = openJournal(root);
  const first = binding.read(logPath)[0];
  const before = snapshot(root);
  assert.equal(binding.read(logPath)[0], first);
  assert.equal(journal.scanCausalTerritory(root, 0, (count) => count + 1).result, 1);
  assert.equal(journal.scanTerritory(root, 0, (count) => count + 1).result, 1);
  assert.deepEqual(snapshot(root), before);
  const next = eventForRow(["other", "attribute", "next", "2026-09-07T00:01:00.000Z"], "test");
  binding.appendEvents(logPath, [next]);
  assert.equal(binding.read(logPath).find((value) => value.id === statement.id), first);
}));

test("warm territory and date scans reject an in-place changed witness despite unchanged directory metadata", () => fixture(({ root, filePath }) => {
  const scan = () => journal.scanCausalTerritory(root, 0, (count) => count + 1);
  assert.equal(scan().result, 1);
  const dir = path.dirname(filePath);
  const before = statSync(dir).mtimeMs;
  const original = readFileSync(filePath, "utf8");
  writeFileSync(filePath, original.replace('"value"', '"wrong"'));
  assert.equal(statSync(dir).mtimeMs, before);
  assert.throws(scan, /does not match/);
  assert.throws(() => journal.scanCausalAll(root, "2026-09-07", 0, (count) => count + 1), /does not match/);
  assert.throws(scan, /does not match/);
  writeFileSync(filePath, original);
  assert.equal(scan().result, 1);
}));

test("a segment line whose id is not its content's address is refused", () => fixture(({ root, filePath, statement }) => {
  journal.scanCausalTerritory(root, 0, (count) => count + 1);
  const other = eventForRow(["different", "attribute", "value", "2026-09-07T00:00:00.000Z"], "test");
  writeFileSync(filePath, `${JSON.stringify({ ...other, id: statement.id })}\n`);
  assert.throws(() => journal.scanCausalTerritory(root, 0, (count) => count + 1), /does not match/);
}));

test("a complete segment line that is not a witness is corruption, and a torn final line is left unread", () => fixture(({ root, filePath }) => {
  const original = readFileSync(filePath, "utf8");
  writeFileSync(filePath, `${original}{"partial":`);
  assert.equal(journal.scanCausalTerritory(root, 0, (count) => count + 1).result, 1);
  writeFileSync(filePath, `${original}not a witness\n`);
  assert.throws(() => journal.scanCausalTerritory(root, 0, (count) => count + 1), /not a witness/);
}));
