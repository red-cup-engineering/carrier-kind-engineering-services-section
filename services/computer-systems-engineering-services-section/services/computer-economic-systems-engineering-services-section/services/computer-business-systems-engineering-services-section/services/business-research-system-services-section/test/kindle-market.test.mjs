import test from "node:test";
import assert from "node:assert/strict";
import { admitKindleMarketSnapshot, analyzeKindleMarket, deriveMarketGapStudy, extractKindleBestsellers, scoreKindleNiches } from "../src/kindle-market.mjs";

const html = `<li data-asin="B000000001" data-series="true"><span data-field="rank">#100</span><b data-field="title">Warm Harbor</b><span data-field="price">$3.99</span><span data-field="pages">280 pages</span><span data-field="reviews">1,250</span><span data-field="rating">4.5</span><time data-field="publication-date">2026-06-01</time><i data-category="small-town romance"></i><i data-quality="slow-burn"></i></li>
<li data-asin="B000000002"><span data-field="rank">unknown</span><b data-field="title">Cold Harbor</b><i data-category="small-town romance"></i><i data-quality="closed-door"></i></li>`;

test("category observations become a content-addressed snapshot and unknowns stay unknown", () => {
  const snapshot = admitKindleMarketSnapshot({ category: "romance", source: { textDigest: "ni:///sha-256;x" }, observedAt: "2026-09-29T00:00:00Z", html });
  assert.match(snapshot.id, /^ni:\/\/\/sha-256;/u);
  assert.equal(snapshot.content.books[1].rank, null);
  const [opportunity] = scoreKindleNiches([snapshot]);
  assert.equal(opportunity.niche, "small-town romance");
  assert.ok(opportunity.uncertainty.unknown.includes("owned-sales-feedback"));
  assert.notEqual(opportunity.evidence.estimatedDailySales, 0);
});

test("snapshots derive rather than hand-code the existing MarketGapStudy input", () => {
  const snapshot = admitKindleMarketSnapshot({ category: "romance", source: {}, observedAt: "2026-09-29T00:00:00Z", html });
  const result = deriveMarketGapStudy([snapshot], [{ id: "slow-closed", wants: ["slow-burn", "closed-door"], evidence: { for: [{ source: snapshot.id }], against: [] } }]);
  assert.equal(result.study.works.length, 2);
  assert.deepEqual(result.study.works.map(({ id }) => id), ["B000000001", "B000000002"]);
  const analysis = analyzeKindleMarket({ snapshots: [snapshot], demands: result.study.demands, analyzedAt: "2026-09-29T00:01:00Z" });
  assert.match(analysis.id, /^ni:\/\/\/sha-256;/u);
  assert.deepEqual(analysis.content.snapshots, [snapshot.id]);
  assert.equal(analysis.content.opportunities[0].uncertainty.coverage, 1);
});

test("typical Amazon bestseller-card markup keeps unavailable facts unknown", () => {
  const observed = extractKindleBestsellers(`<div data-asin="B000000003"><img alt="Harbor &amp; Home"><span class="a-price"><span class="a-offscreen">$4.99</span></span><span aria-label="4.7 out of 5 stars"></span><span aria-label="2,345 ratings"></span></div>`);
  assert.deepEqual(observed[0], { asin: "B000000003", title: "Harbor & Home", rank: 1, priceUsd: 4.99, pageCount: null, reviewCount: 2345, rating: 4.7, publicationDate: null, categories: [], qualities: [], series: false });
});
