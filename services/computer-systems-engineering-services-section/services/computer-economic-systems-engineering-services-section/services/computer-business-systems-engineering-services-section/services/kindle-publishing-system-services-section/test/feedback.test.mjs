import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { feedbackForNicheScorer, importKdpReport, parseCsv } from "../src/feedback.mjs";

test("CSV handles quoted fields and produces content-addressed scorer evidence", async () => {
  assert.equal(parseCsv('Title,Units,Net Royalty\n"Harbor, One",2,$4.20\n')[0].Title, "Harbor, One");
  const root = await mkdtemp(join(tmpdir(), "kdp-feedback-")), path = join(root, "report.csv"); await writeFile(path, "ASIN,Title,Units,Net Royalty\nB000000001,Harbor One,3,$6.30\n");
  const receipt = await importKdpReport({ path, importedAt: "2026-09-29T00:00:00Z", bookMetadata: { B000000001: { id: "harbor-one", niche: "harbor romance" } } });
  assert.match(receipt.id, /^ni:\/\/\/sha-256;/u); assert.deepEqual(feedbackForNicheScorer(receipt).map(({ niche, units }) => ({ niche, units })), [{ niche: "harbor romance", units: 3 }]);
  assert.match(receipt.content.source.sha256, /^[a-f0-9]{64}$/u);
  assert.equal(parseCsv("ASIN,Units\nB000000002,\n").length, 1);
  const unknownPath = join(root, "unknown.csv"); await writeFile(unknownPath, "ASIN,Title,Units,Net Royalty\nB000000002,Unknown,,\n");
  const unknown = await importKdpReport({ path: unknownPath, importedAt: "2026-09-29T00:00:00Z" }); assert.equal(unknown.content.sales[0].units, null);
});
