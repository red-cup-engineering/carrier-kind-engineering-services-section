/**
 * @red-cup-engineering/agent-operations-management-engine/scheduling — temporal placement of work.
 *
 * Working-time arithmetic (calendars), recurring schedules (recurrence rules),
 * and timeline scheduling (the critical-path method). All pure: explicit dates
 * and durations in, schedules out.
 */

export {
  standardCalendar,
  workCalendar,
  isWorkingDay,
  addDays,
  addWorkingDays,
  workingDaysBetween,
  calendarDaysBetween,
  compareDays,
} from "./calendar.mjs";
export type { IsoDay, WorkCalendar } from "./calendar.mjs";

export {
  recurrenceRule,
  expand,
  nextOccurrence,
  MAX_OCCURRENCES,
} from "./recurrence.mjs";
export type { Frequency, RecurrenceRule } from "./recurrence.mjs";

export { criticalPath } from "./critical-path.mjs";
export type { Schedule, ScheduledTask } from "./critical-path.mjs";
