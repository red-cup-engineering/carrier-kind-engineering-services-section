/**
 * codecs/text/json/schema-org - schema.org JSON-LD projections.
 *
 * This codec reads package content records into schema.org boundary material without
 * fetching, writing, or enriching from outside those records.
 *
 * @packageDocumentation
 */
import { articleContract, type Article } from "../article/index.mts";
import { pageContract, type Page } from "../page/index.mts";

export const SCHEMA_ORG_CONTEXT = "https://schema.org" as const;
export const ARTICLE_TYPE = "Article" as const;
export const BLOG_POSTING_TYPE = "BlogPosting" as const;
export const NEWS_ARTICLE_TYPE = "NewsArticle" as const;
export const WEB_PAGE_TYPE = "WebPage" as const;
export const WEB_SITE_TYPE = "WebSite" as const;
export const ORGANIZATION_TYPE = "Organization" as const;
export const COLLECTION_PAGE_TYPE = "CollectionPage" as const;
export const BREADCRUMB_LIST_TYPE = "BreadcrumbList" as const;

export type JsonLdScalar = string | number | boolean | null;
export type JsonLdValue = JsonLdScalar | JsonLdObject | readonly JsonLdValue[];

export interface JsonLdObject {
  readonly [key: string]: JsonLdValue | undefined;
}

export interface SchemaOrgPersonJsonLd {
  readonly "@id"?: string;
  readonly "@type": "Person";
  readonly name: string;
}

export interface ArticleJsonLd {
  readonly "@context": typeof SCHEMA_ORG_CONTEXT;
  readonly "@type": typeof ARTICLE_TYPE | typeof BLOG_POSTING_TYPE;
  readonly "@id"?: string;
  readonly url?: string;
  readonly mainEntityOfPage?: string;
  readonly headline: string;
  readonly name: string;
  readonly datePublished: string;
  readonly dateModified: string;
  readonly author: SchemaOrgPersonJsonLd;
  readonly articleSection?: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly articleBody: string;
  readonly about?: readonly JsonLdObject[];
  readonly citation?: readonly string[];
  readonly license?: string;
  readonly isAccessibleForFree: true;
}

export interface NewsArticleJsonLd extends Omit<ArticleJsonLd, "@type" | "articleSection"> {
  readonly "@type": typeof NEWS_ARTICLE_TYPE;
  readonly articleSection: string;
}

export interface WebPageJsonLd {
  readonly "@context": typeof SCHEMA_ORG_CONTEXT;
  readonly "@type": typeof WEB_PAGE_TYPE;
  readonly "@id"?: string;
  readonly url?: string;
  readonly name: string;
  readonly headline: string;
  readonly datePublished?: string;
  readonly author?: SchemaOrgPersonJsonLd;
  readonly description?: string;
}

export interface OrganizationJsonLd {
  readonly "@context": typeof SCHEMA_ORG_CONTEXT;
  readonly "@type": typeof ORGANIZATION_TYPE;
  readonly "@id": string;
  readonly name: string;
  readonly url?: string;
}

export interface WebSiteJsonLd {
  readonly "@context": typeof SCHEMA_ORG_CONTEXT;
  readonly "@type": typeof WEB_SITE_TYPE;
  readonly "@id": string;
  readonly url: string;
  readonly name: string;
  readonly description?: string;
  readonly inLanguage?: string;
  readonly publisher?: OrganizationJsonLd;
}

export interface CollectionPageJsonLd {
  readonly "@context": typeof SCHEMA_ORG_CONTEXT;
  readonly "@type": typeof COLLECTION_PAGE_TYPE;
  readonly "@id"?: string;
  readonly url: string;
  readonly name: string;
  readonly description?: string;
  readonly about: JsonLdObject;
  readonly isPartOf?: JsonLdObject;
  readonly mainEntity?: JsonLdObject;
}

export interface BreadcrumbListJsonLd {
  readonly "@context": typeof SCHEMA_ORG_CONTEXT;
  readonly "@type": typeof BREADCRUMB_LIST_TYPE;
  readonly "@id"?: string;
  readonly itemListElement: readonly JsonLdObject[];
}

export interface JsonLdGraphDocument {
  readonly "@context": typeof SCHEMA_ORG_CONTEXT;
  readonly "@graph": readonly JsonLdObject[];
}

export interface ArticleJsonLdOptions {
  readonly type?: typeof ARTICLE_TYPE | typeof BLOG_POSTING_TYPE;
  readonly id?: string;
  readonly url?: string;
  readonly authorId?: string;
  readonly termRefs?: readonly JsonLdObject[];
}

export interface WebPageJsonLdOptions {
  readonly id?: string;
  readonly url?: string;
  readonly authorId?: string;
  readonly authorName?: string;
  readonly description?: string;
}

export interface SchemaOrgWebsiteContext {
  readonly websiteUrl: string;
  readonly title: string;
  readonly description?: string;
  readonly language?: string;
  readonly author?: string;
  readonly websiteName?: string;
  readonly organizationId?: string;
  readonly websiteId?: string;
}

