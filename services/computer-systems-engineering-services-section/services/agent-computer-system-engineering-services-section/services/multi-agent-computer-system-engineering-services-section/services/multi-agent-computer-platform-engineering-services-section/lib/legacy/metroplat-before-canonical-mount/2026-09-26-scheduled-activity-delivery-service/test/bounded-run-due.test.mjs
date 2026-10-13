import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CONTRACT, digest, migrateScheduleDeliveryProjections, runDue } from "../src/service.mjs";
import { RECORD_KIND, identify } from "../src/semantic-content.mjs";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

function currentBytes(value) { return identify(value, RECORD_KIND).bytes; }

function inMemoryLedger() {
  const rows = new Map();
  return {
    records(category) { return [...(rows.get(category) ?? [])]; },
    async record({ category, record }) {
      if (!rows.has(category)) rows.set(category, []);
      rows.get(category).push(record);
    },
  };
}

function registration(index, firstDueAt = "2099-01-01T00:00:00.000Z") {
  const scheduleId = `urn:schedule:bounded:${String(index).padStart(2, "0")}`;
  return {
    type: "ScheduleRegistration", id: scheduleId, scheduleId, status: "active", targetBinding: {},
    request: {
      executionMode: "dry-run",
      timeoutMilliseconds: 1_000,
      schedule: { intervalSeconds: 60, firstDueAt, maxDeliveries: 1 },
      activityTemplate: { "@context": "https://www.w3.org/ns/activitystreams", type: "Create", target: "urn:target", object: { type: "BoundedDemand" } },
      target: { actor: "urn:target", contract: "urn:target-contract" },
      deliveryCapabilityId: "urn:capability:bounded",
    },
  };
}

function writeCurrentInterruptedAttempt(root, index, recoverAfter) {
  const scheduleId = `urn:schedule:recovery:${String(index).padStart(2, "0")}`;
  const activity = { type: "Create", actor: "urn:test:provider", object: { type: "RecoveryDemand", index } };
  const body = {
    type: "ScheduledDeliveryAttempt", scheduleId, occurrence: 0,
    scheduledFor: "2098-01-01T00:00:00.000Z", attemptedAt: "2098-01-01T00:00:00.000Z", recoverAfter,
    activity, activityDigest: digest(activity), targetBinding: {}, retryAuthorized: false, customerTerritoryMutation: false,
  };
  const attempt = { id: digest(body), ...body };
  const scheduleDigest = digest(scheduleId).slice("ni:///sha-256;".length);
  const attemptDirectory = join(root, "data", "state", "pending-delivery-attempts", scheduleDigest);
  const recoveryDirectory = join(root, "data", "state", "pending-delivery-recovery", scheduleDigest);
  mkdirSync(attemptDirectory, { recursive: true });
  mkdirSync(recoveryDirectory, { recursive: true });
  writeFileSync(join(attemptDirectory, "0.rmn.cbor"), currentBytes(attempt));
  writeFileSync(join(recoveryDirectory, "0.rmn.cbor"), currentBytes({ type: "PendingDeliveryRecovery", scheduleId, occurrence: 0, attempt: attempt.id, customerTerritoryMutation: false }));
}

test("run-due caps a migrated active set and rotates its dry-run dispatch window", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-bounded-dispatch-"));
  try {
    const journal = createSemanticRecordJournal({ root: dataRoot, objectKind: "scheduled-activity-delivery.record" });
    const firstTickAt = "2026-08-29T00:00:00.000Z";
    const omittedIndex = (Math.floor(Date.parse(firstTickAt) / 60_000) * 32 + 32) % 33;
    for (let index = 0; index < 33; index += 1) {
      journal.record({ category: `${CONTRACT}.schedules`, recordedAt: firstTickAt, record: registration(index, index === omittedIndex ? firstTickAt : "2099-01-01T00:00:00.000Z"), charge: { support: true, refutation: false } });
    }
    assert.equal((await migrateScheduleDeliveryProjections({ root: dataRoot })).activeSchedules, 33);

    let targetInvocations = 0;
    const options = { root: dataRoot, targetInvoker: () => { targetInvocations += 1; throw new Error("dry-run schedules must not invoke targets"); } };
    const first = await runDue(firstTickAt, options);
    const second = await runDue("2026-08-29T00:01:00.000Z", options);

    assert.equal(first.activeSchedules, 33);
    assert.equal(first.maximumTargetsPerTick, 32);
    assert.equal(first.dispatchWindow, 32);
    assert.equal(first.attempted, 0);
    assert.equal(second.dispatchWindow, 32);
    assert.equal(second.attempted, 1);
    assert.equal(targetInvocations, 0);
    assert.equal(second.receipts[0].scheduleId, `urn:schedule:bounded:${String(omittedIndex).padStart(2, "0")}`);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("recovery queue rotation reaches the marker beyond its 32-cell work limit", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-bounded-recovery-"));
  try {
    const firstTickAt = "2098-01-01T00:02:00.000Z";
    const scheduleIds = Array.from({ length: 33 }, (_, index) => `urn:schedule:recovery:${String(index).padStart(2, "0")}`);
    const ordered = scheduleIds.map((scheduleId, index) => ({ index, shard: digest(scheduleId).slice("ni:///sha-256;".length) })).sort((left, right) => left.shard < right.shard ? -1 : left.shard > right.shard ? 1 : 0);
    const omittedIndex = ordered[(Math.floor(Date.parse(firstTickAt) / 60_000) + 32) % 33].index;
    for (let index = 0; index < 33; index += 1) writeCurrentInterruptedAttempt(dataRoot, index, index === omittedIndex ? "2098-01-01T00:01:00.000Z" : "2098-01-01T00:04:00.000Z");
    const ledger = inMemoryLedger();
    const first = await runDue(firstTickAt, { root: dataRoot, ledger });
    const second = await runDue("2098-01-01T00:03:00.000Z", { root: dataRoot, ledger });

    assert.equal(first.recoveredInterruptedAttempts.length, 0);
    assert.equal(second.recoveredInterruptedAttempts.length, 1);
    assert.equal(ledger.records(`${CONTRACT}.delivery-receipts`).length, 1);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
