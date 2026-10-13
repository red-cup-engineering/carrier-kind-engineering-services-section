import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { CONTRACT, migrateScheduleDeliveryProjections, runDue } from "../src/service.mjs";

test("run-due reads the active projection, not historic reservation cells", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-delivery-scale-"));
  try {
    const registration = {
      type: "ScheduleRegistration", id: "urn:schedule:scale", scheduleId: "urn:schedule:scale", status: "active",
      request: {
        schedule: { intervalSeconds: 60, firstDueAt: "2099-01-01T00:00:00.000Z", maxDeliveries: null },
        activityTemplate: { "@context": "https://www.w3.org/ns/activitystreams", type: "Create", target: "urn:target", object: { type: "ScaleDemand" } },
        target: { actor: "urn:target", contract: "urn:target-contract" }, deliveryCapabilityId: "urn:capability:scale",
      },
    };
    createSemanticRecordJournal({ root: dataRoot, objectKind: "scheduled-activity-delivery.record" }).record({ category: `${CONTRACT}.schedules`, recordedAt: "2026-08-29T00:00:00.000Z", record: registration, charge: { support: true, refutation: false } });
    const migration = await migrateScheduleDeliveryProjections({ root: dataRoot });
    assert.equal(migration.activeSchedules, 1);

    // Deliberately invalid historic cells prove the timer does not decode or
    // enumerate them.  A legacy tree can be much larger without changing the
    // timer's working set.
    const history = join(dataRoot, "data", "state", "pending-delivery-attempts", "historic"); mkdirSync(history, { recursive: true });
    for (let occurrence = 0; occurrence < 512; occurrence += 1) writeFileSync(join(history, `${occurrence}.rmn.cbor`), "historic-reservation");

    const result = await runDue("2026-08-29T00:00:00.000Z", { root: dataRoot });
    assert.equal(result.attempted, 0);
    assert.equal(result.migrationRequired, false);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
