// Independent nonpaying merchant observer. Uses the single canonical source
// catalog and Node builtins only: no registry credentials, facilitator, signer,
// Cold Red Gate, private Node origin, or token. Never follows redirects.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MARKET_ORIGIN = "https://market.561.group";
const REQUIRED_TERMS = ["scheme", "network", "amount", "asset", "payTo", "maxTimeoutSeconds"];

function atomicUsd(price) {
  const m = /^\$(\d+)(?:\.(\d{1,6}))?$/.exec(price ?? "");
  return m ? (BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? "").padEnd(6, "0"))).toString() : null;
}

export function probeRequest(offer, origin = MARKET_ORIGIN) {
  if (!offer || !["GET", "POST"].includes(offer.method) || offer.origin !== origin) {
    throw new TypeError("offer must name this canonical GET/POST market origin");
  }
  const raw = offer.probeUrl ?? origin + offer.route;
  if (/[{}]/.test(raw)) throw new TypeError("unresolved route parameters");
  const target = new URL(raw);
  if (target.origin !== origin || target.protocol !== "https:") throw new TypeError("probe refuses an off-market URL");
  const method = offer.method;
  if (method === "POST" && (offer.bodyExample === undefined || offer.bodyExample === null)) {
    throw new TypeError("POST offer has no admissible source example");
  }
  return Object.freeze({
    url: target.href,
    method,
    ...(method === "POST" ? { headers: { "content-type": "application/json" }, body: JSON.stringify(offer.bodyExample) } : {}),
  });
}

/** Classify the unsigned response; never interpret HTTP 402 alone as success. */
export function classifyUnsignedResponse(response, url, declaration) {
  if (response.status !== 402) {
    const type = response.status === 404 ? "runtime-unreachable"
      : response.status === 400 || response.status === 422 ? "admission-refused"
      : response.status >= 500 ? "runtime-or-proxy-error"
      : response.status >= 300 && response.status < 400 ? "unexpected-redirect"
      : "unexpected-status";
    return { classification: type, status: response.status };
  }
  const raw = response.headers.get("payment-required");
  if (!raw) return { classification: "invalid-402", status: 402, reason: "missing PAYMENT-REQUIRED header" };
  try {
    const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (payload.x402Version !== 2 || !Array.isArray(payload.accepts) || payload.accepts.length === 0) {
      throw new TypeError("x402 v2 accepts[] required");
    }
    const requestUrl = new URL(url).href;
    if (typeof payload.resource?.url !== "string" ||
        new URL(payload.resource.url).href !== requestUrl) {
      return { classification: "wrong-resource-identity", status: 402, resource: payload.resource?.url ?? null };
    }
    const accepts = payload.accepts;
    for (const terms of accepts) {
      if (REQUIRED_TERMS.some(field => terms[field] === undefined || terms[field] === null || terms[field] === "")) {
        throw new TypeError("incomplete payment requirement");
      }
      if (typeof terms.amount !== "string" || !/^\d+$/.test(terms.amount) ||
          !/^eip155:\d+$/.test(terms.network) || !/^0x[0-9A-Fa-f]{40}$/.test(terms.asset) ||
          !/^0x[0-9A-Fa-f]{40}$/.test(terms.payTo)) {
        throw new TypeError("invalid exact EVM payment requirement");
      }
    }
    const expected = atomicUsd(declaration.price);
    if (expected !== null && declaration.requestPricing === undefined &&
        !accepts.some(x => x.amount === expected)) {
      return { classification: "declared-price-mismatch", status: 402, expectedAtomic: expected };
    }
    return { classification: "402-ready", status: 402, acceptableSchemes: [...new Set(accepts.map(x => x.scheme))] };
  } catch (error) {
    return { classification: "invalid-402", status: 402, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function observe(offer, fetchImpl, timeoutMs) {
  let request;
  try { request = probeRequest(offer); }
  catch (error) { return { classification: "invalid-source-offer", reason: error.message }; }
  try {
    const response = await fetchImpl(request.url, {
      method: request.method,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      ...(request.headers ? { headers: request.headers, body: request.body } : {}),
    });
    const classification = classifyUnsignedResponse(response, request.url, offer);
    await response.body?.cancel().catch(() => {});
    return { ...classification, method: request.method, url: request.url };
  } catch (error) {
    return { classification: "public-network-unreachable", reason: error instanceof Error ? error.message : String(error), method: request.method, url: request.url };
  }
}

/** Bounded concurrent read-only observation of source-advertised, listed offers. */
export async function auditUnsignedMarket({
  catalog, fetchImpl = fetch, timeoutMs = 10_000, concurrency = 4,
  observedAt = new Date().toISOString(),
} = {}) {
  if (!Array.isArray(catalog) || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8 ||
      !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    throw new TypeError("catalog, concurrency(1-8), and timeoutMs(100-60000) required");
  }
  const listed = catalog.filter(offer => offer.listed !== false);
  let cursor = 0;
  const results = Array(listed.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, listed.length) }, async () => {
    while (cursor < listed.length) {
      const i = cursor++;
      const offer = listed[i];
      results[i] = { gateway: offer.gateway, operation: offer.operation, route: offer.route,
        runtime: offer.runtime ?? "edge", ...await observe(offer, fetchImpl, timeoutMs) };
    }
  }));
  const counts = {};
  for (const row of results) counts[row.classification] = (counts[row.classification] ?? 0) + 1;
  return Object.freeze({
    kind: "561.x402-external-unsigned-market-observation.v1", observedAt,
    origin: MARKET_ORIGIN, offers: listed.length, sourceDeclarations: catalog.length, intentionallyUnlisted: catalog.length - listed.length, counts,
    healthy: counts["402-ready"] === listed.length,
    results,
    limitation: "Unsigned public 402 challenges only; neither paid delivery nor settlement nor external buyer demand is established.",
  });
}

// The CLI reads the same source file used by the merchant, never a manually
// maintained second product inventory.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = process.argv[2];
  if (!output) throw new TypeError("provide destination path for non-secret audit JSON");
  // Publication selectors compile into accepted-edition availability; raw catalog
  // entries marked coming-soon are not buyer-facing payable listings.
  const { COMPILED_DECLARATIONS } = await import("../apps/market-561-group/src/compiled-offers.mjs");
  const catalog = COMPILED_DECLARATIONS;
  const report = await auditUnsignedMarket({ catalog });
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ origin: report.origin, offers: report.offers, counts: report.counts, healthy: report.healthy, failures: report.results.filter(item => item.classification !== "402-ready").map(item => ({ route: item.route, operation: item.operation, classification: item.classification, status: item.status })), output }) + "\n");
  if (!report.healthy) process.exitCode = 1;
}
