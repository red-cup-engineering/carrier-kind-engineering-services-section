#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-operation-engineering-services-section/operation";
import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";

const AI_PRODUCT_NAMES = new Set([
  "groq", "openrouter", "github models", "nvidia nim", "gemini",
  "workers ai", "cloudflare workers ai", "ollama", "openclaw", "litellm",
  "portkey", "open webui", "jan", "lm studio",
]);

const IDENTITY_RANK = { none: 0, email: 1, phone: 2, card: 3, bank: 4, "government-id": 5 };

const KIND_PATTERNS = [
  [/inference|llm|chat completion|tokens\/day|requests\/(minute|day|month)|completions\/month|api credits/i, "inference-lane"],
  [/neuron|image.*generation|image-lane/i, "image-lane"],
  [/\bollama\b|local runtime|self.?hosted/i, "local-runtime"],
  [/\bfaucet\b/i, "faucet"],
  [/\bbridge\b|\bswap\b/i, "bridge"],
  [/\bcuration\b|\bcurate\b|\bvote\b/i, "curation"],
  [/\bposting\b|\bpost\b|\bcomment\b|\bblog\b/i, "posting"],
  [/learn.to.earn|learning reward|\bquiz\b|\blesson\b/i, "learn-to-earn"],
  [/\bpoll\b|\bads?\b|attention|\bwatch\b|\btask\b|\bsurvey\b/i, "earn-by-attention"],
];

const classifyEnterprise = (product, text) => {
  const lower = product.toLowerCase();
  if (AI_PRODUCT_NAMES.has(lower)) return "ai";
  if (/\binference\b|\bllm\b|\bgpt\b|chat completion|\bapi\b.*model/i.test(text)) return "ai";
  return "crypto";
};

