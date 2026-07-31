import type { FeedAuthor, FeedChannel, FeedItem, SitemapUrl } from "@red-cup-engineering/organizing-with-the-web/feed";
import {
  assertHttpUrl,
  atom,
  escapeHtmlText,
  jsonFeed,
  joinUrl,
  maybeString,
  normalizePath,
  robots,
  rss2,
  scalars,
  sitemap,
  slugify,
} from "@red-cup-engineering/organizing-with-the-web/feed";
import type { MicroformatAuthor, MicroformatEntry, MicroformatFeed, MicroformatProperties } from "@red-cup-engineering/organizing-with-the-semantic-web/microformats";
import { hEntry, hFeed } from "@red-cup-engineering/organizing-with-the-semantic-web/microformats";
import { securityTxt, type SecurityTxt } from "@red-cup-engineering/organizing-with-the-semantic-web/page-metadata";
import type { FeedLink, FeedPage } from "@red-cup-engineering/organizing-with-the-web/pagination";
import {
  hfeedAnchors,
  hfeedHeadLinks,
  hfeedLinks,
  pagedLinks,
  pagedLinksToAtom,
  pagedLinksToHeader,
  paginateFeed,
} from "@red-cup-engineering/organizing-with-the-web/pagination";
import type { TaxonomyIndex, TaxonomyItem } from "@red-cup-engineering/organizing-with-the-semantic-web/taxonomy";
import { taxonomyIndex } from "@red-cup-engineering/organizing-with-the-semantic-web/taxonomy";
import { readTextBody, type App, type Context, type Repr, type Resource } from "@emsenn/relating/running/http";
import { minimal, render, type Theme, type ThemeContext } from "@red-cup-engineering/organizing-with-the-web/theming";
import { classifyMention, receiveMention, type MentionType, type ReceiveResult } from "@red-cup-engineering/organizing-with-the-web/webmention";

export type BlogCell = Readonly<{ predicate: string; object: unknown; citation?: string; claimedBy?: string; contraryClaimedBy?: string }>;
export type BlogAlgebra = Readonly<{ subject: string; potential?: readonly BlogCell[]; active?: readonly BlogCell[]; stable?: readonly BlogCell[]; t?: unknown }>;
export type BlogAuthor = string | Readonly<{ name: string; url?: string; photo?: string; email?: string }>;

export type BlogPostInput = Readonly<{
  algebra: BlogAlgebra;
  slug?: string;
  path?: string;
  url?: string;
  author?: BlogAuthor;
  bodyHtml?: string;
}>;

export type BlogPost = Readonly<{
  subject: string;
  slug: string;
  url: string;
  title: string;
  summary: string;
  bodyHtml: string;
  published?: string;
  updated?: string;
  author?: BlogAuthor;
  categories: readonly string[];
  tags: readonly string[];
  photo?: string;
  algebra: BlogAlgebra;
  frontMatter: Readonly<Record<string, unknown>>;
}>;

export type BlogConfig = Readonly<{
  title: string;
  siteUrl: string;
  description?: string;
  language?: string;
  author?: BlogAuthor;
  postPath?: string;
  pageSize?: number;
  feedUrl?: string;
  webmentionEndpoint?: string;
  theme?: Theme;
  themeContext?: ThemeContext;
}>;

export type NormalizedBlogConfig = Required<Pick<BlogConfig, "title" | "siteUrl" | "description" | "language" | "postPath" | "pageSize" | "feedUrl">>
  & Pick<BlogConfig, "author" | "webmentionEndpoint" | "theme" | "themeContext">;

export type BlogIndexPage = Readonly<{
  page: FeedPage<BlogPost>;
  posts: readonly BlogPost[];
  pagedLinks: readonly FeedLink[];
  hfeedLinks: readonly FeedLink[];
  hfeed: string;
  headLinks: string;
  nav: string;
  linkHeader: string;
}>;

export type ArchiveGroup = Readonly<{ key: string; term: string; posts: readonly BlogPost[] }>;
export type ArchiveSummary = Readonly<{ key: string; term: string; count: number }>;
export type ArchivePage = BlogIndexPage & Readonly<{ term: string; key: string }>;

export type BlogMention = Readonly<{
  source?: string;
  target?: string;
  mf2Props?: readonly string[];
  author?: BlogAuthor;
  contentHtml?: string;
  published?: string;
}>;

