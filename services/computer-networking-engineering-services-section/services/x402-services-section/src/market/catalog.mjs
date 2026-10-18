import { declareCatalog, offerPricingReadout, publiclySaleableOffer } from "../offer.mjs";
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";

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
    // Match the REAL POST route admission, which applies the original
    // bodySchema over an object baseline. A schema with only "required"
    // otherwise admits strings vacuously in standalone JSON Schema evaluation.
    ...(declaration.bodySchema === undefined ? {} : { bodySchema:
      declaration.method === "POST" ? { type: "object", ...declaration.bodySchema } : declaration.bodySchema }),
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

/**
 * A bounded reading of seller-authored OUTPUT EXAMPLES against other sellers'
 * INPUT SCHEMAS. The schema evaluator is Computer Data's existing authority;
 * this does not interpret an example as a theorem that arbitrary outputs fit.
 * A direct value (without adaptation) is the only proposed composition.
 *
 * The buyer's transport supplies the comparison budget; missing or exhausted
 * budget is returned as incomplete work, never silently called incompatible.
 */
function hasDiscriminatingBodyObligation(schema) {
  // An object with optional properties only accepts practically any object.
  // That is a valid JSON Schema but does NOT tell a prospective buyer which
  // producer can supply the operation's actual required input. Do not turn
  // such weak schema evidence into hundreds of apparent workflow edges.
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;
  if (schema.type === "object" || schema.properties !== undefined ||
      schema.required !== undefined) {
    return Array.isArray(schema.required) && schema.required.length > 0;
  }
  // Non-object scalar/array shape is itself a discriminating requirement;
  // this remains ONLY an example-level compatibility check, not execution.
  return typeof schema.type === "string" && schema.type !== "object";
}

export function compareMarketOfferSamples(offers, { maxSamplePairs = 0 } = {}) {
  if (!Array.isArray(offers)) throw new TypeError("offer samples require original selected rows");
  if (!Number.isSafeInteger(maxSamplePairs) || maxSamplePairs < 0)
    throw new TypeError("sample comparison budget must be a nonnegative safe integer");
  const outputStates = new Map();
  const invalidOutputExamples = [];
  for (const row of offers) {
    const output = row.output;
    if (output?.schema === undefined || !Object.hasOwn(output, "example")) {
      outputStates.set(row.sku, "unassayed");
      continue;
    }
    let valid;
    try { valid = validateJsonSchema(output.example, output.schema).valid === true; }
    catch { valid = false; }
    outputStates.set(row.sku, valid ? "admitted-example" : "invalid-source-example");
    if (!valid) invalidOutputExamples.push(row.sku);
  }
  const links = [], invalidTargetSchemas = new Set();
  const nonDiscriminatingInputSchemas = new Set(offers.filter(row =>
    row.method === "POST" && row.request?.bodySchema !== undefined &&
    !hasDiscriminatingBodyObligation(row.request.bodySchema)).map(row => row.sku));
  let considered = 0, refused = 0, unassayed = 0;
  const total = offers.length * Math.max(0, offers.length - 1);
  outer: for (const from of offers) {
    for (const to of offers) {
      if (from.sku === to.sku) continue;
      if (considered >= maxSamplePairs) break outer;
      considered++;
      if (outputStates.get(from.sku) !== "admitted-example" ||
          to.method !== "POST" || to.request?.bodySchema === undefined ||
          nonDiscriminatingInputSchemas.has(to.sku)) {
        unassayed++;
        continue;
      }
      let reading;
      try {
        reading = validateJsonSchema(from.output.example, to.request.bodySchema);
      } catch {
        invalidTargetSchemas.add(to.sku);
        unassayed++;
        continue;
      }
      if (reading.issues?.some(issue => issue.kind === "schema")) {
        invalidTargetSchemas.add(to.sku);
        unassayed++;
      } else if (reading.valid === true) {
        links.push(Object.freeze({
          from: from.sku, to: to.sku,
          relation: "seller-output-example-admitted-as-target-POST-body",
          evidenceLevel: "one-example-structural-only",
          executionAuthorized: false,
          contractualCompositionProven: false,
        }));
      } else {
        refused++;
      }
    }
  }
  return Object.freeze({
    kind: "x402.market.sample-composition-reading.v1",
    totalDirectedPairs: total,
    consideredPairs: considered,
    complete: considered === total,
    unexaminedPairs: total - considered,
    sampleRefusedPairs: refused,
    sampleUnassayedPairs: unassayed,
    invalidOutputExampleSkus: Object.freeze(invalidOutputExamples),
    invalidTargetSchemaSkus: Object.freeze([...invalidTargetSchemas]),
    nonDiscriminatingInputSchemaSkus: Object.freeze([...nonDiscriminatingInputSchemas]),
    sampleAdmittedLinks: Object.freeze(links),
    // Neither source-authored example nor schema admission grants third-party
    // rights, wallet authority, conversion code, settlement or delivery.
    authorizesExecution: false,
  });
}

