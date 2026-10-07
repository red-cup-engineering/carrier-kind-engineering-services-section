# derive-set-of-due-events
## Requirements
- `due-events-with-reasons`: The operation takes one request `{events: [{id, dtstart, rrule?, exdate?, rdate?}], now, lastDone?}` and returns `{due}`, an array of `{id, occurrence, reason}` entries — one per event that has at least one recurrence instance at or before `now` not already covered by `lastDone`.
- `composes-expand-recurrence-rule`: The operation delegates all RRULE/DTSTART/EXDATE/RDATE recurrence-set computation to `@red-cup-engineering/expand-recurrence-rule-service`'s own `expandRecurrenceRule`, called with `window: {start: event.dtstart, end: request.now}`, for each event; it never re-derives recurrence expansion itself.
- `never-done-reason`: When an event has at least one occurrence at or before `now` and `lastDone` carries no entry for its id, the event is due with `reason: "never-done"` and `occurrence` set to its most recent (maximum) such occurrence.
- `occurrence-after-last-done-reason`: When an event's most recent occurrence at or before `now` is strictly after its `lastDone` entry, the event is due with `reason: "occurrence-after-last-done"` and `occurrence` set to that most recent occurrence.
- `not-due-omission`: An event with no occurrence at or before `now`, or whose most recent occurrence is at or before its `lastDone` entry, is omitted from `due` entirely (never returned with a "not due" reason).
- `iso-extended-instants`: `now` and every `lastDone` value are Date-parseable ISO 8601 instants (e.g. `1997-09-05T00:00:00Z`), the same form `expand-recurrence-rule-service`'s own `window` bounds take; each event's `dtstart`/`exdate`/`rdate`/`rrule` stay in the RFC 5545 basic-UTC/RRULE-text forms `expand-recurrence-rule-service` itself requires.
## Prohibitions
- `missing-events-refusal`: The operation must refuse (throw `TypeError`) a request whose `events` is not an array.
- `missing-now-refusal`: The operation must refuse (throw `TypeError`) a request whose `now` is not a string.
- `missing-event-identity-refusal`: The operation must refuse (throw `TypeError`) when any event lacks a string `id` or a string `dtstart`.
- `no-second-expander`: The operation must not hand-implement RRULE/RDATE/EXDATE recurrence computation; it must call only `@red-cup-engineering/expand-recurrence-rule-service`'s exported `expandRecurrenceRule`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own due-derivation step. | Recurrence-set computation is delegated to expand-recurrence-rule-service rather than re-authored.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
- `standards-first-data` | 561 Group org-layering rule | 2026-09-04 | .claude/rules/org-layering.md | Applies to the whole operation's data model. | Scheduling data is modeled as RFC 5545 iCalendar VEVENT fields rather than a house-invented schedule format.
## Standards
- `rfc-5545-icalendar` | IETF | RFC 5545, September 2009 | https://www.rfc-editor.org/rfc/rfc5545 | Applies to the shape of each event in the request. | Each event is a VEVENT-shaped record (DTSTART, RRULE, EXDATE, RDATE) whose recurrence set is computed per this specification's §3.8.5.1-§3.8.5.3, via expand-recurrence-rule-service.
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-due-events-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"@red-cup-engineering/expand-recurrence-rule-service":"0.1.0"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-due-events.mjs
#!/usr/bin/env node
import { expandRecurrenceRule } from "@red-cup-engineering/expand-recurrence-rule-service";

const BASIC_UTC_DATE_TIME = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/u;

/**
 * Converts an RFC 5545 basic UTC date-time ("YYYYMMDDTHHMMSSZ") into the ISO 8601 extended form the window bounds this operation composes into expand-recurrence-rule-service require.
 * @param {string} basic An RFC 5545 basic UTC date-time.
 * @returns {string} The equivalent ISO 8601 extended UTC instant.
 * @throws {Error} When basic does not match the RFC 5545 basic UTC form.
 */