export type CommentBuckets = Record<MentionType, BlogMention[]>;
export type CommentSummary = Readonly<{
  groups: Readonly<CommentBuckets>;
  counts: Readonly<Record<MentionType, number>>;
  total: number;
}>;

export type ProfessionalBlog = Readonly<{
  config: NormalizedBlogConfig;
  posts: readonly BlogPost[];
  taxonomy: TaxonomyIndex;
  frontPage: (index?: number) => BlogIndexPage;
  postPage: (slug: string) => BlogPostPage | undefined;
  feeds: () => Readonly<{ rss: string; atom: string; json: string; channel: FeedChannel; items: readonly FeedItem[] }>;
  sitemap: () => string;
  categories: () => ReadonlyMap<string, ArchiveGroup>;
  tags: () => ReadonlyMap<string, ArchiveGroup>;
  authors: () => ReadonlyMap<string, ArchiveGroup>;
  categoryPage: (term: string, index?: number, basePath?: string) => ArchivePage | undefined;
  tagPage: (term: string, index?: number, basePath?: string) => ArchivePage | undefined;
  authorPage: (term: string, index?: number, basePath?: string) => ArchivePage | undefined;
  comments: (mentions: readonly BlogMention[]) => CommentSummary;
  receiveComment: (rawBody: string, opts?: ReceiveCommentOptions) => Promise<ReceiveResult>;
}>;

export type BlogAppOptions = Readonly<{
  basePath?: string;
  indexPath?: string;
  manifestPath?: string;
  feedJsonPath?: string;
  feedAtomPath?: string;
  feedRssPath?: string;
  sitemapPath?: string;
  robotsPath?: string;
  securityTxtPath?: string;
  security?: SecurityTxt;
}>;

export type BlogPostPage = Readonly<{
  post: BlogPost;
  hEntry: string;
  jsonLd: string;
  socialMeta: string;
  head: string;
  html: string;
}>;

export type ReceiveCommentOptions = Readonly<{
  contentType?: string;
  fetchImpl?: Parameters<typeof receiveMention>[1] extends { fetchImpl?: infer T } ? T : never;
  verify?: Parameters<typeof receiveMention>[1] extends { verify?: infer T } ? T : never;
}>;

const POST_PREDICATE_MAP = Object.freeze({
  title: { field: "title" },
  name: { field: "title" },
  summary: { field: "summary" },
  description: { field: "summary" },
  published: { field: "published" },
  date: { field: "published" },
  "date-created": { field: "published" },
  updated: { field: "updated" },
  body: { field: "bodyHtml" },
  content: { field: "bodyHtml" },
  author: { field: "author" },
  category: { field: "categories", repeatable: true },
  categories: { field: "categories", repeatable: true },
  tag: { field: "tags", repeatable: true },
  tags: { field: "tags", repeatable: true },
  photo: { field: "photo" },
  "featured-image": { field: "photo" },
} satisfies Record<string, { field: string; repeatable?: boolean }>);

const COMMENT_TYPES = Object.freeze(["reply", "like", "repost", "bookmark", "mention"] as const);

export { joinUrl, slugify };

function trimBase(baseUrl: string): string {
  const base = String(baseUrl ?? "").replace(/\/+$/, "");
  assertHttpUrl(base, "siteUrl");
  return base;
}

function stableSlug(value: unknown): string {
  const slug = slugify(value);
  return slug.length > 0 ? slug : "post";
}

const RFC3339_INSTANT = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_NO_TZ = /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?$/;

function normalizeDate(value: string): string {
  if (RFC3339_INSTANT.test(value)) return value;
  if (DATE_ONLY.test(value)) return `${value}T00:00:00Z`;
  if (DATETIME_NO_TZ.test(value)) return `${value}Z`;
  return value;
}

function repr(body: unknown, type: string, status = 200, headers: Record<string, string> = {}): Repr {
  return { status, type, headers, body: typeof body === "string" ? body : JSON.stringify(body) };
}

function pageIndex(value: string | null): number {
  if (value === null || value === "") return 0;
  const index = Number(value);
  return Number.isSafeInteger(index) && index >= 0 ? index : 0;
}

function unique(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].filter(Boolean));
}

function feedAuthor(author: BlogAuthor | undefined): FeedAuthor | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return author ? { name: author } : undefined;
  return { name: author.name, ...(author.url ? { url: author.url } : {}), ...(author.email ? { email: author.email } : {}) };
}

