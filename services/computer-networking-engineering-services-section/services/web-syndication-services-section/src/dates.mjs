/**
 * dates -- the instants feeds speak: RFC 3339 (Atom `updated`, JSON Feed `date_published`), RFC 822 /
 * RFC 5322 (RSS `pubDate`) and the sitemap's W3C Datetime. Every function is a pure function of its
 * argument: there is no clock, so identical input is byte-identical output.
 */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/u;
const pad = (n, width = 2) => String(n).padStart(width, "0");

/** Milliseconds since the epoch of an RFC 3339 instant (a zone offset is honoured); throws on anything else. */
export function parseRfc3339(value) {
  const m = typeof value === "string" ? RFC3339.exec(value) : null;
  if (m === null) throw new TypeError(`not an RFC 3339 instant: ${String(value)}`);
  const [, y, mo, d, h, mi, s, frac, zone] = m;
  const month = Number(mo) - 1;
  const day = Number(d);
  if (month < 0 || month > 11 || day < 1 || Number(h) > 23 || Number(mi) > 59 || Number(s) > 60) throw new TypeError(`not an RFC 3339 instant: ${value}`);
  const probe = new Date(Date.UTC(Number(y), month, day));
  if (probe.getUTCMonth() !== month || probe.getUTCDate() !== day) throw new TypeError(`not an RFC 3339 instant: ${value}`);
  let ms = Date.UTC(Number(y), month, day, Number(h), Number(mi), Math.min(Number(s), 59), frac ? Math.round(Number(frac) * 1000) : 0);
  if (zone !== "Z" && zone !== "z") ms -= (zone[0] === "-" ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) * 60_000;
  return ms;
}

/** The instant as RFC 3339 in UTC (`2026-06-05T12:00:00Z`). */
export function toRfc3339(value) {
  const t = new Date(typeof value === "number" ? value : parseRfc3339(value));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}Z`;
}

/** The instant as an RFC 822 date-time in GMT (`Fri, 05 Jun 2026 12:00:00 GMT`), the RSS 2.0 form. */
export function toRfc822(value) {
  const t = new Date(typeof value === "number" ? value : parseRfc3339(value));
  return `${DAYS[t.getUTCDay()]}, ${pad(t.getUTCDate())} ${MONTHS[t.getUTCMonth()]} ${pad(t.getUTCFullYear(), 4)} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())} GMT`;
}

/** The calendar date (`2026-06-05`) of the instant in UTC, a sitemap `lastmod`. */
export function toDate(value) {
  const t = new Date(typeof value === "number" ? value : parseRfc3339(value));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

const ZONES = { UT: 0, GMT: 0, Z: 0, EST: -300, EDT: -240, CST: -360, CDT: -300, MST: -420, MDT: -360, PST: -480, PDT: -420 };

/** Milliseconds of an RFC 822 date-time as RSS feeds write it (day name optional, 2- or 4-digit year, named or numeric zone), or undefined. */
export function parseRfc822(value) {
  const m = /^\s*(?:[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([A-Za-z]{1,4}|[+-]\d{4})?\s*$/u.exec(String(value));
  if (m === null) return undefined;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === m[2].toLowerCase());
  if (month === -1) return undefined;
  let year = Number(m[3]);
  if (m[3].length === 2) year += year < 50 ? 2000 : 1900;
  let ms = Date.UTC(year, month, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0));
  const zone = m[7] ?? "GMT";
  const offset = /^[+-]\d{4}$/u.test(zone) ? (zone[0] === "-" ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5))) : ZONES[zone.toUpperCase()];
  if (offset === undefined) return undefined;
  ms -= offset * 60_000;
  return Number.isNaN(ms) ? undefined : ms;
}
