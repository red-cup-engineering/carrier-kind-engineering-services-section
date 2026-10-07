# expand-recurrence-rule
## Requirements
- `vevent-window-to-occurrences`: The operation takes one request `{dtstart, rrule?, exdate?, rdate?, window:{start,end}}` and returns `{occurrences}`, an array of ISO 8601 UTC instant strings sorted ascending, for every recurrence instance whose start falls within `[window.start, window.end]` inclusive.
- `single-event-without-rrule`: When `rrule` is omitted, the VEVENT occurs exactly once, at `dtstart`, per RFC 5545 §3.8.5.2's recurrence-set definition — still subject to window bounds, `exdate` exclusion, and any `rdate` additions.
- `composes-rrule-library`: The operation delegates all RRULE parsing (FREQ, INTERVAL, COUNT, UNTIL, BYDAY with leading ordinals, BYMONTHDAY, BYMONTH, BYYEARDAY, BYWEEKNO, BYSETPOS, WKST) and RDATE/EXDATE set arithmetic to the published `rrule` library's own `rrulestr`/`RRuleSet`; it never re-derives recurrence expansion itself.
- `utc-only-basic-form`: `dtstart` and every `exdate`/`rdate` value must be an RFC 5545 basic UTC date-time (`YYYYMMDDTHHMMSSZ`). This first version has no TZID or local-time support.
- `pure-operation`: The operation performs no filesystem or network access; it reads only its request fields.
## Prohibitions
- `missing-dtstart-refusal`: The operation must refuse (throw `TypeError`) a request whose `dtstart` is not a string.
- `missing-window-refusal`: The operation must refuse (throw `TypeError`) a request whose `window.start` or `window.end` is not a string.
- `non-utc-basic-form-refusal`: The operation must refuse (throw `Error` naming the field) when `dtstart` or any `exdate`/`rdate` value does not match the RFC 5545 basic UTC form `/^\d{8}T\d{6}Z$/` — a TZID or local-time value is refused loudly, never silently misparsed as UTC.
- `no-second-expander`: The operation must not hand-implement FREQ/BYDAY/BYMONTHDAY/WKST iteration or its own RDATE/EXDATE set-difference; it must call only the `rrule` package's exported `rrulestr`.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to this operation's own recurrence-expansion step. | RRULE parsing and expansion is delegated to the maintained `rrule` npm library rather than re-authored, per the standards-first data rule.
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this whole operation source file. | The operation is born through the jsnode fabrication line from this work order, never hand-written.
- `standards-first-data` | 561 Group org-layering rule | 2026-09-04 | .claude/rules/org-layering.md | Applies to the whole operation's data model. | Scheduling data is modeled as RFC 5545 iCalendar VEVENT fields rather than a house-invented schedule format.
## Standards
- `rfc-5545-icalendar` | IETF | RFC 5545, September 2009 | https://www.rfc-editor.org/rfc/rfc5545 | Applies to the whole operation: the VEVENT recurrence data model (DTSTART, RRULE, EXDATE, RDATE) and recurrence-set semantics of §3.8.5.1-§3.8.5.3. | The operation's request shape and occurrence semantics implement this specification's recurrence set directly, with TZID support deferred to a later version.
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/expand-recurrence-rule-service","packageVersion":"0.1.0","license":"MIT","dependencies":{"rrule":"2.8.1"},"devDependencies":{}}
```
## Operation
```mjs path=scripts/expand-recurrence-rule.mjs
#!/usr/bin/env node
// rrule ships no "exports" map and its cjs-lexer-detected named exports are unreliable under Node's native ESM interop, so its default (whole module.exports) is imported and destructured, per the library's own documented Node-ESM usage.
import rrulePackage from "rrule";
const { rrulestr } = rrulePackage;

const BASIC_UTC_DATE_TIME = /^\d{8}T\d{6}Z$/u;

/**
 * Validates that a value is an RFC 5545 basic UTC date-time ("YYYYMMDDTHHMMSSZ"), refusing TZID and local-time forms loudly rather than silently misparsing them.
 * @param {string} value The candidate date-time value.
 * @param {string} field The request field name, used in the thrown message.
 * @returns {void}
 * @throws {Error} When value does not match the basic UTC form.
 */
function assertBasicUtcDateTime(value, field) {
  if (!BASIC_UTC_DATE_TIME.test(value)) {
    throw new Error(
      `${field} must be an RFC 5545 basic UTC date-time (YYYYMMDDTHHMMSSZ); TZID and local-time forms are not yet supported, got ${JSON.stringify(value)}`,
    );
  }
}

