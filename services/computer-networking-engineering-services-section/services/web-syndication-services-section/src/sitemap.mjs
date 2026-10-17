/**
 * sitemap -- sitemaps.org protocol 0.9: `<urlset>` (at most 50,000 URLs and 50 MiB uncompressed), each
 * `<loc>` an absolute URL under 2,048 characters, `<lastmod>` a W3C Datetime, `<changefreq>` from the
 * fixed list, `<priority>` 0.0-1.0; `<sitemapindex>` beyond the ceiling; every value XML-escaped.
 */
import { toDate } from "./dates.mjs";
import { escapeXml, isIri } from "./model.mjs";

export const MAX_URLS_PER_SITEMAP = 50_000;
export const MAX_SITEMAP_BYTES = 50 * 1024 * 1024;
const CHANGEFREQ = new Set(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]);

function loc(value, what) {
  if (!isIri(value) || !/^https?:\/\//u.test(value)) throw new TypeError(`${what} loc must be an absolute http(s) URL: ${String(value)}`);
  if (value.length > 2048) throw new TypeError(`${what} loc exceeds 2048 characters`);
  return value;
}

function urlBlock(entry) {
  if (!entry || !entry.loc) throw new TypeError("sitemap: each url requires a loc");
  let out = `  <url>\n    <loc>${escapeXml(loc(entry.loc, "sitemap"))}</loc>\n`;
  if (entry.lastmod) out += `    <lastmod>${toDate(entry.lastmod)}</lastmod>\n`;
  if (entry.changefreq !== undefined) {
    if (!CHANGEFREQ.has(entry.changefreq)) throw new TypeError(`sitemap: invalid changefreq: ${entry.changefreq}`);
    out += `    <changefreq>${entry.changefreq}</changefreq>\n`;
  }
  if (entry.priority !== undefined) {
    const p = Number(entry.priority);
    if (!(p >= 0 && p <= 1)) throw new TypeError(`sitemap: priority must be within 0.0-1.0: ${entry.priority}`);
    out += `    <priority>${p.toFixed(1)}</priority>\n`;
  }
  return `${out}  </url>\n`;
}

/** A `<urlset>`. */
export function sitemap(urls = []) {
  if (urls.length > MAX_URLS_PER_SITEMAP) throw new RangeError(`sitemap: ${urls.length} URLs exceeds the ${MAX_URLS_PER_SITEMAP} per-file limit; split and use sitemapIndex`);
  const out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(urlBlock).join("")}</urlset>\n`;
  if (Buffer.byteLength(out) > MAX_SITEMAP_BYTES) throw new RangeError("sitemap: exceeds 50 MiB uncompressed; split it");
  return out;
}

/** A `<sitemapindex>` of sitemap files. */
export function sitemapIndex(sitemaps = []) {
  if (sitemaps.length > MAX_URLS_PER_SITEMAP) throw new RangeError(`sitemap: an index holds at most ${MAX_URLS_PER_SITEMAP} sitemaps`);
  const body = sitemaps.map((s) => {
    if (!s || !s.loc) throw new TypeError("sitemapIndex: each entry requires a loc");
    return `  <sitemap>\n    <loc>${escapeXml(loc(s.loc, "sitemapIndex"))}</loc>\n${s.lastmod ? `    <lastmod>${toDate(s.lastmod)}</lastmod>\n` : ""}  </sitemap>\n`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</sitemapindex>\n`;
}

/** Split URLs into files of at most `size` (default the 50,000 ceiling). */
export function splitSitemaps(urls = [], size = MAX_URLS_PER_SITEMAP) {
  if (!Number.isInteger(size) || size < 1 || size > MAX_URLS_PER_SITEMAP) throw new RangeError(`sitemap: chunk size must be within 1..${MAX_URLS_PER_SITEMAP}`);
  const chunks = [];
  for (let i = 0; i < urls.length; i += size) chunks.push(urls.slice(i, i + size));
  return chunks;
}