function basicUtcToIsoExtended(basic) {
  const match = BASIC_UTC_DATE_TIME.exec(basic);
  if (match === null) throw new Error(`dtstart must be an RFC 5545 basic UTC date-time (YYYYMMDDTHHMMSSZ), got ${JSON.stringify(basic)}`);
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

/**
 * Derives which of a set of iCalendar (RFC 5545) VEVENT-shaped scheduled events are due as of `now`, composing expand-recurrence-rule-service to find each event's most recent recurrence instance at or before `now`.
 * @param {{events: Array<{id: string, dtstart: string, rrule?: string, exdate?: string[], rdate?: string[]}>, now: string, lastDone?: Record<string, string>}} request A record naming the set of scheduled events (each an RFC 5545 basic-UTC VEVENT: dtstart, an optional rrule text, optional exdate/rdate arrays), the current instant `now` (a Date-parseable ISO 8601 instant), and an optional map from event id to the ISO 8601 instant it was last completed.
 * @returns {{due: Array<{id: string, occurrence: string, reason: "never-done"|"occurrence-after-last-done"}>}} Every event with at least one occurrence at or before `now` not already covered by its lastDone entry, each named with its most recent such occurrence and the reason it is due.
 * @throws {TypeError} When request.events is not an array, request.now is not a string, or an event lacks a string id or dtstart.
 */
export function deriveSetOfDueEvents(request) {
  if (!Array.isArray(request?.events)) throw new TypeError("events must be an array");
  if (typeof request?.now !== "string") throw new TypeError("now must be a string");
  const lastDone = request.lastDone && typeof request.lastDone === "object" ? request.lastDone : {};

  const due = [];
  for (const event of request.events) {
    if (typeof event?.id !== "string") throw new TypeError("each event must have a string id");
    if (typeof event?.dtstart !== "string") throw new TypeError("each event must have a string dtstart");

    const { occurrences } = expandRecurrenceRule({
      dtstart: event.dtstart,
      rrule: event.rrule,
      exdate: event.exdate,
      rdate: event.rdate,
      window: { start: basicUtcToIsoExtended(event.dtstart), end: request.now },
    });
    if (occurrences.length === 0) continue;

    const mostRecent = occurrences[occurrences.length - 1];
    const doneAt = lastDone[event.id];
    if (typeof doneAt !== "string") {
      due.push({ id: event.id, occurrence: mostRecent, reason: "never-done" });
    } else if (new Date(mostRecent) > new Date(doneAt)) {
      due.push({ id: event.id, occurrence: mostRecent, reason: "occurrence-after-last-done" });
    }
  }
  return { due };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "deriveSetOfDueEvents — Derives which of a set of iCalendar (RFC 5545) VEVENT-shaped scheduled events are due as of `now`, composing expand-recurrence-rule-service to find each event's most recent recurrence instance at or before `now`.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(deriveSetOfDueEvents(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-set-of-due-events.test.mjs
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
```
## Examples
```json name="one event never done is due"
{"input":{"events":[{"id":"daily-standup","dtstart":"19970902T090000Z","rrule":"FREQ=DAILY;COUNT=10"}],"now":"1997-09-05T00:00:00Z"},"output":{"due":[{"id":"daily-standup","occurrence":"1997-09-04T09:00:00.000Z","reason":"never-done"}]}}
```
```json name="an event done since its last occurrence is not due"
{"input":{"events":[{"id":"daily-standup","dtstart":"19970902T090000Z","rrule":"FREQ=DAILY;COUNT=10"}],"now":"1997-09-05T00:00:00Z","lastDone":{"daily-standup":"1997-09-04T10:00:00Z"}},"output":{"due":[]}}
```
## Traceability
- `due-events-with-reasons` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-5545-icalendar`
- `composes-expand-recurrence-rule` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `never-done-reason` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-5545-icalendar`
- `occurrence-after-last-done-reason` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-5545-icalendar`
- `not-due-omission` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-5545-icalendar`
- `iso-extended-instants` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-5545-icalendar`
- `missing-events-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-now-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-event-identity-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `no-second-expander` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
