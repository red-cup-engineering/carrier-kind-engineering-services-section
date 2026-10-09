import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { assayMarketGaps } from "./market-gap.mjs";

export const kindleMarketSnapshotType = defineSchemaType({
  $id: "org.561-group.market.amazon-kindle-snapshot.v1",
  title: "Amazon Kindle market snapshot",
  description: "A dated, content-addressed observation of bounded public Kindle category-page data; missing facts remain null.",
  type: "object", additionalProperties: false,
  required: ["type", "version", "category", "source", "observedAt", "books"],
  properties: {
    type: { const: "KindleMarketSnapshot" }, version: { const: 1 }, category: { type: "string", minLength: 1 },
    source: { type: "object" }, observedAt: { type: "string" },
    books: { type: "array", items: { type: "object" } },
  },
});

export const kindleMarketAnalysisType = defineSchemaType({
  $id: "org.561-group.market.amazon-kindle-analysis.v1", title: "Amazon Kindle market analysis",
  description: "A content-addressed FCA+FOUR study and uncertainty-carrying niche ranking derived from addressed snapshots and owned-sales evidence.",
  type: "object", additionalProperties: false, required: ["type", "version", "analyzedAt", "snapshots", "feedback", "study", "readings", "opportunities"],
  properties: {
    type: { const: "KindleMarketAnalysis" }, version: { const: 1 }, analyzedAt: { type: "string" },
    snapshots: { type: "array", items: { type: "string" } }, feedback: { type: "array", items: { type: "string" } }, study: { type: "object" }, readings: { type: "object" }, opportunities: { type: "array", items: { type: "object" } },
  },
});

