#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

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
  const result = await runJavascriptNodeOperation({ name: "derive-set-of-guide-chapters-from-catalog", description: "Derives one ordered set of guide-chapter Markdown strings for one No Buy enterprise from a surface catalog: an opening chapter stating the tiers and the referral disclosure in plain words, then one chapter per surface of that enterprise, ordered by identity cost ascending then by whether a pay rate is known, never by referral.", operation: deriveSetOfGuideChaptersFromCatalog }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