/**
 * Expands one iCalendar (RFC 5545) VEVENT's recurrence into the UTC occurrence instants falling within a window, composing the rrule package's own rrulestr/RRuleSet for all RRULE, EXDATE, and RDATE set arithmetic.
 * @param {{dtstart: string, rrule?: string, exdate?: string[], rdate?: string[], window: {start: string, end: string}}} request A record naming the VEVENT's DTSTART (RFC 5545 basic UTC form), an optional RRULE value (the text after "RRULE:"), optional EXDATE/RDATE basic-UTC value arrays, and the window {start, end} (any Date-parseable ISO 8601 instants) to expand within.
 * @returns {{occurrences: string[]}} The occurrence instants within the window, as ascending ISO 8601 UTC strings.
 * @throws {TypeError} When request.dtstart is not a string, or request.window.start/end is not a string.
 * @throws {Error} When dtstart or any exdate/rdate value is not an RFC 5545 basic UTC date-time.
 */
export function expandRecurrenceRule(request) {
  if (typeof request?.dtstart !== "string") throw new TypeError("dtstart must be a string");
  if (typeof request?.window?.start !== "string" || typeof request?.window?.end !== "string") {
    throw new TypeError("window.start and window.end must be strings");
  }
  assertBasicUtcDateTime(request.dtstart, "dtstart");
  const exdate = Array.isArray(request.exdate) ? request.exdate : [];
  const rdateInput = Array.isArray(request.rdate) ? request.rdate : [];
  for (const value of exdate) assertBasicUtcDateTime(value, "exdate");
  for (const value of rdateInput) assertBasicUtcDateTime(value, "rdate");

  const hasRrule = typeof request.rrule === "string" && request.rrule.length > 0;
  const rdate = hasRrule ? rdateInput : [request.dtstart, ...rdateInput];

  const lines = [`DTSTART:${request.dtstart}`];
  if (hasRrule) lines.push(`RRULE:${request.rrule}`);
  if (exdate.length > 0) lines.push(`EXDATE:${exdate.join(",")}`);
  if (rdate.length > 0) lines.push(`RDATE:${rdate.join(",")}`);

  const set = rrulestr(lines.join("\n"), { forceset: true });
  const occurrences = set.between(new Date(request.window.start), new Date(request.window.end), true);
  return { occurrences: occurrences.map((date) => date.toISOString()) };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "expandRecurrenceRule — Expands one iCalendar (RFC 5545) VEVENT's recurrence into the UTC occurrence instants falling within a window, composing the rrule package's own rrulestr/RRuleSet for all RRULE, EXDATE, and RDATE set arithmetic.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(expandRecurrenceRule(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/expand-recurrence-rule.test.mjs
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
  assert.deepEqual(result.occurrences.map((d) => d.slice(0, 10)), [
    "1997-09-02", "1997-09-04", "1997-09-09", "1997-09-11", "1997-09-16",
    "1997-09-18", "1997-09-23", "1997-09-25", "1997-09-30", "1997-10-02",
  ]);
});

test("RFC 5545 §3.8.5.3: monthly on the first Friday for 10 occurrences (BYDAY ordinal)", () => {
  const result = expandRecurrenceRule({
    dtstart: "19970905T090000Z",
    rrule: "FREQ=MONTHLY;COUNT=10;BYDAY=1FR",
    window: { start: "1997-09-01T00:00:00Z", end: "1998-12-31T00:00:00Z" },
  });
  assert.deepEqual(result.occurrences.map((d) => d.slice(0, 10)), [
    "1997-09-05", "1997-10-03", "1997-11-07", "1997-12-05", "1998-01-02",
    "1998-02-06", "1998-03-06", "1998-04-03", "1998-05-01", "1998-06-05",
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
```
## Examples
```json name="daily for 10 occurrences"
{"input":{"dtstart":"19970902T090000Z","rrule":"FREQ=DAILY;COUNT=10","window":{"start":"1997-09-01T00:00:00Z","end":"1997-12-31T00:00:00Z"}},"output":{"occurrences":["1997-09-02T09:00:00.000Z","1997-09-03T09:00:00.000Z","1997-09-04T09:00:00.000Z","1997-09-05T09:00:00.000Z","1997-09-06T09:00:00.000Z","1997-09-07T09:00:00.000Z","1997-09-08T09:00:00.000Z","1997-09-09T09:00:00.000Z","1997-09-10T09:00:00.000Z","1997-09-11T09:00:00.000Z"]}}
```
```json name="a VEVENT without RRULE occurs once, at DTSTART"
{"input":{"dtstart":"19970902T090000Z","window":{"start":"1997-01-01T00:00:00Z","end":"1998-01-01T00:00:00Z"}},"output":{"occurrences":["1997-09-02T09:00:00.000Z"]}}
```
## Traceability
- `vevent-window-to-occurrences` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`, `rfc-5545-icalendar`
- `single-event-without-rrule` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-5545-icalendar`
- `composes-rrule-library` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `fabricate-do-not-hand-write`
- `utc-only-basic-form` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-5545-icalendar`
- `pure-operation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-dtstart-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `missing-window-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `non-utc-basic-form-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `rfc-5545-icalendar`
- `no-second-expander` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`
