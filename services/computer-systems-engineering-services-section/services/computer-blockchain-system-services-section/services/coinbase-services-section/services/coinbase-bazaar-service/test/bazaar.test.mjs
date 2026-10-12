import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchCatalog, fetchPage, findResource, resourceOrigin, searchResources } from "../src/discovery.mjs";
import { catalogTotals, demandByCategory, demandRanked, entryPrice, priceDecimal, priceDistribution, summarize } from "../src/market.mjs";

const item = (resource, { calls = 0, payers = 0, amount = "1000", description = "" } = {}) => ({
  resource, description, type: "http", x402Version: 2,
  accepts: [{ amount, asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", network: "eip155:8453", payTo: "0xabc", scheme: "exact" }],
  quality: { l30DaysTotalCalls: calls, l30DaysUniquePayers: payers, lastCalledAt: "2026-08-25T18:47:43.323Z" },
});

/** Serve a fixed item list through the real pagination contract. */
function pagedFetch(items, { failAt = null } = {}) {
  return async (url) => {
    const offset = Number(new URL(url).searchParams.get("offset") ?? 0);
    const limit = Number(new URL(url).searchParams.get("limit") ?? 100);
    if (failAt !== null && offset === failAt) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ items: items.slice(offset, offset + limit), pagination: { limit, offset, total: items.length }, x402Version: 2 }) };
  };
}

// ── discovery ────────────────────────────────────────────────────────────────────────────

test("fetchPage(): a transport failure is an outcome, not an empty page", async () => {
  const r = await fetchPage({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
  assert.equal(r.ok, false);
  assert.equal("items" in r, false, "a failure must not carry an items array that reads as empty");
  assert.match(r.reason, /500/);
});

test("fetchPage(): a malformed body is a failure, not zero results", async () => {
  const r = await fetchPage({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ nope: true }) }) });
  assert.equal(r.ok, false);
  assert.match(r.reason, /items is not an array/);
});

test("fetchCatalog(): pages through the whole catalog", async () => {
  const items = Array.from({ length: 250 }, (_, i) => item(`https://s${i}.example/api`));
  const catalog = await fetchCatalog({ fetchImpl: pagedFetch(items) });
  assert.equal(catalog.items.length, 250);
  assert.equal(catalog.total, 250);
  assert.equal(catalog.complete, true);
  assert.match(catalog.note, /absence here is a real absence/);
});

test("fetchCatalog(): a mid-walk failure makes the catalog incomplete and says so", async () => {
  const items = Array.from({ length: 250 }, (_, i) => item(`https://s${i}.example/api`));
  const catalog = await fetchCatalog({ fetchImpl: pagedFetch(items, { failAt: 100 }) });
  assert.equal(catalog.complete, false);
  assert.equal(catalog.failures.length, 1);
  assert.match(catalog.note, /INCOMPLETE/);
  assert.match(catalog.note, /proves nothing/);
});

test("fetchCatalog(): stopping at the page cap is incomplete, not complete", async () => {
  const items = Array.from({ length: 500 }, (_, i) => item(`https://s${i}.example/api`));
  const catalog = await fetchCatalog({ fetchImpl: pagedFetch(items), maxPages: 2 });
  assert.equal(catalog.items.length, 200);
  assert.equal(catalog.complete, false);
  assert.match(catalog.note, /cap/);
});

test("findResource(): finds a listed host", () => {
  const catalog = { items: [item("https://ephemeris.561.group/v1/x"), item("https://other.example/api")], complete: true, failures: [], total: 2, note: "" };
  const r = findResource(catalog, "561.group");
  assert.equal(r.listed, true);
  assert.equal(r.matches.length, 1);
});

test("findResource(): absence from a COMPLETE catalog is a real false", () => {
  const catalog = { items: [item("https://other.example/api")], complete: true, failures: [], total: 1, note: "" };
  assert.equal(findResource(catalog, "561.group").listed, false);
});

test("findResource(): absence from an INCOMPLETE catalog is null, never false", () => {
  // The defect this module exists to prevent: an unread catalog reading as an absent listing.
  const catalog = { items: [item("https://other.example/api")], complete: false, failures: [{ offset: 100, reason: "http 503" }], total: 999, note: "INCOMPLETE: 1 page(s) failed" };
  const r = findResource(catalog, "561.group");
  assert.equal(r.listed, null);
  assert.notEqual(r.listed, false);
  assert.match(r.reason, /INCOMPLETE/);
});

test("resourceOrigin(): tolerates a missing or malformed resource url", () => {
  assert.equal(resourceOrigin({ resource: "https://a.example/x/y" }), "https://a.example");
  assert.equal(resourceOrigin({}), null);
  assert.equal(resourceOrigin({ resource: "not a url" }), null);
});

test("searchResources(): matches description and url, case-insensitively", () => {
  const catalog = { items: [item("https://a.example/eph", { description: "Ephemeris positions" }), item("https://b.example/x", { description: "weather" })], complete: true, failures: [], total: 2, note: "" };
  assert.equal(searchResources(catalog, "EPHEMERIS").length, 1);
  assert.equal(searchResources(catalog, ["weather", "nothing"]).length, 1);
});

