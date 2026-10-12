# derive-set-of-guide-chapters-from-catalog
## Requirements
- `opening-chapter`: The operation's first chapter states the two tiers (no-purchase, no-KYC) and the referral disclosure policy in plain words.
- `one-chapter-per-surface`: The operation emits one Markdown chapter per catalog surface of the requested enterprise, after the opening chapter.
- `ordering`: The operation orders surfaces by identity cost ascending (none, email, phone, card, bank, government-id, unknown), then by whether a pay rate is known, never by referral.
- `every-number-sourced`: Every pay-rate number in a chapter is followed by its observed date and source URL.
- `referral-both-sides`: A chapter's referral line states both what the surface pays the person and what the person's signup separately pays the 561 Group.
## Prohibitions
- `missing-catalog-refusal`: The operation must refuse a request whose `catalog.surfaces` is not an array.
- `bad-enterprise-refusal`: The operation must refuse a request whose `enterprise` is not `"crypto"` or `"ai"`.
## Laws
- `no-buy-surface-schema` | personal-no-buy-intelligence-systems-services-section | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/personal-computer-systems-services-section/services/personal-intelligence-systems-services-section/services/personal-no-buy-intelligence-systems-services-section/data/records/schema/no-buy-surface.schema.json | Applies to the shape of every surface object this operation reads. | The record's properties, requiredness, and value shapes are the NoBuySurface JSON Schema (draft 2020-12) at the cited path.
- `scripts-import-scripts-and-src` | org-layering.md / import-stratification.md | v1 | .claude/rules/import-stratification.md | Applies to how this operation's own source file may be structured. | "scripts can import scripts and src. scripts cannot import apps." This operation imports no other package at all, so it trivially satisfies the stratification law.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-guide-chapters-from-catalog-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-guide-chapters-from-catalog.mjs
#!/usr/bin/env node

const IDENTITY_RANK = { none: 0, email: 1, phone: 2, card: 3, bank: 4, "government-id": 5, unknown: 6 };

const formatRequiresPurchase = (value) => (value === false ? "no" : value === true ? "yes" : "unknown");

const formatNoKyc = (requiresIdentity) => (
  requiresIdentity === "unknown" ? "unknown" : IDENTITY_RANK[requiresIdentity] <= IDENTITY_RANK.email ? "yes" : "no"
);

const formatPayRateLine = (surface) => {
  if (surface.unitRate === "unknown" || surface.unitRate === undefined) {
    return "Pay rate: not measured (unknown).";
  }
  const { value, per, observedAt, sourceUrl, text } = surface.unitRate;
  const stated = typeof value === "number" && per !== "unknown" ? `${value} ${surface.unit} per ${per}` : text;
  return `Pay rate: ${stated} (observed ${observedAt}, source: ${sourceUrl}).`;
};

const formatReferralLine = (surface) => {
  if (surface.referral === "unknown" || surface.referral === undefined) return null;
  const { rate, conditions, sourceUrl } = surface.referral;
  const personRate = surface.unitRate === "unknown"
    ? "an unmeasured rate"
    : formatPayRateLine(surface).replace(/^Pay rate: /, "").replace(/\.$/, "");
  return `Referral disclosure: this surface pays you ${personRate}; a signup through this guide's disclosed link separately pays the 561 Group ${rate} (${conditions}), sourced ${sourceUrl}.`;
};

const formatHumanGatedLine = (surface) => (
  Array.isArray(surface.humanGated) && surface.humanGated.length > 0
    ? `Human steps required: ${surface.humanGated.join(", ")}.`
    : null
);

const chapterForSurface = (surface) => {
  const lines = [`## ${surface.provider}`, ""];
  lines.push(`Kind: ${surface.kind}. Enterprise: ${surface.enterprise}.`);
  lines.push(formatPayRateLine(surface));
  lines.push(`No-purchase: ${formatRequiresPurchase(surface.requiresPurchase)}. No-KYC: ${formatNoKyc(surface.requiresIdentity)} (requires: ${surface.requiresIdentity}).`);
  const gated = formatHumanGatedLine(surface);
  if (gated) lines.push(gated);
  const referral = formatReferralLine(surface);
  if (referral) lines.push(referral);
  lines.push(`Source: ${surface.sourceUrl} (measured ${surface.measuredAt}).`);
  return lines.join("\n");
};