function microformatAuthor(author: BlogAuthor | undefined): MicroformatAuthor | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return author ? { name: author } : undefined;
  return { name: author.name, ...(author.url ? { url: author.url } : {}), ...(author.photo ? { photo: author.photo } : {}) };
}

export function frontMatterFromCells(cells: readonly BlogCell[] = []): Readonly<Record<string, unknown>> {
  const props: Record<string, unknown> = {};
  for (const cell of cells) {
    const rule = POST_PREDICATE_MAP[cell.predicate as keyof typeof POST_PREDICATE_MAP];
    if (!rule || cell.object === undefined || cell.object === null || cell.object === "") continue;
    if ("repeatable" in rule && rule.repeatable) {
      const prior = props[rule.field];
      props[rule.field] = [...(Array.isArray(prior) ? prior : []), ...scalars(cell.object)];
    } else {
      props[rule.field] = cell.object;
    }
  }
  return Object.freeze(props);
}

export function normalizeConfig(input: BlogConfig): NormalizedBlogConfig {
  if (!input.title) throw new TypeError("config.title is required");
  const siteUrl = trimBase(input.siteUrl);
  const feedUrl = input.feedUrl ?? `${siteUrl}/feed.xml`;
  assertHttpUrl(feedUrl, "feedUrl");
  return Object.freeze({
    title: input.title,
    siteUrl,
    description: input.description ?? "",
    language: input.language ?? "en",
    postPath: input.postPath ?? "posts",
    pageSize: input.pageSize ?? 10,
    feedUrl,
    ...(input.author ? { author: input.author } : {}),
    ...(input.webmentionEndpoint ? { webmentionEndpoint: input.webmentionEndpoint } : {}),
    ...(input.theme ? { theme: input.theme } : {}),
    ...(input.themeContext ? { themeContext: input.themeContext } : {}),
  });
}

function postUrl(config: NormalizedBlogConfig, slug: string, path?: string, url?: string): string {
  const resolved = url ?? (path ? joinUrl(config.siteUrl, path) : joinUrl(config.siteUrl, joinUrl(config.postPath, slug)));
  assertHttpUrl(resolved, "post.url");
  return resolved;
}

export function normalizePost(input: BlogPostInput, config: BlogConfig | NormalizedBlogConfig): BlogPost {
  const cfg = "pageSize" in config && "feedUrl" in config ? config as NormalizedBlogConfig : normalizeConfig(config as BlogConfig);
  if (!input || typeof input !== "object") throw new TypeError("post input must be an object");
  const fm = frontMatterFromCells(input.algebra.potential);
  const title = maybeString(fm.title) ?? input.algebra.subject;
  const slug = stableSlug(input.slug ?? (input.algebra.subject || title));
  const author = input.author ?? (maybeString(fm.author) as BlogAuthor | undefined);
  const rawPublished = maybeString(fm.published);
  const published = rawPublished ? normalizeDate(rawPublished) : undefined;
  const rawUpdated = maybeString(fm.updated);
  const updated = rawUpdated ? normalizeDate(rawUpdated) : undefined;
  const photo = maybeString(fm.photo);
  return Object.freeze({
    subject: input.algebra.subject,
    slug,
    url: postUrl(cfg, slug, input.path, input.url),
    title,
    summary: maybeString(fm.summary) ?? "",
    bodyHtml: input.bodyHtml ?? maybeString(fm.bodyHtml) ?? `<article><p>${escapeHtmlText(maybeString(fm.summary) ?? title)}</p></article>`,
    ...(published ? { published } : {}),
    ...(updated ? { updated } : {}),
    ...(author ? { author } : {}),
    categories: unique(scalars(fm.categories)),
    tags: unique(scalars(fm.tags)),
    ...(photo ? { photo } : {}),
    algebra: input.algebra,
    frontMatter: fm,
  });
}

export function reverseChronological<T extends { published?: string; subject: string }>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items].sort((a, b) => {
    const ap = a.published ?? "";
    const bp = b.published ?? "";
    if (ap && bp && ap !== bp) return ap < bp ? 1 : -1;
    if (ap !== bp) return ap ? -1 : 1;
    return a.subject.localeCompare(b.subject);
  }));
}

export function feedChannel(config: NormalizedBlogConfig): FeedChannel {
  const author = feedAuthor(config.author);
  return {
    title: config.title,
    homePageUrl: config.siteUrl,
    feedUrl: config.feedUrl,
    ...(config.description ? { description: config.description } : {}),
    ...(author ? { author } : {}),
    language: config.language,
  };
}