// ── market ───────────────────────────────────────────────────────────────────────────────

test("entryPrice(): picks the cheapest accepted price and keeps it a string", () => {
  const multi = { accepts: [{ amount: "320000" }, { amount: "40000" }] };
  const p = entryPrice(multi);
  assert.equal(p.raw, "40000");
  assert.equal(typeof p.raw, "string", "a price must not become a Number");
  assert.equal(priceDecimal(p), "0.04");
});

test("entryPrice(): returns null when no accept carries a usable amount", () => {
  assert.equal(entryPrice({ accepts: [{ amount: "not-a-number" }] }), null);
  assert.equal(entryPrice({}), null);
});

test("priceDecimal(): exact at six decimals", () => {
  assert.equal(priceDecimal({ raw: "1", assumedDecimals: 6 }), "0.000001");
  assert.equal(priceDecimal({ raw: "320000", assumedDecimals: 6 }), "0.32");
  assert.equal(priceDecimal({ raw: "1000000", assumedDecimals: 6 }), "1");
});

test("summarize(): flags a single-payer resource as concentrated", () => {
  // 5000 calls from one payer is one integration, not a market.
  const s = summarize(item("https://a.example/x", { calls: 5000, payers: 1 }));
  assert.equal(s.concentrated, true);
  assert.equal(s.callsPerPayer, 5000);
});

test("summarize(): broad usage is not flagged concentrated", () => {
  const s = summarize(item("https://a.example/x", { calls: 200, payers: 180 }));
  assert.equal(s.concentrated, false);
});

test("summarize(): estimated revenue is price times calls, exactly", () => {
  const s = summarize(item("https://a.example/x", { calls: 1046, amount: "3000" }));
  assert.equal(s.estimatedRevenue, "3.138"); // 0.003 * 1046
});

test("demandRanked(): ranks by unique payers, not raw call count", () => {
  const catalog = { items: [
    item("https://busy.example/x", { calls: 9999, payers: 1 }),   // one customer's cron job
    item("https://broad.example/x", { calls: 200, payers: 180 }), // an actual market
  ], complete: true, failures: [], total: 2, note: "" };
  const ranked = demandRanked(catalog, { minPayers: 1 });
  assert.equal(ranked[0].resource, "https://broad.example/x", "payers must outrank calls");
});

test("demandRanked(): excludes resources below the payer floor", () => {
  const catalog = { items: [item("https://a.example/x", { calls: 100, payers: 1 })], complete: true, failures: [], total: 1, note: "" };
  assert.equal(demandRanked(catalog, { minPayers: 2 }).length, 0);
});

test("priceDistribution(): reports a distribution rather than an average", () => {
  const catalog = { items: [
    item("https://a/1", { calls: 1, amount: "0" }), item("https://a/2", { calls: 1, amount: "1000" }),
    item("https://a/3", { calls: 1, amount: "40000" }), item("https://a/4", { calls: 1, amount: "1000000" }),
  ], complete: true, failures: [], total: 4, note: "" };
  const d = priceDistribution(catalog);
  assert.equal(d.count, 4);
  assert.equal(d.min, 0);
  assert.equal(d.max, 1);
  assert.equal(d.free, 1);
  assert.equal("mean" in d, false, "an average across free and premium tiers describes nothing");
});

test("priceDistribution(): ignores dormant resources by default", () => {
  const catalog = { items: [item("https://a/1", { calls: 0, amount: "1000" })], complete: true, failures: [], total: 1, note: "" };
  assert.equal(priceDistribution(catalog).count, 0);
  assert.equal(priceDistribution(catalog, { onlyLive: false }).count, 1);
});

test("demandByCategory(): groups live demand and returns the matches for checking", () => {
  const catalog = { items: [
    item("https://a/1", { calls: 10, payers: 5, description: "ERC20 token balance via eth_call" }),
    item("https://a/2", { calls: 20, payers: 9, description: "wallet balance lookup" }),
    item("https://a/3", { calls: 5, payers: 2, description: "weather forecast" }),
    item("https://a/4", { calls: 0, payers: 0, description: "dormant balance thing" }),
  ], complete: true, failures: [], total: 4, note: "" };
  const g = demandByCategory(catalog, { chain: ["balance", "eth_call"], weather: ["weather"] });
  assert.equal(g.chain.resources, 2, "the dormant entry must not count as demand");
  assert.equal(g.chain.totalPayers, 14);
  assert.equal(g.weather.resources, 1);
  assert.ok(Array.isArray(g.chain.top), "matches are returned so the grouping can be checked");
});

test("catalogTotals(): separates live from dormant and carries completeness", () => {
  const catalog = { items: [item("https://a/1", { calls: 10, payers: 3 }), item("https://a/2", { calls: 0 })], complete: false, failures: [{ offset: 0, reason: "x" }], total: 99, note: "INCOMPLETE: x" };
  const t = catalogTotals(catalog);
  assert.equal(t.resources, 2);
  assert.equal(t.liveResources, 1);
  assert.equal(t.dormantResources, 1);
  assert.equal(t.complete, false);
  assert.match(t.note, /INCOMPLETE/);
});
