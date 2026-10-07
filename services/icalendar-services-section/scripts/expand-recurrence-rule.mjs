
const BASIC_UTC = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/u;
const DAY = 86400000;
const WEEKDAYS = Object.freeze({ SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 });
const FREQUENCIES = Object.freeze(["SECONDLY", "MINUTELY", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
const RECURRENCE_ITERATION_CAP = 1000000;

function basicUtc(value, field) {
  const match = typeof value === "string" ? BASIC_UTC.exec(value) : null;
  if (!match) throw new Error(field + " must be an RFC 5545 basic UTC date-time (YYYYMMDDTHHMMSSZ); TZID and local-time forms are not yet supported, got " + JSON.stringify(value));
  const parts = match.slice(1).map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  const actual = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()];
  if (actual.some((part, index) => part !== parts[index])) throw new Error(field + " is not a valid UTC date-time");
  return date;
}

function windowInstant(value, field) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(field + " must be a valid ISO 8601 instant");
  return date;
}

function integer(value, field, minimum, maximum, nonzero = false) {
  if (!/^[+-]?\d+$/u.test(value)) throw new Error(field + " must contain integers");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum || (nonzero && number === 0)) throw new RangeError(field + " value is outside its RFC 5545 range");
  return number;
}

function integerList(value, field, minimum, maximum, nonzero = false) {
  if (value === "") throw new Error(field + " must not be empty");
  return [...new Set(value.split(",").map((part) => integer(part, field, minimum, maximum, nonzero)))];
}

function parseRule(source) {
  const values = new Map();
  for (const component of source.split(";")) {
    const separator = component.indexOf("=");
    if (separator <= 0 || separator === component.length - 1) throw new Error("invalid RRULE component " + JSON.stringify(component));
    const name = component.slice(0, separator).toUpperCase();
    if (values.has(name)) throw new Error("RRULE component " + name + " must occur at most once");
    values.set(name, component.slice(separator + 1).toUpperCase());
  }
  const known = new Set(["FREQ", "UNTIL", "COUNT", "INTERVAL", "BYSECOND", "BYMINUTE", "BYHOUR", "BYDAY", "BYMONTHDAY", "BYYEARDAY", "BYWEEKNO", "BYMONTH", "BYSETPOS", "WKST"]);
  for (const name of values.keys()) if (!known.has(name)) throw new Error("unsupported RRULE component " + name);
  const freq = values.get("FREQ");
  if (!FREQUENCIES.includes(freq)) throw new Error("RRULE FREQ must be one of SECONDLY through YEARLY");
  if (values.has("COUNT") && values.has("UNTIL")) throw new Error("RRULE COUNT and UNTIL are mutually exclusive");
  const byday = values.has("BYDAY") ? values.get("BYDAY").split(",").map((part) => {
    const match = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/u.exec(part);
    if (!match) throw new Error("invalid BYDAY value " + part);
    const ordinal = match[1] === undefined ? null : integer(match[1], "BYDAY ordinal", -53, 53, true);
    if (ordinal !== null && !["MONTHLY", "YEARLY"].includes(freq)) throw new Error("ordinal BYDAY is only valid with MONTHLY or YEARLY");
    return { ordinal, weekday: WEEKDAYS[match[2]] };
  }) : null;
  const rule = {
    freq,
    interval: values.has("INTERVAL") ? integer(values.get("INTERVAL"), "INTERVAL", 1, Number.MAX_SAFE_INTEGER) : 1,
    count: values.has("COUNT") ? integer(values.get("COUNT"), "COUNT", 1, Number.MAX_SAFE_INTEGER) : null,
    until: values.has("UNTIL") ? basicUtc(values.get("UNTIL"), "UNTIL").getTime() : null,
    bysecond: values.has("BYSECOND") ? integerList(values.get("BYSECOND"), "BYSECOND", 0, 60) : null,
    byminute: values.has("BYMINUTE") ? integerList(values.get("BYMINUTE"), "BYMINUTE", 0, 59) : null,
    byhour: values.has("BYHOUR") ? integerList(values.get("BYHOUR"), "BYHOUR", 0, 23) : null,
    byday,
    bymonthday: values.has("BYMONTHDAY") ? integerList(values.get("BYMONTHDAY"), "BYMONTHDAY", -31, 31, true) : null,
    byyearday: values.has("BYYEARDAY") ? integerList(values.get("BYYEARDAY"), "BYYEARDAY", -366, 366, true) : null,
    byweekno: values.has("BYWEEKNO") ? integerList(values.get("BYWEEKNO"), "BYWEEKNO", -53, 53, true) : null,
    bymonth: values.has("BYMONTH") ? integerList(values.get("BYMONTH"), "BYMONTH", 1, 12) : null,
    bysetpos: values.has("BYSETPOS") ? integerList(values.get("BYSETPOS"), "BYSETPOS", -366, 366, true) : null,
    wkst: values.has("WKST") ? WEEKDAYS[values.get("WKST")] : WEEKDAYS.MO,
  };
  if (rule.wkst === undefined) throw new Error("WKST must be a weekday abbreviation");
  if (rule.byweekno && freq !== "YEARLY") throw new Error("BYWEEKNO is only valid with YEARLY");
  if (rule.byyearday && freq !== "YEARLY") throw new Error("BYYEARDAY is only valid with YEARLY");
  if (rule.bymonthday && freq === "WEEKLY") throw new Error("BYMONTHDAY is not valid with WEEKLY");
  if (rule.byday?.some((part) => part.ordinal !== null) && rule.byweekno) throw new Error("ordinal BYDAY must not be combined with BYWEEKNO");
  return rule;
}

