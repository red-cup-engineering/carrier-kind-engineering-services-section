#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { declareCatalog, OFFER_DECLARATION_KIND } from "../../../src/offer.mjs";
import { observeX402Resource, publicHttpsUrl } from "../../../src/resource-observation.mjs";

const DEFAULT_MARKET = "https://market.561.group";
const PROVIDER = "561 Group";
const PAYMENT_ASSET = "USD Coin";
const PAYMENT_NETWORK = "Base";

function classificationFor({ status, runtime }) {
  if (status === 404) return "runtime-unreachable";
  if (status === 422) return "admission-or-availability-refused";
  if (status === 502 || status === 503 || status === 504) return runtime === "node" ? "proxy-failed" : "runtime-unreachable";
  if (typeof status === "number" && status >= 500) return "binding-or-settlement-config-failed";
  if (typeof status === "number") return "unexpected-http-status";
  return "unreachable";
}

function marketOrigin(value) {
  const url = new URL(publicHttpsUrl(value, "market"));
  if (url.pathname !== "/" || url.search !== "") throw new TypeError("market must name one public HTTPS deployment origin");
  return url.origin;
}

function probeConcurrency(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 32) {
    throw new TypeError("projection audit concurrency must be an integer from 1 through 32");
  }
  return value;
}

async function sourceOffers(sourceCatalog) {
  if (sourceCatalog === undefined) return (await import("../src/market.mjs")).catalog({ admit: false });
  if (!Array.isArray(sourceCatalog) || sourceCatalog.some(offer => offer?.kind !== OFFER_DECLARATION_KIND)) {
    throw new TypeError("sourceCatalog must contain admitted x402 offers");
  }
  return declareCatalog(sourceCatalog);
}

async function readJson(fetch, url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "manual" });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
    return { status: response.status, body };
  } catch (error) {
    return { status: response?.status ?? "unreachable", error: error instanceof Error ? error.message : String(error) };
  }
}

async function probe(fetch, offer, market) {
  const registration = offer.index402Registration({
    provider: PROVIDER,
    paymentAsset: PAYMENT_ASSET,
    paymentNetwork: PAYMENT_NETWORK,
  });
  const sourceUrl = new URL(registration.url);
  // Candidate receiving projects the same operation and query onto the selected
  // deployment origin; its original declaration and identity are unchanged.
  const projectedUrl = new URL(market);
  projectedUrl.pathname = sourceUrl.pathname;
  projectedUrl.search = sourceUrl.search;
  const url = projectedUrl.href;
  const row = {
    gateway: offer.declaration.gateway,
    operation: offer.declaration.operation,
    name: offer.declaration.name,
    runtime: offer.declaration.runtime ?? "edge",
    method: registration.http_method,
    url,
    ...(url === registration.url ? {} : { sourceUrl: registration.url }),
    priceUsd: registration.price_usd,
  };
  let response;
  try {
    const observation = await observeX402Resource({
      resourceUrl: url,
      method: registration.http_method,
      ...(registration.probe_body === undefined ? {} : { jsonBody: JSON.parse(registration.probe_body) }),
      timeoutMs: 30_000,
      fetchImpl: async (...args) => {
        response = await fetch(...args);
        return response;
      },
    });
    return {
      ...row,
      status: observation.transport.status,
      classification: "402-ready",
      challengeResourceUrl: observation.paymentRequired.resource.url,
      observationDigest: observation.observationDigest,
    };
  } catch (error) {
    const status = response?.status ?? "unreachable";
    const message = error instanceof Error ? error.message : String(error);
    if (status === 402) {
      return {
        ...row,
        status,
        classification: message === "x402 declared resource URL does not match the observed URL"
          ? "402-resource-mismatch"
          : "402-invalid-challenge",
        challengeError: message,
      };
    }
    let detail;
    if (response !== undefined) {
      try { detail = (await response.text()).slice(0, 500); } catch { /* retain the observed HTTP status */ }
    }
    return {
      ...row,
      status,
      classification: classificationFor({ status, runtime: row.runtime }),
      ...(detail ? { detail } : {}),
      ...(response === undefined ? { error: message } : {}),
    };
  } finally {
    try { await response?.body?.cancel(); } catch { /* the body may already be consumed or closed */ }
  }
}

async function mapLimit(items, limit, map) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await map(items[index], index);
    }
  }));
  return results;
}

/**
 * Compare the compiled source catalog with the public market face and probe
 * every currently listed offer at the selected deployment origin. An explicit
 * sourceCatalog must already contain admitted offers; otherwise the production
 * catalog is loaded lazily. This is a release/operations assay, not a
 * directory listing count: the market's own public 402 behavior is the
 * prerequisite that external directories are supposed to project.
 */
export async function auditPublicMarketProjection({
  fetch = globalThis.fetch,
  now = () => new Date().toISOString(),
  market = DEFAULT_MARKET,
  concurrency = 6,
  sourceCatalog,
} = {}) {
  const selectedConcurrency = probeConcurrency(concurrency);
  const selectedMarket = marketOrigin(market);
  const source = await sourceOffers(sourceCatalog);
  const listed = source.filter((offer) => offer.declaration.listed !== false);
  const [status, publicCatalog] = await Promise.all([
    readJson(fetch, `${selectedMarket}/v1/status`),
    readJson(fetch, `${selectedMarket}/v1/catalog`),
  ]);
  const offers = await mapLimit(listed, selectedConcurrency, (offer) => probe(fetch, offer, selectedMarket));
  const byClassification = {};
  for (const offer of offers) byClassification[offer.classification] = (byClassification[offer.classification] ?? 0) + 1;
  const ready = offers.filter((offer) => offer.classification === "402-ready").length;
  const publicOffers = Array.isArray(publicCatalog.body?.offers) ? publicCatalog.body.offers : null;
  const publicListed = publicOffers === null ? null : publicOffers.filter((offer) => offer.listed !== false).length;
  return Object.freeze({
    recordType: "561-group.x402-public-projection-audit",
    observedAt: now(),
    market: selectedMarket,
    source: {
      totalOffers: source.length,
      listedOffers: listed.length,
      edgeListedOffers: listed.filter((offer) => offer.declaration.runtime !== "node").length,
      nodeListedOffers: listed.filter((offer) => offer.declaration.runtime === "node").length,
    },
    deployment: {
      statusHttp: status.status,
      status: status.body ?? null,
      catalogHttp: publicCatalog.status,
      publicCatalogOffers: publicOffers?.length ?? null,
      publicCatalogListedOffers: publicListed,
      ...(status.error ? { statusError: status.error } : {}),
      ...(publicCatalog.error ? { catalogError: publicCatalog.error } : {}),
    },
    summary: {
      probed: offers.length,
      ready,
      notReady: offers.length - ready,
      byClassification,
      sourceMatchesPublicCatalog:
        publicOffers === null ? null : publicOffers.length === source.length && publicListed === listed.length,
    },
    offers,
  });
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

await runMain(async ({ argv }) => auditPublicMarketProjection({
  market: argument(argv, "--market") ?? DEFAULT_MARKET,
  concurrency: Number(argument(argv, "--concurrency") ?? 6),
}), {
  moduleUrl: import.meta.url,
  formatResult: (result) => `${JSON.stringify(result, null, 2)}\n`,
});

