import { createHash } from "node:crypto";
const ACTOR = "urn:ame:topical-knowledge-cell-report-service";
const FORMATS = new Set(["brief", "memo", "faq", "study-guide"]), LENGTHS = new Set(["short", "medium", "long"]);
export const FORBIDDEN_AUTHORITIES = Object.freeze(["notebook-creation", "corpus-mutation", "sharing", "deletion", "publication", "settlement-administration", "grant-delegation"]);
function fail(message) { throw new TypeError(message); }
function exact(value, required) { if (!value || Object.getPrototypeOf(value) !== Object.prototype) fail("plain record required"); for (const key of required) if (!Object.hasOwn(value, key)) fail(`missing ${key}`); for (const key of Object.keys(value)) if (!required.includes(key)) fail(`unexpected ${key}`); }
function text(value, name) { if (typeof value !== "string" || value.trim() === "") fail(`${name} must be exact and nonempty`); return value; }
function time(value, name) { text(value, name); const parsed = Date.parse(value); if (!Number.isFinite(parsed)) fail(`${name} must be an exact instant`); return parsed; }
function rawDigest(value) { return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`; }
function requestBody(request) { return { type: request.type, requestId: request.requestId, actor: request.actor, manifest: request.manifest, discoveryReceipt: request.discoveryReceipt, terms: request.terms, channel: request.channel }; }
function atomic(value, name, { positive = false } = {}) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) fail(`${name} must be an unsigned atomic-unit integer string`);
  if (positive && BigInt(value) === 0n) fail(`${name} must be positive`);
  return value;
}
function asset(value) {
  exact(value, ["assetId", "network", "tokenContract", "symbol", "decimals"]);
  for (const key of ["assetId", "network", "tokenContract", "symbol"]) text(value[key], `asset ${key}`);
  if (!/^eip155:[1-9][0-9]*$/u.test(value.network)) fail("asset network must be an exact EIP-155 CAIP-2 identifier");
  if (!/^0x[0-9a-fA-F]{40}$/u.test(value.tokenContract)) fail("asset token contract must be an exact EVM address");
  if (!Number.isSafeInteger(value.decimals) || value.decimals < 0 || value.decimals > 255) fail("asset decimals must be an exact unsigned integer");
  return value;
}
function quote(value, request) {
  exact(value, ["id", "type", "seller", "offerId", "productId", "manifestId", "termsDigest", "asset", "amountAtomic", "payTo", "facilitator", "validUntil"]);
  if (value.type !== "X402ReportQuote" || value.seller !== ACTOR) fail("quote was not authored by this report seller");
  for (const key of ["id", "offerId", "productId", "termsDigest", "payTo", "facilitator"]) text(value[key], `quote ${key}`);
  if (value.manifestId !== request.manifest.id) fail("quote is not bound to the selected knowledge cell");
  if (value.termsDigest !== rawDigest(JSON.stringify(request.terms))) fail("quote is not bound to the exact report terms");
  asset(value.asset); atomic(value.amountAtomic, "quote amount", { positive: true });
  if (!value.payTo.startsWith(`${value.asset.network}:0x`) || !/^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u.test(value.payTo)) fail("quote payout account must be an exact CAIP-10 account on the quoted network");
  time(value.validUntil, "quote validUntil");
  return value;
}
function providerCost(value, expectedProvider) {
  exact(value, ["type", "provider", "asset", "amountAtomic", "status", "receipt"]);
  if (value.type !== "ProviderCharge" || value.provider !== expectedProvider) fail("inference cost is not bound to the hired provider");
  asset(value.asset); atomic(value.amountAtomic, "provider charge");
  if (!["settled", "no-charge"].includes(value.status)) fail("provider charge status is unknown");
  if (value.status === "no-charge" && value.amountAtomic !== "0") fail("a no-charge receipt must have zero atomic amount");
  text(value.receipt, "provider charge receipt");
  return value;
}
function validateManifest(value) { exact(value, ["id", "type", "issuer", "cellId", "ownerEnterprise", "scopeKind", "authorityMode", "custodyAssignment", "notebookProvider", "corpusSourceSetId", "disclosureClass", "observedAt", "validUntil", "predecessorManifest", "endpoint"]); if (value.type !== "TopicalKnowledgeCellManifest" || value.authorityMode !== "non-authoritative-projection") fail("one non-authoritative cell manifest is required"); for (const key of ["id", "cellId", "ownerEnterprise", "custodyAssignment", "notebookProvider", "corpusSourceSetId"]) text(value[key], key); return value; }
function validateChannel(value) { if (value?.type === "a2a-internal") { exact(value, ["type", "contractId"]); text(value.contractId, "A2A contract"); return; } if (value?.type === "activitypub-x402") { exact(value, ["type", "recipient", "quote"]); text(value.recipient, "ActivityPub recipient"); if (value.recipient === "https://www.w3.org/ns/activitystreams#Public") fail("external delivery must be direct, never public"); return; } fail("unsupported report channel"); }
function validateArtifact(value, requestIdentity, request) { exact(value, ["type", "operationId", "provider", "manifest", "corpusSourceSetId", "format", "language", "text", "contentDigest", "citations", "generationReceipt", "providerCost"]); if (value.type !== "NotebookLMSourceGroundedReportArtifact" || value.operationId !== requestIdentity || value.provider !== request.manifest.notebookProvider || value.manifest !== request.manifest.id || value.corpusSourceSetId !== request.manifest.corpusSourceSetId || value.format !== request.terms.format || value.language !== request.terms.language) fail("NotebookLM artifact is not bound to the exact report contract"); text(value.text, "report text"); if (value.contentDigest !== rawDigest(value.text)) fail("report content digest changed"); if (!Array.isArray(value.citations) || value.citations.length === 0 || value.citations.some((item) => typeof item?.sourceReceipt !== "string" || item.sourceReceipt === "")) fail("source-grounded report requires receipt citations"); text(value.generationReceipt, "generationReceipt"); providerCost(value.providerCost, value.provider); return value; }
function validateSettlement(value, saleQuote, operationId) {
  exact(value, ["id", "type", "status", "quoteId", "operationId", "asset", "amountAtomic", "payTo", "payer", "network", "transaction", "facilitator", "settledAt"]);
  if (value.type !== "X402SettlementReceipt" || value.status !== "settled" || value.quoteId !== saleQuote.id || value.operationId !== operationId) fail("x402 settlement receipt is absent or mismatched");
  if (JSON.stringify(value.asset) !== JSON.stringify(saleQuote.asset) || value.amountAtomic !== saleQuote.amountAtomic || value.payTo !== saleQuote.payTo || value.network !== saleQuote.asset.network || value.facilitator !== saleQuote.facilitator) fail("x402 settlement differs from the quoted asset, amount, payout account, network, or facilitator");
  text(value.id, "settlement receipt"); text(value.payer, "settlement payer"); text(value.transaction, "settlement transaction"); time(value.settledAt, "settledAt");
  return value;
}
function commercialLedger(channel, paymentReceipt, artifact) {
  const cost = artifact.providerCost;
  if (channel.type !== "activitypub-x402") return { revenue: null, costs: [cost], grossMarginAtomic: null, basis: "internal-contract-not-x402-retail" };
  const saleQuote = channel.quote;
  const comparable = cost.asset.assetId === saleQuote.asset.assetId;
  return {
    revenue: { asset: saleQuote.asset, amountAtomic: saleQuote.amountAtomic, settlementReceipt: paymentReceipt.id, payTo: saleQuote.payTo },
    costs: [cost],
    grossMarginAtomic: comparable ? (BigInt(saleQuote.amountAtomic) - BigInt(cost.amountAtomic)).toString() : null,
    basis: comparable ? "same-asset-revenue-minus-inference-provider-charge" : "unknown-cross-asset-no-conversion",
  };
}

function productOffer(value) {
  exact(value, ["type", "version", "offerId", "seller", "productId", "title", "topic", "manifestId", "formats", "lengths", "languages", "price", "validFrom", "validUntil", "status"]);
  if (value.type !== "TopicalKnowledgeCellReportProductOffer" || value.version !== 1 || value.seller !== ACTOR) fail("one current offer authored by this report seller is required");
  for (const key of ["offerId", "productId", "title", "topic", "manifestId"]) text(value[key], `offer ${key}`);
  for (const [name, values] of [["formats", value.formats], ["lengths", value.lengths], ["languages", value.languages]]) if (!Array.isArray(values) || values.length === 0 || values.some((item) => typeof item !== "string" || item === "") || new Set(values).size !== values.length) fail(`offer ${name} must be a nonempty duplicate-free sequence`);
  exact(value.price, ["asset", "amountAtomic"]); asset(value.price.asset); atomic(value.price.amountAtomic, "offer price", { positive: true });
  if (time(value.validUntil, "offer validUntil") <= time(value.validFrom, "offer validFrom")) fail("offer validity interval is empty");
  if (!["active", "suspended", "retired"].includes(value.status)) fail("offer status is unknown");
  return value;
}

export async function issueTopicalKnowledgeCellReportQuote(request, providers, options = {}) {
  exact(request, ["type", "requestId", "actor", "offer", "manifest", "terms"]);
  if (request.type !== "TopicalKnowledgeCellReportQuoteRequest") fail("wrong quote request type");
  text(request.requestId, "quote requestId"); text(request.actor, "quote actor");
  const offer = productOffer(request.offer), manifest = validateManifest(request.manifest), now = options.now ?? new Date().toISOString();
  exact(request.terms, ["prompt", "format", "language", "length"]); text(request.terms.prompt, "prompt"); text(request.terms.language, "language");
  if (offer.status !== "active" || Date.parse(now) < time(offer.validFrom, "offer validFrom") || Date.parse(now) >= time(offer.validUntil, "offer validUntil")) fail("product offer is not currently active");
  if (offer.manifestId !== manifest.id || !offer.formats.includes(request.terms.format) || !offer.lengths.includes(request.terms.length) || !offer.languages.includes(request.terms.language)) fail("requested report is outside the product offer");
  for (const name of ["identify", "lookupQuoteRequest", "recordQuote"]) if (typeof providers?.[name] !== "function") fail("contracted quote identity and witness providers are incomplete");
  const payTo = text(options.payTo, "runtime payout account"), facilitator = text(options.facilitator, "runtime x402 facilitator");
  if (!payTo.startsWith(`${offer.price.asset.network}:0x`) || !/^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u.test(payTo)) fail("runtime payout account is not an exact CAIP-10 account on the offer network");
  const requestIdentity = await providers.identify(request), incumbent = await providers.lookupQuoteRequest(request.requestId);
  if (incumbent && incumbent.requestIdentity !== requestIdentity.id) fail("quote request identity collision");
  if (incumbent) return incumbent.quote;
  const maximumTtl = options.maximumQuoteTtlSeconds ?? 300;
  if (!Number.isSafeInteger(maximumTtl) || maximumTtl < 1 || maximumTtl > 3600) fail("quote TTL is outside the admitted bound");
  const expires = new Date(Math.min(Date.parse(offer.validUntil), Date.parse(now) + maximumTtl * 1000)).toISOString();
  const body = {
    type: "X402ReportQuote", seller: ACTOR, offerId: offer.offerId, productId: offer.productId,
    manifestId: manifest.id, termsDigest: rawDigest(JSON.stringify(request.terms)), asset: offer.price.asset,
    amountAtomic: offer.price.amountAtomic, payTo, facilitator, validUntil: expires,
  };
  const identity = await providers.identify({ ...body, id: undefined }), result = Object.freeze({ id: identity.id, ...body });
  await providers.recordQuote({ type: "TopicalKnowledgeCellReportQuoteReceipt", requestId: request.requestId, requestIdentity: requestIdentity.id, buyer: request.actor, quote: result, recordedAt: now });
  return result;
}

export async function executeTopicalKnowledgeCellReport(request, providers, options = {}) {
  exact(request, ["type", "requestId", "actor", "manifest", "discoveryReceipt", "terms", "channel", "authorization"]); if (request.type !== "TopicalKnowledgeCellReportRequest") fail("wrong report request type"); text(request.requestId, "requestId"); text(request.actor, "actor"); const manifest = validateManifest(request.manifest); validateChannel(request.channel);
  exact(request.discoveryReceipt, ["snapshotId", "manifestId", "status", "observedAt"]); if (request.discoveryReceipt.manifestId !== manifest.id || request.discoveryReceipt.status !== "fresh") fail("report requires an exact fresh discovery receipt"); if (time(manifest.validUntil, "manifest validUntil") < time(request.discoveryReceipt.observedAt, "discovery observedAt")) fail("discovery occurred after manifest validity");
  exact(request.terms, ["prompt", "format", "language", "length"]); text(request.terms.prompt, "prompt"); text(request.terms.language, "language"); if (!FORMATS.has(request.terms.format) || !LENGTHS.has(request.terms.length)) fail("unsupported report format or length");
  for (const name of ["identify", "lookupRequest", "generateNotebookReport", "recordReport"]) if (typeof providers?.[name] !== "function") fail("contracted report providers are incomplete");
  const bodyIdentity = await providers.identify(requestBody(request)), auth = request.authorization; exact(auth, ["holder", "operation", "requestId", "requestBodyId", "expiresAt", "nondelegable", "singleUse", "allowedEffects", "forbiddenAuthorities"]);
  if (auth.holder !== request.actor || auth.operation !== "request-one-source-grounded-report" || auth.requestId !== request.requestId || auth.requestBodyId !== bodyIdentity.id) fail("report authority is not bound to the exact request body"); if (auth.nondelegable !== true || auth.singleUse !== true || auth.allowedEffects.length !== 1 || auth.allowedEffects[0] !== "request-one-report" || JSON.stringify(auth.forbiddenAuthorities) !== JSON.stringify(FORBIDDEN_AUTHORITIES)) fail("report authority is widened, reusable, delegable, or missing forbidden borders");
  const requestIdentity = await providers.identify(request), incumbent = await providers.lookupRequest(request.requestId); if (incumbent && incumbent.requestIdentity !== requestIdentity.id) fail("request identity collision");
  let report = incumbent?.report ?? null, paymentReceipt = incumbent?.paymentReceipt ?? null;
  if (!report) {
    if (time(auth.expiresAt, "authorization expiry") <= Date.parse(options.now ?? new Date().toISOString())) fail("report authority expired");
    if (request.channel.type === "activitypub-x402") {
      if (typeof providers.settleX402 !== "function") fail("external report requires a contracted x402 provider");
      const saleQuote = quote(request.channel.quote, request), quoteIdentity = await providers.identify({ ...saleQuote, id: undefined });
      if (quoteIdentity.id !== saleQuote.id) fail("x402 quote identity changed");
      if (time(saleQuote.validUntil, "quote validUntil") <= Date.parse(options.now ?? new Date().toISOString())) fail("x402 quote expired");
      paymentReceipt = validateSettlement(await providers.settleX402({ quote: saleQuote, buyer: request.actor, operationId: requestIdentity.id }), saleQuote, requestIdentity.id);
    }
    const artifact = validateArtifact(await providers.generateNotebookReport({ operationId: requestIdentity.id, customer: request.actor, manifest, discoveryReceipt: request.discoveryReceipt, terms: request.terms }), requestIdentity.id, request);
    const body = { type: "TopicalKnowledgeCellReport", version: 1, provider: ACTOR, request: requestIdentity.id, requestId: request.requestId, customer: request.actor, manifest: manifest.id, cellId: manifest.cellId, corpusSourceSetId: manifest.corpusSourceSetId, notebookProvider: manifest.notebookProvider, format: artifact.format, language: artifact.language, text: artifact.text, contentDigest: artifact.contentDigest, citations: artifact.citations, generationReceipt: artifact.generationReceipt, paymentReceipt: paymentReceipt?.id ?? null, commercial: commercialLedger(request.channel, paymentReceipt, artifact), disclosure: { aiGenerated: true, sourceGrounded: true, truthProven: false, sourceCompletenessProven: false, modelProvider: manifest.notebookProvider }, forbiddenAuthorities: Object.fromEntries(FORBIDDEN_AUTHORITIES.map((name) => [name, false])), formedAt: options.now ?? new Date().toISOString() };
    const identity = await providers.identify(body); report = Object.freeze({ id: identity.id, ...body }); await providers.recordReport({ type: "TopicalKnowledgeCellReportReceipt", requestId: request.requestId, requestIdentity: requestIdentity.id, report, paymentReceipt, recordedAt: options.now ?? new Date().toISOString() });
  }
  let deliveryReceipt = null;
  if (request.channel.type === "activitypub-x402") { for (const name of ["lookupDelivery", "deliverActivityPub", "recordDelivery"]) if (typeof providers[name] !== "function") fail("external report requires contracted direct-delivery providers"); const deliveryId = (await providers.identify({ type: "DirectReportDelivery", report: report.id, recipient: request.channel.recipient })).id; deliveryReceipt = await providers.lookupDelivery(deliveryId); if (!deliveryReceipt) { deliveryReceipt = await providers.deliverActivityPub({ deliveryId, actor: ACTOR, recipient: request.channel.recipient, audience: [request.channel.recipient], public: false, report }); if (deliveryReceipt?.deliveryId !== deliveryId || deliveryReceipt?.status !== "delivered" || deliveryReceipt?.public !== false) fail("direct ActivityPub delivery receipt is absent or mismatched"); await providers.recordDelivery({ type: "DirectReportDeliveryReceipt", deliveryId, report: report.id, recipient: request.channel.recipient, receipt: deliveryReceipt }); } }
  return Object.freeze({ type: "TopicalKnowledgeCellReportServiceResult", report, paymentReceipt, deliveryReceipt, replay: incumbent !== null });
}
