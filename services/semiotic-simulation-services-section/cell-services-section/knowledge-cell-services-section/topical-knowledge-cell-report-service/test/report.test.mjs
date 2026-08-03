import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";
import { executeTopicalKnowledgeCellReport, FORBIDDEN_AUTHORITIES, issueTopicalKnowledgeCellReportQuote } from "../lib/report.mjs";
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`; return JSON.stringify(value); }
function identify(value) { return { id: makeNiUri(Buffer.from(stable(value), "utf8")) }; } function digest(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
const USDC = { assetId: "eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", network: "eip155:8453", tokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 };
const PAY_TO = "eip155:8453:0x1111111111111111111111111111111111111111";
function request(channel = { type: "a2a-internal", contractId: "ni:///sha-256;internal" }, overrides = {}) { const manifestBody = { type: "TopicalKnowledgeCellManifest", issuer: "urn:ame:rendanheyi-owner", cellId: "urn:cell:rendanheyi", ownerEnterprise: "urn:ame:rendanheyi-owner", scopeKind: "public", authorityMode: "non-authoritative-projection", custodyAssignment: "urn:custody:one", notebookProvider: "urn:ame:notebooklm-inference-team", corpusSourceSetId: "ni:///sha-256;sources", disclosureClass: "public", observedAt: "2026-07-23T03:00:00.000Z", validUntil: "2026-07-24T03:00:00.000Z", predecessorManifest: null, endpoint: "https://cell.example/.well-known/agent-card.json" }; const manifest = { id: identify(manifestBody).id, ...manifestBody }; const value = { type: "TopicalKnowledgeCellReportRequest", requestId: "urn:report:one", actor: "urn:ame:buyer", manifest, discoveryReceipt: { snapshotId: "urn:snapshot:one", manifestId: manifest.id, status: "fresh", observedAt: "2026-07-23T04:00:00.000Z" }, terms: { prompt: "Explain Rendanheyi from the admitted sources.", format: "brief", language: "en", length: "short" }, channel, authorization: null, ...overrides }; value.authorization = overrides.authorization ?? { holder: value.actor, operation: "request-one-source-grounded-report", requestId: value.requestId, requestBodyId: identify({ type: value.type, requestId: value.requestId, actor: value.actor, manifest: value.manifest, discoveryReceipt: value.discoveryReceipt, terms: value.terms, channel: value.channel }).id, expiresAt: "2026-07-24T04:00:00.000Z", nondelegable: true, singleUse: true, allowedEffects: ["request-one-report"], forbiddenAuthorities: [...FORBIDDEN_AUTHORITIES] }; return value; }
function harness() {
  const reports = new Map(), deliveries = new Map(), calls = { generate: 0, settle: 0, deliver: 0 };
  return { calls, providers: {
    identify: async (value) => identify(value),
    lookupRequest: async (id) => reports.get(id) ?? null,
    generateNotebookReport: async ({ operationId, manifest, terms }) => {
      calls.generate += 1;
      const text = "Rendanheyi report grounded in source receipt one.";
      return {
        type: "NotebookLMSourceGroundedReportArtifact", operationId, provider: manifest.notebookProvider,
        manifest: manifest.id, corpusSourceSetId: manifest.corpusSourceSetId, format: terms.format, language: terms.language,
        text, contentDigest: digest(text), citations: [{ sourceReceipt: "urn:source-receipt:one", locator: "section-1" }],
        generationReceipt: "urn:notebooklm-receipt:one",
        providerCost: { type: "ProviderCharge", provider: manifest.notebookProvider, asset: USDC, amountAtomic: "250000", status: "settled", receipt: "urn:notebooklm-charge:one" },
      };
    },
    recordReport: async (value) => reports.set(value.requestId, { requestIdentity: value.requestIdentity, report: value.report, paymentReceipt: value.paymentReceipt }),
    settleX402: async ({ quote, buyer, operationId }) => {
      calls.settle += 1;
      return {
        id: "urn:payment:one", type: "X402SettlementReceipt", status: "settled", quoteId: quote.id, operationId,
        asset: quote.asset, amountAtomic: quote.amountAtomic, payTo: quote.payTo, payer: buyer,
        network: quote.asset.network, transaction: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        facilitator: quote.facilitator, settledAt: "2026-07-23T04:29:00.000Z",
      };
    },
    lookupDelivery: async (id) => deliveries.get(id) ?? null,
    deliverActivityPub: async ({ deliveryId, public: isPublic }) => { calls.deliver += 1; return { id: "urn:delivery:one", deliveryId, status: "delivered", public: isPublic }; },
    recordDelivery: async (value) => deliveries.set(value.deliveryId, value.receipt),
  } };
}
function externalChannel(terms = { prompt: "Explain Rendanheyi from the admitted sources.", format: "brief", language: "en", length: "short" }) { const quoteBody = { type: "X402ReportQuote", seller: "urn:ame:topical-knowledge-cell-report-service", offerId: "urn:offer:rendanheyi-brief-v1", productId: "urn:product:rendanheyi-brief", manifestId: identify({ type: "TopicalKnowledgeCellManifest", issuer: "urn:ame:rendanheyi-owner", cellId: "urn:cell:rendanheyi", ownerEnterprise: "urn:ame:rendanheyi-owner", scopeKind: "public", authorityMode: "non-authoritative-projection", custodyAssignment: "urn:custody:one", notebookProvider: "urn:ame:notebooklm-inference-team", corpusSourceSetId: "ni:///sha-256;sources", disclosureClass: "public", observedAt: "2026-07-23T03:00:00.000Z", validUntil: "2026-07-24T03:00:00.000Z", predecessorManifest: null, endpoint: "https://cell.example/.well-known/agent-card.json" }).id, termsDigest: digest(JSON.stringify(terms)), asset: USDC, amountAtomic: "2000000", payTo: PAY_TO, facilitator: "https://api.cdp.coinbase.com/platform/v2/x402", validUntil: "2026-07-24T04:00:00.000Z" }; return { type: "activitypub-x402", recipient: "https://buyer.example/users/alice", quote: { id: identify({ ...quoteBody, id: undefined }).id, ...quoteBody } }; }
const NOW = { now: "2026-07-23T04:30:00.000Z" }, EXTERNAL = externalChannel();
function quoteRequest(overrides = {}) {
  const base = request();
  return {
    type: "TopicalKnowledgeCellReportQuoteRequest", requestId: "urn:quote-request:one", actor: base.actor,
    offer: {
      type: "TopicalKnowledgeCellReportProductOffer", version: 1,
      offerId: "urn:offer:rendanheyi-brief-v1", seller: "urn:ame:topical-knowledge-cell-report-service",
      productId: "urn:product:rendanheyi-brief", title: "Rendanheyi grounded brief", topic: "Rendanheyi business philosophy",
      manifestId: base.manifest.id, formats: ["brief"], lengths: ["short"], languages: ["en"],
      price: { asset: USDC, amountAtomic: "2000000" },
      validFrom: "2026-07-23T00:00:00.000Z", validUntil: "2026-08-23T00:00:00.000Z", status: "active",
    },
    manifest: base.manifest, terms: base.terms, ...overrides,
  };
}
function quoteHarness() {
  const values = new Map();
  return {
    identify: async (value) => identify(value),
    lookupQuoteRequest: async (id) => values.get(id) ?? null,
    recordQuote: async (value) => values.set(value.requestId, { requestIdentity: value.requestIdentity, quote: value.quote }),
  };
}
test("seller issues one exact replayable USDC quote to its runtime payout account", async () => {
  const providers = quoteHarness(), options = { now: "2026-07-23T04:30:00.000Z", payTo: PAY_TO, facilitator: "https://api.cdp.coinbase.com/platform/v2/x402", maximumQuoteTtlSeconds: 300 };
  const first = await issueTopicalKnowledgeCellReportQuote(quoteRequest(), providers, options), replay = await issueTopicalKnowledgeCellReportQuote(quoteRequest(), providers, options);
  assert.equal(first.amountAtomic, "2000000"); assert.equal(first.asset.symbol, "USDC"); assert.equal(first.payTo, PAY_TO); assert.equal(first.validUntil, "2026-07-23T04:35:00.000Z"); assert.equal(replay.id, first.id);
});
test("quote issuance refuses placeholder authority, foreign terms, and absent payout activation", async () => {
  await assert.rejects(issueTopicalKnowledgeCellReportQuote(quoteRequest(), quoteHarness(), { now: NOW.now, facilitator: "https://facilitator.example" }), /payout/u);
  const changed = quoteRequest(); changed.terms.format = "memo";
  await assert.rejects(issueTopicalKnowledgeCellReportQuote(changed, quoteHarness(), { now: NOW.now, payTo: PAY_TO, facilitator: "https://facilitator.example" }), /outside/u);
  const foreign = quoteRequest(); foreign.offer.seller = "urn:ame:other";
  await assert.rejects(issueTopicalKnowledgeCellReportQuote(foreign, quoteHarness(), { now: NOW.now, payTo: PAY_TO, facilitator: "https://facilitator.example" }), /authored/u);
});
test("internal A2A report is grounded, disclosed, and grants no elevated authority", async () => { const h = harness(), result = await executeTopicalKnowledgeCellReport(request(), h.providers, NOW); assert.equal(result.report.disclosure.aiGenerated, true); assert.equal(result.report.citations.length, 1); assert.ok(Object.values(result.report.forbiddenAuthorities).every((value) => value === false)); assert.deepEqual(h.calls, { generate: 1, settle: 0, deliver: 0 }); });
test("external ordering settles exact USDC, records margin, and directly delivers exactly once", async () => { const h = harness(), first = await executeTopicalKnowledgeCellReport(request(EXTERNAL), h.providers, NOW), replay = await executeTopicalKnowledgeCellReport(request(EXTERNAL), h.providers, { now: "2026-07-25T04:30:00.000Z" }); assert.equal(first.deliveryReceipt.public, false); assert.equal(first.report.commercial.revenue.amountAtomic, "2000000"); assert.equal(first.report.commercial.grossMarginAtomic, "1750000"); assert.equal(first.report.commercial.revenue.payTo, PAY_TO); assert.equal(replay.report.id, first.report.id); assert.equal(replay.replay, true); assert.deepEqual(h.calls, { generate: 1, settle: 1, deliver: 1 }); });
test("request collision and widened, delegated, or expired authority refuse", async () => { const h = harness(); await executeTopicalKnowledgeCellReport(request(), h.providers, NOW); await assert.rejects(executeTopicalKnowledgeCellReport(request(undefined, { terms: { prompt: "changed", format: "brief", language: "en", length: "short" } }), h.providers, NOW), /collision/u); for (const authorization of [{ ...request().authorization, holder: "urn:ame:other" }, { ...request().authorization, nondelegable: false }, { ...request().authorization, allowedEffects: ["request-one-report", "publication"] }, { ...request().authorization, expiresAt: "2026-07-23T04:00:00.000Z" }]) await assert.rejects(executeTopicalKnowledgeCellReport(request(undefined, { authorization }), harness().providers, NOW)); });
test("public ActivityPub delivery and unsettled external purchase refuse before generation", async () => { await assert.rejects(executeTopicalKnowledgeCellReport(request({ ...EXTERNAL, recipient: "https://www.w3.org/ns/activitystreams#Public" }), harness().providers, NOW), /never public/u); const h = harness(); h.providers.settleX402 = async () => ({ status: "unpaid" }); await assert.rejects(executeTopicalKnowledgeCellReport(request(EXTERNAL), h.providers, NOW), /missing id|plain record|required|settlement receipt/u); assert.equal(h.calls.generate, 0); });
test("stale discovery, authoritative manifest, altered digest, and absent citations refuse", async () => { const stale = request(); stale.discoveryReceipt.status = "stale"; await assert.rejects(executeTopicalKnowledgeCellReport(stale, harness().providers, NOW), /fresh/u); const central = request(); central.manifest.authorityMode = "authoritative"; await assert.rejects(executeTopicalKnowledgeCellReport(central, harness().providers, NOW), /non-authoritative/u); const h1 = harness(); h1.providers.generateNotebookReport = async ({ operationId, manifest, terms }) => ({ type: "NotebookLMSourceGroundedReportArtifact", operationId, provider: manifest.notebookProvider, manifest: manifest.id, corpusSourceSetId: manifest.corpusSourceSetId, format: terms.format, language: terms.language, text: "bytes", contentDigest: digest("other"), citations: [{ sourceReceipt: "urn:r" }], generationReceipt: "urn:g", providerCost: { type: "ProviderCharge", provider: manifest.notebookProvider, asset: USDC, amountAtomic: "0", status: "no-charge", receipt: "urn:g-cost" } }); await assert.rejects(executeTopicalKnowledgeCellReport(request(), h1.providers, NOW), /digest changed/u); const h2 = harness(); h2.providers.generateNotebookReport = async ({ operationId, manifest, terms }) => ({ type: "NotebookLMSourceGroundedReportArtifact", operationId, provider: manifest.notebookProvider, manifest: manifest.id, corpusSourceSetId: manifest.corpusSourceSetId, format: terms.format, language: terms.language, text: "bytes", contentDigest: digest("bytes"), citations: [], generationReceipt: "urn:g", providerCost: { type: "ProviderCharge", provider: manifest.notebookProvider, asset: USDC, amountAtomic: "0", status: "no-charge", receipt: "urn:g-cost" } }); await assert.rejects(executeTopicalKnowledgeCellReport(request(), h2.providers, NOW), /requires receipt citations/u); });
