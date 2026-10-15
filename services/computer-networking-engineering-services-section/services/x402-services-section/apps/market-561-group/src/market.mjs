import { readContractSignatureValidity } from "@red-cup-engineering/base-chain-data-gateway/base-reads";

import { createMarket } from "../../../src/market/market.mjs";
import { selectFacilitatorClient } from "../../../src/cdp-facilitator.mjs";
import { declareCatalog, sellerCatalogRows } from "../../../src/offer.mjs";
import { edgeSettlementJournal } from "./edge-settlement.mjs";
import { createPaidPublicationStore } from "./paid-publication-store.mjs";

import { instanceMarketAccess } from "../../../src/market/instance-access-grants.mjs";
import { COMPILED_DECLARATIONS as declarations, COMPILED_OFFERS } from "./compiled-offers.mjs";
import { CAPABILITY_OUTBOX } from "./compiled-capability-outbox.mjs";

/**
 * market.561.group: the one x402 market of the 561 Group.
 *
 * This app composes the market engine over the catalog in
 * `data/market-561-group/records/catalog.json`. It carries no compute of its own: every offer
 * names the typed operation it sells by package and export, and the engine
 * resolves that binding by import. Adding an offer is adding a catalog entry
 * and pinning its package here; nothing else is built, named, or deployed.
 */

export const MARKET_NAME = "market.561.group";

const admittedCatalogs = new Map();
/**
 * The catalog, admitted once per mode on first use rather than at module
 * load. `admit: true` validates every offer's schemas and derives its content
 * identities; `admit: false` takes the identities and discovery extensions compile-catalog derived
 * from the same declaration (src/compiled-offers.mjs), so a host with a
 * small CPU budget does not hash every declaration on its first request.
 * @param {{admit?: boolean}} [options]
 */
export function catalog({ admit = true } = {}) {
  if (!admittedCatalogs.has(admit)) {
    admittedCatalogs.set(admit, admit ? declareCatalog(declarations) : declareCatalog(declarations, { admit: false, identities: COMPILED_OFFERS }));
  }
  return admittedCatalogs.get(admit);
}

/**
 * The offers one face of the market serves: every offer on a Node host, and
 * every offer not declared `runtime: "node"` on an edge host.
 * @param {"node"|"edge"} runtime The host runtime of this face.
 */
export function catalogForRuntime(runtime = "node") {
  if (runtime !== "node" && runtime !== "edge") throw new TypeError("MARKET_RUNTIME must be node or edge");
  if (runtime === "node") return catalog();
  return declareCatalog(catalog({ admit: false }).filter((offer) => offer.declaration.runtime !== "node"));
}

/**
 * The wallets that use this market's offers without paying
 * supplied by this instance as an explicit grants record, proven by x402's
 * sign-in-with-x. Off until the deployment binds X402_SIGN_IN_SECRET, the
 * key its sign-in challenges are issued under; a contract wallet on Base is
 * checked with an ERC-1271 read.
 * @param {Record<string, string|undefined>} env
 */
export function marketAccess(env, { grants } = {}) {
  return instanceMarketAccess(env, {
    grants, marketName: MARKET_NAME,
    operations: () => catalog({ admit: false }).map((offer) => offer.declaration.operation),
    verifyContractSignature: ({ chainId, address, digest, signature }) => (chainId === "eip155:8453"
      ? readContractSignatureValidity({ address, digest, signature })
      : Promise.resolve(false)),
  });
}

/** The market's settlement rails as this deployment binds them; Base mainnet unless the deployment says otherwise. */
export function marketEnvironment(env = {}) {
  return { X402_NETWORK: "eip155:8453", ...env };
}

/**
 * The durable settlement journal, loaded only when a witness-journal document
 * agent is bound: its provider chain (typed-computer-system-engine and the
 * typed code-networking engine) resolves file URLs at module load, which a
 * fetch-handler host refuses at startup, so the edge face never evaluates it
 * and the Node runner evaluates it on the first settlement.
 */
function settlementJournalWhenBound(env, dependencies) {
  let journal;
  return async function appendSettlement(context) {
    journal ??= (async () => (await import("./settlement-journal.mjs")).createSettlementJournal(env, dependencies))();
    return (await journal)(context);
  };
}

/**
 * Compose the market for one deployment.
 * @param {Record<string, string|undefined>} [env] Deployment bindings.
 * @param {{facilitatorClient?: object, afterSettle?: Function, load?: Function, now?: () => string}} [dependencies] Seams.
 */
export function createMarket561Group(env = process.env, dependencies = {}) {
  const bound = marketEnvironment(env);
  const access = dependencies.access ?? marketAccess(bound, { grants: dependencies.accessGrants });
  const afterSettle = dependencies.afterSettle ?? (bound.MARKET_RUNTIME === "edge"
    ? edgeSettlementJournal(catalogForRuntime("edge"), bound, { now: dependencies.now })
    : bound.WITNESS_JOURNAL_DOCUMENT_AGENT ? settlementJournalWhenBound(bound, dependencies) : undefined);
  const publicationStore = dependencies.purchaseStore ?? (bound.MARKET_SETTLEMENTS
    ? createPaidPublicationStore(bound, { afterSettle }) : undefined);
  // NODE_MARKET_ORIGIN names a live Node face (serve-market.mjs, wherever it
  // runs) that already serves the runtime:"node" offers this edge face
  // cannot compute; when it is bound, the edge face proxies those offers
  // through instead of 404ing them. Unset, this is
  // the empty array createMarket has always defaulted to. The market-561-group
  // Worker binds it to the Node runner on Cold Red Gate.
  const nodeOrigin = bound.MARKET_RUNTIME === "edge" ? bound.NODE_MARKET_ORIGIN : undefined;
  const proxyCatalog = nodeOrigin === undefined ? [] : catalog({ admit: false }).filter((offer) => offer.declaration.runtime === "node");
  return createMarket({
    catalog: catalogForRuntime(bound.MARKET_RUNTIME ?? "node"),
    name: MARKET_NAME,
    env: bound,
    // Bindings resolve from this app's own dependency graph, never the engine's.
    load: dependencies.load ?? ((specifier) => import(specifier)),
    ...(dependencies.now === undefined ? {} : { now: dependencies.now }),
    facilitatorClient: dependencies.facilitatorClient,
    facilitatorClientFactory: (rails) => selectFacilitatorClient(bound, rails.facilitatorUrl, { source: MARKET_NAME, sourceVersion: "0.1.0" }),
    afterSettle,
    purchaseStoreForOffer: () => publicationStore,
    nodeOrigin,
    proxyCatalog,
    access,
    capabilityOutbox: CAPABILITY_OUTBOX,
  });
}

/** The house seller catalog rows for this market on one set of rails. */
export function paidSellerRows(rails) {
  return sellerCatalogRows(catalog(), rails);
}
