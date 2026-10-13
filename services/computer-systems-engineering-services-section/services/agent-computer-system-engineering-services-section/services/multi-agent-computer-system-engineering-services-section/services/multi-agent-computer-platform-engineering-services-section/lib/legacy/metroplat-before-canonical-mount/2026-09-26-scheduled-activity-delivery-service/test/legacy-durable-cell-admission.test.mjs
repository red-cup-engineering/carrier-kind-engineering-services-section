import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { semanticBytes } from "@red-cup-engineering/relation-model-notation-cbor-codec";
import { encodeRelationalValue } from "@red-cup-engineering/relational-value-graph-service";
import { admitDurableRecord, LEGACY_DURABLE_CELL_FORMAT, legacyRecordDigest } from "../src/durable-cell-admission.mjs";
import { runDue } from "../src/service.mjs";

function legacyBytes(value) {
  const encoded = encodeRelationalValue(value);
  return semanticBytes(["ascribe", encoded.type, encoded.term]);
}

function emptyLedger() {
  return { records: () => [], async record() { throw new Error("a future interrupted attempt must not settle"); } };
}

test("legacy relational-RMN attempts retain their historic identity and earn a current migration projection", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-legacy-attempt-"));
  try {
    const activity = { type: "Create", actor: "urn:test:customer", object: { type: "TestDemand" } };
    const body = {
      type: "ScheduledDeliveryAttempt",
      scheduleId: "ni:///sha-256;legacy-schedule",
      occurrence: 0,
      scheduledFor: "2098-01-01T00:00:00.000Z",
      attemptedAt: "2098-01-01T00:00:00.000Z",
      recoverAfter: "2098-01-01T00:01:00.000Z",
      activity,
      activityDigest: legacyRecordDigest(activity),
      targetBinding: { packageDigest: "ni:///sha-256;package", selectedBinDigest: "ni:///sha-256;bin" },
      retryAuthorized: false,
      customerTerritoryMutation: false,
    };
    const attempt = { id: legacyRecordDigest(body), ...body };
    const bytes = legacyBytes(attempt), admission = admitDurableRecord(bytes);
    assert.equal(admission.format, LEGACY_DURABLE_CELL_FORMAT);
    assert.equal(admission.recordDigest(body), attempt.id);

    const directory = join(dataRoot, "data", "state", "pending-delivery-attempts", "legacy-schedule");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "0.rmn.cbor"), bytes);
    const result = await runDue("2098-01-01T00:00:30.000Z", { root: dataRoot, ledger: emptyLedger() });

    assert.deepEqual(result.pendingSettlements, []);
    assert.deepEqual(result.recoveredInterruptedAttempts, []);
    assert.equal(existsSync(join(dataRoot, "data", "state", "durable-cell-format-migrations", `${admission.sourceDigest.slice("ni:///sha-256;".length)}.rmn.cbor`)), true);
    assert.equal(existsSync(join(dataRoot, "data", "state", "durable-cell-current-projections", `${admission.sourceDigest.slice("ni:///sha-256;".length)}.rmn.cbor`)), true);
    assert.equal(existsSync(join(dataRoot, "data", "state", "durable-cell-decoding-caches", `${admission.sourceDigest.slice("ni:///sha-256;".length)}.json`)), true);
    assert.equal(existsSync(join(dataRoot, "data", "state", "durable-cell-migration-decoding-caches", `${admission.sourceDigest.slice("ni:///sha-256;".length)}.json`)), true);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