const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const daysInYear = (year) => (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY;
function startOfWeek(time, wkst) {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - ((date.getUTCDay() - wkst + 7) % 7));
}
const weekOneStart = (year, wkst) => startOfWeek(Date.UTC(year, 0, 4), wkst);
const weeksInYear = (year, wkst) => (weekOneStart(year + 1, wkst) - weekOneStart(year, wkst)) / (7 * DAY);
function weekOfYear(time, wkst) {
  const calendarYear = new Date(time).getUTCFullYear();
  if (time < weekOneStart(calendarYear, wkst)) return { year: calendarYear - 1, week: weeksInYear(calendarYear - 1, wkst) };
  if (time >= weekOneStart(calendarYear + 1, wkst)) return { year: calendarYear + 1, week: 1 };
  return { year: calendarYear, week: Math.floor((time - weekOneStart(calendarYear, wkst)) / (7 * DAY)) + 1 };
}
const matchesSigned = (value, total, wanted) => wanted.some((number) => number > 0 ? value === number : value === total + number + 1);
function weekdayPositions(date, yearly) {
  const year = date.getUTCFullYear();
  const value = yearly
    ? Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(year, 0, 1)) / DAY) + 1
    : date.getUTCDate();
  const total = yearly ? daysInYear(year) : daysInMonth(year, date.getUTCMonth());
  return [Math.floor((value - 1) / 7) + 1, -(Math.floor((total - value) / 7) + 1)];
}

