/** Read the live Bazaar: are we listed, what sells, and at what price. Read-only. */
import { fetchCatalog, findResource } from "../src/discovery.mjs";
import { catalogTotals, demandByCategory, demandRanked, priceDistribution } from "../src/market.mjs";

const catalog = await fetchCatalog({ maxPages: 200 });
const totals = catalogTotals(catalog);
console.log("catalog:", JSON.stringify(totals));

for (const host of ["561.group", "ephemeris.561.group"]) {
  const f = findResource(catalog, host);
  console.log(`listed[${host}]:`, f.listed === null ? `UNKNOWN (${f.reason})` : f.listed);
}

console.log("\nprice distribution (live resources, USDC):", JSON.stringify(priceDistribution(catalog)));

console.log("\ntop demand by DISTINCT PAYERS:");
for (const s of demandRanked(catalog, { limit: 12 })) {
  console.log(`  ${String(s.payers).padStart(5)} payers  ${String(s.calls).padStart(6)} calls  $${(s.priceDecimal ?? "?").padEnd(8)} ${(s.description ?? s.resource ?? "").slice(0, 78)}`);
}

console.log("\ndemand by category:");
const cats = {
  "chain data": ["balance", "eth_call", "onchain", "on-chain", "wallet", "token", "rpc", "block"],
  "market/price": ["price", "quote", "ticker", "ohlc", "candle", "market data"],
  "math/compute": ["calculat", "comput", "solver", "simulat", "optimiz", "statistic"],
  "ai/inference": ["llm", "inference", "completion", "embedding", "model"],
  "search/web": ["search", "scrape", "crawl", "index"],
  "identity/security": ["verify", "audit", "risk", "sanction", "kyc", "fraud", "policy"],
  "geo/time": ["weather", "geocode", "timezone", "ephemeris", "astronom"],
};
for (const [name, g] of Object.entries(demandByCategory(catalog, cats))) {
  console.log(`  ${name.padEnd(18)} ${String(g.resources).padStart(4)} live  ${String(g.totalPayers).padStart(6)} payers  median $${g.medianPrice ?? "-"}`);
}
