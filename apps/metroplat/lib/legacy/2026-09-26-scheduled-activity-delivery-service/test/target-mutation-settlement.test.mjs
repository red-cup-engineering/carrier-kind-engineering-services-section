import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ACTOR, CONTRACT, migrateScheduleDeliveryProjections, runDue, targetResponseProblem } from "../src/service.mjs";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

const AT = "2026-08-30T14:05:23.796Z";
const target = Object.freeze({ actor: "urn:test:koios", contract: "urn:test:koios-routine" });

function registration() {
  return Object.freeze({
    type: "ScheduleRegistration", id: "urn:test:authorized-output", scheduleId: "urn:test:authorized-output", status: "active", targetBinding: {},
    request: Object.freeze({
      executionMode: "live", timeoutMilliseconds: 1_000,
      schedule: Object.freeze({ intervalSeconds: 86_400, firstDueAt: "2026-08-30T14:00:00.000Z", maxDeliveries: 1 }),
      activityTemplate: Object.freeze({ "@context": "https://www.w3.org/ns/activitystreams", type: "Create", target: target.actor, object: Object.freeze({ type: "KoiosRoutinePublicationDemand" }) }),
      target, deliveryCapabilityId: "urn:capability:test:koios-routine",
    }),
  });
}

function acceptedMutation(activity) {
  return Object.freeze({
    "@context": "https://www.w3.org/ns/activitystreams", type: "Accept", actor: target.actor, target: ACTOR, inReplyTo: activity.id,
    object: Object.freeze({ type: "KoiosRoutineOperationReceipt", contract: target.contract, customerTerritoryMutation: true }),
  });
}

test("a carrier-set writable-root authorization settles an admitted target candidate effect", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "scheduled-authorized-target-mutation-"));
  try {
    const journal = createSemanticRecordJournal({ root: dataRoot, objectKind: "scheduled-activity-delivery.record" });
    journal.record({ category: `${CONTRACT}.schedules`, recordedAt: AT, record: registration(), charge: { support: true, refutation: false } });
    assert.equal((await migrateScheduleDeliveryProjections({ root: dataRoot })).activeSchedules, 1);
    const tick = await runDue(AT, {
      root: dataRoot,
      targetInvoker: (_registration, activity) => Object.freeze({ status: 0, signal: null, stdout: "", stderr: "", response: acceptedMutation(activity), problem: null, dryRun: false, customerTerritoryMutationAuthorized: true }),
    });
    assert.equal(tick.receipts.length, 1);
    assert.equal(tick.receipts[0].disposition, "target-accept");
    assert.equal(tick.receipts[0].targetResponseProblem, null);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("a target cannot authorize its own mutation claim", () => {
  const activity = Object.freeze({ id: "urn:test:activity" }), response = acceptedMutation(activity), current = registration();
  assert.equal(targetResponseProblem(response, current, activity), "target-mutation-claim");
  assert.equal(targetResponseProblem({ ...response, type: "Reject" }, current, activity, { customerTerritoryMutationAuthorized: true }), "target-mutation-claim");
  assert.equal(targetResponseProblem({ ...response, object: { ...response.object, customerTerritoryMutation: false } }, current, activity), null);
});