export interface SchemaOrgTermPageContext {
  readonly term: string;
  readonly url: string;
  readonly id?: string;
  readonly termId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly dimension?: string;
  readonly websiteId?: string;
  readonly itemUrls?: readonly string[];
}

export interface BreadcrumbJsonLdOptions {
  readonly websiteUrl?: string;
  readonly rootName?: string;
  readonly names?: Readonly<Record<string, string>>;
  readonly id?: string;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function firstText(values: readonly (string | undefined)[], fallback: string): string {
  return values.map(clean).find((value): value is string => value !== undefined) ?? fallback;
}

function uniqueText(values: readonly (string | undefined)[]): readonly string[] {
  return Object.freeze([...new Set(values.map(clean).filter((value): value is string => value !== undefined))]);
}

function articleUrl(article: Article): string | undefined {
  return clean(article.url) ?? clean(article.canonicalUrl) ?? clean(article.koios?.original_permalink);
}

function citations(article: Article): readonly string[] {
  return uniqueText([
    ...(article.references ?? []).map((reference) => reference.URL),
    ...(article.citations ?? []).map((reference) => reference.URL),
    ...(article.sources ?? []).map((source) => source.url),
  ]);
}

function articleSection(article: Article): string | undefined {
  return clean(firstText([
    article.section,
    article.beat,
    article.koios?.beat,
    article.categories?.[0],
  ], ""));
}

function articleJsonLdBase(article: Article, opts: ArticleJsonLdOptions): Omit<ArticleJsonLd, "@type"> {
  const admitted = articleContract.assert(article, "article") as Article;
  const headline = firstText([admitted.koios?.headline, admitted.title], admitted.title);
  const url = clean(opts.url) ?? articleUrl(admitted);
  const citation = citations(admitted);
  const id = clean(opts.id);
  const authorId = clean(opts.authorId);
  const keywords = uniqueText([
    ...(admitted.keywords ?? []),
    ...(admitted.tags ?? []),
    ...(admitted.categories ?? []),
    admitted.seoTerm,
    admitted.koios?.seo_term,
  ]);
  const section = articleSection(admitted);

  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    ...(id === undefined ? {} : { "@id": id }),
    ...(url === undefined ? {} : { url, mainEntityOfPage: url }),
    headline,
    name: headline,
    datePublished: admitted.date,
    dateModified: admitted.updated ?? admitted.date,
    author: Object.freeze({
      ...(authorId === undefined ? {} : { "@id": authorId }),
      "@type": "Person" as const,
      name: admitted.author,
    }),
    ...(section === undefined ? {} : { articleSection: section }),
    keywords: keywords.length === 0 ? Object.freeze([headline]) : keywords,
    description: firstText([
      admitted.metaDescription,
      admitted.description,
      admitted.excerpt,
      admitted.summary,
      admitted.koios?.tweet,
    ], headline),
    articleBody: admitted.body,
    ...(opts.termRefs === undefined || opts.termRefs.length === 0 ? {} : { about: Object.freeze([...opts.termRefs]) }),
    ...(citation.length === 0 ? {} : { citation }),
    ...(admitted.license_url === undefined ? {} : { license: admitted.license_url }),
    isAccessibleForFree: true as const,
  });
}

/** Project an Article content record to generic schema.org Article or BlogPosting JSON-LD. */
export function articleToArticleJsonLd(article: Article, opts: ArticleJsonLdOptions = {}): ArticleJsonLd {
  return Object.freeze({
    ...articleJsonLdBase(article, opts),
    "@type": opts.type ?? ARTICLE_TYPE,
  });
}

/** Project an Article content record to schema.org NewsArticle JSON-LD. */
export function articleToNewsArticleJsonLd(article: Article): NewsArticleJsonLd {
  const admitted = articleContract.assert(article, "article") as Article;
  const news = articleJsonLdBase(admitted, {});
  return Object.freeze({
    ...news,
    "@type": NEWS_ARTICLE_TYPE,
    articleSection: news.articleSection ?? "News",
  });
}

/** Project a Page content record to schema.org WebPage JSON-LD. */
export function pageToWebPageJsonLd(page: Page, opts: WebPageJsonLdOptions = {}): WebPageJsonLd {
  const admitted = pageContract.assert(page, "page") as Page;
  const id = clean(opts.id);
  const url = clean(opts.url) ?? clean(admitted.url);
  const authorId = clean(opts.authorId);
  const authorName = clean(opts.authorName);
  const description = clean(opts.description);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": WEB_PAGE_TYPE,
    ...(id === undefined ? {} : { "@id": id }),
    ...(url === undefined ? {} : { url }),
    name: admitted.title,
    headline: admitted.title,
    ...(admitted.date === undefined ? {} : { datePublished: admitted.date }),
    ...(authorName === undefined ? {} : {
      author: Object.freeze({
        ...(authorId === undefined ? {} : { "@id": authorId }),
        "@type": "Person" as const,
        name: authorName,
      }),
    }),
    ...(description === undefined ? {} : { description }),
  });
}