export function feedItem(post: BlogPost): FeedItem {
  const author = feedAuthor(post.author);
  const effectiveUpdated = post.updated ?? post.published ?? "1970-01-01T00:00:00Z";
  return {
    id: post.url,
    url: post.url,
    title: post.title,
    contentHtml: post.bodyHtml,
    ...(post.summary ? { summary: post.summary } : {}),
    ...(author ? { author } : {}),
    ...(post.published ? { published: post.published } : {}),
    updated: effectiveUpdated,
    ...([...post.categories, ...post.tags].length > 0 ? { tags: [...post.categories, ...post.tags] } : {}),
    ...(post.photo ? { imageUrl: post.photo } : {}),
  };
}

export function blogFeeds(config: NormalizedBlogConfig, posts: readonly BlogPost[]): ProfessionalBlog["feeds"] extends () => infer T ? T : never {
  const channel = feedChannel(config);
  const items = posts.map(feedItem);
  return Object.freeze({
    rss: rss2(channel, items),
    atom: atom(channel, items),
    json: jsonFeed(channel, items),
    channel,
    items: Object.freeze(items),
  });
}

export function hEntryProps(post: BlogPost): MicroformatProperties {
  const author = microformatAuthor(post.author);
  const cats = [...post.categories, ...post.tags];
  return {
    name: post.title,
    url: post.url,
    uid: post.url,
    content: post.bodyHtml,
    ...(post.summary ? { summary: post.summary } : {}),
    ...(author ? { author } : {}),
    ...(post.published ? { published: post.published } : {}),
    ...(post.updated ? { updated: post.updated } : {}),
    ...(cats.length > 0 ? { category: cats } : {}),
    ...(post.photo ? { photo: post.photo } : {}),
  };
}

export function postHEntry(post: BlogPost): string {
  return hEntry(hEntryProps(post));
}

function listingEntry(post: BlogPost): MicroformatEntry {
  const author = microformatAuthor(post.author);
  return {
    id: post.url,
    url: post.url,
    title: post.title,
    ...(post.summary ? { summary: post.summary } : {}),
    ...(author ? { author } : {}),
    ...(post.published ? { published: post.published } : {}),
    ...(post.updated ? { updated: post.updated } : {}),
    ...([...post.categories, ...post.tags].length > 0 ? { tags: [...post.categories, ...post.tags] } : {}),
    ...(post.photo ? { photos: [post.photo] } : {}),
  };
}

function feedForPosts(config: NormalizedBlogConfig, posts: readonly BlogPost[]): MicroformatFeed {
  const author = microformatAuthor(config.author);
  return {
    title: config.title,
    url: config.siteUrl,
    ...(author ? { author } : {}),
    entries: posts.map(listingEntry),
  };
}

export function indexPage(posts: readonly BlogPost[], index: number, config: NormalizedBlogConfig, base = config.siteUrl): BlogIndexPage {
  const page = paginateFeed(posts, config.pageSize, index);
  const pageLinks = pagedLinks(page, base);
  const htmlLinks = hfeedLinks(page, base);
  const visiblePosts = page.items;
  return Object.freeze({
    page,
    posts: visiblePosts,
    pagedLinks: pageLinks,
    hfeedLinks: htmlLinks,
    hfeed: hFeed(feedForPosts(config, visiblePosts)),
    headLinks: hfeedHeadLinks(htmlLinks),
    nav: hfeedAnchors(htmlLinks),
    linkHeader: pagedLinksToHeader(pageLinks),
  });
}

function authorName(author: BlogAuthor | undefined): string {
  if (!author) return "";
  return typeof author === "string" ? author : author.name;
}

export function termKey(term: unknown): string {
  return String(term ?? "").trim().toLowerCase();
}

function groupBy(posts: readonly BlogPost[], key: "categories" | "tags" | "author"): ReadonlyMap<string, ArchiveGroup> {
  const groups = new Map<string, { key: string; term: string; posts: BlogPost[] }>();
  for (const post of posts) {
    const values = key === "author" ? [authorName(post.author)] : [...post[key]];
    for (const value of values) {
      const id = termKey(value);
      if (!id) continue;
      const existing = groups.get(id) ?? { key: id, term: String(value), posts: [] };
      existing.posts.push(post);
      groups.set(id, existing);
    }
  }
  return new Map([...groups.entries()].map(([id, group]) => [id, Object.freeze({ ...group, posts: Object.freeze(group.posts) })]));
}

