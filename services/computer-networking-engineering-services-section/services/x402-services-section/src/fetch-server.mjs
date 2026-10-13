import { HTTPFacilitatorClient, SETTLEMENT_OVERRIDES_HEADER, x402HTTPResourceServer, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { boundUptoSettlement, evmNetwork, routeSet } from "./route-configuration.mjs";
import { identifyPaidResponseAuthorization, inspectPaidResponseRequest, recoverPaidResponse } from "./paid-response-recovery.mjs";
export { declareDiscoveryExtension } from "@x402/extensions/bazaar";
export { SETTLEMENT_OVERRIDES_HEADER } from "@x402/core/server";

/**
 * Adapt the standard Fetch API `Request` to the official x402 HTTP adapter
 * contract (`getHeader`/`getMethod`/`getPath`/...), the same shape the
 * official `@x402/express` package implements for Node's `http.IncomingMessage`.
 * This is the transport seam that lets a stateless edge runtime (Cloudflare
 * Workers, or any other fetch-handler host) reuse the identical protocol
 * core (`@x402/core/server`) that Express uses, with no Express dependency.
 */
class FetchAdapter {
  #request;
  #url;
  #body;

  constructor(request, url, body) {
    this.#body = body;
    this.#request = request;
    this.#url = url;
  }

  getBody() { return this.#body; }
  getHeader(name) { return this.#request.headers.get(name) ?? undefined; }
  getMethod() { return this.#request.method; }
  getPath() { return this.#url.pathname; }
  getUrl() { return this.#request.url; }
  getAcceptHeader() { return this.#request.headers.get("accept") ?? ""; }
  getUserAgent() { return this.#request.headers.get("user-agent") ?? ""; }
  getQueryParams() { return Object.fromEntries(this.#url.searchParams); }
  getQueryParam(name) { return this.#url.searchParams.get(name) ?? undefined; }
}

/** Project one official `HTTPResponseInstructions` result into a Fetch API `Response`. */
function toResponse({ status, headers, body, isHtml }) {
  const responseHeaders = new Headers(headers ?? {});
  if (isHtml) {
    if (!responseHeaders.has("content-type")) responseHeaders.set("content-type", "text/html; charset=utf-8");
    return new Response(body ?? "", { status, headers: responseHeaders });
  }
  if (!responseHeaders.has("content-type")) responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify(body ?? {}), { status, headers: responseHeaders });
}

async function releasePurchase(purchaseStore, claim) {
  try { await purchaseStore.release?.({ claim }); }
  catch (error) {
    console.error("x402 recoverable purchase release deferred", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Procure an official x402 v2 exact-EVM resource boundary for a stateless
 * fetch-handler host (Cloudflare Workers and equivalents). Same customer
 * contract as `createExactEvmPaymentBoundary` in `./resource-server.mjs`;
 * the difference is transport only — this returns one `handle(request,
 * respond)` function instead of Express middleware, because a fetch handler
 * has no persistent response object to buffer and rewrite around.
 */
function createEvmFetchPaymentBoundary({
  network,
  routes,
  facilitatorUrl,
  facilitatorClient,
  afterSettle,
}, scheme) {
  const selectedNetwork = evmNetwork(network);
  const selectedRoutes = routeSet(routes, scheme.scheme, selectedNetwork);
  if (facilitatorClient === undefined && (typeof facilitatorUrl !== "string" || !/^https?:\/\//u.test(facilitatorUrl))) {
    throw new TypeError("x402 facilitatorUrl is required when no contracted facilitator client is supplied");
  }
  const facilitator = facilitatorClient ?? new HTTPFacilitatorClient({ url: facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator)
    .register(selectedNetwork, scheme)
    .registerExtension(bazaarResourceServerExtension);
  if (scheme.scheme === "upto") resourceServer.onBeforeSettle(boundUptoSettlement);
  if (afterSettle !== undefined) resourceServer.onAfterSettle(afterSettle);
  const httpServer = new x402HTTPResourceServer(resourceServer, selectedRoutes);
  // A Workers subrequest not awaited by the request that spawned it is cancelled the instant that
  // request's response completes, so the handshake must not fire at construction or during an unpriced
  // request that would return before awaiting it; it is armed lazily on the first request that itself awaits it.
  let initialized;

  return Object.freeze({
    network: selectedNetwork,
    resourceServer,
    /**
     * Run one fetch `Request` through the payment boundary. `respond` is
     * called, at most once, only after payment verifies (or immediately for
     * a route the boundary does not price) and must return a `Response`.
     * @param {Request} request
     * @param {(request: Request) => Promise<Response> | Response} respond
     * @returns {Promise<Response>}
     */
    async handle(request, respond, { purchaseStore, recoveryChecked = false, body } = {}) {
      const url = new URL(request.url);
      const adapter = new FetchAdapter(request, url, body);
      const context = { adapter, path: url.pathname, method: request.method };
      if (!httpServer.requiresPayment(context)) return respond(request);
      if (purchaseStore !== undefined && scheme.scheme !== "exact") {
        throw new TypeError("recoverable purchase storage currently admits only exact-EVM authorizations");
      }

      // A completed purchase is returned before facilitator verification, which
      // rejects the already-used EIP-3009 nonce on a client retry.
      if (purchaseStore !== undefined && !recoveryChecked) {
        const recovered = await recoverPaidResponse(request, purchaseStore);
        if (recovered !== null) return recovered;
      }
      const inspected = purchaseStore === undefined ? null : await inspectPaidResponseRequest(request);

      initialized ??= httpServer.initialize();
      try {
        await initialized;
      } catch (error) {
        initialized = undefined;
        throw error;
      }
      const result = await httpServer.processHTTPRequest(context);
      if (result.type === "no-payment-required") return respond(request);
      if (result.type === "payment-error") return toResponse(result.response);

      const { paymentPayload, paymentRequirements, declaredExtensions, cancellationDispatcher } = result;
      let claim;
      if (purchaseStore !== undefined) {
        const verifiedCredential = await identifyPaidResponseAuthorization(paymentPayload, request.headers.get("x-payment-recovery"));
        if (inspected === null || verifiedCredential === null
          || verifiedCredential.identity !== inspected.identity
          || verifiedCredential.credentialDigest !== inspected.credentialDigest) {
          await cancellationDispatcher.cancel({ reason: "handler_failed", responseStatus: 400 });
          return Response.json({ error: "recoverable purchases require one canonical exact-EVM authorization" }, { status: 400, headers: { "cache-control": "no-store" } });
        }
        try {
          const claimed = await purchaseStore.claim({
            ...inspected,
            authorization: verifiedCredential.authorization,
            accepted: verifiedCredential.accepted,
            requirements: paymentRequirements,
          });
          if (claimed?.claimed !== true) {
            await cancellationDispatcher.cancel({ reason: "handler_failed", responseStatus: claimed?.state === "conflict" ? 409 : 503 });
            if (claimed?.state === "conflict") {
              return Response.json({ error: "payment authorization is already bound to a different request" }, { status: 409, headers: { "cache-control": "no-store" } });
            }
            return Response.json({ error: "purchase is already being fulfilled; retry this exact request shortly" }, { status: 503, headers: { "retry-after": "2", "cache-control": "no-store" } });
          }
          claim = claimed.claim;
        } catch (error) {
          await cancellationDispatcher.cancel({ reason: "handler_failed", responseStatus: 503 });
          console.error("x402 recoverable purchase claim failed", error instanceof Error ? error.message : String(error));
          return Response.json({ error: "purchase recovery storage is unavailable" }, { status: 503, headers: { "retry-after": "2", "cache-control": "no-store" } });
        }
      }
      // Observe only this seller's response preparation, excluding payment
      // verification, settlement and buyer receiving. This is elapsed time,
      // not CPU/provider cost or customer demand.
      const preparationStarted = performance.now();
      let handlerResponse;
      try {
        handlerResponse = await respond(request);
      } catch (error) {
        if (claim !== undefined) await releasePurchase(purchaseStore, claim);
        await cancellationDispatcher.cancel({ reason: "handler_threw", error });
        throw error;
      }
      if (handlerResponse.status >= 400) {
        if (claim !== undefined) await releasePurchase(purchaseStore, claim);
        await cancellationDispatcher.cancel({ reason: "handler_failed", responseStatus: handlerResponse.status });
        const headers = new Headers(handlerResponse.headers);
        headers.delete(SETTLEMENT_OVERRIDES_HEADER);
        return new Response(handlerResponse.body, { status: handlerResponse.status, statusText: handlerResponse.statusText, headers });
      }

      let responseBody;
      try {
        responseBody = Buffer.from(await handlerResponse.clone().arrayBuffer());
      } catch (error) {
        if (claim !== undefined) await releasePurchase(purchaseStore, claim);
        await cancellationDispatcher.cancel({ reason: "handler_threw", error });
        throw error;
      }
      const responseHeaders = Object.fromEntries(handlerResponse.headers);
      const deliveredHeaders = new Headers(handlerResponse.headers);
      deliveredHeaders.delete(SETTLEMENT_OVERRIDES_HEADER);
      const responsePreparation = {
        basis: "server-response-preparation",
        elapsedMs: Math.max(0, Math.ceil(performance.now() - preparationStarted)),
        includes: ["handler", "response-body-read"],
        measuredCpu: false, measuredMonetaryCost: false, measuredPhysicalEnergy: false,
      };
      if (claim !== undefined) {
        try {
          claim = await purchaseStore.prepare({
            claim,
            response: {
              status: handlerResponse.status,
              statusText: handlerResponse.statusText,
              headers: Object.fromEntries(deliveredHeaders),
              body: responseBody,
            },
          });
        } catch (error) {
          await releasePurchase(purchaseStore, claim);
          await cancellationDispatcher.cancel({ reason: "handler_failed", responseStatus: 503 });
          console.error("x402 recoverable purchase preparation failed", error instanceof Error ? error.message : String(error));
          return Response.json({ error: "purchase recovery storage is unavailable" }, { status: 503, headers: { "retry-after": "2", "cache-control": "no-store" } });
        }
      }
      const settleResult = await httpServer.processSettlement(
        paymentPayload,
        paymentRequirements,
        declaredExtensions,
        { request: context, responseBody, responseHeaders, responseStatus: handlerResponse.status, responsePreparation },
      );
      if (!settleResult.success) return toResponse(settleResult.response);

      const finalHeaders = deliveredHeaders;
      for (const [key, value] of Object.entries(settleResult.headers)) finalHeaders.set(key, value);
      if (claim !== undefined) {
        try {
          await purchaseStore.finalize({ claim, settlementResponse: settleResult });
        } catch (error) {
          // The app store can finish this record on retry by proving the
          // already-settled authorization against the chain.
          console.error("x402 recoverable purchase finalization deferred", error instanceof Error ? error.message : String(error));
        }
      }
      return new Response(handlerResponse.body, { status: handlerResponse.status, headers: finalHeaders });
    },
  });
}

export function createExactEvmFetchPaymentBoundary(options) {
  return createEvmFetchPaymentBoundary(options, new ExactEvmScheme());
}

/** Reuse the same official HTTP adapter for usage-based EVM settlement.
 * The handler returns the native Settlement-Overrides response header;
 * the shared settlement hook bounds the resolved amount before the facilitator.
 * That internal header is never returned or retained as a delivered header.
 */
export function createUptoEvmFetchPaymentBoundary(options) {
  return createEvmFetchPaymentBoundary(options, new UptoEvmScheme());
}

