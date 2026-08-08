import test from "node:test";
import assert from "node:assert/strict";
import { ACTOR, CAPABILITY, CONTEXT, readSystemTime } from "../src/service.mjs";

function question(overrides = {}) {
  return {
    "@context": CONTEXT,
    id: "urn:test:time-question",
    type: "Question",
    actor: "urn:ame:test-customer",
    target: ACTOR,
    capability: CAPABILITY,
    object: { type: "SystemTimeQuestion" },
    ...overrides,
  };
}

test("Clockkeeper returns exactly one sampled system-time reading", () => {
  let samples = 0;
  const result = readSystemTime(question(), { now: () => { samples += 1; return 1_784_781_200_123; } });
  assert.equal(samples, 1);
  assert.equal(result.type, "Create");
  assert.equal(result.object.type, "SystemTimeReading");
  assert.equal(result.object.observedAt, "2026-07-23T04:33:20.123Z");
  assert.equal(result.object.epochMilliseconds, 1_784_781_200_123);
  assert.equal(result.object.scheduled, false);
  assert.equal(result.object.deliveredActivity, false);
  assert.equal(result.object.processExecuted, false);
});

test("Clockkeeper refuses every scheduling or delivery-shaped request", () => {
  for (const request of [
    question({ type: "Create", object: { type: "ScheduledActivityDeliveryRequest" } }),
    question({ object: { type: "SystemTimeQuestion", intervalSeconds: 60 } }),
    question({ capability: "urn:ame:clockkeeper-service:capability:run-due" }),
  ]) assert.equal(readSystemTime(request).type, "Reject");
});
