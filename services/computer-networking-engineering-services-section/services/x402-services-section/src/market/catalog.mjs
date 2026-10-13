import { declareCatalog, offerPricingReadout } from "../offer.mjs";

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
      listed: offer.declaration.listed !== false,
      amountAtomic: offer.amount,
      ...(offer.declaration.requestPricing === undefined ? {} : { pricing: offerPricingReadout(offer.declaration) }),
      mimeType: offer.mimeType,
      request: requestContract(offer),
      ...(offer.declaration.recoverable ? { recovery: { method: "repeat-same-signed-request", requiredHeader: "X-Payment-Recovery", token: "32 random bytes as 64 lowercase hex characters, saved privately before payment", preserves: "exact-purchased-response" } } : {}),
      sku: offer.sku,
      category: offer.declaration.category ?? "data",
      description: offer.declaration.framings[0].description,
      ...(offer.declaration.evidence === undefined ? {} : { evidence: offer.declaration.evidence }),
      ...(offer.declaration.compute === undefined ? {} : { compute: { package: offer.declaration.compute.package, export: offer.declaration.compute.export, ...(offer.declaration.compute.configuration === undefined ? {} : { configuration: offer.declaration.compute.configuration }) } }),
      output: offer.declaration.output,
    })),
  });
}

