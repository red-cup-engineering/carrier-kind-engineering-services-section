import assert from "node:assert/strict";
import test from "node:test";
import { deriveSetOfGuideChaptersFromCatalog } from "../scripts/derive-set-of-guide-chapters-from-catalog.mjs";

const catalog = {
  surfaces: [
    {
      id: "zbd", provider: "ZBD", enterprise: "crypto", kind: "earn-by-attention",
      requiresPurchase: false, requiresIdentity: "phone", humanGated: ["streak"],
      unit: "unknown", unitRate: "unknown", sourceUrl: "https://zbd.io", measuredAt: "2026-09-05",
      referral: { disclosed: true, program: "ZBD Referral", rate: "20% match", conditions: "1 year", payoutRail: "sats", sourceUrl: "https://zbd.io/ref" },
    },
    {
      id: "groq", provider: "Groq", enterprise: "ai", kind: "inference-lane",
      requiresPurchase: false, requiresIdentity: "email", humanGated: [],
      unit: "requests/minute", unitRate: { value: 30, per: "minute", observedAt: "2026-09-05", sourceUrl: "https://groq.com", evidence: "observed", text: "30 requests/minute" },
      sourceUrl: "https://groq.com", measuredAt: "2026-09-05", referral: "unknown",
    },
  ],
};

test("opening chapter states the tiers and referral disclosure in plain words", () => {
  const result = deriveSetOfGuideChaptersFromCatalog({ catalog, enterprise: "ai" });
  assert.match(result.chapters[0], /No-purchase/);
  assert.match(result.chapters[0], /No-KYC/);
  assert.match(result.chapters[0], /Referral disclosure/);
});

test("one chapter per surface of the requested enterprise, after the opening chapter", () => {
  const result = deriveSetOfGuideChaptersFromCatalog({ catalog, enterprise: "ai" });
  assert.equal(result.chapters.length, 2);
  assert.match(result.chapters[1], /## Groq/);
});

test("every pay-rate number carries its observed date and source", () => {
  const result = deriveSetOfGuideChaptersFromCatalog({ catalog, enterprise: "ai" });
  assert.match(result.chapters[1], /30 requests\/minute per minute \(observed 2026-09-05, source: https:\/\/groq\.com\)/);
});

test("a referral line states both what the surface pays the person and what it pays the Group", () => {
  const result = deriveSetOfGuideChaptersFromCatalog({ catalog, enterprise: "crypto" });
  const zbdChapter = result.chapters.find((c) => c.startsWith("## ZBD"));
  assert.match(zbdChapter, /this surface pays you/);
  assert.match(zbdChapter, /separately pays the 561 Group 20% match/);
});

test("refuses a request without a surfaces array or an unknown enterprise", () => {
  assert.throws(() => deriveSetOfGuideChaptersFromCatalog({ catalog: {}, enterprise: "ai" }), /surfaces array/u);
  assert.throws(() => deriveSetOfGuideChaptersFromCatalog({ catalog, enterprise: "gaming" }), /must be/u);
});
