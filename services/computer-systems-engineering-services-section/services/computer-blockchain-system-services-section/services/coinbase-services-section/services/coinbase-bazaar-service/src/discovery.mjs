/**
 * `discovery` — a read-only client for Coinbase's x402 Bazaar catalog.
 *
 * The Bazaar is the directory agent buyers query to find priced HTTP endpoints. Being in it is
 * the difference between a working product and an invisible one, and the Group learned that
 * the expensive way: its paid ephemeris gateway ran correctly for over a month, took four
 * unsolicited payments from two strangers, and was never in this catalog at any point. Nobody
 * noticed, because nothing was watching. This module is the thing that watches.
 *
 * A resource is catalogued off settlement activity rather than by submission — there is no
 * listing form. That makes listing an *observable consequence* of the payment path being wired
 * correctly, which in turn makes "are we listed?" a real diagnostic about our own plumbing
 * rather than a marketing question.
 *
 * Two properties of the catalog make it worth reading beyond our own row. It is large — call
 * it fifteen thousand resources — and every entry publishes `quality`, carrying
 * `l30DaysTotalCalls`, `l30DaysUniquePayers`, and `lastCalledAt` alongside the price in
 * `accepts`. That is a public record of what agents actually pay for and how much they pay,
 * which is a far better guide to what to build next than any amount of reasoning about what
 * agents might want. `market.mjs` reads it that way.
 *
 * The endpoint needs no API key. Everything here is read-only: this module cannot list,
 * delist, or modify anything, and it never signs or spends.
 *
 * Amounts stay strings. A price is money, and the catalog reports it in base units as a
 * string; parsing it into a Number to "make it easier" is how a value path acquires a float.
 *
 * Plain JavaScript, shapes in the co-located discovery.d.ts.
 */

export const BAZAAR_URL = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources";

/** The catalog's maximum page size. Larger values are silently capped by the API, so paging
 *  is bounded by this rather than by what a caller asks for. */
export const MAX_PAGE = 100;

/**
 * Fetch one page. Returns an outcome rather than throwing on a transport failure, for the same
 * reason the treasury scanner does: a failed read must never be indistinguishable from an
 * empty catalog, or "we are not listed" and "we could not check" collapse into one answer.
 */
export async function fetchPage({ offset = 0, limit = MAX_PAGE, fetchImpl = fetch, url = BAZAAR_URL, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${url}?limit=${limit}&offset=${offset}`, { signal: controller.signal });
    if (!response.ok) return { ok: false, reason: `http ${response.status}`, offset };
    const body = await response.json();
    const items = body?.items;
    if (!Array.isArray(items)) return { ok: false, reason: "malformed response: items is not an array", offset };
    return { ok: true, items, total: body?.pagination?.total ?? null, offset };
  } catch (error) {
    return { ok: false, reason: error?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(error?.message ?? error), offset };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walk the whole catalog.
 *
 * Returns what it managed to read together with which pages it failed on, and a `complete`
 * flag that is true only when every page was read. A caller asking "is our resource listed?"
 * must be able to tell a confident no from an incomplete read, so absence is only meaningful
 * when `complete` is true — `findResource` enforces that rather than trusting the caller to.
 */
export async function fetchCatalog({ fetchImpl = fetch, url = BAZAAR_URL, maxPages = 250, timeoutMs = 30000 } = {}) {
  const items = [];
  const failures = [];
  let offset = 0;
  let total = null;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage({ offset, limit: MAX_PAGE, fetchImpl, url, timeoutMs });
    if (!result.ok) {
      failures.push({ offset, reason: result.reason });
      break;
    }
    if (result.total !== null) total = result.total;
    items.push(...result.items);
    if (result.items.length < MAX_PAGE) break;
    offset += result.items.length;
    if (total !== null && offset >= total) break;
  }
  const reachedCap = items.length > 0 && failures.length === 0 && total !== null && items.length < total;
  return {
    items,
    total,
    failures,
    complete: failures.length === 0 && !reachedCap,
    note: failures.length > 0
      ? `INCOMPLETE: ${failures.length} page(s) failed; absence from these results proves nothing`
      : reachedCap
        ? `INCOMPLETE: stopped at the ${maxPages}-page cap with ${items.length} of ${total}`
        : "complete: every page was read, so absence here is a real absence",
  };
}

/** The origin of a catalog entry's resource URL, or null when it has none or is malformed. */
export function resourceOrigin(item) {
  try {
    return new URL(item?.resource ?? "").origin;
  } catch {
    return null;
  }
}

/**
 * Look for resources belonging to a host.
 *
 * `listed` is deliberately three-valued — true, false, or null for "could not determine" —
 * because the whole point of this module is that an unread catalog must not read as an empty
 * one. A caller that treats null as false reintroduces exactly the blindness that let a paid
 * service sit unlisted for a month.
 */
export function findResource(catalog, host) {
  const needle = String(host).toLowerCase();
  const matches = catalog.items.filter((item) => {
    const origin = resourceOrigin(item);
    return origin !== null && origin.toLowerCase().includes(needle);
  });
  if (matches.length > 0) return { listed: true, matches, checked: catalog.items.length, complete: catalog.complete };
  return {
    listed: catalog.complete ? false : null,
    matches: [],
    checked: catalog.items.length,
    complete: catalog.complete,
    reason: catalog.complete ? undefined : catalog.note,
  };
}

/** Free-text search across a catalog entry's description, resource URL, and declared service
 *  name. Case-insensitive; matches any of the supplied terms. */
export function searchResources(catalog, terms) {
  const needles = (Array.isArray(terms) ? terms : [terms]).map((t) => String(t).toLowerCase());
  return catalog.items.filter((item) => {
    const hay = `${item?.resource ?? ""} ${item?.description ?? ""} ${item?.extensions?.bazaar?.info?.serviceName ?? ""}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
}
