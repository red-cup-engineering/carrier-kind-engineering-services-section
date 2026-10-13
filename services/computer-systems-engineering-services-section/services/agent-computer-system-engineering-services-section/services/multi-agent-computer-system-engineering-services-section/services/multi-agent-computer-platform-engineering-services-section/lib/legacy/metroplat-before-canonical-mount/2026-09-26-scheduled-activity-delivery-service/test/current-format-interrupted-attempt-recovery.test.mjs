import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CONTRACT, digest, runDue } from "../src/service.mjs";
import { RECORD_KIND, identify } from "../src/semantic-content.mjs";

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

test("a current-format interrupted attempt is recovered and settled exactly once", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-current-attempt-"));
  try {
    const scheduleId = "urn:schedule:current-interruption";
    const activity = { type: "Create", actor: "urn:test:provider", object: { type: "RecoveryDemand" } };
    const body = {
      type: "ScheduledDeliveryAttempt",
      scheduleId,
      occurrence: 0,
      scheduledFor: "2098-01-01T00:00:00.000Z",
      attemptedAt: "2098-01-01T00:00:00.000Z",
      recoverAfter: "2098-01-01T00:01:00.000Z",
      activity,
      activityDigest: digest(activity),
      targetBinding: { packageDigest: "ni:///sha-256;package", selectedBinDigest: "ni:///sha-256;bin" },
      retryAuthorized: false,
      customerTerritoryMutation: false,
    };
    const attempt = { id: digest(body), ...body };
    const scheduleDigest = digest(scheduleId).slice("ni:///sha-256;".length);
    const attemptDirectory = join(dataRoot, "data", "state", "pending-delivery-attempts", scheduleDigest);
    const recoveryDirectory = join(dataRoot, "data", "state", "pending-delivery-recovery", scheduleDigest);
    mkdirSync(attemptDirectory, { recursive: true });
    mkdirSync(recoveryDirectory, { recursive: true });
    writeFileSync(join(attemptDirectory, "0.rmn.cbor"), currentBytes(attempt));
    writeFileSync(join(recoveryDirectory, "0.rmn.cbor"), currentBytes({ type: "PendingDeliveryRecovery", scheduleId, occurrence: 0, attempt: attempt.id, customerTerritoryMutation: false }));

    const ledger = inMemoryLedger();
    const first = await runDue("2098-01-01T00:02:00.000Z", { root: dataRoot, ledger });
    const second = await runDue("2098-01-01T00:03:00.000Z", { root: dataRoot, ledger });

    assert.equal(first.recoveredInterruptedAttempts.length, 1);
    assert.deepEqual(second.recoveredInterruptedAttempts, []);
    assert.equal(ledger.records(`${CONTRACT}.delivery-receipts`).length, 1);
    assert.equal(ledger.records(`${CONTRACT}.events`).length, 1);
    assert.equal(existsSync(join(recoveryDirectory, "0.rmn.cbor")), false);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
