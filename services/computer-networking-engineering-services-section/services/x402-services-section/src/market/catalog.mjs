import { declareCatalog, offerPricingReadout, publiclySaleableOffer } from "../offer.mjs";

export const DEFAULT_MAX_BODY_BYTES = 100 * 1024;

export function requestContract(offer) {
  const declaration = offer.declaration;
  const url = new URL(offer.probeUrl);
  for (const [key, value] of Object.entries(declaration.queryExample ?? {})) {
    url.searchParams.set(key, String(value));
  }
  const example = {
    method: declaration.method,
    url: /\{[^}]+\}/u.test(offer.probeUrl) ? null : url.href,
    headers: { accept: offer.mimeType },
  };
  if (declaration.method === "POST") {
    example.headers["content-type"] = "application/json";
    example.body = declaration.bodyExample;
  }
  return {
    ...(declaration.method === "POST" ? { maxBytes: declaration.requestMaxBytes ?? DEFAULT_MAX_BODY_BYTES } : {}),
    ...(declaration.bodySchema === undefined ? {} : { bodySchema: declaration.bodySchema }),
    ...(declaration.querySchema === undefined ? {} : { querySchema: declaration.querySchema }),
    ...(declaration.pathParamsSchema === undefined ? {} : { pathParamsSchema: declaration.pathParamsSchema }),
    example,
  };
}


export function marketCatalogReadout(offers, rails = {}) {
  const catalog = declareCatalog(offers);
  return Object.freeze({
    recordType: "561-group.x402-market-catalog",
    market: catalog[0].declaration.origin,
    settlement: { protocol: "x402", scheme: "exact", network: rails.network ?? null, asset: rails.asset ?? null },
    offers: catalog.map((offer) => ({
      gateway: offer.declaration.gateway,
      seller: offer.declaration.seller ?? null,
      book: offer.declaration.seller ? { enterprise: offer.declaration.seller.enterprise, account: offer.ledgerAccount } : null,
      operation: offer.declaration.operation,
      name: offer.declaration.name,
      method: offer.declaration.method,
      route: offer.declaration.route,
      url: offer.url,
      price: offer.declaration.price,
      listed: publiclySaleableOffer(offer),
      amountAtomic: offer.amount,
      ...(offer.declaration.requestPricing === undefined ? {} : { pricing: offerPricingReadout(offer.declaration) }),
      mimeType: offer.mimeType,
      request: requestContract(offer),
      ...(offer.declaration.recoverable ? { recovery: { method: "repeat-same-signed-request", requiredHeader: "X-Payment-Recovery", token: "32 random bytes as 64 lowercase hex characters, saved privately before payment", preserves: "exact-purchased-response" } } : {}),
      sku: offer.sku,
      // Preexisting Obsmetrologia/SEN content identities: one declaration,
      // one seller/actor cell and one typed operation law, not three SKUs.
      cell: offer.cell,
      law: offer.law,
      category: offer.declaration.category ?? "data",
      description: offer.declaration.framings[0].description,
      ...(offer.declaration.evidence === undefined ? {} : { evidence: offer.declaration.evidence }),
      // Missing evidence is not legally equivalent to an unassayed claim.
      // Neither one is independently verified redistribution authority.
      sourceRightsVerification: offer.declaration.sourceRightsClaim === undefined
        ? "not-declared" : "unassayed",
      ...(offer.declaration.sourceRightsClaim === undefined ? {} : {
        sourceRightsClaim: offer.declaration.sourceRightsClaim,
      }),
      ...(offer.declaration.compute === undefined ? {} : { compute: { package: offer.declaration.compute.package, export: offer.declaration.compute.export, ...(offer.declaration.compute.configuration === undefined ? {} : { configuration: offer.declaration.compute.configuration }) } }),
      output: offer.declaration.output,
    })),
  });
}


/** Project buyer-visible catalogue rows without discarding typed source
 * declarations needed for internal receiving and historical identity. A
 * merchant with only held/private offers still answers with an empty public
 * catalogue and its original seller/settlement metadata.
 */
export function publicMarketCatalogReadout(offers, rails = {}) {
  const admitted = marketCatalogReadout(offers, rails);
  return Object.freeze({
    ...admitted,
    offers: Object.freeze(admitted.offers.filter((row) => row.listed === true)),
  });
}
