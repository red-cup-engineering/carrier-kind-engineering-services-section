import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { importLegacyClockkeeper, LEGACY_ARCHIVE_CONTRACT } from "../src/legacy-clockkeeper-import.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function id(value) { return `urn:${digest(value)}`; }
function append(root, kind, record) { const path = join(root, "records", kind, "2026", "07", "19", `${kind}.jsonl`); mkdirSync(join(root, "records", kind, "2026", "07", "19"), { recursive: true }); writeFileSync(path, `${JSON.stringify(record)}\n`); return path; }

function fixture(root) {
  const request = { type: "ScheduledActivityDeliveryRequest", schedule: { firstDueAt: "2026-07-19T00:00:00.000Z", intervalSeconds: 60, maxDeliveries: null } };
  const requestDigest = digest(request), scheduleId = id({ provider: "urn:legacy:clockkeeper", customer: "urn:test:customer", requestDigest });
  const schedule = { type: "ScheduleRegistration", id: scheduleId, scheduleId, provider: "urn:legacy:clockkeeper", customer: "urn:test:customer", request, requestDigest, status: "active", registeredAt: "2026-07-19T00:00:00.000Z", customerTerritoryMutation: false };
  const activity = { "@context": "https://www.w3.org/ns/activitystreams", type: "Create", object: { type: "Pulse" } };
  const receipt = { type: "ScheduledDeliveryReceipt", id: id({ scheduleId, occurrence: 0, activity, disposition: "dry-run", response: null }), scheduleId, occurrence: 0, scheduledFor: "2026-07-19T00:00:00.000Z", attemptedAt: "2026-07-19T00:00:00.000Z", activity, activityDigest: digest(activity), disposition: "dry-run", targetResponse: null, targetResponseDigest: null, process: {}, retryAuthorized: false, customerTerritoryMutation: false };
  const retirementRequest = "sha256:retirement-request";
  const retirement = { type: "ScheduleRetirement", id: id({ scheduleId, requestDigest: retirementRequest }), scheduleId, provider: "urn:legacy:clockkeeper", customer: "urn:test:customer", contract: "clocked-activity-delivery-retirement", requestDigest: retirementRequest, registrationDigest: digest(schedule), status: "retired", retiredAt: "2026-07-19T00:01:00.000Z", customerTerritoryMutation: false };
  return { schedulePath: append(root, "schedules", schedule), receiptPath: append(root, "delivery-receipts", receipt), retirementPath: append(root, "schedule-retirements", retirement) };
}

test("imports validated legacy Clockkeeper JSONL once without delivery or source mutation", async () => {
  const base = mkdtempSync(join(tmpdir(), "legacy-clockkeeper-import-")); const source = join(base, "source"), destination = join(base, "destination");
  try {
    const paths = fixture(source), before = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(path, "utf8")]));
    const options = { sourceRoot: source, destinationRoot: destination };
    const first = await importLegacyClockkeeper(options), second = await importLegacyClockkeeper(options);
    assert.deepEqual(Object.values(first.counts).map((count) => count.imported), [1, 1, 1]);
    assert.deepEqual(Object.values(second.counts).map((count) => count.skipped), [1, 1, 1]);
    assert.equal(first.deliveryActivated, false); assert.equal(first.sourceMutated, false); assert.equal(first.importedRecordDigests.length, 3);
    const journal = createSemanticRecordJournal({ root: destination, objectKind: "scheduled-activity-delivery.record" });
    assert.equal(journal.query({ category: `${LEGACY_ARCHIVE_CONTRACT}.schedules` }).length, 1);
    for (const [key, path] of Object.entries(paths)) assert.equal(readFileSync(path, "utf8"), before[key]);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test("refuses malformed identities and overlapping roots before journal mutation", async () => {
  const base = mkdtempSync(join(tmpdir(), "legacy-clockkeeper-refusal-")); const source = join(base, "source"), destination = join(base, "destination");
  try {
    const { schedulePath } = fixture(source); const malformed = JSON.parse(readFileSync(schedulePath, "utf8")); malformed.id = "urn:sha256:not-the-schedule"; writeFileSync(schedulePath, `${JSON.stringify(malformed)}\n`);
    await assert.rejects(importLegacyClockkeeper({ sourceRoot: source, destinationRoot: destination }), /identity/);
    await assert.rejects(importLegacyClockkeeper({ sourceRoot: source, destinationRoot: join(source, "output") }), /non-overlapping/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});
