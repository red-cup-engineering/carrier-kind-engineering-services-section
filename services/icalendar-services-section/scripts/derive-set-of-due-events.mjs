import { expandRecurrenceRule } from "@red-cup-engineering/icalendar-services-section/expand-recurrence-rule";

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

export const operation = Object.freeze({ name: "derive-set-of-due-events", description: "Derives which of a set of iCalendar (RFC 5545) VEVENT-shaped scheduled events are due as of `now`, composing expand-recurrence-rule-service to find each event's most recent recurrence instance at or before `now`.", operation: deriveSetOfDueEvents });