/**
 * Select the original seller's buyer-visible rows for HTTP, MCP, or another
 * admitted discovery transport. Search is a literal projection of existing
 * typed SKU/cell/law/source fields; it is NOT ontology inference, a payment,
 * or an independent seller authority check. The consuming transport owns
 * its page/query budget, not a numeric ceiling secretly built into the seller.
 *
 * @param {object} readout The original marketCatalogReadout output.
 * @param {"get"|"list"|"search"|"compare"} mode One buyer operation.
 * @param {object} args Caller-supplied selector.
 * @param {object} policy Transport-supplied page and input budgets.
 */
export function selectPublicMarketCatalogRows(readout, mode, args = {}, policy = {}) {
  if (!readout || !Array.isArray(readout.offers))
    throw new TypeError("only one admitted seller catalogue readout is accepted");
  if (!args || typeof args !== "object" || Array.isArray(args))
    throw new TypeError("tool arguments must be an object");
  const listed = readout.offers.filter(row => row?.listed === true);
  // A public offer must have one unambiguous original SKU across EVERY buyer
  // channel. Previously list/search admitted duplicates that exact-get refused.
  const sourceIds = listed.map(row => row.sku);
  if (sourceIds.some(id => typeof id !== "string" || id.length === 0))
    throw new TypeError("public seller catalogue requires source SKU identities");
  if (new Set(sourceIds).size !== sourceIds.length)
    throw new TypeError("duplicate catalog SKU");
  if (mode === "get") {
    if (typeof args.sku !== "string" || args.sku === "")
      throw new TypeError("exact SKU is required");
    const found = listed.filter(row => row.sku === args.sku);
    return found[0] ?? null;
  }
  if (mode === "compare") {
    // This is a single read across several ORIGINAL seller addresses, not a
    // new ranking/price authority. The transport determines its read budget.
    // A missing SKU is unknown in this seller, not a zero-valued offer or proof
    // of nonexistence elsewhere in a federated market.
    const ids = args.skus;
    if (!Array.isArray(ids) || ids.length < 2 ||
        (policy.maxComparedOffers !== undefined && ids.length > policy.maxComparedOffers) ||
        ids.some(id => typeof id !== "string" || id.length === 0 ||
          (policy.maxSkuLength !== undefined && id.length > policy.maxSkuLength)) ||
        new Set(ids).size !== ids.length)
      throw new TypeError("comparison requires distinct, bounded, exact seller SKUs");
    const bySku = new Map(listed.map(row => [row.sku, row]));
    const selected = ids.flatMap(id => bySku.has(id) ? [bySku.get(id)] : []);
    return Object.freeze({
      kind: "x402.market.offer-comparison.v1",
      requestedSkus: Object.freeze([...ids]),
      offers: Object.freeze(selected),
      missingSkus: Object.freeze(ids.filter(id => !bySku.has(id))),
      sampleComposition: compareMarketOfferSamples(selected, {
        maxSamplePairs: policy.maxSamplePairs ?? 0,
      }),
      basis: "one seller's source-authored public offer declarations; source-example admission is not operation equivalence, licensed composition, payment or paid delivery",
    });
  }
  if (mode !== "list" && mode !== "search")
    throw new TypeError("unknown read-only discovery operation");

  let selected = listed;
  if (mode === "search") {
    const query = args.query;
    if (typeof query !== "string" ||
      (policy.maxQueryLength !== undefined && query.length > policy.maxQueryLength))
      throw new TypeError("query must be one bounded search string");
    const terms = [...new Set(query.trim().toLowerCase().split(/\s+/u).filter(Boolean))];
    if (policy.maxTerms !== undefined && terms.length > policy.maxTerms)
      throw new TypeError("too many query terms");
    for (const field of ["category", "sellerEnterprise", "producerPackage"]) {
      const value = args[field];
      const ceiling = policy.exactMaxLength?.[field];
      if (value !== undefined && (typeof value !== "string" || value === "" ||
          (ceiling !== undefined && value.length > ceiling)))
        throw new TypeError(field + " must be bounded, nonempty exact seller identity text");
    }
    // A fixed atomic-price budget is meaningful only within an observed
    // single-seller settlement rail. A variable request tariff's starting
    // price is not its actual payable quote; never report it as affordable.
    const maxFixedPriceAtomic = args.maxFixedPriceAtomic;
    let ceiling;
    if (maxFixedPriceAtomic !== undefined) {
      if (typeof maxFixedPriceAtomic !== "string" ||
          !/^(0|[1-9][0-9]{0,77})$/u.test(maxFixedPriceAtomic) ||
          BigInt(maxFixedPriceAtomic) > (1n << 256n) - 1n)
        throw new TypeError("maxFixedPriceAtomic must be one canonical uint256 atomic amount");
      if (typeof readout.settlement?.network !== "string" ||
          typeof readout.settlement?.asset !== "string" ||
          !readout.settlement.network || !readout.settlement.asset)
        throw new TypeError("atomic price search requires source-qualified network and asset");
      ceiling = BigInt(maxFixedPriceAtomic);
    }
    selected = listed.filter(row => {
      if (ceiling !== undefined) {
        if (row.pricing !== undefined ||
            typeof row.amountAtomic !== "string" ||
            !/^(0|[1-9][0-9]{0,77})$/u.test(row.amountAtomic) ||
            BigInt(row.amountAtomic) > ceiling)
          return false;
      }
      if (args.category !== undefined && (row.category ?? "unclassified") !== args.category)
        return false;
      if (args.sellerEnterprise !== undefined && row.seller?.enterprise !== args.sellerEnterprise)
        return false;
      if (args.producerPackage !== undefined && row.compute?.package !== args.producerPackage)
        return false;
      if (!terms.length) return true;
      const haystack = [
        row.sku, row.cell, row.law, row.name, row.description, row.gateway, row.operation,
        row.route, row.category, row.seller?.enterprise, row.compute?.package, row.compute?.export,
      ].map(item => String(item ?? "").toLowerCase()).join(" ");
      return terms.every(term => haystack.includes(term));
    });
  }
  const offset = args.offset ?? 0;
  const limit = args.limit ?? policy.defaultPageSize ?? Math.max(1, selected.length);
  if (!Number.isSafeInteger(offset) || offset < 0 ||
    (policy.maxOffset !== undefined && offset > policy.maxOffset) ||
    !Number.isSafeInteger(limit) || limit < 1 ||
    (policy.maxPageSize !== undefined && limit > policy.maxPageSize))
    throw new TypeError("offset or limit is outside the admitted range");
  return Object.freeze({
    total: selected.length, offset, limit,
    offers: Object.freeze(selected.slice(offset, offset + limit)),
    nextOffset: offset + limit < selected.length ? offset + limit : null,
  });
}


