/**
 * Seed — the string that fixes the environment's strategy for a run (see `./rules.mjs`).
 *
 * A daily seed is a pure function of the game, the UTC calendar day and the configuration, so
 * every player meets the same Opponent on the same day wherever they are. Nothing here reads
 * the clock: the caller supplies the date.
 */

const UTC_DATE_STRING = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` for `date`'s UTC calendar day. */
export function utcDateString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new TypeError("utcDateString: date must be a valid Date");
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function resolveDay(date) {
  if (typeof date !== "string") return utcDateString(date);
  if (!UTC_DATE_STRING.test(date)) throw new TypeError(`resolveDay: "${date}" is not a YYYY-MM-DD date string`);
  return date;
}

/** The `daily-utc` seed: `<gameId>-daily:[<configId>:]<YYYY-MM-DD>`. `date` is a `Date` or a
 *  `YYYY-MM-DD` string. */
export function dailySeed(gameId, date, configId) {
  if (typeof gameId !== "string" || gameId.length === 0) throw new TypeError("dailySeed: gameId must be a non-empty string");
  const suffix = configId !== undefined && configId.length > 0 ? `${configId}:` : "";
  return `${gameId}-daily:${suffix}${resolveDay(date)}`;
}

/** The `client-supplied` seed: any non-empty string, returned unchanged. */
export function clientSuppliedSeed(raw) {
  if (typeof raw !== "string" || raw.length === 0) throw new TypeError("clientSuppliedSeed: seed must be a non-empty string");
  return raw;
}
