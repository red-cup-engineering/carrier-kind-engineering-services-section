/** Observe global EIP-3009 activity and, only when explicitly scoped, a merchant's Bazaar catalogue. */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSnapshotParameters, takeSnapshot } from "@red-cup-engineering/computer-data-engineering-services-section/x402-discovery-snapshot";
import { observeSettlement } from "../src/market-observation/settlement.mjs";
import { createCdpJwt } from "../src/cdp-facilitator.mjs";

// Coinbase's /merchant route is scoped by payTo; /resources is its global
// listing (whose pagination.total counts offers, never a merchant's calls).
const DEFAULT_DISCOVERY_ENDPOINT = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant";
const MAX_PAGE_BYTES = 2_000_000;

export function observationOptions(argv = []) {
  const arg = (name) => {
    const at = argv.indexOf("--" + name);
    return at < 0 ? undefined : argv[at + 1];
  };
  for (const flag of ["window", "merchant-pay-to", "discovery-endpoint"]) {
    if (argv.includes("--" + flag) && arg(flag) === undefined)
      throw new TypeError("observe-x402-market --" + flag + " requires a value");
  }
  const windowBlocks = arg("window") === undefined ? 900 : Number(arg("window"));
  if (!Number.isSafeInteger(windowBlocks) || windowBlocks < 1)
    throw new RangeError("observe-x402-market --window requires a positive integer");
  const payTo = arg("merchant-pay-to");
  const suppliedEndpoint = arg("discovery-endpoint");
  if (suppliedEndpoint !== undefined && payTo === undefined)
    throw new TypeError("--discovery-endpoint requires --merchant-pay-to");
  const merchant = payTo === undefined ? null : readSnapshotParameters({
    endpoint: suppliedEndpoint ?? DEFAULT_DISCOVERY_ENDPOINT, payTo,
  });
  return { windowBlocks, merchant };
}

/** Networking performs the bounded HTTP read; Data owns pagination and epistemic reduction. */
export async function readBazaarPage(url, {
  environment = process.env, fetchImpl = fetch, tokenFactory = createCdpJwt,
} = {}) {
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password)
    throw new TypeError("discovery needs a credential-free HTTPS target URI");
  const headers = { accept: "application/json" };
  if (target.origin === "https://api.cdp.coinbase.com") {
    if (!target.pathname.startsWith("/platform/v2/x402/discovery/"))
      throw new TypeError("CDP token may only address its discovery resources");
    if (!environment.CDP_API_KEY_ID || !environment.CDP_API_KEY_SECRET)
      throw new TypeError("CDP discovery requires the existing CDP_API_KEY_ID and CDP_API_KEY_SECRET");
    // Hire the original signed-JWT provider; never write another signer in an app.
    headers.authorization = "Bearer " + tokenFactory({
      apiKeyId: environment.CDP_API_KEY_ID,
      apiKeySecret: environment.CDP_API_KEY_SECRET,
      method: "GET", host: target.host, path: target.pathname,
    });
  }
  const response = await fetchImpl(target.href, {
    method: "GET", redirect: "error", headers,
  });
  if (!response.ok) throw new Error("Bazaar discovery HTTP " + response.status);
  const announced = Number(response.headers.get("content-length"));
  if (Number.isFinite(announced) && announced > MAX_PAGE_BYTES)
    throw new RangeError("Bazaar discovery page exceeds the bounded observation size");
  const body = await response.text();
  if (body.length > MAX_PAGE_BYTES)
    throw new RangeError("Bazaar discovery page exceeds the bounded observation size");
  return JSON.parse(body);
}

/**
 * Produces two separate observations, never a global-chain/single-seller ratio.
 * Caller injects effects for native tests; no payTo means NO catalogue request.
 */
export async function observeMarketReport(options, {
  chainObserver = observeSettlement, snapshotReader = takeSnapshot,
  fetchJson, fetchImpl = fetch, environment = process.env, now = () => new Date(),
} = {}) {
  if (!Number.isSafeInteger(options?.windowBlocks) || options.windowBlocks < 1)
    throw new RangeError("observation needs a positive block window");
  const merchant = options.merchant == null ? null : readSnapshotParameters(options.merchant);
  const instant = now();
  const observedAt = new Date(instant).toISOString();

  // Chain-wide EIP-3009 authorizations are neither merchant-specific nor
  // proof of paid HTTP delivery. Keep that observation independent.
  let settlement;
  try { settlement = await chainObserver({ windowBlocks: options.windowBlocks }); }
  catch (error) { settlement = { ok: false, reason: String(error?.message ?? error) }; }

  let catalog = { ok: false, reason: "merchant-payTo-not-supplied", scope: "no-seller-selected" };
  if (merchant !== null) {
    try {
      const reader = fetchJson ?? ((url) => readBazaarPage(url, { environment, fetchImpl }));
      const snapshot = await snapshotReader(merchant, { fetchJson: reader, now: () => new Date(observedAt) });
      const calls = snapshot.complete === true ? snapshot.totals.calls30d : null;
      catalog = {
        ok: true, scope: "one-merchant", endpoint: snapshot.endpoint,
        payTo: snapshot.payTo, observedAt: snapshot.takenAt,
        complete: snapshot.complete, problems: snapshot.problems,
        listedResources: snapshot.totals.resources, calls30d: calls,
        // Per-resource distinct payer counts are NOT additive across SKUs.
        uniquePayers30d: null, uniquePayerPopulation: "not-observable-from-per-resource-counts",
        resourceReadings: snapshot.resources,
        evidence: "vendor-reported discovery, not independent paid delivery or external demand",
      };
    } catch (error) {
      catalog = { ok: false, scope: "one-merchant", reason: String(error?.message ?? error) };
    }
  }
  return {
    recordType: "561-group.x402-market-observation",
    observedAt,
    chain: settlement?.ok === true
      ? { network: "eip155:8453", asset: settlement.asset, rangeObservation: true,
          provenance: settlement.measured.provenance }
      : { network: "eip155:8453", ok: false, reason: settlement?.reason ?? "unavailable" },
    settlement: settlement?.ok === true
      ? { measured: settlement.measured, extrapolated: settlement.extrapolated }
      : { ok: false, reason: settlement?.reason ?? "unavailable" },
    distinctAuthorizersSampled: settlement?.ok === true
      ? settlement.measured.distinctAuthorizers : null,
    catalog,
    // Retain the historical field without inventing a dimensionless market ratio.
    catalogAuthorizationComparison: null,
    comparisonReason: "seller catalogue calls and Base-wide EIP-3009 authorization projections are different populations",
    caveat: settlement?.caveat ?? "No current chain sample; no authorization rate can be inferred.",
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = observationOptions(process.argv.slice(2));
    const report = await observeMarketReport(options);
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    if (report.settlement.ok === false || (options.merchant !== null && report.catalog.ok !== true))
      process.exitCode = 1;
  } catch (error) {
    process.stderr.write("observe-x402-market: " + String(error?.message ?? error) + "\n");
    process.exitCode = 1;
  }
}
