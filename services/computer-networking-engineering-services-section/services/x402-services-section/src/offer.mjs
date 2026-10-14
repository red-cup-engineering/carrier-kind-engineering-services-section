import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { getDefaultAsset } from "@x402/evm";
// The validation face alone: the package root evaluates a file URL at module
// load, which a fetch-handler host (the market's edge face) refuses at startup.
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

import offerSchema from "../schemas/offer.schema.json" with { type: "json" };
import { bindingSpecifier } from "./compute-binding.mjs";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { settlementWitnessGraphId } from "../scripts/x402-settlement-witness-identity.mjs";
import { sha256Bytes } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-sha256';

/**
 * One offer an enterprise sells over an x402 boundary, declared once and
 * derived into every market's own form of it: the priced route with its
 * Bazaar discovery extension, the 402index registration body, the house
 * capability-offer object, the seller-catalog row, and the Beancount open
 * directive for the income account its settlements book to.
 *
 * The payout address always comes from the deployment. A native atomic
 * price binds its exact asset and network; a dollar price retains the legacy
 * six-decimal quote. Neither form invents a dollar exchange rate for an asset.
 */

export const OFFER_DECLARATION_KIND = "org.emsenn.x402.offer-declaration.v1";
export const CAPABILITY_OFFER_KIND = "org.emsenn.capability-offer.v3";
export const COORDINATE_RESIDUAL_KIND = "org.emsenn.capability-offer.coordinate-residual.v1";
export const OFFER_SCHEMA = Object.freeze(offerSchema);

const EVM_NETWORK = /^eip155:[1-9][0-9]*$/u;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/u;
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const USDC_DECIMALS = 6;
const DEFAULT_MIME_TYPE = "application/json";
const DEFAULT_CATEGORY = "data";
const ATOMIC_ASSET = /^(eip155:[1-9][0-9]*)\/erc20:(0x[0-9a-f]{40})$/u;
const MAX_ATOMIC_AMOUNT = (1n << 256n) - 1n;

function atomicPrice(price) {
  if (price === null || typeof price !== "object" || Array.isArray(price)
    || Object.keys(price).sort().join(",") !== "amountAtomic,asset"
    || typeof price.amountAtomic !== "string" || typeof price.asset !== "string"
    || !/^(0|[1-9][0-9]{0,77})$/u.test(price.amountAtomic ?? "")
    || BigInt(price.amountAtomic) > MAX_ATOMIC_AMOUNT) {
    throw new TypeError("native offer price requires canonical uint256 amountAtomic and one exact CAIP-19 asset");
  }
  const matched = ATOMIC_ASSET.exec(price.asset ?? "");
  if (!matched) throw new TypeError("native offer price requires one canonical EVM ERC-20 CAIP-19 asset");
  return { network: matched[1], asset: matched[2] };
}

function requirePriceRails(price, network, asset) {
  if (typeof price === "string") return;
  const owned = atomicPrice(price);
  if (owned.network !== network || owned.asset !== asset?.toLowerCase()) {
    throw new TypeError("native offer price does not match the deployment's network and asset");
  }
}

/** Human discovery keeps the owner's denomination; atomic prices imply no dollar rate. */
export function offerPriceText(declaration) {
  const price = declaration.price;
  if (typeof price === "string") return price;
  atomicPrice(price);
  return `${price.amountAtomic} atomic units of ${price.asset}`;
}



/**
 * Does every offered x402 exact-EVM payment alternative match the merchant's
 * authorized contract? This is a pure comparison, *not* a payment validation:
 * the official x402 schema and signatures are checked at their own boundary.
 * Accepts may contain several choices, so one unauthorized choice poisons the
 * entire quote instead of being silently hidden from the buyer.
 *
 * Shared by the direct market receiver and the Node proxy; never duplicate the
 * merchant payment-law comparisons in the site or a transport adapter.
 */