export function termList(groups: ReadonlyMap<string, ArchiveGroup>): readonly ArchiveSummary[] {
  return Object.freeze([...groups.values()]
    .map((group) => Object.freeze({ key: group.key, term: group.term, count: group.posts.length }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)));
}

function archivePage(group: ArchiveGroup, index: number, config: NormalizedBlogConfig, path: string): ArchivePage {
  return Object.freeze({ key: group.key, term: group.term, ...indexPage(group.posts, index, config, new URL(path, config.siteUrl).href) });
}

function taxonomyItems(posts: readonly BlogPost[]): readonly TaxonomyItem[] {
  return posts.map((post) => ({
    id: post.url,
    url: post.url,
    title: post.title,
    ...(post.summary ? { summary: post.summary } : {}),
    ...(post.published ? { published: post.published } : {}),
    ...(post.updated ? { updated: post.updated } : {}),
    terms: {
      category: post.categories,
      tag: post.tags,
      ...(authorName(post.author) ? { author: [authorName(post.author)] } : {}),
    },
  }));
}

function person(author: BlogAuthor | undefined): Record<string, unknown> | undefined {
  if (!author) return undefined;
  if (typeof author === "string") return { "@type": "Person", name: author };
  return { "@type": "Person", name: author.name, ...(author.url ? { url: author.url } : {}) };
}

export function blogPosting(post: BlogPost, config: NormalizedBlogConfig): Record<string, unknown> {
  const keywords = [...post.categories, ...post.tags];
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    url: post.url,
    mainEntityOfPage: post.url,
    ...(post.summary ? { description: post.summary } : {}),
    ...(post.published ? { datePublished: post.published } : {}),
    ...(post.updated ? { dateModified: post.updated } : {}),
    ...(person(post.author) ? { author: person(post.author) } : {}),
    publisher: { "@type": "Organization", name: config.title, url: config.siteUrl },
    ...(keywords.length > 0 ? { keywords } : {}),
    ...(post.photo ? { image: post.photo } : {}),
  };
}

