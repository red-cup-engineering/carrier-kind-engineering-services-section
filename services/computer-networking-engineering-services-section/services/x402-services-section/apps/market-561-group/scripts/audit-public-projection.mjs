#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { catalog } from "../src/market.mjs";

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

function classifyPaymentRequired(response, requestedUrl) {
  const encoded = response.headers.get("payment-required");
  if (!encoded?.trim()) {
    return { classification: "402-invalid-challenge", challengeError: "missing PAYMENT-REQUIRED header" };
  }
  try {
    const challenge = JSON.parse(Buffer.from(encoded.trim(), "base64").toString("utf8"));
    if (challenge?.x402Version !== 2) {
      return { classification: "402-invalid-challenge", challengeError: "x402Version must be 2" };
    }
    if (!Array.isArray(challenge.accepts) || challenge.accepts.length === 0) {
      return { classification: "402-invalid-challenge", challengeError: "accepts must be a non-empty array" };
    }
    const resourceUrl = challenge?.resource?.url;
    if (typeof resourceUrl !== "string" || !resourceUrl.trim()) {
      return { classification: "402-invalid-challenge", challengeError: "resource.url is required" };
    }
    let requested;
    let resource;
    try {
      requested = new URL(requestedUrl).href;
      resource = new URL(resourceUrl).href;
    } catch {
      return {
        classification: "402-invalid-challenge",
        challengeResourceUrl: resourceUrl,
        challengeError: "resource.url must be an absolute URL",
      };
    }
    if (resource !== requested) {
      return {
        classification: "402-resource-mismatch",
        challengeResourceUrl: resource,
        challengeError: `challenge names ${resource} instead of requested ${requested}`,
      };
    }
    return { classification: "402-ready", challengeResourceUrl: resource };
  } catch (error) {
    return {
      classification: "402-invalid-challenge",
      challengeError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readJson(fetch, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "manual" });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
    return { status: response.status, body };
  } catch (error) {
    return { status: "unreachable", error: error instanceof Error ? error.message : String(error) };
  }
}

async function probe(fetch, offer) {
  const registration = offer.index402Registration({
    provider: PROVIDER,
    paymentAsset: PAYMENT_ASSET,
    paymentNetwork: PAYMENT_NETWORK,
  });
  try {
    const response = await fetch(registration.url, {
      method: registration.http_method,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      ...(registration.probe_body === undefined ? {} : {
        headers: { "content-type": "application/json" },
        body: registration.probe_body,
      }),
    });
    const status = response.status;
    let detail;
    let challenge;
    if (status !== 402) {
      const text = await response.text();
      detail = text.slice(0, 500);
    } else {
      challenge = classifyPaymentRequired(response, registration.url);
      await response.body?.cancel();
    }
    return {
      gateway: offer.declaration.gateway,
      operation: offer.declaration.operation,
      name: offer.declaration.name,
      runtime: offer.declaration.runtime ?? "edge",
      method: registration.http_method,
      url: registration.url,
      priceUsd: registration.price_usd,
      status,
      classification: status === 402
        ? challenge.classification
        : classificationFor({ status, runtime: offer.declaration.runtime ?? "edge" }),
      ...(challenge?.challengeResourceUrl ? { challengeResourceUrl: challenge.challengeResourceUrl } : {}),
      ...(challenge?.challengeError ? { challengeError: challenge.challengeError } : {}),
      ...(detail ? { detail } : {}),
    };
  } catch (error) {
    return {
      gateway: offer.declaration.gateway,
      operation: offer.declaration.operation,
      name: offer.declaration.name,
      runtime: offer.declaration.runtime ?? "edge",
      method: registration.http_method,
      url: registration.url,
      priceUsd: registration.price_usd,
      status: "unreachable",
      classification: "unreachable",
      error: error instanceof Error ? error.message : String(error),
    };
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
 * every currently listed offer. This is a release/operations assay, not a
 * directory listing count: the market's own public 402 behavior is the
 * prerequisite that external directories are supposed to project.
 */
export async function auditPublicMarketProjection({
  fetch = globalThis.fetch,
  now = () => new Date().toISOString(),
  market = DEFAULT_MARKET,
  concurrency = 6,
} = {}) {
  const source = catalog({ admit: false });
  const listed = source.filter((offer) => offer.declaration.listed !== false);
  const [status, publicCatalog] = await Promise.all([
    readJson(fetch, `${market}/v1/status`),
    readJson(fetch, `${market}/v1/catalog`),
  ]);
  const offers = await mapLimit(listed, concurrency, (offer) => probe(fetch, offer));
  const byClassification = {};
  for (const offer of offers) byClassification[offer.classification] = (byClassification[offer.classification] ?? 0) + 1;
  const ready = offers.filter((offer) => offer.classification === "402-ready").length;
  const publicOffers = Array.isArray(publicCatalog.body?.offers) ? publicCatalog.body.offers : null;
  const publicListed = publicOffers === null ? null : publicOffers.filter((offer) => offer.listed !== false).length;
  return Object.freeze({
    recordType: "561-group.x402-public-projection-audit",
    observedAt: now(),
    market,
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
