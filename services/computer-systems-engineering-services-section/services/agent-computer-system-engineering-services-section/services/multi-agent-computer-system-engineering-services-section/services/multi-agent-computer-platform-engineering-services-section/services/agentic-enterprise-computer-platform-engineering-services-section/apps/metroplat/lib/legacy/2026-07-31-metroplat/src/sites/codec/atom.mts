/**
 * codecs/text/xml/atom - Article content records projected as Atom 1.0.
 *
 * @packageDocumentation
 */
import { document, element, type XmlElement } from "../../lib/codecs/xml-svg/core.mts";

export interface FeedAuthor {
  readonly name: string;
  readonly uri?: string;
  readonly email?: string;
}

export interface ArticleFeedMeta {
  readonly id?: string;
  readonly title: string;
  readonly homePageUrl?: string;
  readonly websiteUrl?: string;
  readonly feedUrl?: string;
  readonly description?: string;
  readonly language?: string;
  readonly author?: string | FeedAuthor;
  readonly updated?: string;
}

export interface ArticleContent {
  readonly title: string;
  readonly slug: string;
  readonly author: string;
  readonly date: string;
  readonly updated?: string;
  readonly excerpt?: string;
  readonly metaDescription?: string;
  readonly description?: string;
  readonly summary?: string;
  readonly keywords?: readonly string[];
  readonly categories?: readonly string[];
  readonly tags?: readonly string[];
  readonly license?: string;
  readonly license_url?: string;
  readonly sources?: readonly { readonly url: string; readonly title?: string; readonly source?: string }[];
  readonly body: string;
  readonly url?: string;
  readonly canonicalUrl?: string;
  readonly koios?: { readonly original_permalink?: string };
}

const ATOM_NS = "http://www.w3.org/2005/Atom";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
const EPOCH = "1970-01-01T00:00:00.000Z";

function nonEmpty(value: string | undefined, label: string): string {
  if (value === undefined || value.trim() === "") throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function articleUrl(feedMeta: ArticleFeedMeta, article: ArticleContent): string {
  if (article.url !== undefined && article.url.trim() !== "") return article.url;
  if (article.canonicalUrl !== undefined && article.canonicalUrl.trim() !== "") return article.canonicalUrl;
  if (article.koios?.original_permalink !== undefined && article.koios.original_permalink.trim() !== "") return article.koios.original_permalink;
  const root = feedMeta.websiteUrl ?? feedMeta.homePageUrl;
  if (root === undefined || root.trim() === "") return article.slug;
  return `${trimSlash(root)}/${article.slug.replace(/^\/+/u, "")}`;
}

function isoDateTime(value: string | undefined, label: string): string {
  const candidate = nonEmpty(value, label);
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${label}: expected an ISO-compatible date`);
  return date.toISOString();
}

function articlePublished(article: ArticleContent): string {
  return isoDateTime(article.date, `article ${article.slug} date`);
}

function articleUpdated(article: ArticleContent): string {
  return isoDateTime(article.updated ?? article.date, `article ${article.slug} updated`);
}

function latestUpdated(feedMeta: ArticleFeedMeta, articles: readonly ArticleContent[]): string {
  if (feedMeta.updated !== undefined) return isoDateTime(feedMeta.updated, "feed updated");
  let latest = EPOCH;
  for (const article of articles) {
    const updated = articleUpdated(article);
    if (updated > latest) latest = updated;
  }
  return latest;
}

function articleSummary(article: ArticleContent): string | undefined {
  return article.summary ?? article.description ?? article.metaDescription ?? article.excerpt;
}

function feedAuthor(author: string | FeedAuthor | undefined): XmlElement | null {
  if (author === undefined) return null;
  const normalized = typeof author === "string" ? { name: author } : author;
  return element("author", {}, [
    element("name", {}, [normalized.name]),
    normalized.uri === undefined ? null : element("uri", {}, [normalized.uri]),
    normalized.email === undefined ? null : element("email", {}, [normalized.email]),
  ]);
}

function articleAuthor(article: ArticleContent): XmlElement {
  return element("author", {}, [element("name", {}, [article.author])]);
}

function sortedArticles(articles: readonly ArticleContent[]): ArticleContent[] {
  return [...articles].sort((left, right) => {
    const byUpdated = articleUpdated(right).localeCompare(articleUpdated(left));
    if (byUpdated !== 0) return byUpdated;
    const bySlug = left.slug.localeCompare(right.slug);
    return bySlug !== 0 ? bySlug : left.title.localeCompare(right.title);
  });
}

function entry(feedMeta: ArticleFeedMeta, article: ArticleContent): XmlElement {
  const url = articleUrl(feedMeta, article);
  const summary = articleSummary(article);
  return element("entry", {}, [
    element("title", {}, [article.title]),
    element("id", {}, [url]),
    element("link", { rel: "alternate", href: url }),
    element("published", {}, [articlePublished(article)]),
    element("updated", {}, [articleUpdated(article)]),
    articleAuthor(article),
    summary === undefined ? null : element("summary", { type: "text" }, [summary]),
    element("content", { type: "text" }, [article.body]),
    ...(article.tags ?? article.categories ?? []).map((term) => element("category", { term })),
    article.license_url === undefined ? null : element("link", { rel: "license", href: article.license_url }),
    ...(article.sources ?? []).map((source) => element("link", {
      rel: "via",
      href: source.url,
      title: source.title ?? source.source,
    })),
    article.license === undefined ? null : element("rights", {}, [article.license]),
  ]);
}

/** Project Article content records to an Atom 1.0 XML document. */
export function articlesToAtom(feedMeta: ArticleFeedMeta, articles: readonly ArticleContent[]): string {
  const homePageUrl = feedMeta.homePageUrl ?? feedMeta.websiteUrl;
  const feedId = feedMeta.id ?? feedMeta.feedUrl ?? homePageUrl ?? feedMeta.title;
  const feed = element("feed", { xmlns: ATOM_NS, "xml:lang": feedMeta.language }, [
    element("title", {}, [feedMeta.title]),
    element("id", {}, [feedId]),
    element("updated", {}, [latestUpdated(feedMeta, articles)]),
    homePageUrl === undefined ? null : element("link", { rel: "alternate", href: homePageUrl }),
    feedMeta.feedUrl === undefined ? null : element("link", { rel: "self", href: feedMeta.feedUrl, type: "application/atom+xml" }),
    feedAuthor(feedMeta.author),
    feedMeta.description === undefined
      ? null
      : element("subtitle", { type: "xhtml" }, [element("div", { xmlns: XHTML_NS }, [feedMeta.description])]),
    ...sortedArticles(articles).map((article) => entry(feedMeta, article)),
  ]);
  return document(feed, { declaration: true });
}
