import assert from "node:assert/strict";
import test from "node:test";
import { expandRecurrenceRule } from "../scripts/expand-recurrence-rule.mjs";

test("RFC 5545 §3.8.5.3: daily for 10 occurrences (COUNT)", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970902T090000Z",
    rrule: "FREQ=DAILY;COUNT=10",
    window: { start: "1997-09-01T00:00:00Z", end: "1997-12-31T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-09-02T09:00:00.000Z", "1997-09-03T09:00:00.000Z", "1997-09-04T09:00:00.000Z",
    "1997-09-05T09:00:00.000Z", "1997-09-06T09:00:00.000Z", "1997-09-07T09:00:00.000Z",
    "1997-09-08T09:00:00.000Z", "1997-09-09T09:00:00.000Z", "1997-09-10T09:00:00.000Z",
    "1997-09-11T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: every other day forever, bounded by window (INTERVAL)", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970902T090000Z",
    rrule: "FREQ=DAILY;INTERVAL=2",
    window: { start: "1997-09-02T00:00:00Z", end: "1997-09-11T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-09-02T09:00:00.000Z", "1997-09-04T09:00:00.000Z", "1997-09-06T09:00:00.000Z",
    "1997-09-08T09:00:00.000Z", "1997-09-10T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: daily until December 24, 1997 (UNTIL boundary)", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970902T090000Z",
    rrule: "FREQ=DAILY;UNTIL=19971224T000000Z",
    window: { start: "1997-12-20T00:00:00Z", end: "1997-12-26T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-12-20T09:00:00.000Z", "1997-12-21T09:00:00.000Z",
    "1997-12-22T09:00:00.000Z", "1997-12-23T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: weekly on Tuesday and Thursday for 10 occurrences (BYDAY, WKST)", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970902T090000Z",
    rrule: "FREQ=WEEKLY;COUNT=10;WKST=SU;BYDAY=TU,TH",
    window: { start: "1997-09-01T00:00:00Z", end: "1997-12-31T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-09-02T09:00:00.000Z", "1997-09-04T09:00:00.000Z", "1997-09-09T09:00:00.000Z", "1997-09-11T09:00:00.000Z", "1997-09-16T09:00:00.000Z",
    "1997-09-18T09:00:00.000Z", "1997-09-23T09:00:00.000Z", "1997-09-25T09:00:00.000Z", "1997-09-30T09:00:00.000Z", "1997-10-02T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: monthly on the first Friday for 10 occurrences (BYDAY ordinal)", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970905T090000Z",
    rrule: "FREQ=MONTHLY;COUNT=10;BYDAY=1FR",
    window: { start: "1997-09-01T00:00:00Z", end: "1998-12-31T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-09-05T09:00:00.000Z", "1997-10-03T09:00:00.000Z", "1997-11-07T09:00:00.000Z", "1997-12-05T09:00:00.000Z", "1998-01-02T09:00:00.000Z",
    "1998-02-06T09:00:00.000Z", "1998-03-06T09:00:00.000Z", "1998-04-03T09:00:00.000Z", "1998-05-01T09:00:00.000Z", "1998-06-05T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: monthly on the second-to-last Monday", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970922T090000Z",
    rrule: "FREQ=MONTHLY;COUNT=6;BYDAY=-2MO",
    window: { start: "1997-09-01T00:00:00Z", end: "1998-03-01T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-09-22T09:00:00.000Z", "1997-10-20T09:00:00.000Z", "1997-11-17T09:00:00.000Z",
    "1997-12-22T09:00:00.000Z", "1998-01-19T09:00:00.000Z", "1998-02-16T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: yearly in June and July", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970610T090000Z",
    rrule: "FREQ=YEARLY;COUNT=10;BYMONTH=6,7",
    window: { start: "1997-01-01T00:00:00Z", end: "2002-01-01T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-06-10T09:00:00.000Z", "1997-07-10T09:00:00.000Z", "1998-06-10T09:00:00.000Z", "1998-07-10T09:00:00.000Z",
    "1999-06-10T09:00:00.000Z", "1999-07-10T09:00:00.000Z", "2000-06-10T09:00:00.000Z", "2000-07-10T09:00:00.000Z",
    "2001-06-10T09:00:00.000Z", "2001-07-10T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: every 20th Monday of the year", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970519T090000Z",
    rrule: "FREQ=YEARLY;COUNT=3;BYDAY=20MO",
    window: { start: "1997-01-01T00:00:00Z", end: "2000-01-01T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-05-19T09:00:00.000Z", "1998-05-18T09:00:00.000Z", "1999-05-17T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: last work day of each month", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970930T090000Z",
    rrule: "FREQ=MONTHLY;COUNT=6;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1",
    window: { start: "1997-09-01T00:00:00Z", end: "1998-03-01T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-09-30T09:00:00.000Z", "1997-10-31T09:00:00.000Z", "1997-11-28T09:00:00.000Z",
    "1997-12-31T09:00:00.000Z", "1998-01-30T09:00:00.000Z", "1998-02-27T09:00:00.000Z",
  ]);
});

test("RFC 5545 recurrence set arithmetic: EXDATE removes and RDATE adds", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970902T090000Z",
    rrule: "FREQ=DAILY;COUNT=4",
    exdate: ["19970903T090000Z"],
    rdate: ["19970910T090000Z"],
    window: { start: "1997-09-01T00:00:00Z", end: "1997-09-30T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, [
    "1997-09-02T09:00:00.000Z", "1997-09-04T09:00:00.000Z", "1997-09-05T09:00:00.000Z", "1997-09-10T09:00:00.000Z",
  ]);
});

test("RFC 5545 §3.8.5.3: WKST changes the generated days (MO vs SU)", () => {
  const mondayStart = expandRecurrenceRule({
    dtstart: "19970805T090000Z",
    rrule: "FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=MO",
    window: { start: "1997-08-01T00:00:00Z", end: "1997-09-01T00:00:00Z" },
  });
  assert.deepEqual(mondayStart.occurrences.map((d) => d.slice(0, 10)), [
    "1997-08-05", "1997-08-10", "1997-08-19", "1997-08-24",
  ]);

  const sundayStart = expandRecurrenceRule({
    dtstart: "19970805T090000Z",
    rrule: "FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=SU",
    window: { start: "1997-08-01T00:00:00Z", end: "1997-09-01T00:00:00Z" },
  });
  assert.deepEqual(sundayStart.occurrences.map((d) => d.slice(0, 10)), [
    "1997-08-05", "1997-08-17", "1997-08-19", "1997-08-31",
  ]);
});

test("RFC 5545 §3.8.5.3: every Friday the 13th, with EXDATE on DTSTART (BYMONTHDAY+BYDAY, EXDATE)", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970101T090000Z",
    exdate: ["19970101T090000Z"],
    rrule: "FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13",
    window: { start: "1997-01-01T00:00:00Z", end: "1997-07-01T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, ["1997-06-13T09:00:00.000Z"]);
});

test("RDATE adds an ad-hoc instance outside the RRULE pattern", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970902T090000Z",
    rrule: "FREQ=DAILY;COUNT=3",
    rdate: ["19970910T090000Z"],
    window: { start: "1997-09-01T00:00:00Z", end: "1997-09-30T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences.map((d) => d.slice(0, 10)), [
    "1997-09-02", "1997-09-03", "1997-09-04", "1997-09-10",
  ]);
});

test("a VEVENT without RRULE occurs exactly once, at DTSTART", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970902T090000Z",
    window: { start: "1997-01-01T00:00:00Z", end: "1998-01-01T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences, ["1997-09-02T09:00:00.000Z"]);
});

test("refuses a non-string dtstart", () => {
  assert.throws(
    () => expandRecurrenceRule({ dtstart: 42, window: { start: "1997-01-01T00:00:00Z", end: "1998-01-01T00:00:00Z" } }),
    TypeError,
  );
});

test("refuses a TZID/local-time dtstart rather than silently misparsing it", () => {
  assert.throws(
    () => expandRecurrenceRule({ dtstart: "19970902T090000", window: { start: "1997-01-01T00:00:00Z", end: "1998-01-01T00:00:00Z" } }),
    /basic UTC date-time/u,
  );
});