/** Project website/publication context to a schema.org Organization node. */
export function websiteContextToOrganizationJsonLd(websiteContext: SchemaOrgWebsiteContext): OrganizationJsonLd {
  const root = canonicalRoot(websiteContext.websiteUrl);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": ORGANIZATION_TYPE,
    "@id": clean(websiteContext.organizationId) ?? `${root}#organization`,
    name: firstText([websiteContext.author, websiteContext.websiteName, websiteContext.title], websiteContext.title),
    url: root,
  });
}

/** Project website/publication context to a schema.org WebSite node with an Organization publisher. */
export function websiteContextToWebSiteJsonLd(websiteContext: SchemaOrgWebsiteContext): WebSiteJsonLd {
  const root = canonicalRoot(websiteContext.websiteUrl);
  const description = clean(websiteContext.description);
  const language = clean(websiteContext.language);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": WEB_SITE_TYPE,
    "@id": clean(websiteContext.websiteId) ?? `${root}#website`,
    url: root,
    name: websiteContext.websiteName ?? websiteContext.title,
    ...(description === undefined ? {} : { description }),
    ...(language === undefined ? {} : { inLanguage: language }),
    publisher: websiteContextToOrganizationJsonLd(websiteContext),
  });
}

/** Project a taxonomy term route to schema.org CollectionPage JSON-LD. */
export function termToCollectionPageJsonLd(term: SchemaOrgTermPageContext): CollectionPageJsonLd {
  const url = canonicalUrl(term.url);
  const termId = clean(term.termId) ?? `${url}#term`;
  const pageId = clean(term.id) ?? `${url}#collection`;
  const title = clean(term.title) ?? `${term.term} (${term.dimension ?? "term"})`;
  const description = clean(term.description);
  const websiteId = clean(term.websiteId);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": COLLECTION_PAGE_TYPE,
    "@id": pageId,
    url,
    name: title,
    ...(description === undefined ? {} : { description }),
    about: Object.freeze({
      "@id": termId,
      "@type": "Thing",
      name: term.term,
    }),
    ...(websiteId === undefined ? {} : { isPartOf: Object.freeze({ "@id": websiteId }) }),
    ...(term.itemUrls === undefined ? {} : {
      mainEntity: Object.freeze({
        "@type": "ItemList",
        itemListElement: Object.freeze(term.itemUrls.map((itemUrl, index) => Object.freeze({
          "@type": "ListItem",
          position: index + 1,
          url: itemUrl,
        }))),
      }),
    }),
  });
}

/** Project a taxonomy term to the graph node linked by articles and its CollectionPage. */
export function termToThingJsonLd(term: SchemaOrgTermPageContext): JsonLdObject {
  const page = termToCollectionPageJsonLd(term);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@id": page.about["@id"],
    "@type": "Thing",
    name: term.term,
    subjectOf: Object.freeze({ "@id": page["@id"] }),
  });
}

/** Project a route path to a schema.org BreadcrumbList JSON-LD node. */
export function breadcrumbJsonLd(routePath: string, opts: BreadcrumbJsonLdOptions = {}): BreadcrumbListJsonLd {
  const id = clean(opts.id);
  const cleanPath = routePath.replace(/\\/gu, "/").replace(/^\/+|\/+$/gu, "").replace(/\/index\.html$/u, "");
  const segments = cleanPath === "" ? [] : cleanPath.split("/").filter(Boolean);
  const rootName = clean(opts.rootName) ?? "Home";
  const crumbs = [{ label: rootName, path: "" }, ...segments.map((segment, index) => ({
    label: opts.names?.[segment] ?? labelForSegment(segment),
    path: segments.slice(0, index + 1).join("/"),
  }))];
  const root = opts.websiteUrl === undefined ? undefined : canonicalRoot(opts.websiteUrl);
  const itemListElement = Object.freeze(crumbs.map((crumb, index) => Object.freeze({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.label,
    ...(root === undefined ? {} : { item: crumb.path === "" ? root : `${root}${crumb.path}/` }),
  })));
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": BREADCRUMB_LIST_TYPE,
    ...(id === undefined ? {} : { "@id": id }),
    itemListElement,
  });
}

/** Wrap schema.org nodes in a single JSON-LD @graph document. */
export function entityGraphJsonLd(nodes: readonly JsonLdObject[]): JsonLdGraphDocument {
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@graph": Object.freeze(nodes.map(withoutContext)),
  });
}

/** Render JSON-LD as a head-safe script element for static HTML injection. */
export function renderJsonLdScript(jsonLd: JsonLdObject): string {
  return `<script type="application/ld+json">${JSON.stringify(jsonLd, null, 2).replace(/</gu, "\\u003c")}</script>`;
}

function withoutContext(node: JsonLdObject): JsonLdObject {
  const { "@context": _context, ...rest } = node;
  return Object.freeze(rest);
}

function canonicalRoot(value: string): string {
  return canonicalUrl(value).replace(/\/?$/u, "/");
}

function canonicalUrl(value: string): string {
  return new URL(value).toString();
}

function labelForSegment(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/\.[^.]+$/u, "")
    .replace(/[-_]+/gu, " ")
    .replace(/\b[a-z]/gu, (letter) => letter.toUpperCase());
}
