import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { journalAppendAddress } from "@red-cup-engineering/computer-system-engine/journal/filesystem/operations";
import { listDailyFeedsInternal } from "@red-cup-engineering/computer-system-engine/journal/filesystem/write-journal-store";
import { appendArrivalAtRoot, readArrivalLogProjection } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
const DATE = "2026-10-01", AT = `${DATE}T01:02:03Z`;
const ROOT_NAME = "@red-cup-engineering/computer-system-engine";
function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "journal-kind-arrival-"));
  try { return run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

for (const relativeRoot of [false, true]) test(`arrival packet and append use the same explicit subject and date (relative root: ${relativeRoot})`, () => fixture((root) => {
  if (relativeRoot) root = path.relative(process.cwd(), root);
  appendArrivalAtRoot(root, { specversion: "1.0", id: "synthetic-arrival", source: "urn:test:fixture",
    type: "fixture.arrival", time: AT, datacontenttype: "application/json", data: { present: true } },
    { at: AT, subject: "custom-arrival", rootName: ROOT_NAME });
  const feed = journalAppendAddress(root, "arrival", AT, { subject: "custom-arrival", rootName: ROOT_NAME });
  const projection = readArrivalLogProjection(feed.path, { readFileUtf8: file => readFileSync(file, "utf8") });
  assert.equal(projection.validPackets, 1);
  assert.equal(projection.obstructedPackets, 0);
  assert.deepEqual(listDailyFeedsInternal(root, DATE), [feed.path]);
}));

