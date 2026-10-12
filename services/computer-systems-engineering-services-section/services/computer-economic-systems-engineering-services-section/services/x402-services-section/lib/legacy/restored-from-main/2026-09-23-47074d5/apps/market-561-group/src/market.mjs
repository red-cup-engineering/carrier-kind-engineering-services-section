import { createMarket, marketAgentCard, marketCatalogReadout } from "@red-cup-engineering/x402-market-service";
import { selectFacilitatorClient } from "@red-cup-engineering/x402-services-section/cdp-facilitator";
import { catalogIdentities, declareCatalog, sellerCatalogRows } from "@red-cup-engineering/x402-services-section/offer";

import declarations from "../data/records/catalog.json" with { type: "json" };
import compiledIdentities from "../data/records/catalog-identities.json" with { type: "json" };
import compiledReadouts from "../data/records/catalog-readouts.json" with { type: "json" };

/**
 * market.561.group: the one x402 market of the 561 Group.
 *
 * This app composes the market engine over the catalog in
 * `data/records/catalog.json`. It carries no compute of its own: every offer
 * names the typed operation it sells by package and export, and the engine
 * resolves that binding by import. Adding an offer is adding a catalog entry
 * and pinning its package here; nothing else is built, named, or deployed.
 */

export const MARKET_NAME = "market.561.group";
/** Base mainnet and Circle's USDC there: the rails the compiled readouts are derived for. */
export const PRODUCTION_RAILS = Object.freeze({ network: "eip155:8453", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" });

const admittedCatalogs = new Map();
/**
 * The catalog, admitted once per mode on first use rather than at module
 * load. `admit: true` (the Node face, the tests, the derivations) validates
 * every offer's schemas and derives its content identities; `admit: false`
 * (the edge face) trusts the committed catalog the Node suite admitted and
 * loads the identities the compiled record carries, deriving nothing, so a
 * fetch-handler host's first request stays inside its CPU budget.
 * @param {{admit?: boolean}} [options]
 */
export function catalog({ admit = true } = {}) {
  if (!admittedCatalogs.has(admit)) {
    admittedCatalogs.set(admit, admit ? declareCatalog(declarations) : declareCatalog(declarations, { admit: false, identities: compiledIdentities.identities }));
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
  return createMarket({
    catalog: catalogForRuntime(bound.MARKET_RUNTIME ?? "node"),
    // The face's readouts, compiled with the production rails so a cold
    // isolate serves them without deriving; a deployment on other rails
    // derives them once instead.
    ...(bound.X402_NETWORK === PRODUCTION_RAILS.network && (bound.X402_ASSET ?? PRODUCTION_RAILS.asset) === PRODUCTION_RAILS.asset
      ? { precompiled: compiledReadouts.faces[bound.MARKET_RUNTIME ?? "node"] }
      : {}),
    name: MARKET_NAME,
    env: bound,
    // Bindings resolve from this app's own dependency graph, never the engine's.
    load: dependencies.load ?? ((specifier) => import(specifier)),
    ...(dependencies.now === undefined ? {} : { now: dependencies.now }),
    facilitatorClient: dependencies.facilitatorClient,
    facilitatorClientFactory: (rails) => selectFacilitatorClient(bound, rails.facilitatorUrl, { source: MARKET_NAME, sourceVersion: "0.1.0" }),
    afterSettle: dependencies.afterSettle ?? (bound.WITNESS_JOURNAL_DOCUMENT_AGENT ? settlementJournalWhenBound(bound, dependencies) : undefined),
  });
}

/** The house seller catalog rows for this market on one set of rails. */
export function paidSellerRows(rails) {
  return sellerCatalogRows(catalog(), rails);
}

/** The compiled identities of the whole catalog, as data/records/catalog-identities.json records them. */
export function compiledCatalogIdentities() {
  return { recordType: "561-group.x402-market-catalog-identities", note: "Derived from catalog.json by scripts/compile-catalog.mjs; do not hand-edit. The edge face loads these instead of deriving them.", identities: catalogIdentities(catalog()) };
}

/** The compiled readouts of both faces on the production rails, as data/records/catalog-readouts.json records them. */
export function compiledCatalogReadouts() {
  const faces = {};
  const admitted = catalog();
  for (const runtime of ["node", "edge"]) {
    // This derivation must come from the newly admitted declarations.  The
    // edge runtime deliberately loads the prior compiled identities, which
    // would otherwise make a single compiler invocation write mixed-era node
    // and edge readouts after a binding migration.
    const offers = runtime === "node"
      ? admitted
      : declareCatalog(admitted.filter((offer) => offer.declaration.runtime !== "node"));
    faces[runtime] = { catalog: marketCatalogReadout(offers, PRODUCTION_RAILS), agentCard: marketAgentCard(offers, { name: MARKET_NAME }) };
  }
  return { recordType: "561-group.x402-market-catalog-readouts", note: "Derived from catalog.json by scripts/compile-catalog.mjs for the production rails; do not hand-edit. A face on these rails serves them without deriving.", rails: PRODUCTION_RAILS, faces };
}
