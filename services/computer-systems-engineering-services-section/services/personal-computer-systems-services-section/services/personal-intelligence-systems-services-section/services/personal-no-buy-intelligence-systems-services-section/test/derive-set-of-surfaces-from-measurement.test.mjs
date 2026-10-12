import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfSurfacesFromMeasurement } from "../scripts/derive-set-of-surfaces-from-measurement.mjs";

const zbdRows = [
  { product: "ZBD", arena: "attention-rewards-polls-ads", capability: "earning mechanics: polls", normalized_value: "daily poll streak", unit: "unknown", exact_source_language: "Keep up your Daily Poll streak for extra rewards", source_url: "https://zbd.io/a", observed_at: "2026-09-05T00:00:00Z", evidence_kind: "documented", confidence: "medium", requiresPurchase: false, requiresIdentity: "phone", result: "ZBD's app requires phone verification before withdrawal." },
  { product: "ZBD", arena: "attention-rewards-polls-ads", capability: "referral program", normalized_value: "20% match for 1 year", unit: "percent", exact_source_language: "20% match", source_url: "https://zbd.io/b", observed_at: "2026-09-04T00:00:00Z", evidence_kind: "documented", confidence: "high", requiresPurchase: false, requiresIdentity: "unknown", result: "ZBD matches 20% of a referee's earnings.", referral: { program: "ZBD Referral", rate: "20% match for 1 year", conditions: "1 year window", payoutRail: "sats", sourceUrl: "https://zbd.io/ref" } },
];
const groqRows = [
  { product: "Groq", arena: "inference-lane", capability: "free tier requests per minute", normalized_value: "30 requests/minute", unit: "requests/minute", exact_source_language: "30 requests per minute on the free tier", source_url: "https://groq.com/pricing", observed_at: "2026-09-05T00:00:00Z", evidence_kind: "observed", confidence: "high", requiresPurchase: false, requiresIdentity: "email" },
];

test("groups rows by product into one surface each, sorted by id", () => {
  const catalog = deriveSetOfSurfacesFromMeasurement([{ type: "T", measuredAt: "2026-09-05", rows: [...zbdRows, ...groqRows] }]);
  assert.equal(catalog.type, "NoBuySurfaceCatalog");
  assert.deepEqual(catalog.surfaces.map((s) => s.id), ["groq", "zbd"]);
});

test("classifies a known AI provider as ai and a crypto surface as crypto", () => {
  const catalog = deriveSetOfSurfacesFromMeasurement([{ type: "T", measuredAt: "2026-09-05", rows: [...zbdRows, ...groqRows] }]);
  const groq = catalog.surfaces.find((s) => s.id === "groq");
  const zbd = catalog.surfaces.find((s) => s.id === "zbd");
  assert.equal(groq.enterprise, "ai");
  assert.equal(zbd.enterprise, "crypto");
});

test("lifts a unit rate from the row that states a parseable number", () => {
  const catalog = deriveSetOfSurfacesFromMeasurement([{ type: "T", measuredAt: "2026-09-05", rows: groqRows }]);
  const groq = catalog.surfaces[0];
  assert.equal(groq.unit, "requests/minute");
  assert.equal(groq.unitRate.value, 30);
  assert.equal(groq.unitRate.per, "minute");
  assert.equal(groq.unitRate.evidence, "observed");
});

test("aggregates requiresIdentity to the most identity-demanding stated value", () => {
  const catalog = deriveSetOfSurfacesFromMeasurement([{ type: "T", measuredAt: "2026-09-05", rows: zbdRows }]);
  assert.equal(catalog.surfaces[0].requiresIdentity, "phone");
});

test("lifts a referral from a row's own inline referral field", () => {
  const catalog = deriveSetOfSurfacesFromMeasurement([{ type: "T", measuredAt: "2026-09-05", rows: zbdRows }]);
  assert.deepEqual(catalog.surfaces[0].referral, {
    disclosed: true, program: "ZBD Referral", rate: "20% match for 1 year", conditions: "1 year window", payoutRail: "sats", sourceUrl: "https://zbd.io/ref",
  });
});

test("lifts a referral from the referralPrograms table when no row carries one", () => {
  const rows = [{ product: "GreenCart", arena: "x2earn", capability: "cashback", normalized_value: "0.5", unit: "percent", observed_at: "2026-09-05", evidence_kind: "observed", confidence: "medium", requiresPurchase: true, requiresIdentity: "unknown" }];
  const referralPrograms = [{ product: "GreenCart", value: "cashback referral", conditions: "per referral", result: "GreenCart pays a bonus per successful referral.", payoutRail: "B3TR", sourceUrl: "https://greencart.ai" }];
  const catalog = deriveSetOfSurfacesFromMeasurement([{ type: "T", measuredAt: "2026-09-05", rows, referralPrograms }]);
  assert.deepEqual(catalog.surfaces[0].referral, {
    disclosed: true, program: "cashback referral", rate: "per referral", conditions: "GreenCart pays a bonus per successful referral.", payoutRail: "B3TR", sourceUrl: "https://greencart.ai",
  });
});

test("a field no row states is the literal string unknown, never a guess", () => {
  const rows = [{ product: "Mystery", arena: "unclear-arena", capability: "unclear", normalized_value: "unclear", unit: "unknown", observed_at: "2026-09-05", evidence_kind: "unknown", confidence: "low", requiresPurchase: "unknown", requiresIdentity: "unknown" }];
  const catalog = deriveSetOfSurfacesFromMeasurement([{ type: "T", measuredAt: "2026-09-05", rows }]);
  const surface = catalog.surfaces[0];
  assert.equal(surface.kind, "unknown");
  assert.equal(surface.unitRate, "unknown");
  assert.equal(surface.caps, "unknown");
  assert.equal(surface.payoutRail, "unknown");
  assert.equal(surface.custody, "unknown");
  assert.equal(surface.referral, "unknown");
});

test("refuses an input that is not a non-empty array of records carrying rows", () => {
  assert.throws(() => deriveSetOfSurfacesFromMeasurement([]), /non-empty array/u);
  assert.throws(() => deriveSetOfSurfacesFromMeasurement([{ measuredAt: "x" }]), /non-empty array/u);
  assert.throws(() => deriveSetOfSurfacesFromMeasurement("not an array"), /non-empty array/u);
});
