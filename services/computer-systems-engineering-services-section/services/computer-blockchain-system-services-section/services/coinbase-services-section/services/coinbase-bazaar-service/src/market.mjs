/**
 * `market` — read the Bazaar catalog as demand evidence rather than as a phone book.
 *
 * Deciding what to sell to agent buyers is normally guesswork. It does not have to be here,
 * because every catalog entry publishes a `quality` block carrying `l30DaysTotalCalls`,
 * `l30DaysUniquePayers`, and `lastCalledAt`, next to its price in `accepts`. Across roughly
 * fifteen thousand resources that is a public record of what agents actually pay for, how
 * often, how many distinct buyers each seller has, and what they charge — the answer to "what
 * should we build next" as measurement instead of speculation.
 *
 * The distinction this module insists on is **calls versus payers**. A resource with ten
 * thousand calls from one payer is one customer's cron job, and tells you almost nothing about
 * a market. A resource with two hundred calls from a hundred and eighty distinct payers is
 * demand. Ranking by call count alone would put the first above the second and point a
 * roadmap at the wrong thing, so `demandRanked` sorts on unique payers and reports the
 * concentration explicitly.
 *
 * Prices stay in base units as strings, and revenue estimates are computed in BigInt.
 * Estimated revenue is the product of a published price and a published call count and is
 * clearly labelled an estimate: sellers may serve free tiers, price several routes
 * differently, or have had calls that never settled. It is a lower-bound signal about a
 * market, not an accounting figure about a competitor.
 *
 * Nothing here fetches. It takes a catalog from `discovery.mjs` and reduces it, so every
 * function is pure and testable without a network.
 *
 * Plain JavaScript, shapes in the co-located market.d.ts.
 */

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** The cheapest accepted price on an entry, as `{ raw, asset, network, decimals }`. Entries
 *  may accept several schemes or assets; the lowest is the entry price a buyer actually sees. */
export function entryPrice(item) {
  const accepts = Array.isArray(item?.accepts) ? item.accepts : [];
  let best = null;
  for (const accept of accepts) {
    if (typeof accept?.amount !== "string" || !/^\d+$/u.test(accept.amount)) continue;
    const raw = BigInt(accept.amount);
    if (best === null || raw < best.raw) {
      best = { raw, asset: accept.asset ?? null, network: accept.network ?? null, scheme: accept.scheme ?? null };
    }
  }
  if (best === null) return null;
  // Every asset seen in this catalog to date is USDC at six decimals. The decimals are not
  // published per entry, so this is recorded as an assumption rather than silently applied.
  return { ...best, raw: best.raw.toString(), assumedDecimals: 6 };
}

/** Price in whole units as an exact decimal string, given the assumed decimals. */
export function priceDecimal(price) {
  if (price === null) return null;
  const raw = BigInt(price.raw);
  const d = price.assumedDecimals;
  const digits = raw.toString().padStart(d + 1, "0");
  const whole = digits.slice(0, digits.length - d);
  const frac = digits.slice(digits.length - d).replace(/0+$/u, "");
  return frac === "" ? whole : `${whole}.${frac}`;
}

/** Normalize one catalog entry into the fields a demand question actually needs. */
export function summarize(item) {
  const quality = item?.quality ?? {};
  const calls = num(quality.l30DaysTotalCalls);
  const payers = num(quality.l30DaysUniquePayers);
  const price = entryPrice(item);
  const revenueRaw = price === null ? 0n : BigInt(price.raw) * BigInt(calls);
  return {
    resource: item?.resource ?? null,
    description: item?.description ?? null,
    calls,
    payers,
    // One payer making every call is a single integration, not a market. Reported so a reader
    // cannot mistake a busy cron job for demand.
    callsPerPayer: payers > 0 ? calls / payers : null,
    concentrated: payers > 0 && payers < 3 && calls > 50,
    price,
    priceDecimal: priceDecimal(price),
    estimatedRevenue: price === null ? null : priceDecimal({ raw: revenueRaw.toString(), assumedDecimals: price.assumedDecimals }),
    lastCalledAt: quality.lastCalledAt ?? null,
    live: calls > 0,
  };
}

/** Entries ranked by number of distinct paying buyers — the honest demand signal. */
export function demandRanked(catalog, { limit = 25, minPayers = 2 } = {}) {
  return catalog.items
    .map(summarize)
    .filter((s) => s.payers >= minPayers)
    .sort((a, b) => b.payers - a.payers || b.calls - a.calls)
    .slice(0, limit);
}

/** What the market charges, as a distribution rather than an average. An average price across
 *  a catalog with free tiers and dollar-plus premium routes describes nothing real. */
export function priceDistribution(catalog, { onlyLive = true } = {}) {
  const prices = catalog.items
    .map(summarize)
    .filter((s) => s.price !== null && (!onlyLive || s.live))
    .map((s) => Number(s.priceDecimal))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (prices.length === 0) return { count: 0 };
  const at = (q) => prices[Math.min(prices.length - 1, Math.floor(q * prices.length))];
  return {
    count: prices.length,
    min: prices[0],
    p25: at(0.25),
    median: at(0.5),
    p75: at(0.75),
    p90: at(0.9),
    max: prices[prices.length - 1],
    free: prices.filter((p) => p === 0).length,
  };
}

/**
 * Group live demand by keyword, to answer "which kinds of computation do agents pay for".
 *
 * Keyword grouping is coarse and a resource can land in several groups; that is acceptable for
 * a directional read and is why the result reports the matched resources rather than only a
 * count, so a reader can check the grouping instead of trusting it.
 */
export function demandByCategory(catalog, categories) {
  const summaries = catalog.items.map(summarize).filter((s) => s.live);
  const out = {};
  for (const [name, terms] of Object.entries(categories)) {
    const needles = terms.map((t) => t.toLowerCase());
    const matched = summaries.filter((s) => {
      const hay = `${s.resource ?? ""} ${s.description ?? ""}`.toLowerCase();
      return needles.some((n) => hay.includes(n));
    });
    out[name] = {
      resources: matched.length,
      totalCalls: matched.reduce((t, s) => t + s.calls, 0),
      totalPayers: matched.reduce((t, s) => t + s.payers, 0),
      medianPrice: matched.length === 0 ? null : Number(matched.map((s) => Number(s.priceDecimal)).sort((a, b) => a - b)[Math.floor(matched.length / 2)]),
      top: matched.sort((a, b) => b.payers - a.payers).slice(0, 3).map((s) => ({ resource: s.resource, payers: s.payers, calls: s.calls, price: s.priceDecimal })),
    };
  }
  return out;
}

/** Catalog-wide totals, for sizing the market before reading any single row. */
export function catalogTotals(catalog) {
  const summaries = catalog.items.map(summarize);
  const live = summaries.filter((s) => s.live);
  return {
    resources: summaries.length,
    liveResources: live.length,
    dormantResources: summaries.length - live.length,
    totalCalls30d: live.reduce((t, s) => t + s.calls, 0),
    totalPayers30d: live.reduce((t, s) => t + s.payers, 0),
    complete: catalog.complete,
    note: catalog.complete ? undefined : catalog.note,
  };
}
