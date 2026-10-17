// sitemaps.org 0.9 and robots.txt (RFC 9309).
import assert from "node:assert/strict";
import test from "node:test";
import { MAX_URLS_PER_SITEMAP, parseXml, robots, sitemap, sitemapIndex, splitSitemaps } from "../src/index.mjs";
import { childOf, childrenOf } from "../src/xml.mjs";

test("sitemap: a urlset in the 0.9 namespace; absolute escaped loc; W3C date lastmod; fixed changefreq; priority 0.0-1.0", () => {
  const root = parseXml(sitemap([{ loc: "https://example.org/a?x=1&y=2", lastmod: "2026-06-05T23:30:00-05:00", changefreq: "daily", priority: 0.8 }, { loc: "https://example.org/b" }]));
  assert.deepEqual([root.name, root.attrs.xmlns], ["urlset", "http://www.sitemaps.org/schemas/sitemap/0.9"]);
  const [a, b] = childrenOf(root, "url");
  assert.deepEqual(["loc", "lastmod", "changefreq", "priority"].map((n) => childOf(a, n).text), ["https://example.org/a?x=1&y=2", "2026-06-06", "daily", "0.8"]);
  assert.equal(childOf(b, "lastmod"), undefined);
  assert.throws(() => sitemap([{ loc: "/relative" }]), /absolute/);
  assert.throws(() => sitemap([{ loc: "https://example.org/", changefreq: "sometimes" }]), /changefreq/);
  assert.throws(() => sitemap([{ loc: "https://example.org/", priority: 1.5 }]), /priority/);
  assert.throws(() => sitemap([{ loc: `https://example.org/${"a".repeat(2050)}` }]), /2048/);
  assert.throws(() => sitemap([{}]), /loc/);
});
test("sitemap: 50,000 URLs per file; beyond that, split and index", () => {
  const urls = Array.from({ length: MAX_URLS_PER_SITEMAP + 1 }, (_, i) => ({ loc: `https://example.org/${i}` }));
  assert.throws(() => sitemap(urls), RangeError);
  const parts = splitSitemaps(urls);
  assert.deepEqual(parts.map((p) => p.length), [MAX_URLS_PER_SITEMAP, 1]);
  assert.doesNotThrow(() => sitemap(parts[0]));
  assert.throws(() => splitSitemaps(urls, 0), RangeError);
  const index = parseXml(sitemapIndex([{ loc: "https://example.org/sitemap-1.xml", lastmod: "2026-06-05T00:00:00Z" }]));
  assert.equal(index.name, "sitemapindex");
  assert.equal(childOf(childOf(index, "sitemap"), "loc").text, "https://example.org/sitemap-1.xml");
});
test("robots.txt: grouped User-agent lines and rules; Sitemap lines are absolute; no line injection", () => {
  assert.equal(robots(), "User-agent: *\nAllow: /\n");
  assert.equal(robots({ groups: [{ userAgent: "*", disallow: ["/admin", "private"] }, { userAgent: ["Googlebot", "Bingbot"], allow: ["/"], crawlDelay: 2 }], sitemap: "https://example.org/sitemap.xml" }),
    "User-agent: *\nDisallow: /admin\nDisallow: /private\n\nUser-agent: Googlebot\nUser-agent: Bingbot\nAllow: /\nCrawl-delay: 2\n\nSitemap: https://example.org/sitemap.xml\n");
  assert.equal(robots({ groups: [{ userAgent: "*" }] }), "User-agent: *\nDisallow:\n");
  assert.throws(() => robots({ sitemap: "/sitemap.xml" }), /absolute/);
  assert.throws(() => robots({ groups: [{ userAgent: "bot\nDisallow: /", disallow: ["/"] }] }), /line break/);
});
