/** Read a USD price observation from CoinGecko's public simple-price endpoint. */
const SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price";

export async function fetchCoingeckoUsdPrices(ids, { fetchImpl = fetch } = {}) {
  const url = new URL(SIMPLE_PRICE_URL);
  url.searchParams.set("ids", [...new Set(ids)].join(","));
  url.searchParams.set("vs_currencies", "usd");
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`coingecko: HTTP ${response.status}`);
  const body = await response.json();
  const prices = new Map();
  for (const [id, entry] of Object.entries(body ?? {})) {
    if (entry && typeof entry.usd === "number") prices.set(id, entry.usd);
  }
  return prices;
}