const text = (value) => String(value ?? "").replace(/<[^>]+>/gu, " ").replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&#39;|&apos;/gu, "'").replace(/&nbsp;/gu, " ").replace(/\s+/gu, " ").trim();
const number = (value) => { const cleaned = String(value ?? "").replace(/[^0-9.]/gu, ""); if (!cleaned) return null; const parsed = Number(cleaned); return Number.isFinite(parsed) ? parsed : null; };
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "iu"))?.[1] ?? null;
const field = (body, name) => body.match(new RegExp(`<[^>]+data-field=["']${name}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "iu"))?.[1] ?? null;
const first = (body, patterns) => patterns.map((pattern) => body.match(pattern)?.[1]).find((value) => value !== undefined) ?? null;

/** Parse stable semantic hooks from a saved/acquired category page; absent evidence is null, not zero. */
export function extractKindleBestsellers(html) {
  const books = [];
  for (const match of String(html).matchAll(/(<[^>]+data-asin=["'][A-Z0-9]{10}["'][^>]*>)([\s\S]*?)(?=<[^>]+data-asin=["'][A-Z0-9]{10}["']|$)/giu)) {
    const [, tag, body] = match;
    const asin = attribute(tag, "data-asin");
    const title = text(field(body, "title") ?? first(body, [
      /<[^>]+class=["'][^"']*(?:line-clamp|p13n-sc-truncate)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/iu,
      /<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/iu,
    ]));
    if (!asin || !title) continue;
    const categories = [...body.matchAll(/data-category=["']([^"']+)["']/giu)].map((entry) => text(entry[1])).filter(Boolean);
    const position = books.length + 1, recordedRank = field(body, "rank");
    books.push(Object.freeze({
      asin, title,
      rank: recordedRank === null ? number(first(body, [/#\s*([\d,]+)\s+in\s+(?:the\s+)?Kindle Store/iu, /(?:^|>)\s*#\s*([\d,]+)\b/iu])) ?? position : number(recordedRank),
      priceUsd: number(field(body, "price") ?? first(body, [/(?:\$|USD\s*)([\d,.]+)/iu])),
      pageCount: number(field(body, "pages") ?? first(body, [/([\d,]+)\s+pages?\b/iu])),
      reviewCount: number(field(body, "reviews") ?? first(body, [/([\d,]+)\s+(?:ratings?|reviews?)\b/iu, /aria-label=["']([\d,]+)\s+(?:ratings?|reviews?)/iu])),
      rating: number(field(body, "rating") ?? first(body, [/([0-5](?:\.\d+)?)\s+out of 5/iu])),
      publicationDate: text(field(body, "publication-date") ?? first(body, [/(?:publication date|published)[^<:]*:?\s*<[^>]+>([^<]+)/iu])) || null,
      categories: Object.freeze([...new Set(categories)]),
      qualities: Object.freeze([...body.matchAll(/data-quality=["']([^"']+)["']/giu)].map((entry) => text(entry[1])).filter(Boolean)),
      series: /data-series=["']true["']|\bbook\s+\d+\s+of\s+\d+/iu.test(tag + body),
    }));
  }
  return Object.freeze(books);
}

export function admitKindleMarketSnapshot({ category, source, observedAt, html }) {
  const candidate = { type: "KindleMarketSnapshot", version: 1, category, source, observedAt, books: extractKindleBestsellers(html) };
  const admitted = createTypedMark(kindleMarketSnapshotType, candidate);
  if (!admitted.ok) throw new TypeError(admitted.refusal.message);
  return admitted.value;
}

/** A deliberately explicit rank curve. It is a demand proxy, not represented as observed sales. */
export function estimatedDailySales(rank, { scale = 7500, exponent = 0.82 } = {}) {
  return Number.isFinite(rank) && rank > 0 ? scale * Math.pow(rank, -exponent) : null;
}

const known = (values) => values.filter((value) => Number.isFinite(value));
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const bounded = (value) => Math.max(0, Math.min(1, value));

/** Rank niches while carrying coverage and uncertainty; no missing observation contributes a numeric zero. */
export function scoreKindleNiches(snapshots, feedback = []) {
  const groups = new Map();
  for (const snapshot of snapshots) for (const book of snapshot.content?.books ?? snapshot.books ?? []) {
    const categories = book.categories.length ? book.categories : [snapshot.content?.category ?? snapshot.category];
    for (const category of categories) { const group = groups.get(category) ?? []; group.push(book); groups.set(category, group); }
  }
  return Object.freeze([...groups].map(([niche, books]) => {
    const sales = known(books.map((book) => estimatedDailySales(book.rank)));
    const reviews = known(books.map((book) => book.reviewCount));
    const prices = known(books.map((book) => book.priceUsd));
    const pageCounts = known(books.map((book) => book.pageCount));
    const feedbackSales = known(feedback.filter((item) => item.niche === niche).map((item) => item.units));
    const demand = sales.length ? bounded(Math.log1p(sales.reduce((sum, value) => sum + value, 0)) / 8) : null;
    const competition = reviews.length ? bounded(Math.log1p(mean(reviews)) / 10) : null;
    const price = prices.length ? bounded(mean(prices) / 9.99) : null;
    const series = books.length ? books.filter((book) => book.series).length / books.length : null;
    const observed = [demand, competition, price, series].filter((value) => value !== null);
    const feedbackLift = feedbackSales.length ? bounded(Math.log1p(mean(feedbackSales)) / 5) : null;
    const score = observed.length < 4 ? null : 0.38 * demand + 0.2 * (1 - competition) + 0.17 * price + 0.17 * series + 0.08 * (feedbackLift ?? 0.5);
    return Object.freeze({ niche, score, uncertainty: Object.freeze({ coverage: observed.length / 4, unknown: Object.freeze([
      ...(sales.length ? [] : ["rank-demand"]), ...(reviews.length ? [] : ["competition"]), ...(prices.length ? [] : ["price"]), ...(books.length ? [] : ["series-readthrough"]), ...(feedbackSales.length ? [] : ["owned-sales-feedback"]),
    ]) }), evidence: Object.freeze({ books: books.length, meanPriceUsd: mean(prices), meanPageCount: mean(pageCounts), estimatedDailySales: sales.length ? sales.reduce((sum, value) => sum + value, 0) : null }) });
  }).sort((left, right) => (right.score ?? -1) - (left.score ?? -1) || left.niche.localeCompare(right.niche)));
}

/** Automatically project observations into the existing FCA+FOUR MarketGapStudy carrier. */
export function deriveMarketGapStudy(snapshots, demands, { question = "Which evidenced Kindle niche has demand that observed supply does not occupy?" } = {}) {
  const books = new Map();
  for (const snapshot of snapshots) for (const book of snapshot.content?.books ?? snapshot.books ?? []) books.set(book.asin, book);
  const works = [...books.values()].map((book) => ({ id: book.asin, title: book.title, has: book.qualities, lacks: [], sources: snapshots.filter((snapshot) => (snapshot.content?.books ?? snapshot.books ?? []).some(({ asin }) => asin === book.asin)).map((snapshot) => snapshot.id ?? snapshot.source?.textDigest) }));
  const study = Object.freeze({ type: "MarketGapStudy", version: 1, question, works, demands });
  return Object.freeze({ study, readings: assayMarketGaps(study) });
}

/** Admit the analysis product so a planner selects a niche by evidence address, not an in-memory score. */
export function analyzeKindleMarket({ snapshots, demands = [], feedback = [], analyzedAt = new Date().toISOString() }) {
  const { study, readings } = deriveMarketGapStudy(snapshots, demands);
  const opportunities = scoreKindleNiches(snapshots, feedback);
  const content = {
    type: "KindleMarketAnalysis", version: 1, analyzedAt,
    snapshots: snapshots.map((snapshot) => snapshot.id),
    feedback: [...new Set(feedback.map((item) => item.evidence).filter(Boolean))],
    study, readings, opportunities,
  };
  const admitted = createTypedMark(kindleMarketAnalysisType, content);
  if (!admitted.ok) throw new TypeError(admitted.refusal.message);
  return admitted.value;
}