export function jsonLdScript(node: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(node).replace(/</g, "\\u003c")}</script>`;
}

export function socialMeta(post: BlogPost, config: NormalizedBlogConfig): string {
  const tags = [...post.categories, ...post.tags];
  const meta: [string, string][] = [
    ["og:type", "article"],
    ["og:title", post.title],
    ["og:url", post.url],
    ["og:site_name", config.title],
    ["twitter:card", post.photo ? "summary_large_image" : "summary"],
    ["twitter:title", post.title],
  ];
  if (post.summary) {
    meta.push(["og:description", post.summary], ["twitter:description", post.summary]);
  }
  if (post.photo) {
    meta.push(["og:image", post.photo], ["twitter:image", post.photo]);
  }
  if (post.published) meta.push(["article:published_time", post.published]);
  if (post.updated) meta.push(["article:modified_time", post.updated]);
  const by = authorName(post.author);
  if (by) meta.push(["article:author", by]);
  for (const tag of tags) meta.push(["article:tag", tag]);
  return meta.map(([property, content]) => `<meta property="${escapeHtmlText(property)}" content="${escapeHtmlText(content)}">`).join("\n");
}

export function webmentionLink(endpoint: string): string {
  return `<link rel="webmention" href="${escapeHtmlText(endpoint)}">`;
}

function extraHead(post: BlogPost, config: NormalizedBlogConfig): { jsonLd: string; socialMeta: string; head: string } {
  const jsonLd = jsonLdScript(blogPosting(post, config));
  const social = socialMeta(post, config);
  const wm = config.webmentionEndpoint ? webmentionLink(config.webmentionEndpoint) : "";
  return { jsonLd, socialMeta: social, head: [social, jsonLd, wm].filter(Boolean).join("\n") };
}

export function buildPostPage(post: BlogPost, config: NormalizedBlogConfig): BlogPostPage {
  const hEntryHtml = postHEntry(post);
  const head = extraHead(post, config);
  const author = typeof post.author === "string" ? post.author : post.author?.name;
  const html = render(config.theme ?? minimal, `${head.head}\n${hEntryHtml}`, {
    title: post.title,
    siteName: config.title,
    description: post.summary || config.description,
    canonical: post.url,
    lang: config.language,
    ...(author ? { author } : {}),
    ...config.themeContext,
  });
  return Object.freeze({ post, hEntry: hEntryHtml, jsonLd: head.jsonLd, socialMeta: head.socialMeta, head: head.head, html });
}

function indexHtml(site: ProfessionalBlog, page: BlogIndexPage, title = site.config.title, canonical = site.config.siteUrl): string {
  return render(site.config.theme ?? minimal, `${page.headLinks}\n${page.hfeed}\n${page.nav}`, {
    title,
    siteName: site.config.title,
    description: site.config.description,
    canonical,
    lang: site.config.language,
    ...(typeof site.config.author === "string" ? { author: site.config.author } : site.config.author?.name ? { author: site.config.author.name } : {}),
    ...site.config.themeContext,
  });
}

export function classify(mention: BlogMention): MentionType {
  return classifyMention([{ mf2Props: mention.mf2Props ?? [] }]);
}

export function commentsForPost(mentions: readonly BlogMention[]): CommentSummary {
  const groups: CommentBuckets = { reply: [], like: [], repost: [], bookmark: [], mention: [] };
  for (const mention of mentions) groups[classify(mention)].push(mention);
  const counts = Object.fromEntries(COMMENT_TYPES.map((type) => [type, groups[type].length])) as Record<MentionType, number>;
  const total = COMMENT_TYPES.reduce((sum, type) => sum + counts[type], 0);
  return Object.freeze({ groups: Object.freeze(groups), counts: Object.freeze(counts), total });
}

export function buildSite(configInput: BlogConfig, inputPosts: readonly BlogPostInput[]): ProfessionalBlog {
  const config = normalizeConfig(configInput);
  const posts = reverseChronological(inputPosts.map((input) => normalizePost(input, config)));
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const categories = groupBy(posts, "categories");
  const tags = groupBy(posts, "tags");
  const authors = groupBy(posts, "author");
  return Object.freeze({
    config,
    posts,
    taxonomy: taxonomyIndex(taxonomyItems(posts)),
    frontPage: (index = 0) => indexPage(posts, index, config),
    postPage: (slug: string) => {
      const post = bySlug.get(slug);
      return post ? buildPostPage(post, config) : undefined;
    },
    feeds: () => blogFeeds(config, posts),
    sitemap: () => sitemap(posts.map((post): SitemapUrl => {
      const lastmod = post.updated ?? post.published;
      return { loc: post.url, ...(lastmod ? { lastmod } : {}) };
    })),
    categories: () => categories,
    tags: () => tags,
    authors: () => authors,
    categoryPage: (term: string, index = 0, basePath = "") => {
      const group = categories.get(termKey(term));
      return group ? archivePage(group, index, config, `${basePath}/category/${encodeURIComponent(group.key)}`) : undefined;
    },
    tagPage: (term: string, index = 0, basePath = "") => {
      const group = tags.get(termKey(term));
      return group ? archivePage(group, index, config, `${basePath}/tag/${encodeURIComponent(group.key)}`) : undefined;
    },
    authorPage: (term: string, index = 0, basePath = "") => {
      const group = authors.get(termKey(term));
      return group ? archivePage(group, index, config, `${basePath}/author/${encodeURIComponent(group.key)}`) : undefined;
    },
    comments: commentsForPost,
    receiveComment: (rawBody: string, opts: ReceiveCommentOptions = {}) => receiveMention(rawBody, {
      baseUrl: config.siteUrl,
      ...(opts.contentType ? { contentType: opts.contentType } : {}),
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
      ...(opts.verify ? { verify: opts.verify } : {}),
    }),
  });
}

function pathFromUrl(url: string): string {
  return new URL(url).pathname || "/";
}

function archiveMatch(prefix: string, path: string): { term: string } | null {
  const root = `/${prefix}/`;
  if (!path.startsWith(root)) return null;
  const rest = path.slice(root.length);
  if (!rest || rest.includes("/")) return null;
  return { term: decodeURIComponent(rest) };
}

function endpointPath(endpoint: string | undefined, siteUrl: string): string | null {
  if (!endpoint) return null;
  return new URL(endpoint, siteUrl).pathname;
}

function publicBlogSummary(site: ProfessionalBlog): Record<string, unknown> {
  return {
    title: site.config.title,
    siteUrl: site.config.siteUrl,
    description: site.config.description,
    language: site.config.language,
    feeds: {
      rss: site.config.feedUrl,
      atom: new URL("/feed.atom", site.config.siteUrl).href,
      json: new URL("/feed.json", site.config.siteUrl).href,
      sitemap: new URL("/sitemap.xml", site.config.siteUrl).href,
      robots: new URL("/robots.txt", site.config.siteUrl).href,
    },
    counts: {
      posts: site.posts.length,
      categories: site.categories().size,
      tags: site.tags().size,
      authors: site.authors().size,
    },
    posts: site.posts.map((post) => ({
      subject: post.subject,
      slug: post.slug,
      url: post.url,
      title: post.title,
      summary: post.summary,
      published: post.published ?? null,
      updated: post.updated ?? null,
      categories: post.categories,
      tags: post.tags,
    })),
  };
}

export function blogApp(site: ProfessionalBlog, options: BlogAppOptions = {}): App {
  const base = (options.basePath != null && options.basePath !== "")
    ? normalizePath(options.basePath, "")
    : "";
  const baseStripped = base.replace(/^\/+|\/+$/g, "");
  const sep = baseStripped ? `/${baseStripped}` : "";
  const archivePfx = (kind: string): string => baseStripped ? `${baseStripped}/${kind}` : kind;

  const indexPath = normalizePath(options.indexPath, sep || "/");
  const manifestPath = normalizePath(options.manifestPath, `${sep}/blog.json`);
  const feedJsonPath = normalizePath(options.feedJsonPath, `${sep}/feed.json`);
  const feedAtomPath = normalizePath(options.feedAtomPath, `${sep}/feed.atom`);
  const feedRssPath = normalizePath(options.feedRssPath, `${sep}/feed.xml`);
  const securityTxtPath = normalizePath(options.securityTxtPath, "/.well-known/security.txt");
  const sitemapPath = options.sitemapPath !== undefined
    ? normalizePath(options.sitemapPath, "/sitemap.xml")
    : (baseStripped ? null : "/sitemap.xml");
  const robotsPath = options.robotsPath !== undefined
    ? normalizePath(options.robotsPath, "/robots.txt")
    : (baseStripped ? null : "/robots.txt");

  const postPaths = new Map(site.posts.map((post) => [pathFromUrl(post.url), post.slug]));
  const webmentionPath = endpointPath(site.config.webmentionEndpoint, site.config.siteUrl);
  const sitemapUrl = sitemapPath != null ? new URL(sitemapPath, site.config.siteUrl).href : null;
  const languages = Object.freeze([site.config.language]);

  const resources: Resource[] = [
    {
      id: "professional-blog.index",
      name: "Professional Blog Index",
      route: indexPath,
      match: indexPath,
      methods: ["GET"],
      produces: ["text/html"],
      languages,
      handler: async (ctx) => {
        const page = site.frontPage(pageIndex(ctx.url.searchParams.get("page")));
        return repr(indexHtml(site, page), "text/html; charset=utf-8", 200, page.linkHeader ? { Link: page.linkHeader } : {});
      },
    },
    {
      id: "professional-blog.manifest",
      name: "Professional Blog Manifest",
      route: manifestPath,
      match: manifestPath,
      methods: ["GET"],
      produces: ["application/json"],
      languages,
      handler: async () => repr(publicBlogSummary(site), "application/json; charset=utf-8"),
    },
    {
      id: "professional-blog.feed.json",
      name: "Professional Blog JSON Feed",
      route: feedJsonPath,
      match: feedJsonPath,
      methods: ["GET"],
      produces: ["application/feed+json"],
      languages,
      handler: async () => repr(site.feeds().json, "application/feed+json; charset=utf-8"),
    },
    {
      id: "professional-blog.feed.atom",
      name: "Professional Blog Atom Feed",
      route: feedAtomPath,
      match: feedAtomPath,
      methods: ["GET"],
      produces: ["application/atom+xml"],
      languages,
      handler: async () => repr(site.feeds().atom, "application/atom+xml; charset=utf-8"),
    },
    {
      id: "professional-blog.feed.rss",
      name: "Professional Blog RSS Feed",
      route: feedRssPath,
      match: feedRssPath,
      methods: ["GET"],
      produces: ["application/rss+xml"],
      languages,
      handler: async () => repr(site.feeds().rss, "application/rss+xml; charset=utf-8"),
    },
    {
      id: "professional-blog.category",
      name: "Professional Blog Category Archive",
      route: `/${archivePfx("category")}/:term`,
      match: (path) => archiveMatch(archivePfx("category"), path),
      methods: ["GET"],
      produces: ["text/html"],
      languages,
      handler: async (ctx) => {
        const page = site.categoryPage(ctx.params.term ?? "", pageIndex(ctx.url.searchParams.get("page")), sep);
        return page ? repr(indexHtml(site, page, `${page.term} - ${site.config.title}`, new URL(`/${archivePfx("category")}/${encodeURIComponent(page.key)}`, site.config.siteUrl).href), "text/html; charset=utf-8", 200, page.linkHeader ? { Link: page.linkHeader } : {}) : null;
      },
    },
    {
      id: "professional-blog.tag",
      name: "Professional Blog Tag Archive",
      route: `/${archivePfx("tag")}/:term`,
      match: (path) => archiveMatch(archivePfx("tag"), path),
      methods: ["GET"],
      produces: ["text/html"],
      languages,
      handler: async (ctx) => {
        const page = site.tagPage(ctx.params.term ?? "", pageIndex(ctx.url.searchParams.get("page")), sep);
        return page ? repr(indexHtml(site, page, `${page.term} - ${site.config.title}`, new URL(`/${archivePfx("tag")}/${encodeURIComponent(page.key)}`, site.config.siteUrl).href), "text/html; charset=utf-8", 200, page.linkHeader ? { Link: page.linkHeader } : {}) : null;
      },
    },
    {
      id: "professional-blog.author",
      name: "Professional Blog Author Archive",
      route: `/${archivePfx("author")}/:term`,
      match: (path) => archiveMatch(archivePfx("author"), path),
      methods: ["GET"],
      produces: ["text/html"],
      languages,
      handler: async (ctx) => {
        const page = site.authorPage(ctx.params.term ?? "", pageIndex(ctx.url.searchParams.get("page")), sep);
        return page ? repr(indexHtml(site, page, `${page.term} - ${site.config.title}`, new URL(`/${archivePfx("author")}/${encodeURIComponent(page.key)}`, site.config.siteUrl).href), "text/html; charset=utf-8", 200, page.linkHeader ? { Link: page.linkHeader } : {}) : null;
      },
    },
    {
      id: "professional-blog.post",
      name: "Professional Blog Post",
      route: `/${site.config.postPath.replace(/^\/+|\/+$/g, "")}/:slug`,
      match(path) {
        const slug = postPaths.get(path);
        return slug ? { slug } : null;
      },
      methods: ["GET"],
      produces: ["text/html"],
      languages,
      handler: async (ctx) => {
        const page = site.postPage(ctx.params.slug ?? "");
        return page ? repr(page.html, "text/html; charset=utf-8") : null;
      },
    },
  ];

  if (sitemapPath != null) {
    resources.push({
      id: "professional-blog.sitemap",
      name: "Professional Blog Sitemap",
      route: sitemapPath,
      match: sitemapPath,
      methods: ["GET"],
      produces: ["application/xml"],
      handler: async () => repr(site.sitemap(), "application/xml; charset=utf-8"),
    });
  }

  if (robotsPath != null) {
    resources.push({
      id: "professional-blog.robots",
      name: "Professional Blog Robots",
      route: robotsPath,
      match: robotsPath,
      methods: ["GET"],
      produces: ["text/plain"],
      handler: async () => repr(robots(sitemapUrl ?? new URL(`${sep}/sitemap.xml`, site.config.siteUrl).href), "text/plain; charset=utf-8"),
    });
  }

  if (options.security) {
    resources.push({
      id: "professional-blog.security-txt",
      name: "Professional Blog Security Contact Policy",
      route: securityTxtPath,
      match: securityTxtPath,
      methods: ["GET"],
      produces: ["text/plain"],
      handler: async () => repr(securityTxt(options.security!), "text/plain; charset=utf-8"),
    });
  }

  const webmentionResource: Resource | null = webmentionPath ? {
      id: "professional-blog.webmention",
      name: "Professional Blog Webmention",
      route: webmentionPath,
      match: webmentionPath,
      methods: ["POST"],
      produces: ["application/json"],
      handler: async (ctx: Context) => {
        const result = await site.receiveComment(await readTextBody(ctx.req, { maxBytes: 100_000 }), {
          contentType: String(ctx.req.headers["content-type"] ?? ""),
        });
        return repr(result, "application/json; charset=utf-8", result.status);
      },
    } : null;

  return { resources: webmentionResource === null ? resources : [...resources, webmentionResource] };
}

export function buildBlogApp(config: BlogConfig, posts: readonly BlogPostInput[], options: BlogAppOptions = {}): App {
  return blogApp(buildSite(config, posts), options);
}
