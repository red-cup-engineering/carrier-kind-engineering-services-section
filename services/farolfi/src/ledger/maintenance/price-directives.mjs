/** Derives Beancount `price` directives: CoinGecko USD prices for named commodities, and
 *  Hive-Engine-metrics-times-HIVE/USD derived prices for every other commodity the ledger's
 *  Hive-Engine Unclassified balances name. */
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { callMany } from "@red-cup-engineering/treasury-observation-service/chains";
import { renderFile, renderPriceDirective } from "./beancount-render.mjs";
import { fetchCoingeckoUsdPrices } from "./coingecko.mjs";
import { multiplyDecimalStrings } from "@red-cup-engineering/exact-number-data-service/decimal-string";
import { EngineClient } from "@red-cup-engineering/hive-blockchain-client-service/engine.mjs";
import { hiveEngineUnclassifiedSymbols } from "./ledger-metadata.mjs";

const HIVE_ENGINE_SOURCE = "hive-engine-metrics x coingecko";

/**
 * @typedef {{ directive: string, symbol: string, price: string }} PricedDirective
 * @typedef {{ symbol: string, reason: string }} UnpricedCommodity
 */

/**
 * Compose `price` directives for the commodities named in `sourcesMap`, from a CoinGecko
 * id -> USD price map.
 * @param {{ date: string, sourcesMap: Record<string, { coingecko: string }>,
 *   coingeckoPrices: Map<string, number> }} input
 * @returns {{ priced: PricedDirective[], unpriced: UnpricedCommodity[] }}
 */
export function composeCoingeckoDirectives({ date, sourcesMap, coingeckoPrices }) {
  const priced = [];
  const unpriced = [];
  for (const [symbol, { coingecko: id }] of Object.entries(sourcesMap)) {
    const usd = coingeckoPrices.get(id);
    if (usd === undefined) {
      unpriced.push({ symbol, reason: `coingecko returned no USD price for id "${id}"` });
      continue;
    }
    const price = String(usd);
    priced.push({ directive: renderPriceDirective({ date, symbol, price }), symbol, price });
  }
  return { priced, unpriced };
}

/**
 * Compose `price` directives for commodities priced via Hive-Engine market metrics (their
 * `lastPrice` in SWAP.HIVE) times a HIVE/USD price. A metrics entry may be `null` (no market
 * for that symbol), `{ error }` (the fetch itself failed), or `{ lastPrice }` (priced).
 * @param {{ date: string, symbols: readonly string[], hivePriceUsd: string | null,
 *   metricsBySymbol: Map<string, { lastPrice: string } | { error: string } | null> }} input
 * @returns {{ priced: PricedDirective[], unpriced: UnpricedCommodity[] }}
 */
export function composeHiveEngineDerivedDirectives({ date, symbols, hivePriceUsd, metricsBySymbol }) {
  const priced = [];
  const unpriced = [];
  for (const symbol of symbols) {
    if (hivePriceUsd === null) {
      unpriced.push({ symbol, reason: "HIVE/USD price unavailable, cannot derive a Hive-Engine price" });
      continue;
    }
    const metrics = metricsBySymbol.get(symbol);
    if (!metrics) {
      unpriced.push({ symbol, reason: `no Hive-Engine market metrics for "${symbol}"` });
      continue;
    }
    if (metrics.error !== undefined) {
      unpriced.push({ symbol, reason: `Hive-Engine market metrics fetch failed: ${metrics.error}` });
      continue;
    }
    const price = multiplyDecimalStrings(metrics.lastPrice, hivePriceUsd);
    priced.push({
      directive: renderPriceDirective({ date, symbol, price, metadata: { source: HIVE_ENGINE_SOURCE } }),
      symbol,
      price,
    });
  }
  return { priced, unpriced };
}

/**
 * Read `input.ledger` and `input.sources`, fetch CoinGecko and Hive-Engine prices once each,
 * return one reviewable Beancount `price` directive proposal per priced commodity, optionally
 * writing it to `input.out` for an explicitly local maintenance run.
 * @param {{ ledger: string, date: string, out?: string, sources?: string, sourcesMap?: object }} input
 * @param {{ fetchImpl?: typeof fetch, concurrency?: number }} [options]
 * @returns {Promise<object>}
 */
export async function derivePriceDirectives(input, { fetchImpl = fetch, concurrency = 3 } = {}) {
  const { ledger, date, out, sources, sourcesMap: suppliedSourcesMap } = input;
  const ledgerText = await readFileText(ledger);
  const sourcesMap = suppliedSourcesMap ?? (typeof sources === "string" ? JSON.parse(await readFileText(sources)) : undefined);
  if (sourcesMap === null || typeof sourcesMap !== "object" || Array.isArray(sourcesMap)) {
    throw new TypeError("price-directives: sourcesMap must be an object keyed by commodity symbol");
  }

  const ids = Object.values(sourcesMap).map((entry) => entry.coingecko);
  const coingeckoPrices = await fetchCoingeckoUsdPrices(ids, { fetchImpl });
  const named = composeCoingeckoDirectives({ date, sourcesMap, coingeckoPrices });

  const hivePriceEntry = named.priced.find((p) => p.symbol === "HIVE");
  const hivePriceUsd = hivePriceEntry ? hivePriceEntry.price : null;

  const heSymbols = hiveEngineUnclassifiedSymbols(ledgerText).filter((symbol) => !(symbol in sourcesMap));
  const metricsBySymbol = new Map();
  const jobs = heSymbols.map((symbol) => async () => {
    try {
      metricsBySymbol.set(symbol, await new EngineClient({ fetch: fetchImpl }).getMetrics(symbol));
    } catch (error) {
      metricsBySymbol.set(symbol, { error: String(error?.message ?? error) });
    }
  });
  await callMany(jobs, concurrency);
  const derived = composeHiveEngineDerivedDirectives({ date, symbols: heSymbols, hivePriceUsd, metricsBySymbol });

  const allPriced = [...named.priced, ...derived.priced];
  const allUnpriced = [...named.unpriced, ...derived.unpriced];
  const header = "; Proposed by Metroplat book maintenance from observed market prices. Review before accepting.";
  const proposal = renderFile(header, allPriced.map((p) => p.directive));
  if (typeof out === "string" && out.length > 0) await writeFileText(out, proposal);

  return {
    ...(typeof out === "string" && out.length > 0 ? { out } : {}),
    directives: Object.freeze(allPriced.map((p) => p.directive)),
    proposal,
    date,
    directiveCount: allPriced.length,
    named: { priced: named.priced.map((p) => p.symbol), unpriced: named.unpriced },
    hiveEngineDerived: { priced: derived.priced.map((p) => p.symbol), unpriced: derived.unpriced },
    unpriced: allUnpriced,
  };
}
