import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MARKET_ORIGIN, probeRequest, classifyUnsignedResponse, auditUnsignedMarket,
} from "../../scripts/audit-unsigned-merchant.mjs";

const terms = { scheme: "exact", network: "eip155:8453", amount: "40000",
  asset: "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913",
  payTo: "0x1234567890123456789012345678901234567890", maxTimeoutSeconds: 60 };

const offer = (parts = {}) => ({ gateway: "astronomy", operation: "positions", origin: MARKET_ORIGIN,
  method: "GET", route: "/v1/astronomy/positions/{date}", price: "$0.04",
  probeUrl: MARKET_ORIGIN + "/v1/astronomy/positions/2026-10-12", ...parts });

function challengeResponse(url, changes = {}) {
  const payload = { x402Version: 2, resource: { url },
    accepts: [{ ...terms }], ...changes };
  return new Response(null, { status: 402,
    headers: { "payment-required": Buffer.from(JSON.stringify(payload)).toString("base64") } });
}

test("canonical public probes cannot be redirected to private/orphan hosts or unresolved templates", () => {
  assert.equal(probeRequest(offer()).url, MARKET_ORIGIN + "/v1/astronomy/positions/2026-10-12");
  assert.throws(() => probeRequest(offer({ probeUrl: "http://node-market.561.group:8087/x" })), /off-market/);
  assert.throws(() => probeRequest(offer({ probeUrl: "https://ephemeris.561.group/x" })), /off-market/);
  assert.throws(() => probeRequest(offer({ probeUrl: undefined })), /unresolved route/);
  assert.throws(() => probeRequest(offer({ method: "POST", probeUrl: undefined, route: "/v1/sky/angles" })), /no admissible/);
  const post = probeRequest(offer({ method: "POST", probeUrl: undefined, route: "/v1/sky/angles", bodyExample: { bodies: ["moon", "sun"] } }));
  assert.equal(post.method, "POST");
  assert.deepEqual(JSON.parse(post.body), { bodies: ["moon", "sun"] });
});

test("HTTP 402 is readiness only if exact source price, public resource, and payment fields agree", () => {
  const url = probeRequest(offer()).url;
  assert.equal(classifyUnsignedResponse(challengeResponse(url), url, offer()).classification, "402-ready");
  assert.equal(classifyUnsignedResponse(challengeResponse(url.replace("2026-10-12", "2026-10-11")), url, offer()).classification, "wrong-resource-identity");
  assert.equal(classifyUnsignedResponse(new Response(null, { status: 402 }), url, offer()).classification, "invalid-402");
  assert.equal(classifyUnsignedResponse(challengeResponse(url, { accepts: [{ ...terms, payTo: "" }] }), url, offer()).classification, "invalid-402");
  assert.equal(classifyUnsignedResponse(challengeResponse(url, { accepts: [{ ...terms, amount: "1" }] }), url, offer()).classification, "declared-price-mismatch");
  assert.equal(classifyUnsignedResponse(challengeResponse(url, { x402Version: 1 }), url, offer()).classification, "invalid-402");
  assert.equal(classifyUnsignedResponse(challengeResponse(url, { accepts: [{ ...terms, amount: "45000" }] }), url,
    offer({ requestPricing: { mode: "canonical-json-byte-bands" } })).classification, "402-ready");
});

test("classify runtime, admission, and redirect failures without falsely counting payment", () => {
  const u = probeRequest(offer()).url;
  assert.equal(classifyUnsignedResponse(new Response(null, { status: 404 }), u, offer()).classification, "runtime-unreachable");
  assert.equal(classifyUnsignedResponse(new Response(null, { status: 422 }), u, offer()).classification, "admission-refused");
  assert.equal(classifyUnsignedResponse(new Response(null, { status: 503 }), u, offer()).classification, "runtime-or-proxy-error");
  assert.equal(classifyUnsignedResponse(new Response(null, { status: 302 }), u, offer()).classification, "unexpected-redirect");
});

test("bounded independent sweep preserves failures, source order, and no signed payment headers", async () => {
  const catalog = [
    offer(),
    offer({ route: "/v1/sky/angles", operation: "angular-geometry", method: "POST",
      probeUrl: undefined, bodyExample: { time: "2026-10-12", bodies: ["sun", "moon"] }, price: "$0.04" }),
    offer({ route: "/v1/old", operation: "retired", probeUrl: MARKET_ORIGIN + "/v1/old", listed: false }),
  ];
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (init.method === "POST") return new Response(null, { status: 503 });
    return challengeResponse(url);
  };
  const report = await auditUnsignedMarket({ catalog, fetchImpl, concurrency: 2, timeoutMs: 1000,
    observedAt: "2026-10-12T00:00:00.000Z" });
  assert.equal(report.offers, 2);
  assert.deepEqual(report.counts, { "402-ready": 1, "runtime-or-proxy-error": 1 });
  assert.equal(report.healthy, false);
  assert.deepEqual(report.results.map(x => x.operation), ["positions", "angular-geometry"]);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.init.redirect === "manual" && c.init.headers?.["payment-signature"] === undefined));
  assert.match(report.limitation, /neither paid delivery nor settlement/);
});

test("network failures remain explicitly unknown instead of masquerading as zero listed SKUs", async () => {
  const report = await auditUnsignedMarket({ catalog: [offer()], fetchImpl: async () => { throw new Error("DNS unavailable"); } });
  assert.equal(report.healthy, false);
  assert.equal(report.counts["public-network-unreachable"], 1);
  assert.match(report.results[0].reason, /DNS unavailable/);
});

test("the effective compiled publication listing, not a frozen source count, controls external probes", async () => {
  const { COMPILED_DECLARATIONS } = await import("../../apps/market-561-group/src/compiled-offers.mjs");
  assert.ok(COMPILED_DECLARATIONS.length >= 130);
  const handbook = COMPILED_DECLARATIONS.find(x => x.route === "/v1/publications/the-agent-operators-handbook");
  assert.ok(handbook, "the historical declaration must remain traceable");
  // Never pin a coming-soon book to false forever: its accepted edition can go live.
  const active = COMPILED_DECLARATIONS.filter(x => x.listed !== false);
  assert.ok(active.length > 0);
  const probed = [];
  const report = await auditUnsignedMarket({
    catalog: COMPILED_DECLARATIONS,
    observedAt: "2026-10-12T00:00:00.000Z",
    fetchImpl: async url => { probed.push(url); return new Response(null, { status: 503 }); },
  });
  assert.equal(report.sourceDeclarations, COMPILED_DECLARATIONS.length);
  assert.equal(report.intentionallyUnlisted, COMPILED_DECLARATIONS.length - active.length);
  assert.equal(report.offers, active.length);
  assert.equal(probed.length, active.length);
  if (handbook.listed === false) assert.ok(probed.every(u => !u.includes("/v1/publications/the-agent-operators-handbook")));
  assert.equal(report.healthy, false);
  assert.equal(report.counts["runtime-or-proxy-error"], active.length);
});
