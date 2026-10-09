import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { expandRecurrenceRule } from "@red-cup-engineering/expand-recurrence-rule-service";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { CONTRACT, migrateScheduleDeliveryProjections, runDue } from "../src/service.mjs";

const FIRST_DUE_AT = "2026-01-01T00:00:00.000Z";
const INTERVAL_SECONDS = 3600;
const AT = "2026-01-01T03:30:00.000Z";

function registration() {
  return Object.freeze({
    type: "ScheduleRegistration", id: "urn:schedule:icalendar-recurrence", scheduleId: "urn:schedule:icalendar-recurrence", status: "active", targetBinding: {},
    request: Object.freeze({
      executionMode: "dry-run", timeoutMilliseconds: 1_000,
      schedule: Object.freeze({ intervalSeconds: INTERVAL_SECONDS, firstDueAt: FIRST_DUE_AT, maxDeliveries: null }),
      activityTemplate: Object.freeze({ "@context": "https://www.w3.org/ns/activitystreams", type: "Create", target: "urn:target", object: Object.freeze({ type: "RecurrenceDemand" }) }),
      target: Object.freeze({ actor: "urn:target", contract: "urn:target-contract" }), deliveryCapabilityId: "urn:capability:icalendar-recurrence",
    }),
  });
}

test("a recurring delivery's due instant is the iCalendar recurrence operation's own answer, not a hand-rolled interval division", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-icalendar-recurrence-"));
  try {
    const journal = createSemanticRecordJournal({ root: dataRoot, objectKind: "scheduled-activity-delivery.record" });
    journal.record({ category: `${CONTRACT}.schedules`, recordedAt: FIRST_DUE_AT, record: registration(), charge: { support: true, refutation: false } });
    assert.equal((await migrateScheduleDeliveryProjections({ root: dataRoot })).activeSchedules, 1);

    // Independently expand the same VEVENT (bare DTSTART + a FREQ=SECONDLY;INTERVAL=n RRULE, RFC 5545 §3.8.5.3)
    // through the iCalendar section's own operation, never re-deriving the expectation by interval arithmetic.
    const dtstart = FIRST_DUE_AT.replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
    const { occurrences } = expandRecurrenceRule({
      dtstart,
      rrule: `FREQ=SECONDLY;INTERVAL=${INTERVAL_SECONDS}`,
      window: { start: FIRST_DUE_AT, end: AT },
    });
    const expectedOccurrence = occurrences.length - 1;
    const expectedScheduledFor = occurrences[expectedOccurrence];

    const tick = await runDue(AT, { root: dataRoot });

    assert.equal(tick.receipts.length, 1);
    assert.equal(tick.receipts[0].occurrence, expectedOccurrence);
    assert.equal(tick.receipts[0].scheduledFor, expectedScheduledFor);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
