/**
 * codecs/text/xml/sitemap - URL and Article collection projections into sitemap XML.
 *
 * The builders here are pure string projections over settled Article material:
 * they sort by projected URL, skip drafts by default, and rely on the XML core
 * writer for escaping and well-formed serialization.
 */
import type { Article } from "../article/index.mts";
import { document, element, type XmlElement } from "@red-cup-engineering/xml-document-rendering-service";

const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
const NEWS_NS = "http://www.google.com/schemas/sitemap-news/0.9";

export interface ArticleSitemapOptions {
  readonly websiteUrl: string;
  readonly pathPrefix?: string;
  readonly includeDrafts?: boolean;
  readonly changefreq?: string;
  readonly priority?: number;
}

export interface ArticleNewsSitemapOptions extends ArticleSitemapOptions {
  readonly publicationName: string;
  readonly publicationLanguage?: string;
}

interface SitemapEntry {
  readonly article: Article;
  readonly loc: string;
  readonly lastmod: string;
}

export interface SitemapUrlEntry {
  readonly loc: string;
  readonly lastmod?: string;
  readonly draft?: boolean;
}

function publishedArticles(articles: Iterable<Article>, includeDrafts: boolean): Article[] {
  return Array.from(articles).filter((article) => includeDrafts || !article.draft);
}

function cleanPathSegment(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function articlePath(article: Article, pathPrefix = ""): string {
  const prefix = cleanPathSegment(pathPrefix);
  const slug = cleanPathSegment(article.slug);
  return `/${[prefix, slug].filter(Boolean).join("/")}`;
}

function articleUrl(article: Article, options: ArticleSitemapOptions): string {
  return new URL(articlePath(article, options.pathPrefix), options.websiteUrl).toString();
}

function articleLastmod(article: Article): string {
  return article.updated ?? article.date;
}

function sitemapEntries(articles: Iterable<Article>, options: ArticleSitemapOptions): SitemapEntry[] {
  return publishedArticles(articles, options.includeDrafts ?? false)
    .map((article) => ({
      article,
      loc: articleUrl(article, options),
      lastmod: articleLastmod(article),
    }))
    .sort((a, b) => a.loc.localeCompare(b.loc));
}

function standardUrl(entry: SitemapEntry, options: ArticleSitemapOptions): XmlElement {
  return element("url", {}, [
    element("loc", {}, [entry.loc]),
    element("lastmod", {}, [entry.lastmod]),
    options.changefreq === undefined ? null : element("changefreq", {}, [options.changefreq]),
    options.priority === undefined ? null : element("priority", {}, [String(options.priority)]),
  ]);
}

function standardUrlEntry(entry: SitemapUrlEntry, options: ArticleSitemapOptions): XmlElement {
  return element("url", {}, [
    element("loc", {}, [entry.loc]),
    entry.lastmod === undefined ? null : element("lastmod", {}, [entry.lastmod]),
    options.changefreq === undefined ? null : element("changefreq", {}, [options.changefreq]),
    options.priority === undefined ? null : element("priority", {}, [String(options.priority)]),
  ]);
}

function newsUrl(entry: SitemapEntry, options: ArticleNewsSitemapOptions): XmlElement {
  return element("url", {}, [
    element("loc", {}, [entry.loc]),
    element("news:news", {}, [
      element("news:publication", {}, [
        element("news:name", {}, [options.publicationName]),
        element("news:language", {}, [options.publicationLanguage ?? "en"]),
      ]),
      element("news:publication_date", {}, [entry.article.date]),
      element("news:title", {}, [entry.article.title]),
    ]),
  ]);
}

export function articlesToSitemap(articles: Iterable<Article>, options: ArticleSitemapOptions): string {
  return document(
    element("urlset", { xmlns: SITEMAP_NS }, sitemapEntries(articles, options).map((entry) => standardUrl(entry, options))),
    { declaration: true },
  );
}

export function urlsToSitemap(entries: Iterable<SitemapUrlEntry>, options: ArticleSitemapOptions): string {
  const includeDrafts = options.includeDrafts ?? false;
  const urls = Array.from(entries)
    .filter((entry) => includeDrafts || !(entry.draft ?? false))
    .sort((left, right) => left.loc.localeCompare(right.loc));
  return document(
    element("urlset", { xmlns: SITEMAP_NS }, urls.map((entry) => standardUrlEntry(entry, options))),
    { declaration: true },
  );
}

export function articlesToNewsSitemap(articles: Iterable<Article>, options: ArticleNewsSitemapOptions): string {
  return document(
    element("urlset", { xmlns: SITEMAP_NS, "xmlns:news": NEWS_NS }, sitemapEntries(articles, options).map((entry) => newsUrl(entry, options))),
    { declaration: true },
  );
}