function periodFor(rule, dtstart, index) {
  const amount = index * rule.interval;
  const year = dtstart.getUTCFullYear();
  const month = dtstart.getUTCMonth();
  let start;
  let end;
  let identityYear;
  switch (rule.freq) {
    case "YEARLY":
      identityYear = year + amount;
      start = rule.byweekno ? weekOneStart(identityYear, rule.wkst) : Date.UTC(identityYear, 0, 1);
      end = rule.byweekno ? weekOneStart(identityYear + 1, rule.wkst) : Date.UTC(identityYear + 1, 0, 1);
      break;
    case "MONTHLY": start = Date.UTC(year, month + amount, 1); end = Date.UTC(year, month + amount + 1, 1); break;
    case "WEEKLY": start = startOfWeek(dtstart.getTime(), rule.wkst) + amount * 7 * DAY; end = start + 7 * DAY; break;
    case "DAILY": start = Date.UTC(year, month, dtstart.getUTCDate() + amount); end = start + DAY; break;
    case "HOURLY": start = Date.UTC(year, month, dtstart.getUTCDate(), dtstart.getUTCHours() + amount); end = start + 3600000; break;
    case "MINUTELY": start = Date.UTC(year, month, dtstart.getUTCDate(), dtstart.getUTCHours(), dtstart.getUTCMinutes() + amount); end = start + 60000; break;
    default: start = Date.UTC(year, month, dtstart.getUTCDate(), dtstart.getUTCHours(), dtstart.getUTCMinutes(), dtstart.getUTCSeconds() + amount); end = start + 1000;
  }
  return { start, end, identityYear };
}

function dateMatches(time, rule, dtstart, identityYear) {
  const date = new Date(time);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const monthDay = date.getUTCDate();
  const weekday = date.getUTCDay();
  if (rule.bymonth && !rule.bymonth.includes(month + 1)) return false;
  if (rule.byweekno) {
    const info = weekOfYear(time, rule.wkst);
    if (info.year !== identityYear || !matchesSigned(info.week, weeksInYear(identityYear, rule.wkst), rule.byweekno)) return false;
  }
  if (rule.byyearday) {
    if (year !== identityYear) return false;
    const yearDay = Math.floor((time - Date.UTC(year, 0, 1)) / DAY) + 1;
    if (!matchesSigned(yearDay, daysInYear(year), rule.byyearday)) return false;
  }
  if (rule.bymonthday && !matchesSigned(monthDay, daysInMonth(year, month), rule.bymonthday)) return false;
  if (rule.byday && !rule.byday.some((part) => {
    if (weekday !== part.weekday) return false;
    if (part.ordinal === null) return true;
    const positions = weekdayPositions(date, rule.freq === "YEARLY" && !rule.bymonth);
    return positions.includes(part.ordinal);
  })) return false;
  if (rule.freq === "YEARLY") {
    const selectedDay = rule.byweekno || rule.byyearday || rule.bymonthday || rule.byday;
    if (!selectedDay && monthDay !== dtstart.getUTCDate()) return false;
    if (!selectedDay && !rule.bymonth && month !== dtstart.getUTCMonth()) return false;
    if (rule.byweekno && !rule.byday && weekday !== dtstart.getUTCDay()) return false;
  } else if (rule.freq === "MONTHLY" && !rule.bymonthday && !rule.byday && monthDay !== dtstart.getUTCDate()) return false;
  else if (rule.freq === "WEEKLY" && !rule.byday && weekday !== dtstart.getUTCDay()) return false;
  return true;
}

function timeParts(rule, dtstart, periodStart) {
  const anchor = new Date(periodStart);
  const rank = FREQUENCIES.indexOf(rule.freq);
  if (rank <= 2 && rule.byhour && !rule.byhour.includes(anchor.getUTCHours())) return null;
  if (rank <= 1 && rule.byminute && !rule.byminute.includes(anchor.getUTCMinutes())) return null;
  if (rank === 0 && rule.bysecond && !rule.bysecond.includes(anchor.getUTCSeconds())) return null;
  return {
    hours: rank > 2 ? (rule.byhour ?? [dtstart.getUTCHours()]) : [anchor.getUTCHours()],
    minutes: rank > 1 ? (rule.byminute ?? [dtstart.getUTCMinutes()]) : [anchor.getUTCMinutes()],
    seconds: rank > 0 ? (rule.bysecond ?? [dtstart.getUTCSeconds()]) : [anchor.getUTCSeconds()],
  };
}