/**
 * One seller's bounded coordinate fiber and source-offer neighborhood graph.
 * Reuses the existing selectPublicMarketCatalogRows source/publicity/SKU
 * admission, never a new registry, graph identity or settlement authority.
 *
 * A graph edge means only "these two independently authored public offers
 * share this explicit seller/category/producer/gateway string". It does NOT
 * establish contractual substitutability, executable composition, payee
 * equivalence, independent rights or consumer preference.
 *
 * @param {object} readout The SAME marketCatalogReadout as MCP, human listing, etc.
 * @param {{filters?: object,near?:string,limit?:number,offset?:number}} query
 * @param {{maxPageSize?:number,maxOffset?:number,maxFacetValues?:number}} policy
 */
export function selectMarketCoordinateFiber(readout, query = {}, policy = {}) {
  if (readout?.recordType !== "561-group.x402-market-catalog")
    throw new TypeError("coordinate fiber requires the original marketCatalogReadout");
  if (!query || typeof query !== "object" || Array.isArray(query))
    throw new TypeError("coordinate fiber query must be an object");
  const axes = Object.freeze({
    seller: row => row.seller?.enterprise,
    category: row => row.category,
    producer: row => row.compute?.package,
    gateway: row => row.gateway,
  });
  const keys = Object.keys(axes);
  const filterNames = new Set([...keys, "sku"]);
  const filters = query.filters ?? {};
  if (!filters || typeof filters !== "object" || Array.isArray(filters))
    throw new TypeError("coordinate filters must be an object");
  for (const [key, value] of Object.entries(filters)) {
    if (!filterNames.has(key) || typeof value !== "string" || !value.length || value.length > (key === "sku" ? 512 : 256))
      throw new TypeError("coordinate filter must be an exact bounded original identity");
  }
  if (query.near !== undefined &&
      (typeof query.near !== "string" || !query.near.length || query.near.length > 512))
    throw new TypeError("near must name one exact original seller SKU");
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;
  // The public merchant supplies its own 20/100000/12 resource profile.
  // This reusable, pure market reader must not enforce that merchant's alpha
  // capacity as a mathematical ceiling for independent trusted consumers.
  const maxPageSize = policy.maxPageSize ?? 20;
  const maxOffset = policy.maxOffset ?? 100000;
  const maxFacetValues = policy.maxFacetValues ?? 12;
  if (![maxPageSize, maxOffset, maxFacetValues].every(Number.isSafeInteger) ||
      maxPageSize < 1 || maxOffset < 0 || maxFacetValues < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > maxPageSize ||
      !Number.isSafeInteger(offset) || offset < 0 || offset > maxOffset)
    throw new TypeError("coordinate page or facets budget exceeded");

  // Canonical public eligibility and original SKU uniqueness are checked by
  // the SAME Networking selector already consumed by MCP; no second policy.
  const source = selectPublicMarketCatalogRows(readout, "list", {}, {
    defaultPageSize: Math.max(1, readout.offers.length),
    maxPageSize: Math.max(1, readout.offers.length),
  });
  const originals = source.offers;
  const valueAt = (row, key) => {
    const value = key === "sku" ? row.sku : axes[key](row);
    return typeof value === "string" && value.length ? value : undefined;
  };
  const anchor = query.near === undefined ? undefined
    : originals.find(row => row.sku === query.near);
  if (query.near !== undefined && anchor === undefined)
    throw new TypeError("near must identify one currently listed original seller SKU");

  const selected = originals.flatMap(row => {
    const shares = anchor === undefined ? [] : keys.flatMap(key => {
      const value = valueAt(anchor, key);
      return value !== undefined && valueAt(row, key) === value
        ? [{ axis: key, value }] : [];
    });
    if (anchor !== undefined && (row.sku === anchor.sku || shares.length === 0))
      return [];
    if (!Object.entries(filters).every(([key, wanted]) => valueAt(row, key) === wanted))
      return [];
    return [{ row, shares }];
  });
  const page = selected.slice(offset, offset + limit);
  const facets = {};
  for (const key of keys) {
    const values = new Map();
    let unknownCount = 0;
    for (const {row} of selected) {
      const identity = valueAt(row, key);
      if (identity === undefined) { unknownCount++; continue; }
      values.set(identity, (values.get(identity) ?? 0) + 1);
    }
    const sorted = [...values].sort((a,b) => b[1] - a[1] ||
      (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    facets[key] = Object.freeze({
      distinctValues: sorted.length, unknownCount,
      truncated: sorted.length > maxFacetValues,
      values: Object.freeze(sorted.slice(0, maxFacetValues)
        .map(([value,count]) => Object.freeze({value,count}))),
    });
  }
  return Object.freeze({
    recordType: "561-group.market-coordinate-fiber.v1",
    sourceRecordType: readout.recordType,
    filters: Object.freeze({...filters}),
    ...(anchor === undefined ? {} : {
      anchor,
      edges: Object.freeze(page.map(({row,shares}) => Object.freeze({
        from: anchor.sku, to: row.sku,
        relation: "shared-source-coordinate",
        via: Object.freeze(shares.map(value => Object.freeze(value))),
        executableComposition: "unassayed",
        legalSubstitutability: "unassayed",
      }))),
    }),
    total: selected.length, offset, limit,
    nextOffset: offset + page.length < selected.length ? offset + page.length : null,
    facets: Object.freeze(facets),
    offers: Object.freeze(page.map(({row}) => row)),
  });
}