const openingChapter = (enterprise) => [
  "## Reading this guide",
  "",
  'Two tiers filter every row below. **No-purchase** means you never spend money to earn through a surface. **No-KYC** means the surface never asks for a phone number, a government ID, a bank account, or a card — an email address is the most it asks. A surface can be in neither, either, or both tiers; the row says which, and "unknown" means the tier was never confirmed, so the surface is shown in neither tier rather than guessed into one.',
  "",
  "Referral disclosure: where a surface pays the 561 Group for a signup made through this guide's own link, that is stated plainly on the surface's own row, alongside what the surface pays you. No row hides a referral inside a rate.",
  `This chapter covers the No Buy ${enterprise === "ai" ? "AI" : "Crypto"} surfaces.`,
].join("\n");

/**
 * Derives one ordered set of guide-chapter Markdown strings for one No Buy enterprise from a surface catalog: an opening chapter stating the tiers and the referral disclosure in plain words, then one chapter per surface of that enterprise, ordered by identity cost ascending then by whether a pay rate is known, never by referral.
 * @param {object} request A record with `catalog` (a NoBuySurfaceCatalog) and `enterprise` ("crypto" | "ai").
 * @returns {object} `{enterprise, chapters: string[]}` — chapters[0] is the opening chapter; the rest are one Markdown chapter per admitted surface, in the stated order.
 * @throws {TypeError} When request.catalog does not carry a surfaces array, or request.enterprise is not "crypto" or "ai".
 */
export function deriveSetOfGuideChaptersFromCatalog(request) {
  if (!request || typeof request !== "object" || !Array.isArray(request.catalog?.surfaces)) {
    throw new TypeError("request.catalog must carry a surfaces array");
  }
  if (request.enterprise !== "crypto" && request.enterprise !== "ai") {
    throw new TypeError('request.enterprise must be "crypto" or "ai"');
  }
  const surfaces = request.catalog.surfaces
    .filter((s) => s.enterprise === request.enterprise)
    .slice()
    .sort((a, b) => {
      const identity = (IDENTITY_RANK[a.requiresIdentity] ?? 6) - (IDENTITY_RANK[b.requiresIdentity] ?? 6);
      if (identity !== 0) return identity;
      const aKnown = a.unitRate === "unknown" ? 1 : 0;
      const bKnown = b.unitRate === "unknown" ? 1 : 0;
      if (aKnown !== bKnown) return aKnown - bKnown;
      return a.provider.localeCompare(b.provider);
    });
  return {
    enterprise: request.enterprise,
    chapters: [openingChapter(request.enterprise), ...surfaces.map(chapterForSurface)],
  };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveSetOfGuideChaptersFromCatalog — Derives one ordered set of guide-chapter Markdown strings for one No Buy enterprise from a surface catalog: an opening chapter stating the tiers and the referral disclosure in plain words, then one chapter per surface of that enterprise, ordered by identity cost ascending then by whether a pay rate is known, never by referral.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(deriveSetOfGuideChaptersFromCatalog(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-set-of-guide-chapters-from-catalog.test.mjs
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
```
## Examples
```json name="ai enterprise with one surface"
{"input":{"catalog":{"surfaces":[{"id":"groq","provider":"Groq","enterprise":"ai","kind":"inference-lane","requiresPurchase":false,"requiresIdentity":"email","humanGated":[],"unit":"requests/minute","unitRate":{"value":30,"per":"minute","observedAt":"2026-09-05","sourceUrl":"https://groq.com","evidence":"observed","text":"30 requests/minute"},"sourceUrl":"https://groq.com","measuredAt":"2026-09-05","referral":"unknown"}]},"enterprise":"ai"},"output":{"enterprise":"ai","chapters":["## Reading this guide\n\nTwo tiers filter every row below. **No-purchase** means you never spend money to earn through a surface. **No-KYC** means the surface never asks for a phone number, a government ID, a bank account, or a card — an email address is the most it asks. A surface can be in neither, either, or both tiers; the row says which, and \"unknown\" means the tier was never confirmed, so the surface is shown in neither tier rather than guessed into one.\n\nReferral disclosure: where a surface pays the 561 Group for a signup made through this guide's own link, that is stated plainly on the surface's own row, alongside what the surface pays you. No row hides a referral inside a rate.\nThis chapter covers the No Buy AI surfaces.","## Groq\n\nKind: inference-lane. Enterprise: ai.\nPay rate: 30 requests/minute per minute (observed 2026-09-05, source: https://groq.com).\nNo-purchase: no. No-KYC: yes (requires: email).\nSource: https://groq.com (measured 2026-09-05)."]}}
```
## Traceability
- `opening-chapter` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `one-chapter-per-surface` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `ordering` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `every-number-sourced` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `referral-both-sides` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `missing-catalog-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `bad-enterprise-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
