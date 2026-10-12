# derive-set-of-surfaces-from-measurement
## Requirements
- `group-by-product`: The operation groups every row across all input measurement records by its `product` field into one surface per distinct product.
- `enterprise-classification`: The operation classifies each surface as `"crypto"` or `"ai"` from a fixed named-provider list and inference/LLM keyword matching over its rows' arena, capability, and normalized_value text.
- `kind-classification`: The operation classifies each surface's `kind` by majority vote of pattern matches over its rows' arena, capability, and normalized_value text, `"unknown"` when no row matches any pattern.
- `tier-field-aggregation`: The operation aggregates `requiresPurchase` conservatively (true if any row says true; false only if every stated row says false; unknown otherwise) and `requiresIdentity` to the most identity-demanding stated value across its rows.
- `rate-and-cap-lift`: The operation lifts a representative `unitRate` and `caps` from the rows that state a parseable numeric rate, carrying `observedAt` and `sourceUrl` per value; `"unknown"` when no row does.
- `referral-lift`: The operation lifts a `referral` object from a row's own inline `referral` field when its `program` is not `"unknown"`, else from a matching `referralPrograms` table entry, else `"unknown"`.
- `never-guess`: A field no contributing row states is the literal string `"unknown"`, never a guess.
## Prohibitions
- `missing-rows-refusal`: The operation must refuse an input that is not a non-empty array of records each carrying a `rows` array.
## Laws
- `no-buy-surface-schema` | personal-no-buy-intelligence-systems-services-section | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/personal-computer-systems-services-section/services/personal-intelligence-systems-services-section/services/personal-no-buy-intelligence-systems-services-section/data/records/schema/no-buy-surface.schema.json | Applies to the shape of every surface object this operation returns. | The record's properties, requiredness, and value shapes are the NoBuySurface JSON Schema (draft 2020-12) at the cited path.
- `scripts-import-scripts-and-src` | org-layering.md / import-stratification.md | v1 | .claude/rules/import-stratification.md | Applies to how this operation's own source file may be structured. | "scripts can import scripts and src. scripts cannot import apps." This operation imports no other package at all, so it trivially satisfies the stratification law.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/derive-set-of-surfaces-from-measurement-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/derive-set-of-surfaces-from-measurement.mjs
#!/usr/bin/env node

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

const slugify = (name) => (
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "surface"
);

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
      id: slugify(product),
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
  if (process.argv.includes("--help")) {
    process.stdout.write("deriveSetOfSurfacesFromMeasurement — Derives one No Buy surface catalog from one or more measurement records, grouping every row by its product into one surface each. A field no contributing row states is the literal string \"unknown\", never guessed; requiresPurchase and requiresIdentity aggregate conservatively toward the tier that would exclude the surface (see the schema's per-field description).\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(deriveSetOfSurfacesFromMeasurement(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/derive-set-of-surfaces-from-measurement.test.mjs
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
```
## Examples
```json name="two surfaces from one record"
{"input":[{"type":"T","measuredAt":"2026-09-05","rows":[{"product":"Groq","arena":"inference-lane","capability":"free tier requests per minute","normalized_value":"30 requests/minute","unit":"requests/minute","exact_source_language":"30 requests per minute on the free tier","source_url":"https://groq.com/pricing","observed_at":"2026-09-05T00:00:00Z","evidence_kind":"observed","confidence":"high","requiresPurchase":false,"requiresIdentity":"email"}]}],"output":{"type":"NoBuySurfaceCatalog","measurementSources":[{"type":"T","measuredAt":"2026-09-05"}],"surfaces":[{"id":"groq","enterprise":"ai","kind":"inference-lane","provider":"Groq","sourceUrl":"https://groq.com/pricing","measuredAt":"2026-09-05T00:00:00Z","requiresPurchase":false,"requiresIdentity":"email","unit":"requests/minute","unitRate":{"value":30,"per":"minute","observedAt":"2026-09-05T00:00:00Z","sourceUrl":"https://groq.com/pricing","evidence":"observed","text":"30 requests/minute"},"caps":{"perDay":"unknown","perWindow":30,"windowSeconds":60,"resetsAt":"unknown","timezone":"unknown","observedAt":"2026-09-05T00:00:00Z","sourceUrl":"https://groq.com/pricing"},"payoutRail":"unknown","custody":"unknown","automationTerms":{"botsAllowed":"unknown","multipleAccounts":"unknown","quote":"unknown","sourceUrl":"unknown"},"humanGated":[],"referral":"unknown"}]}}
```
## Traceability
- `group-by-product` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `enterprise-classification` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `kind-classification` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `tier-field-aggregation` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `rate-and-cap-lift` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `referral-lift` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `never-guess` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `no-buy-surface-schema`, `node-esm-operation`
- `missing-rows-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