function periodCandidates(rule, dtstart, period, tick) {
  const parts = timeParts(rule, dtstart, period.start);
  if (!parts) return [];
  const date = new Date(period.start);
  const firstDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const lastDay = ["HOURLY", "MINUTELY", "SECONDLY"].includes(rule.freq) ? firstDay + DAY : period.end;
  const found = new Set();
  for (let day = firstDay; day < lastDay; day += DAY) {
    tick();
    if (!dateMatches(day, rule, dtstart, period.identityYear)) continue;
    for (const hour of parts.hours) for (const minute of parts.minutes) for (const second of parts.seconds) {
      tick();
      const d = new Date(day);
      const candidate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute, second);
      if (candidate >= period.start && candidate < period.end) found.add(candidate);
    }
  }
  const sorted = [...found].sort((a, b) => a - b);
  if (!rule.bysetpos) return sorted;
  const selected = new Set();
  for (const position of rule.bysetpos) {
    const index = position > 0 ? position - 1 : sorted.length + position;
    if (index >= 0 && index < sorted.length) selected.add(sorted[index]);
  }
  return [...selected].sort((a, b) => a - b);
}

function expandRule(rule, dtstart, windowEnd) {
  const result = [];
  const beginning = dtstart.getTime();
  const boundary = Math.min(windowEnd, rule.until ?? Infinity);
  let generated = 0;
  let iterations = 0;
  const tick = () => {
    if (++iterations > RECURRENCE_ITERATION_CAP) throw new RangeError("recurrence expansion exceeded RECURRENCE_ITERATION_CAP (" + RECURRENCE_ITERATION_CAP + ")");
  };
  for (let index = 0; ; index += 1) {
    tick();
    const period = periodFor(rule, dtstart, index);
    if (!Number.isFinite(period.start)) throw new RangeError("recurrence expansion exceeded JavaScript Date range");
    if (period.start > boundary) break;
    for (const candidate of periodCandidates(rule, dtstart, period, tick)) {
      if (candidate < beginning || (rule.until !== null && candidate > rule.until)) continue;
      generated += 1;
      if (candidate <= windowEnd) result.push(candidate);
      if (rule.count !== null && generated >= rule.count) return result;
    }
    if (period.end > boundary) break;
  }
  return result;
}

/**
 * Expands one RFC 5545 VEVENT recurrence set into UTC occurrence instants in an inclusive window.
 * @param {{dtstart: string, rrule?: string, exdate?: string[], rdate?: string[], window: {start: string, end: string}}} request
 * @returns {{occurrences: string[]}}
 */
export function expandRecurrenceRule(request) {
  if (typeof request?.dtstart !== "string") throw new TypeError("dtstart must be a string");
  if (typeof request?.window?.start !== "string" || typeof request?.window?.end !== "string") throw new TypeError("window.start and window.end must be strings");
  const dtstart = basicUtc(request.dtstart, "dtstart");
  const windowStart = windowInstant(request.window.start, "window.start").getTime();
  const windowEnd = windowInstant(request.window.end, "window.end").getTime();
  const exdate = Array.isArray(request.exdate) ? request.exdate.map((value) => basicUtc(value, "exdate").getTime()) : [];
  const rdate = Array.isArray(request.rdate) ? request.rdate.map((value) => basicUtc(value, "rdate").getTime()) : [];
  if (windowStart > windowEnd) return { occurrences: [] };
  const hasRule = typeof request.rrule === "string" && request.rrule.length > 0;
  const recurrence = hasRule ? expandRule(parseRule(request.rrule), dtstart, windowEnd) : [dtstart.getTime()];
  const excluded = new Set(exdate);
  return { occurrences: [...new Set([...recurrence, ...rdate])]
    .filter((time) => time >= windowStart && time <= windowEnd && !excluded.has(time))
    .sort((a, b) => a - b)
    .map((time) => new Date(time).toISOString()) };
}

export const operation = Object.freeze({ name: "expand-recurrence-rule", description: "Expands one iCalendar (RFC 5545) VEVENT recurrence set into UTC occurrence instants within a bounded window.", operation: expandRecurrenceRule });