export function exactMerchantTermsMatch(paymentRequired, { network, asset, amount, payTo } = {}) {
  requireNetwork(network);
  requireAddress(asset, "asset");
  if (payTo !== undefined) requireAddress(payTo, "payTo");
  if (typeof amount !== "string" || !/^(0|[1-9][0-9]{0,77})$/u.test(amount) ||
      BigInt(amount) > MAX_ATOMIC_AMOUNT) {
    throw new TypeError("merchant comparison requires canonical atomic amount");
  }
  const accepts = paymentRequired?.accepts;
  return Array.isArray(accepts) && accepts.length > 0 && accepts.length <= 32 &&
    accepts.every(entry =>
      entry?.scheme === "exact" &&
      entry.network === network &&
      entry.asset?.toLowerCase() === asset.toLowerCase() &&
      entry.amount === amount &&
      (payTo === undefined || entry.payTo?.toLowerCase() === payTo.toLowerCase()));
}

// An explicit AssetAmount bypasses the SDK's money conversion, including its
// signing metadata. Recover that metadata from the SDK's token registry while
// retaining our exact integer price and the deployment's chosen asset.
function paymentAssetAmount(amount, asset, network, assetExtra, price) {
  requirePriceRails(price, network, asset);
  let known;
  try { known = getDefaultAsset(network); } catch { /* custom network */ }
  if (known?.address.toLowerCase() === asset.toLowerCase()) {
    if (typeof price === "string" && known.decimals !== USDC_DECIMALS) throw new TypeError("offer prices require a six-decimal settlement asset");
    return {
      amount, asset,
      extra: {
        ...(!known.assetTransferMethod || known.supportsEip2612 ? { name: known.name, version: known.version } : {}),
        ...(known.assetTransferMethod ? { assetTransferMethod: known.assetTransferMethod } : {}),
      },
    };
  }
  if (typeof assetExtra?.name !== "string" || !assetExtra.name.trim()
    || typeof assetExtra?.version !== "string" || !assetExtra.version.trim()) {
    throw new TypeError("a custom settlement asset requires assetExtra.name and assetExtra.version for EIP-712 signing");
  }
  return { amount, asset, extra: { name: assetExtra.name, version: assetExtra.version } };
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function requireNetwork(value) {
  if (!EVM_NETWORK.test(value ?? "")) throw new TypeError("offer derivation requires one explicit EVM CAIP-2 network from the deployment");
  return value;
}

function requireAddress(value, label) {
  if (typeof value !== "string" || !EVM_ADDRESS.test(value)) throw new TypeError(`offer derivation requires ${label} as one EVM address from the deployment`);
  return value;
}

/**
 * An owner-declared request tariff. Bytes are UTF-8 of canonical JSON, never
 * Content-Length, an unsigned buyer price, an ambient clock or traffic counts.
 * The same admitted body gives the same exact quote when the buyer returns.
 * This is a commercial workload band, not measured CPU cost or physical EROEI.
 */
export function offerRequestPricing(declaration, body) {
  if (declaration.requestPricing === undefined) return offerRequestPricingFromBytes(declaration);
  if (body === null || typeof body !== "object" || Array.isArray(body)) throw new TypeError("request-priced offers require the admitted JSON object");
  return offerRequestPricingFromBytes(declaration, Buffer.byteLength(canonicalJson(body), "utf8"));
}

/** Re-read the same tariff from the recorded canonical byte count, without retaining private buyer bodies. */
export function offerRequestPricingFromBytes(declaration, canonicalInputBytes) {
  const base = BigInt(priceAtomicUnits(declaration.price));
  const policy = declaration.requestPricing;
  if (policy === undefined) return Object.freeze({ amountAtomic: base.toString(), basis: "fixed" });
  if (declaration.method !== "POST" || policy.mode !== "canonical-json-byte-bands"
    || !Number.isSafeInteger(policy.includedBytes) || policy.includedBytes < 1
    || !Number.isSafeInteger(policy.additionalUnitBytes) || policy.additionalUnitBytes < 1
    || (!/^[1-9][0-9]{0,77}$/u.test(policy.additionalUnitAtomic ?? "") || BigInt(policy.additionalUnitAtomic) > MAX_ATOMIC_AMOUNT)
    || (!/^[1-9][0-9]{0,77}$/u.test(policy.maximumAtomic ?? "") || BigInt(policy.maximumAtomic) > MAX_ATOMIC_AMOUNT)
    || BigInt(policy.maximumAtomic) < base) throw new TypeError("offer request pricing requires bounded owner-declared POST byte bands");
  if (!Number.isSafeInteger(canonicalInputBytes) || canonicalInputBytes < 2) throw new TypeError("recorded canonical JSON bytes must be a safe integer of at least two");
  const additionalUnits = Math.max(0, Math.ceil((canonicalInputBytes - policy.includedBytes) / policy.additionalUnitBytes));
  const calculated = base + BigInt(additionalUnits) * BigInt(policy.additionalUnitAtomic);
  const ceiling = BigInt(policy.maximumAtomic);
  return Object.freeze({ basis: policy.mode, canonicalInputBytes, additionalUnits,
    amountAtomic: (calculated > ceiling ? ceiling : calculated).toString(),
    minimumAtomic: base.toString(), maximumAtomic: ceiling.toString(), capped: calculated > ceiling });
}

/** The same owner tariff in public discovery; the live quote is the payable amount. */
export function offerPricingReadout(declaration) {
  if (declaration.requestPricing === undefined) return undefined;
  return Object.freeze({ ...declaration.requestPricing, minimumAtomic: priceAtomicUnits(declaration.price),
    priceBasis: "starting-price", ...(typeof declaration.price === "string" ? { settlementDecimals: 6 } : { settlementAsset: declaration.price.asset, denomination: "atomic" }), quote: "native-x402-payment-required",
    metering: "UTF-8 bytes of canonical JSON after input admission; whitespace and alternate escaping do not change the price",
    evidenceScope: "commercial-workload-tariff; no measured CPU, monetary-cost, physical-energy or customer-demand claim" });
}

/**
 * Convert a United States dollar price string to the settlement asset's
 * atomic units, exactly. USDC carries six decimals, so `$0.05` is `50000` and
 * `$0.001` is `1000`; a price with more decimals than the asset is refused.
 * @param {string|{amountAtomic: string, asset: string}} price Dollar quote or asset-bound atomic price.
 * @param {number} [decimals] The asset's decimal places.
 * @returns {string} The price in atomic units, as a canonical digit string.
 */
export function priceAtomicUnits(price, decimals = USDC_DECIMALS) {
  if (price !== null && typeof price === "object") { atomicPrice(price); return price.amountAtomic; }
  const match = /^\$([0-9]+)\.([0-9]{2,6})$/u.exec(price ?? "");
  if (match === null) throw new TypeError("offer price must be one $D.CC United States dollar string with two to six decimals");
  if (match[2].length > decimals) throw new TypeError(`offer price carries more decimals than the settlement asset's ${decimals}`);
  const fraction = match[2].padEnd(decimals, "0");
  return (BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt(fraction)).toString();
}

/**
 * Derive the house income account for one gateway, in the books convention
 * the settlement-transaction derivation already writes:
 * `Income:Sales:X402:<Gateway>`.
 * @param {string} gateway The gateway's own name.
 * @returns {string} The Beancount income account.
 */
export function incomeAccountFor(gateway) {
  if (typeof gateway !== "string" || gateway === "") throw new TypeError("gateway must be one nonempty name");
  return `Income:Sales:X402:${gateway.charAt(0).toUpperCase()}${gateway.slice(1)}`;
}

function semanticToken(objectKind, value) {
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

function coordinate(name, value, reason) {
  if (value === undefined || value === null) {
    return Object.freeze({ kind: COORDINATE_RESIDUAL_KIND, coordinate: name, state: "missing", reason });
  }
  return Object.freeze(typeof value === "string" ? { kind: "reference", href: value } : { kind: "reference", ...value });
}

/**
 * Live declarations use the shared JSON Schema evaluator. `admit: false`
 * trusts prior admission of the exact declaration set, such as a compiled
 * catalog validated before publication; it avoids repeating schema evaluation
 * and never substitutes for admission of new or altered buyer data.
 */
function admitDeclaration(input, { admit = true } = {}) {
  if (admit) {
    const result = validateJsonSchema(input, offerSchema);
    if (!result.valid) {
      const said = result.issues.map((issue) => `${issue.path || "/"} ${issue.keyword}: ${issue.message}`).join("; ");
      throw new TypeError(`offer declaration is not admissible: ${said}`);
    }
  }
  if (!/^Income(?::[A-Z][A-Za-z0-9-]*)+$/u.test(input.ledgerAccount ?? "")) throw new TypeError("offer ledgerAccount must name an income account in its seller book");
  if (input.seller !== undefined && (!/^[a-z0-9][a-z0-9-]*$/u.test(input.seller?.enterprise ?? "") ||
      typeof input.seller?.entity !== "string" || input.seller.entity === "" ||
      !/^lib\/[^\\]+\/lib\/agency\/enterprises\/[a-z0-9-]+\.json$/u.test(input.seller?.record?.path ?? "") ||
      input.seller.record.path.split("/").includes("..") || !/^[a-f0-9]{64}$/u.test(input.seller?.record?.sha256 ?? ""))) {
    throw new TypeError("offer seller must name an enterprise, legal entity and exact repository constitution record");
  }
  // An admitted declaration is copied before it is frozen; one taken on trust (a
  // compiled catalog on a small CPU budget) is frozen where it lies, since
  // cloning every example again is the cost the trusted path avoids.
  return deepFreeze(admit ? structuredClone(input) : input);
}

function selectFraming(declaration, key) {
  if (key === undefined) return declaration.framings[0];
  const framing = declaration.framings.find((entry) => entry.key === key);
  if (framing === undefined) throw new TypeError(`offer carries no framing ${key}`);
  return framing;
}

function discoveryExtension(declaration) {
  if (declaration.method === "POST") {
    return declareDiscoveryExtension({
      method: "POST",
      bodyType: "json",
      input: declaration.bodyExample,
      ...(declaration.bodySchema === undefined ? {} : { inputSchema: declaration.bodySchema }),
      output: { schema: declaration.output.schema, example: declaration.output.example },
    });
  }
  return declareDiscoveryExtension({
    method: "GET",
    ...(declaration.pathParamsSchema === undefined ? {} : { pathParamsSchema: declaration.pathParamsSchema }),
    ...(declaration.queryExample === undefined ? {} : { input: declaration.queryExample }),
    ...(declaration.querySchema === undefined ? {} : { inputSchema: declaration.querySchema }),
    output: { schema: declaration.output.schema, example: declaration.output.example },
  });
}

/**
 * Admit one offer declaration and return its derivations.
 *
 * @param {object} input One offer declaration, validated against
 *   `schemas/offer.schema.json`.
 * @param {{admit?: boolean}} [options] `admit: false` trusts `input` as
 *   already schema-checked, such as an immutable compiled catalog.
 * @returns {Readonly<object>} The admitted offer: its frozen `declaration`,
 *   its derived identities, and one derivation per market.
 * @throws {TypeError} When the declaration fails the schema or its
 *   its seller or income account is malformed.
 */
export function declareOffer(input, { admit = true, identities } = {}) {
  const declaration = admitDeclaration(input, { admit });
  if (declaration.compute !== undefined) bindingSpecifier(declaration.compute);
  if (declaration.validate !== undefined) bindingSpecifier(declaration.validate);
  const amount = priceAtomicUnits(declaration.price);
  // Validate a tariff even on the precompiled edge admission path.
  if (declaration.requestPricing !== undefined) offerRequestPricing(declaration, {});
  const url = `${declaration.origin}${declaration.route}`;
  const probeUrl = declaration.probeUrl ?? url;
  const mimeType = declaration.mimeType ?? DEFAULT_MIME_TYPE;
  const routeKey = `${declaration.method} ${declaration.route}`;
  // The three content identities are pure functions of the one declaration.
  // Hashing a declaration with its examples costs tens of milliseconds, so a
  // host with a small CPU budget (the edge face) takes them precompiled from
  // the same declaration by compile-catalog, and only a host that admits the
  // catalog computes them here.
  const sku = identities?.sku ?? semanticToken("x402.offer-declaration", declaration);
  const cell = identities?.cell ?? semanticToken("x402.offer-seller-cell", {
    gateway: declaration.gateway,
    gatewayPackageName: declaration.gatewayPackageName,
    section: declaration.section,
    ...(declaration.seller === undefined ? {} : { seller: declaration.seller }),
  });
  // The Bazaar discovery extension infers a schema from the examples: derived
  // once, or taken precompiled like the identities.
  let discovery = identities?.discovery === undefined ? undefined : deepFreeze(identities.discovery);
  const discoveryOf = () => (discovery ??= deepFreeze(discoveryExtension(declaration)));
  const law = identities?.law ?? semanticToken("x402.offer-contract", {
    operation: declaration.operation,
    method: declaration.method,
    route: declaration.route,
    bodySchema: declaration.bodySchema ?? null,
    querySchema: declaration.querySchema ?? null,
    ...(declaration.pathParamsSchema === undefined ? {} : { pathParamsSchema: declaration.pathParamsSchema }),
    outputSchema: declaration.output.schema,
  });

  /**
   * Derive this offer's x402 route entry for one framing, with a Bazaar
   * discovery extension carrying `input.method` and `routeTemplate`.
   */
  function x402Route({ framing, payTo, network, asset, assetExtra } = {}) {
    const selected = selectFraming(declaration, framing);
    const routeTemplate = declaration.route.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/gu, ":$1");
    const parameterized = routeTemplate !== declaration.route;
    return Object.freeze({
      [`${declaration.method} ${routeTemplate}`]: {
        accepts: [{
          scheme: "exact",
          network: requireNetwork(network),
          price: declaration.requestPricing === undefined
            ? paymentAssetAmount(amount, requireAddress(asset, "the settlement asset"), network, assetExtra, declaration.price)
            : context => paymentAssetAmount(offerRequestPricing(declaration, context.adapter.getBody?.()).amountAtomic,
              requireAddress(asset, "the settlement asset"), network, assetExtra, declaration.price),
          payTo: requireAddress(payTo, "the payout address"),
        }],
        description: selected.description,
        mimeType,
        serviceName: selected.serviceName,
        tags: selected.tags,
        extensions: { bazaar: { ...discoveryOf().bazaar, ...(parameterized ? { routeTemplate } : {}) } },
      },
    });
  }

  /**
   * Derive the `POST https://402index.io/api/v1/register` body for one
   * framing, in the field names that index's own OpenAPI document declares.
   * The display strings for the settlement asset and network, and the
   * provider name, come from the deployment because the declaration carries
   * no rails.
   */
  function index402Registration({ framing, provider, paymentAsset, paymentNetwork, contactEmail } = {}) {
    if (typeof declaration.price !== "string") throw new TypeError("402index requires a declared dollar price; a native asset price has no implicit USD rate");
    const selected = selectFraming(declaration, framing);
    return Object.freeze({
      url: probeUrl,
      name: selected.title,
      protocol: "x402",
      description: selected.description,
      category: selected.category ?? declaration.category ?? DEFAULT_CATEGORY,
      http_method: declaration.method,
      ...(declaration.method === "POST" ? { probe_body: JSON.stringify(declaration.bodyExample) } : {}),
      price_usd: Number(declaration.price.slice(1)),
      ...(paymentAsset === undefined ? {} : { payment_asset: paymentAsset }),
      ...(paymentNetwork === undefined ? {} : { payment_network: paymentNetwork }),
      ...(provider === undefined ? {} : { provider }),
      ...(contactEmail === undefined ? {} : { contact_email: contactEmail }),
    });
  }

  /** Derive this offer's `org.emsenn.capability-offer.v3` object. */
  function capabilityOffer({ network, asset, agentCard, expiresAt, coordinates = {} } = {}) {
    requirePriceRails(declaration.price, network, asset);
    if (typeof agentCard !== "string" || agentCard === "") throw new TypeError("capability offer requires the provider's A2A agent card URL");
    if (!ISO_INSTANT.test(expiresAt ?? "")) throw new TypeError("capability offer requires expiresAt as one ISO-8601 UTC instant");
    return deepFreeze({
      kind: CAPABILITY_OFFER_KIND,
      cell,
      sku,
      provider: `${declaration.origin}/actors/market`,
      seller: declaration.seller ?? null,
      book: declaration.seller ? { enterprise: declaration.seller.enterprise, account: declaration.ledgerAccount } : null,
      operation: declaration.operation,
      law,
      agentCard,
      authorization: { profile: "x402", grantRequired: false },
      price: { protocol: "x402", asset: requireAddress(asset, "the settlement asset"),
        amount: declaration.requestPricing?.maximumAtomic ?? amount, network: requireNetwork(network),
        ...(declaration.requestPricing === undefined ? {} : { basis: "maximum-authorized-tariff", pricing: offerPricingReadout(declaration) }) },
      coordinates: {
        signedAgentCard: coordinate("signedAgentCard", coordinates.signedAgentCard ?? agentCard, "no signed Agent Card reference was supplied"),
        packageOperation: coordinate("packageOperation", coordinates.packageOperation ?? {
          href: `https://www.npmjs.com/package/${declaration.gatewayPackageName}`,
          operation: declaration.operation,
          consumes: [mimeType],
          emits: [mimeType],
          invocation: url,
        }, "no owner-authored package operation reference was supplied"),
        deploymentHealth: coordinate("deploymentHealth", coordinates.deploymentHealth, "no live deployment or health reference was supplied"),
        resourceMeter: coordinate("resourceMeter", coordinates.resourceMeter, "no provider-native resource meter reference was supplied"),
        settlementReturn: coordinate("settlementReturn", coordinates.settlementReturn, "no settlement-return reference was supplied"),
      },
      expiresAt,
    });
  }

  /** Derive this offer's row of the house seller catalog. */
  function sellerCatalogRow({ network, asset, payTo } = {}) {
    requirePriceRails(declaration.price, network, asset);
    return deepFreeze({
      seller: declaration.seller?.enterprise ?? null,
      servingProvider: `${declaration.origin}/actors/market`,
      gateway: declaration.gateway,
      sellerRecord: declaration.seller?.record ?? null,
      book: declaration.seller ? { enterprise: declaration.seller.enterprise, account: declaration.ledgerAccount } : null,
      gatewayPackageName: declaration.gatewayPackageName,
      url: probeUrl,
      method: declaration.method,
      ...(declaration.method === "POST" ? { body: structuredClone(declaration.bodyExample) } : {}),
      expectedAmount: offerRequestPricing(declaration, declaration.bodyExample).amountAtomic,
      network: requireNetwork(network),
      asset: requireAddress(asset, "the settlement asset"),
      payTo: requireAddress(payTo, "the payout address"),
      listed: declaration.listed ?? true,
    });
  }

  /** Derive the Beancount `open` directive for this offer's income account. */
  function beancountOpen({ date } = {}) {
    if (!CALENDAR_DATE.test(date ?? "")) throw new TypeError("beancount open directive requires a YYYY-MM-DD date");
    return `${date} open ${declaration.ledgerAccount}`;
  }

  return Object.freeze({
    kind: OFFER_DECLARATION_KIND,
    declaration,
    amount,
    url,
    probeUrl,
    routeKey,
    mimeType,
    cell,
    sku,
    law,
    framingKeys: Object.freeze(declaration.framings.map((framing) => framing.key)),
    markets: declaration.markets,
    ledgerAccount: declaration.ledgerAccount,
    get discovery() { return discoveryOf(); },
    x402Route,
    index402Registration,
    capabilityOffer,
    sellerCatalogRow,
    beancountOpen,
  });
}

/**
 * Derive one x402 route configuration covering a set of offers served by the
 * same boundary, each at its default (or named) framing.
 * @param {readonly object[]} offers Admitted offers from `declareOffer`.
 * @param {{payTo: string, network: string, asset: string, framings?: Record<string,string>}} rails
 * @returns {Record<string, object>} The boundary's route configuration.
 */
export function x402RoutesForOffers(offers, rails = {}) {
  if (!Array.isArray(offers) || offers.length === 0) throw new TypeError("x402RoutesForOffers requires one nonempty set of admitted offers");
  const routes = Object.assign({}, ...offers.map((offer) => offer.x402Route({
    ...rails,
    framing: rails.framings?.[offer.declaration.route],
  })));
  // HTTP HEAD has the GET representation's payment terms, without its body.
  for (const [route, configuration] of Object.entries(routes)) {
    if (route.startsWith("GET ")) routes[route.replace(/^GET /u, "HEAD ")] = configuration;
  }
  return Object.freeze(routes);
}

/**
 * Admit one catalog: the set of offers one market serves. Every declaration
 * is admitted by `declareOffer`; across the set, every `METHOD route` and
 * every `gateway/operation` pair is unique, so one origin can serve offers
 * from many gateways without a collision. A catalog may be handed as already
 * admitted offers, raw declarations, or a mix.
 *
 * @param {readonly object[]} entries Offer declarations, or admitted offers.
 * @param {{admit?: boolean}} [options] Forwarded to `declareOffer` for every
 *   raw declaration; an entry that is already admitted is never re-checked.
 * @returns {readonly object[]} The admitted offers, frozen, in catalog order.
 */
export function declareCatalog(entries, { admit = true, identities } = {}) {
  if (!Array.isArray(entries) || entries.length === 0) throw new TypeError("a catalog requires one nonempty set of offer declarations");
  const offers = entries.map((entry) => {
    if (entry?.kind === OFFER_DECLARATION_KIND) return entry;
    const precompiled = admit ? undefined : identities?.[`${entry.method} ${entry.route}`];
    return declareOffer(entry, { admit, ...(precompiled === undefined ? {} : { identities: precompiled }) });
  });
  const routes = new Map();
  const operations = new Map();
  for (const offer of offers) {
    const previous = routes.get(offer.routeKey);
    if (previous !== undefined) throw new TypeError(`catalog route ${offer.routeKey} is declared by both ${previous.declaration.gateway} and ${offer.declaration.gateway}`);
    routes.set(offer.routeKey, offer);
    const operation = `${offer.declaration.gateway}/${offer.declaration.operation}`;
    if (operations.has(operation)) throw new TypeError(`catalog operation ${operation} is declared twice`);
    operations.set(operation, offer);
  }
  return Object.freeze(offers);
}

/** Derive the house seller catalog rows for a whole catalog on one set of rails. */
export function sellerCatalogRows(offers, rails) {
  return Object.freeze(declareCatalog(offers).map((offer) => offer.sellerCatalogRow(rails)));
}

/**
 * Witness one settlement at the seller that earned it.
 *
 * A settlement read from the chain names only the receiver, and one receiver
 * serves several of the Group's sellers, so the chain alone cannot say which
 * seller a settlement belongs to. This handler logs the attribution at the
 * seller, and posts it to the house witness journal when the deployment binds
 * `WITNESS_SINK_URL`. The deterministic `witnessId` also travels in the body
 * and `x-x402-settlement-witness-id` header, so a durable sink can accept a
 * retry exactly once. A failed post never fails the settlement or the response
 * the buyer paid for.
 *
 * @param {object|readonly object[]} offer One admitted offer, or the set of
 *   offers this boundary serves (the settled route selects among them).
 * @param {{env?: object, fetch?: typeof globalThis.fetch, now?: () => string, log?: (line: string) => void}} [options]
 * @returns {(context: object) => Promise<object>} The boundary's `afterSettle` handler.
 */
function deliveredResearch(context) {
  const transport = context?.transportContext, body = transport?.responseBody;
  if (context?.result?.success !== true || !(body instanceof Uint8Array) || body.byteLength > 1048576 ||
      !String(transport.responseHeaders?.['content-type'] ?? '').includes('json')) return undefined;
  try {
    const product = JSON.parse(new TextDecoder().decode(body)), packet = product.research;
    if (packet?.kind !== 'koios.news.market-research/v1' || !/^[a-f0-9]{64}$/.test(packet.id) ||
        typeof product.id !== 'string' || product.id.length > 500 || !Array.isArray(packet.observations) || packet.observations.length > 128) return undefined;
    const observationIds = packet.observations.map(row => row.id);
    if (observationIds.some(id => typeof id !== 'string' || id.length > 500)) return undefined;
    return { productId: product.id, packetId: packet.id, sourceObservationIds: observationIds,
      responseDigest: 'sha256:' + sha256Bytes(body) };
  } catch { return undefined; }
}
export function settlementWitness(offer, { env = {}, fetch: fetchImpl, now = () => new Date().toISOString(), log = (line) => console.log(line) } = {}) {
  const offers = Array.isArray(offer) ? offer : [offer];
  if (offers.length === 0) throw new TypeError("settlementWitness requires at least one admitted offer");

  return async function afterSettle(context) {
    const request = context?.transportContext?.request;
    const settledPath = request?.path;
    const settledMethod = typeof request?.method === "string" ? request.method.toUpperCase() : null;
    const matched = settledMethod === null || typeof settledPath !== "string"
      ? (offers.length === 1 ? offers[0] : null)
      : offers.find((entry) => entry.declaration.method === (settledMethod === "HEAD" ? "GET" : settledMethod) && routeTemplateMatches(entry.declaration.route, settledPath)) ?? null;
    const gateway = matched?.declaration.gateway ?? (offers.length === 1 ? offers[0].declaration.gateway : null);
    const delivered = deliveredResearch(context);
    const witness = {
      version: 2,
      gateway,
      route: matched?.declaration.route ?? settledPath ?? null,
      method: matched?.declaration.method ?? null,
      operation: matched?.declaration.operation ?? null,
      sku: matched?.sku ?? null,
      ledgerAccount: matched?.ledgerAccount ?? null,
      seller: matched?.declaration.seller ?? null,
      book: matched?.declaration.seller ? { enterprise: matched.declaration.seller.enterprise, account: matched.ledgerAccount } : null,
      paymentObservation: { basis: "facilitator-result", success: context?.result?.success === true, independentlyVerifiedTransfer: false },
      deliveryObservation: { basis: "server-response-prepared", status: context?.transportContext?.responseStatus ?? null,
        bodyBytes: context?.transportContext?.responseBody?.byteLength ?? null, requesterAccepted: null },
      ...(context?.transportContext?.responsePreparation === undefined ? {} : {
        responsePreparation: context.transportContext.responsePreparation,
      }),
      offerDeclaration: matched?.declaration ?? null,
      ...(matched?.declaration.requestPricing === undefined ? {} : {
        pricingBasis: offerRequestPricing(matched.declaration, request.adapter.getBody?.()),
        quotedAmountAtomic: context?.requirements?.amount ?? null,
        reportedAmountAtomic: context?.result?.amount ?? null,
      }),
      network: context?.result?.network ?? null,
      transaction: context?.result?.transaction ?? null,
      payer: context?.result?.payer ?? null,
      amount: context?.result?.amount ?? context?.requirements?.amount ?? null,
      asset: context?.requirements?.asset ?? null,
      payTo: context?.requirements?.payTo ?? null,
      recordedAt: now(),
      ...(delivered ? { deliveredResearch: delivered } : {}),
    };
    if (typeof witness.network === "string" && witness.network !== "" && typeof witness.transaction === "string" && witness.transaction !== "") {
      witness.witnessId = settlementWitnessGraphId({ network: witness.network, transaction: witness.transaction });
    }
    const { offerDeclaration: _offerDeclaration, ...loggedWitness } = witness;
    log(JSON.stringify({ event: `${gateway ?? "market"}.x402-settlement-witness`, ...loggedWitness }));
    const sink = env.WITNESS_SINK_URL;
    if (typeof sink !== "string" || sink === "") return witness;
    try {
      const send = fetchImpl ?? globalThis.fetch;
      const response = await send(sink, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(witness.witnessId ? { "x-x402-settlement-witness-id": witness.witnessId } : {}),
        },
        body: JSON.stringify(witness),
      });
      if (response?.ok === false) {
        log(JSON.stringify({
          event: `${gateway ?? "market"}.x402-settlement-witness-sink-refused`,
          reason: `sink responded ${response.status}`,
          recordedAt: witness.recordedAt,
          witnessId: witness.witnessId ?? null,
        }));
      }
    } catch (error) {
      log(JSON.stringify({
        event: `${gateway ?? "market"}.x402-settlement-witness-sink-refused`,
        reason: error instanceof Error ? error.message : String(error),
        recordedAt: witness.recordedAt,
        witnessId: witness.witnessId ?? null,
      }));
    }
    return witness;
  };
}

function routeTemplateMatches(template, path) {
  const expression = template
    .split(/(\{[A-Za-z_][A-Za-z0-9_]*\})/u)
    .map((segment) => /^\{[A-Za-z_][A-Za-z0-9_]*\}$/u.test(segment)
      ? "[^/]+"
      : segment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
    .join("");
  return new RegExp(`^${expression}$`, "u").test(path);
}

