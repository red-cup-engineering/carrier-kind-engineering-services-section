import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfDueEvents } from "../scripts/derive-set-of-due-events.mjs";

test("an event never done, with a past occurrence, is due as never-done", () => {
  const result = deriveSetOfDueEvents({
    events: [{ id: "daily-standup", dtstart: "19970902T090000Z", rrule: "FREQ=DAILY;COUNT=10" }],
    now: "1997-09-05T00:00:00Z",
  });
  assert.deepEqual(result.due, [
    { id: "daily-standup", occurrence: "1997-09-04T09:00:00.000Z", reason: "never-done" },
  ]);
});

test("an event done after its most recent occurrence is not due", () => {
  const result = deriveSetOfDueEvents({
    events: [{ id: "daily-standup", dtstart: "19970902T090000Z", rrule: "FREQ=DAILY;COUNT=10" }],
    now: "1997-09-05T00:00:00Z",
    lastDone: { "daily-standup": "1997-09-04T10:00:00Z" },
  });
  assert.deepEqual(result.due, []);
});

test("an event with a new occurrence since it was last done is due as occurrence-after-last-done", () => {
  const result = deriveSetOfDueEvents({
    events: [{ id: "daily-standup", dtstart: "19970902T090000Z", rrule: "FREQ=DAILY;COUNT=10" }],
    now: "1997-09-05T10:00:00Z",
    lastDone: { "daily-standup": "1997-09-04T10:00:00Z" },
  });
  assert.deepEqual(result.due, [
    { id: "daily-standup", occurrence: "1997-09-05T09:00:00.000Z", reason: "occurrence-after-last-done" },
  ]);
});

test("an event with no occurrence yet is not due", () => {
  const result = deriveSetOfDueEvents({
    events: [{ id: "future-thing", dtstart: "19980101T090000Z", rrule: "FREQ=DAILY;COUNT=3" }],
    now: "1997-09-05T00:00:00Z",
  });
  assert.deepEqual(result.due, []);
});

test("multiple events resolve independently", () => {
  const result = deriveSetOfDueEvents({
    events: [
      { id: "daily-standup", dtstart: "19970902T090000Z", rrule: "FREQ=DAILY;COUNT=10" },
      { id: "future-thing", dtstart: "19980101T090000Z", rrule: "FREQ=DAILY;COUNT=3" },
    ],
    now: "1997-09-05T00:00:00Z",
  });
  assert.deepEqual(result.due, [
    { id: "daily-standup", occurrence: "1997-09-04T09:00:00.000Z", reason: "never-done" },
  ]);
});

test("refuses a non-array events", () => {
  assert.throws(() => deriveSetOfDueEvents({ events: "nope", now: "1997-01-01T00:00:00Z" }), TypeError);
});

test("refuses a missing now", () => {
  assert.throws(() => deriveSetOfDueEvents({ events: [] }), TypeError);
});

test("refuses an event without a string id", () => {
  assert.throws(
    () => deriveSetOfDueEvents({ events: [{ dtstart: "19970902T090000Z" }], now: "1997-01-01T00:00:00Z" }),
    TypeError,
  );
});

test("refuses an event without a string dtstart", () => {
  assert.throws(
    () => deriveSetOfDueEvents({ events: [{ id: "x" }], now: "1997-01-01T00:00:00Z" }),
    TypeError,
  );
});
