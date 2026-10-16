import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/server";
import { paymentMiddleware } from "@x402/express";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { boundUptoSettlement, evmNetwork, routeSet } from "./route-configuration.mjs";
import { x402SettlementEvidence as projectX402SettlementEvidence } from "./x402-settlement-evidence.mjs";
export { declareDiscoveryExtension } from "@x402/extensions/bazaar";
export { setSettlementOverrides } from "@x402/express";

/** Identify one exact x402 payment payload consistently at HTTP and hook faces. */
export function x402PaymentIdentity(value) {
  const payload = typeof value === "string" ? decodePaymentSignatureHeader(value) : value;
  if (payload?.x402Version !== 2) throw new TypeError("one x402 v2 payment payload is required");
  return identifyJsonSemanticContent({ objectKind: "x402.payment-payload", value: payload, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

/**
 * Project the official library's read-only settlement context into the small,
 * prototype-free value carried across durable SEN boundaries.  Library return
 * objects are protocol adapters, not persistent application state.
 */
export function x402SettlementEvidence(context, { identify = x402PaymentIdentity } = {}) {
  return projectX402SettlementEvidence(context, { identify });
}

/** Validate one explicit EVM CAIP-2 network identifier, shared by every transport-specific boundary. */
export { evmNetwork, routeSet };

/**
 * Procure an official x402 v2 exact-EVM resource boundary. The customer owns
 * the protected operation and its books; this provider owns only the public
 * protocol projection. Settlement remains with the explicitly hired
 * facilitator and never becomes an ambient Union ledger.
 */
export function createExactEvmPaymentBoundary({
  network,
  routes,
  facilitatorUrl,
  facilitatorClient,
  afterSettle,
}) {
  const selectedNetwork = evmNetwork(network);
  const selectedRoutes = routeSet(routes, "exact", selectedNetwork);
  if (facilitatorClient === undefined && (typeof facilitatorUrl !== "string" || !/^https?:\/\//u.test(facilitatorUrl))) {
    throw new TypeError("x402 facilitatorUrl is required when no contracted facilitator client is supplied");
  }
  const facilitator = facilitatorClient ?? new HTTPFacilitatorClient({ url: facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator)
    .register(selectedNetwork, new ExactEvmScheme())
    .registerExtension(bazaarResourceServerExtension);
  if (afterSettle !== undefined) resourceServer.onAfterSettle(afterSettle);
  return Object.freeze({
    network: selectedNetwork,
    resourceServer,
    middleware: paymentMiddleware(selectedRoutes, resourceServer),
  });
}

/** Procure the official cumulative-voucher batch-settlement boundary. */
export function createBatchEvmPaymentBoundary({
  network,
  receiver,
  routes,
  storage,
  facilitatorUrl,
  facilitatorClient,
  receiverAuthorizerSigner,
  withdrawDelay,
  afterSettle,
}) {
  const selectedNetwork = evmNetwork(network);
  const selectedRoutes = routeSet(routes, "batch-settlement", selectedNetwork);
  if (!/^0x[0-9a-fA-F]{40}$/u.test(receiver ?? "")) throw new TypeError("batch receiver must be one EVM smart-account address");
  if (storage === undefined) throw new TypeError("batch settlement requires explicit sovereign channel storage");
  if (facilitatorClient === undefined && (typeof facilitatorUrl !== "string" || !/^https?:\/\//u.test(facilitatorUrl))) {
    throw new TypeError("x402 facilitatorUrl is required when no contracted facilitator client is supplied");
  }
  const facilitator = facilitatorClient ?? new HTTPFacilitatorClient({ url: facilitatorUrl });
  const scheme = new BatchSettlementEvmScheme(receiver, {
    storage,
    ...(receiverAuthorizerSigner === undefined ? {} : { receiverAuthorizerSigner }),
    ...(withdrawDelay === undefined ? {} : { withdrawDelay }),
  });
  const resourceServer = new x402ResourceServer(facilitator)
    .register(selectedNetwork, scheme)
    .registerExtension(bazaarResourceServerExtension);
  if (afterSettle !== undefined) resourceServer.onAfterSettle(afterSettle);
  return Object.freeze({
    network: selectedNetwork,
    scheme,
    resourceServer,
    middleware: paymentMiddleware(selectedRoutes, resourceServer),
  });
}

/** Official usage-based EVM boundary. The route price is the buyer's ceiling;
 * the owning handler sets actual consideration with setSettlementOverrides.
 * No clock, resource tariff, sponsor or ledger is inferred by this provider.
 */
export function createUptoEvmPaymentBoundary({ network, routes, facilitatorUrl, facilitatorClient, afterSettle }) {
  const selectedNetwork = evmNetwork(network);
  const selectedRoutes = routeSet(routes, "upto", selectedNetwork);
  if (facilitatorClient === undefined && (typeof facilitatorUrl !== "string" || !/^https?:\/\//u.test(facilitatorUrl))) {
    throw new TypeError("x402 facilitatorUrl is required when no contracted facilitator client is supplied");
  }
  const facilitator = facilitatorClient ?? new HTTPFacilitatorClient({ url: facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator)
    .register(selectedNetwork, new UptoEvmScheme())
    .registerExtension(bazaarResourceServerExtension);
  resourceServer.onBeforeSettle(boundUptoSettlement);
  if (afterSettle !== undefined) resourceServer.onAfterSettle(afterSettle);
  return Object.freeze({ network: selectedNetwork, resourceServer, middleware: paymentMiddleware(selectedRoutes, resourceServer) });
}

