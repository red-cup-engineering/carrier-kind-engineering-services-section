import { createExactEvmFetchPaymentBoundary } from "@red-cup-engineering/x402-services-section/fetch";
import { settlementWitness, x402RoutesForOffers } from "@red-cup-engineering/x402-services-section/offer";
import { deriveValueChainShares } from "@red-cup-engineering/derive-value-chain-shares-service";
import { deriveTerritoryReadout } from "@red-cup-engineering/derive-territory-readout-service";
import indexListing from "../402index-listing.json" with { type: "json" };

import {
  MAINNET_NETWORK,
  SEPOLIA_NETWORK,
  DEFAULT_NETWORK,
  PUBLIC_TESTNET_FACILITATOR_URL,
  USDC_BASE_MAINNET,
  USDC_BASE_SEPOLIA,
} from "./network-constants.mjs";
import { offers } from "./offers.mjs";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/u;

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value;
}

/**
 * Read and validate this worker's runtime configuration from its Cloudflare
 * Workers environment bindings. Nothing here is a source-code constant
 * except the two well-known Base USDC contract addresses and the public
 * Base Sepolia facilitator; every settlement-affecting value (network,
 * payee, facilitator, price) is deployment-supplied, matching the
 * `base-chain-data-gateway` convention (`X402_NETWORK` / `X402_PAY_TO` /
 * `X402_FACILITATOR`).
 * @param {Record<string, string|undefined>} env
 */
export function envConfiguration(env) {
  const network = env.X402_NETWORK ?? DEFAULT_NETWORK;
  if (!/^eip155:[1-9][0-9]*$/u.test(network)) throw new Error("X402_NETWORK must be an explicit EVM CAIP-2 identifier");
  const payTo = required(env.X402_PAY_TO, "X402_PAY_TO");
  if (!ADDRESS_PATTERN.test(payTo)) throw new Error("X402_PAY_TO must be one EVM address");
  const knownAsset = network === MAINNET_NETWORK ? USDC_BASE_MAINNET : network === SEPOLIA_NETWORK ? USDC_BASE_SEPOLIA : undefined;
  const asset = env.X402_ASSET ?? knownAsset;
  if (!asset) throw new Error("X402_ASSET is required; no built-in USDC default exists for this network");
  if (!ADDRESS_PATTERN.test(asset)) throw new Error("X402_ASSET must be one EVM address");
  const knownFacilitator = network === SEPOLIA_NETWORK ? PUBLIC_TESTNET_FACILITATOR_URL : undefined;
  const facilitatorUrl = env.X402_FACILITATOR ?? knownFacilitator;
  if (!facilitatorUrl) {
    throw new Error(
      "X402_FACILITATOR is required for this network; Base mainnet (eip155:8453) additionally needs an "
      + "authenticated facilitator (this package does not implement CDP JWT signing) or another explicit "
      + "mainnet-capable facilitator URL",
    );
  }
  return {
    network,
    payTo: payTo.toLowerCase(),
    asset: asset.toLowerCase(),
    facilitatorUrl,
  };
}

/** Construct this worker's x402 fetch payment boundary from its declared offers. */
export function buildPaymentBoundary(config, { facilitatorClient, env = {} } = {}) {
  return createExactEvmFetchPaymentBoundary({
    network: config.network,
    facilitatorUrl: config.facilitatorUrl,
    facilitatorClient,
    routes: x402RoutesForOffers(offers, { network: config.network, payTo: config.payTo, asset: config.asset }),
    afterSettle: settlementWitness(offers, { env }),
  });
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * Dispatch one already-payment-cleared (or unpriced) request to its handler.
 * Injectable `deps.deriveValueChainShares`/`deps.deriveTerritoryReadout` let
 * tests replace either compute step without importing the live operation
 * packages.
 * @param {Request} request
 * @param {{deriveValueChainShares?: typeof deriveValueChainShares, deriveTerritoryReadout?: typeof deriveTerritoryReadout}} [deps]
 */
export async function respond(request, deps = {}) {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/" && request.method === "GET") return json(200, indexListing);
    if (url.pathname === "/value-chain/shares" && request.method === "POST") {
      const derive = deps.deriveValueChainShares ?? deriveValueChainShares;
      const body = await request.json();
      const result = derive(body);
      return json(200, result);
    }
    if (url.pathname === "/territory/readout" && request.method === "POST") {
      const derive = deps.deriveTerritoryReadout ?? deriveTerritoryReadout;
      const body = await request.json();
      const result = derive(body);
      return json(200, result);
    }
    return json(404, { ok: false, error: "not found" });
  } catch (error) {
    return json(400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

let cachedBoundary;

/** Build (once per isolate) and return this worker's `{ boundary, config }`, or rebuild after a config error. */
function boundaryFor(env) {
  if (cachedBoundary === undefined) {
    const config = envConfiguration(env);
    cachedBoundary = { boundary: buildPaymentBoundary(config, { env }), config };
  }
  return cachedBoundary;
}

export default {
  /** @param {Request} request @param {Record<string, string|undefined>} env */
  async fetch(request, env) {
    let boundary;
    try {
      ({ boundary } = boundaryFor(env));
    } catch (error) {
      return json(500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return boundary.handle(request, (req) => respond(req));
  },
};