const classifyKind = (rows) => {
  const votes = new Map();
  for (const row of rows) {
    const text = `${row.arena ?? ""} ${row.capability ?? ""} ${row.normalized_value ?? ""}`;
    const match = KIND_PATTERNS.find(([pattern]) => pattern.test(text));
    if (!match) continue;
    votes.set(match[1], (votes.get(match[1]) ?? 0) + 1);
  }
  if (votes.size === 0) return "unknown";
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const aggregateRequiresPurchase = (rows) => {
  const defined = rows.map((r) => r.requiresPurchase).filter((v) => v === true || v === false);
  if (defined.includes(true)) return true;
  if (defined.length > 0 && defined.every((v) => v === false)) return false;
  return "unknown";
};

const aggregateRequiresIdentity = (rows) => {
  let worst = null;
  for (const row of rows) {
    const value = row.requiresIdentity;
    if (typeof value !== "string" || !(value in IDENTITY_RANK)) continue;
    if (worst === null || IDENTITY_RANK[value] > IDENTITY_RANK[worst]) worst = value;
  }
  return worst ?? "unknown";
};

const parseLeadingNumber = (text) => {
  if (typeof text !== "string") return null;
  const match = text.match(/^[~≈]?\s*\$?([\d,]+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
};

const derivePer = (unit) => {
  const slash = unit.match(/\/(.+)$/);
  if (slash) return slash[1].trim();
  const per = unit.match(/\bper\s+(.+)$/i);
  if (per) return per[1].trim();
  return "unknown";
};

const evidenceOf = (row) => {
  if (row.evidence_kind === "observed") return "observed";
  if (row.evidence_kind === "documented") return "published";
  return "unknown";
};

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };

const deriveUnitRate = (rows) => {
  let best = null;
  let bestRank = -1;
  for (const row of rows) {
    if (typeof row.unit !== "string" || row.unit === "unknown") continue;
    const value = parseLeadingNumber(row.normalized_value);
    if (value === null) continue;
    const rank = CONFIDENCE_RANK[row.confidence] ?? 0;
    if (rank > bestRank) { bestRank = rank; best = row; }
  }
  if (!best) return { unit: "unknown", unitRate: "unknown" };
  return {
    unit: best.unit,
    unitRate: {
      value: parseLeadingNumber(best.normalized_value),
      per: derivePer(best.unit),
      observedAt: best.observed_at ?? "unknown",
      sourceUrl: best.source_url ?? "unknown",
      evidence: evidenceOf(best),
      text: best.normalized_value ?? "unknown",
    },
  };
};

const WINDOW_SECONDS = { minute: 60, hour: 3600, day: 86400, week: 604800, month: 2592000 };

const deriveCaps = (rows) => {
  for (const row of rows) {
    if (typeof row.unit !== "string" || row.unit === "unknown") continue;
    const value = parseLeadingNumber(row.normalized_value);
    if (value === null) continue;
    const perMatch = row.unit.match(/\/(minute|hour|day|week|month)\b/i);
    if (!perMatch) continue;
    const per = perMatch[1].toLowerCase();
    return {
      perDay: per === "day" ? value : "unknown",
      perWindow: value,
      windowSeconds: WINDOW_SECONDS[per] ?? "unknown",
      resetsAt: per === "day" ? "utc-midnight" : "unknown",
      timezone: per === "day" ? "UTC" : "unknown",
      observedAt: row.observed_at ?? "unknown",
      sourceUrl: row.source_url ?? "unknown",
    };
  }
  return "unknown";
};

const PAYOUT_RAIL_PATTERNS = [
  [/lightning/i, "Lightning"],
  [/\bhbd\b/i, "HBD"],
  [/\bhive\b/i, "Hive"],
  [/base.*usdc|\busdc\b/i, "Base USDC"],
  [/paypal/i, "PayPal"],
  [/bank transfer/i, "bank transfer"],
];

const derivePayoutRail = (rows) => {
  for (const row of rows) {
    const text = `${row.result ?? ""} ${row.normalized_value ?? ""}`;
    const match = PAYOUT_RAIL_PATTERNS.find(([pattern]) => pattern.test(text));
    if (match) return match[1];
  }
  return "unknown";
};

const deriveCustody = (rows) => {
  for (const row of rows) {
    const text = `${row.result ?? ""}`;
    if (/self.?custod/i.test(text)) return "self";
    if (/custodial/i.test(text)) return "custodial";
  }
  return "unknown";
};

const deriveAutomationTerms = (rows) => {
  for (const row of rows) {
    const text = `${row.result ?? ""} ${row.exact_source_language ?? ""}`;
    if (!/\bbot(s)?\b|\bautomat/i.test(text)) continue;
    const prohibits = /not allowed|prohibit|no bots|disallow/i.test(text);
    const permits = /allow|permit/i.test(text);
    return {
      botsAllowed: prohibits ? false : permits ? true : "unknown",
      multipleAccounts: /multiple account|one account per/i.test(text)
        ? (/not allowed|prohibit|disallow/i.test(text) ? false : "unknown")
        : "unknown",
      quote: row.exact_source_language ?? "unknown",
      sourceUrl: row.source_url ?? "unknown",
    };
  }
  return { botsAllowed: "unknown", multipleAccounts: "unknown", quote: "unknown", sourceUrl: "unknown" };
};

const HUMAN_GATE_PATTERNS = [
  [/captcha/i, "captcha"],
  [/streak/i, "streak"],
  [/phone (number|verification)/i, "phone"],
  [/app.only|mobile app only/i, "app-only"],
  [/manual(ly)? claim|must claim/i, "manual-claim"],
];

const deriveHumanGated = (rows) => {
  const found = new Set();
  for (const row of rows) {
    const text = `${row.result ?? ""} ${row.exact_source_language ?? ""}`;
    for (const [pattern, tag] of HUMAN_GATE_PATTERNS) if (pattern.test(text)) found.add(tag);
  }
  return HUMAN_GATE_PATTERNS.map(([, tag]) => tag).filter((tag) => found.has(tag));
};

const projectReferralRow = (referral) => ({
  disclosed: true,
  program: typeof referral.program === "string" ? referral.program : "unknown",
  rate: typeof referral.rate === "string" ? referral.rate : "unknown",
  conditions: typeof referral.conditions === "string" ? referral.conditions : "unknown",
  payoutRail: typeof referral.payoutRail === "string" ? referral.payoutRail : "unknown",
  sourceUrl: typeof referral.sourceUrl === "string" ? referral.sourceUrl : "unknown",
});

const projectReferralProgramEntry = (entry) => ({
  disclosed: true,
  program: typeof entry.value === "string" ? entry.value : "unknown",
  rate: typeof entry.conditions === "string" ? entry.conditions : "unknown",
  conditions: typeof entry.result === "string" ? entry.result : "unknown",
  payoutRail: typeof entry.payoutRail === "string" ? entry.payoutRail : "unknown",
  sourceUrl: typeof entry.sourceUrl === "string" ? entry.sourceUrl : "unknown",
});

const deriveReferral = (rows, referralProgramsByProduct, product) => {
  for (const row of rows) {
    const referral = row.referral;
    if (referral && typeof referral === "object" && referral.program && referral.program !== "unknown") {
      return projectReferralRow(referral);
    }
  }
  const entry = referralProgramsByProduct.get(product);
  if (entry) return projectReferralProgramEntry(entry);
  return "unknown";
};

const latestObservedAt = (rows, fallback) => {
  const stamps = rows.map((r) => r.observed_at).filter((v) => typeof v === "string");
  if (stamps.length === 0) return fallback;
  return stamps.reduce((max, v) => (v > max ? v : max));
};

/**
 * Derives one No Buy surface catalog from one or more measurement records, grouping every row by its product into one surface each. A field no contributing row states is the literal string "unknown", never guessed; requiresPurchase and requiresIdentity aggregate conservatively toward the tier that would exclude the surface (see the schema's per-field description).
 * @param {object[]} measurementRecords One or more No Buy measurement records, each `{type, measuredAt, rows: object[], referralPrograms?: object[]}`.
 * @returns {object} A NoBuySurfaceCatalog: `{type: "NoBuySurfaceCatalog", measurementSources: {type, measuredAt}[], surfaces: object[]}`, each surface conforming to no-buy-surface.schema.json, sorted by id.
 * @throws {TypeError} When measurementRecords is not a non-empty array of records each carrying a rows array.
 */
export function deriveSetOfSurfacesFromMeasurement(measurementRecords) {
  if (!Array.isArray(measurementRecords) || measurementRecords.length === 0
    || measurementRecords.some((r) => !r || typeof r !== "object" || !Array.isArray(r.rows))) {
    throw new TypeError("measurementRecords must be a non-empty array of records each carrying a rows array");
  }

  const byProduct = new Map();
  const referralProgramsByProduct = new Map();
  for (const record of measurementRecords) {
    for (const row of record.rows) {
      if (!row || typeof row.product !== "string") continue;
      if (!byProduct.has(row.product)) byProduct.set(row.product, []);
      byProduct.get(row.product).push(row);
    }
    for (const entry of record.referralPrograms ?? []) {
      if (entry && typeof entry.product === "string" && !referralProgramsByProduct.has(entry.product)) {
        referralProgramsByProduct.set(entry.product, entry);
      }
    }
  }

  const surfaces = [];
  for (const [product, rows] of byProduct) {
    const text = rows.map((r) => `${r.arena ?? ""} ${r.capability ?? ""} ${r.normalized_value ?? ""}`).join(" ");
    const { unit, unitRate } = deriveUnitRate(rows);
    surfaces.push({
      id: slugify(product) || "surface",
      enterprise: classifyEnterprise(product, text),
      kind: classifyKind(rows),
      provider: product,
      sourceUrl: rows[0]?.source_url ?? "unknown",
      measuredAt: latestObservedAt(rows, "unknown"),
      requiresPurchase: aggregateRequiresPurchase(rows),
      requiresIdentity: aggregateRequiresIdentity(rows),
      unit,
      unitRate,
      caps: deriveCaps(rows),
      payoutRail: derivePayoutRail(rows),
      custody: deriveCustody(rows),
      automationTerms: deriveAutomationTerms(rows),
      humanGated: deriveHumanGated(rows),
      referral: deriveReferral(rows, referralProgramsByProduct, product),
    });
  }
  surfaces.sort((a, b) => a.id.localeCompare(b.id));

  return {
    type: "NoBuySurfaceCatalog",
    measurementSources: measurementRecords.map((r) => ({ type: r.type ?? "unknown", measuredAt: r.measuredAt ?? "unknown" })),
    surfaces,
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-set-of-surfaces-from-measurement", description: "Derives one No Buy surface catalog from one or more measurement records, grouping every row by its product into one surface each.", operation: deriveSetOfSurfacesFromMeasurement }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
